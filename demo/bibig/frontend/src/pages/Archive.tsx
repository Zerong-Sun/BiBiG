import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  listRecordings,
  listBiographies,
  transcribeRecording,
  processRecording,
  getBiography,
  uploadRecording,
  attachRecordingToBiography,
  updateTranscript,
  saveLocalTranscriptDraft,
  getLocalTranscriptDraft,
  checkBackendHealth,
  getApiErrorMessage,
} from '../services/api';
import { useAppStore, isOfflineMode } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';
import {
  getLocalRecordings,
  deleteLocalRecording,
  saveRecordingLocally,
  type LocalRecording,
} from '../utils/localStorage';

type Tab = 'local' | 'server' | 'entries';

const STATUS_LABELS: Record<string, string> = {
  uploading: '已上传',
  processing: '转写中',
  transcribed: '已转写',
  failed: '转写失败',
};

function hasPlayableAudio(audioUrl?: string) {
  return Boolean(audioUrl && !audioUrl.startsWith('text://'));
}

export default function Archive() {
  const [searchParams] = useSearchParams();
  const { requireAuth } = useAuth();
  const { userId, setUserId, biographyId, setBiographyId } = useAppStore();
  const [tab, setTab] = useState<Tab>('server');
  const [filterBioId, setFilterBioId] = useState<string>(searchParams.get('bio') || biographyId || '');
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [biographies, setBiographies] = useState<Array<{ id: string; title: string }>>([]);
  const [localRecordings, setLocalRecordings] = useState<LocalRecording[]>([]);
  const [serverRecordings, setServerRecordings] = useState<
    Array<{
      id: string;
      title: string;
      status: string;
      transcript?: string;
      audio_url?: string;
      created_at?: string;
      biography_id?: string;
    }>
  >([]);
  const [entries, setEntries] = useState<
    Array<{ id: string; title: string; content: string; original_transcript?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [assignBio, setAssignBio] = useState<Record<string, string>>({});
  const [localBioPick, setLocalBioPick] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [manualTranscript, setManualTranscript] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (uid: string, bioFilter?: string) => {
    const bioId = bioFilter || undefined;
    const [local, server] = await Promise.all([
      getLocalRecordings(bioId),
      listRecordings(uid, bioId),
    ]);
    setLocalRecordings(local);
    setServerRecordings(server);

    const drafts: Record<string, string> = {};
    await Promise.all(
      local.map(async (rec) => {
        const text = await getLocalTranscriptDraft(rec.id);
        if (text) drafts[rec.id] = text;
      }),
    );
    setLocalDrafts(drafts);

    if (bioFilter) {
      const bio = await getBiography(bioFilter);
      setEntries(bio.entries || []);
    } else {
      setEntries([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const id = userId || (await requireAuth());
        if (!userId) setUserId(id);
        const bios = await listBiographies(id);
        setBiographies(bios);
        const initialBio = searchParams.get('bio') || filterBioId;
        if (initialBio) {
          setFilterBioId(initialBio);
          setBiographyId(initialBio);
        }
        await loadData(id, initialBio || undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, setUserId, requireAuth]);

  useEffect(() => {
    if (userId) loadData(userId, filterBioId || undefined);
  }, [filterBioId, userId]);

  const filteredLocal = localRecordings.filter((rec) => {
    if (syncFilter === 'synced') return rec.synced;
    if (syncFilter === 'unsynced') return !rec.synced;
    return true;
  });

  const bioTitle = (id?: string) => biographies.find((b) => b.id === id)?.title;

  const playLocal = (recording: LocalRecording) => {
    const url = URL.createObjectURL(recording.blob);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  };

  const playServer = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  const handleTranscribe = async (recordingId: string) => {
    setProcessing(recordingId);
    try {
      const result = await transcribeRecording(recordingId);
      setSelectedTranscript(result.transcript);
      showToast(true, '转写完成');
      await loadData(userId, filterBioId || undefined);
    } catch (err) {
      showToast(false, getApiErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const handleAttach = async (recordingId: string, bioId: string) => {
    if (!bioId) {
      showToast(false, '请先选择要关联的传记');
      return;
    }
    setProcessing(recordingId);
    try {
      await attachRecordingToBiography(recordingId, bioId);
      showToast(true, `已关联到「${bioTitle(bioId)}」`);
      await loadData(userId, filterBioId || undefined);
    } catch (err) {
      showToast(false, getApiErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const handleSyncAndTranscribe = async (recording: LocalRecording, useManualDraft = false) => {
    if (isOfflineMode()) {
      showToast(false, '纯离线模式无法上传，请使用「手动输入转写」');
      return;
    }
    const online = await checkBackendHealth();
    if (!online) {
      showToast(false, '后端未连接，无法上传。请先启动 backend（端口 8000）');
      return;
    }
    const bioId = localBioPick[recording.id] || recording.biographyId || filterBioId;
    const draft = localDrafts[recording.id];
    setProcessing(recording.id);
    try {
      const formData = new FormData();
      formData.append('file', recording.blob, `recording_${recording.id}.wav`);
      formData.append('recording_id', recording.id);
      formData.append('user_id', userId);
      if (bioId) formData.append('biography_id', bioId);

      const useDraft = useManualDraft && draft?.trim();
      const result = await uploadRecording(formData, { autoTranscribe: !useDraft });
      await saveRecordingLocally({ ...recording, synced: true, biographyId: bioId || recording.biographyId });

      if (useDraft) {
        await updateTranscript(recording.id, draft.trim());
        setSelectedTranscript(draft.trim());
        showToast(true, '已上传并保存手输转写');
      } else if (result.transcript) {
        setSelectedTranscript(result.transcript);
        showToast(true, '已上传并完成转写');
      } else if (result.transcribe_error) {
        const errMsg =
          typeof result.transcribe_error === 'object'
            ? result.transcribe_error.message
            : String(result.transcribe_error);
        showToast(false, `已上传，转写失败：${errMsg}。可改用手动输入转写。`);
      } else {
        showToast(true, '已上传到服务器，请在「服务器录音」点转文字');
      }
      setTab('server');
      await loadData(userId, filterBioId || undefined);
    } catch (err) {
      showToast(false, getApiErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const openManualTranscribe = async (recording: LocalRecording) => {
    const existing = localDrafts[recording.id] || (await getLocalTranscriptDraft(recording.id)) || '';
    setEditingLocalId(recording.id);
    setManualTranscript(existing);
  };

  const handleSaveManualTranscript = async () => {
    if (!editingLocalId || !manualTranscript.trim()) {
      showToast(false, '请输入转写文字');
      return;
    }
    setProcessing(editingLocalId);
    try {
      await saveLocalTranscriptDraft(editingLocalId, manualTranscript.trim());
      setLocalDrafts((prev) => ({ ...prev, [editingLocalId]: manualTranscript.trim() }));
      setEditingLocalId(null);
      showToast(true, isOfflineMode() ? '转写已保存到本机' : '转写已保存，可点「上传并提交转写」同步到服务器');
    } catch (err) {
      showToast(false, getApiErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const handleReprocess = async (recordingId: string, bioId: string) => {
    setProcessing(recordingId);
    try {
      await processRecording(bioId, recordingId);
      showToast(true, 'AI 整理完成，已加入传记章节');
      if (filterBioId) await loadData(userId, filterBioId);
    } catch (err) {
      showToast(false, getApiErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteLocal = async (id: string) => {
    if (confirm('确定删除这条本地录音吗？')) {
      await deleteLocalRecording(id);
      await loadData(userId, filterBioId || undefined);
    }
  };

  const formatDate = (ts: string | number) => new Date(ts).toLocaleString('zh-CN');

  const canTranscribe = (status: string) => status !== 'transcribed' && status !== 'processing';
  const canAiProcess = (rec: { biography_id?: string; status: string; transcript?: string }) =>
    rec.biography_id && (rec.status === 'transcribed' || !!rec.transcript);

  if (loading) {
    return <p className="text-muted text-center py-12">加载中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">档案管理</h1>
        <p className="text-sm text-muted mt-1">
          录音 → 转文字 → 关联传记 → AI 整理 → 生成书籍
        </p>
      </div>

      <div className="card-muted p-4 text-sm text-muted space-y-1">
        <p><span className="text-accent font-medium">本地录音</span>：存在浏览器里，<strong>不能直接在本地转写</strong>。在线模式需「上传并转写」；也可「手动输入转写」后上传。</p>
        <p><span className="text-accent font-medium">服务器录音</span>：上传后可点「转文字」→ 关联传记 →「AI 整理」</p>
      </div>

      {toast && (
        <div className={toast.ok ? 'alert-success' : 'alert-error'} role="status">
          {toast.text}
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-muted mb-1">筛选传记</label>
          <select
            className="input-field"
            value={filterBioId}
            onChange={(e) => {
              setFilterBioId(e.target.value);
              setBiographyId(e.target.value || null);
            }}
          >
            <option value="">全部传记</option>
            {biographies.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
        {tab === 'local' && (
          <div>
            <label className="block text-sm text-muted mb-1">同步状态</label>
            <select className="input-field" value={syncFilter} onChange={(e) => setSyncFilter(e.target.value as typeof syncFilter)}>
              <option value="all">全部</option>
              <option value="synced">已同步</option>
              <option value="unsynced">未同步</option>
            </select>
          </div>
        )}
      </div>

      <audio ref={audioRef} controls className="w-full" />

      <div className="flex flex-wrap gap-2">
        {([
          ['server', `服务器录音 (${serverRecordings.length})`],
          ['local', `本地录音 (${filteredLocal.length})`],
          ['entries', `传记条目 (${entries.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg ${tab === key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'server' && (
        <div className="card p-6 space-y-3">
          {serverRecordings.length === 0 ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-muted">暂无服务器录音</p>
              <Link to="/record" className="btn-primary text-sm py-2 px-4 no-underline inline-block">
                去录音
              </Link>
            </div>
          ) : (
            serverRecordings.map((rec) => (
              <div key={rec.id} className="card-muted p-4 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-muted mt-1">
                      {rec.created_at && formatDate(rec.created_at)}
                      {' · '}
                      {STATUS_LABELS[rec.status] || rec.status}
                      {rec.biography_id
                        ? ` · 已关联「${bioTitle(rec.biography_id) || '传记'}」`
                        : ' · 未关联传记'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasPlayableAudio(rec.audio_url) && (
                      <button type="button" onClick={() => playServer(rec.audio_url!)} className="btn-secondary text-sm py-1 px-3">
                        播放
                      </button>
                    )}
                    {canTranscribe(rec.status) && (
                      <button
                        type="button"
                        onClick={() => handleTranscribe(rec.id)}
                        disabled={processing === rec.id}
                        className="btn-primary text-sm py-1 px-3"
                      >
                        {processing === rec.id ? '转写中...' : '转文字'}
                      </button>
                    )}
                    {rec.status === 'transcribed' && (
                      <button
                        type="button"
                        onClick={() => handleTranscribe(rec.id)}
                        disabled={processing === rec.id}
                        className="btn-secondary text-sm py-1 px-3"
                      >
                        {processing === rec.id ? '处理中...' : '重新转写'}
                      </button>
                    )}
                    {rec.transcript && (
                      <button type="button" onClick={() => setSelectedTranscript(rec.transcript!)} className="btn-secondary text-sm py-1 px-3">
                        查看转写
                      </button>
                    )}
                    {canAiProcess(rec) && (
                      <button
                        type="button"
                        onClick={() => handleReprocess(rec.id, rec.biography_id!)}
                        disabled={processing === rec.id}
                        className="btn-primary text-sm py-1 px-3"
                      >
                        {processing === rec.id ? '整理中...' : 'AI 整理'}
                      </button>
                    )}
                    {rec.biography_id && (
                      <Link to={`/biography/${rec.biography_id}`} className="btn-secondary text-sm py-1 px-3 no-underline">
                        查看传记
                      </Link>
                    )}
                    </div>
                </div>
                {rec.transcript && (
                  <p className="text-sm text-muted text-left line-clamp-3 border-t border-[var(--border)] pt-2">
                    {rec.transcript}
                  </p>
                )}
                {!rec.biography_id && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
                    <span className="text-sm text-muted">关联到传记：</span>
                    <select
                      className="input-field text-sm py-1 flex-1 min-w-[160px]"
                      value={assignBio[rec.id] || filterBioId || ''}
                      onChange={(e) => setAssignBio((prev) => ({ ...prev, [rec.id]: e.target.value }))}
                    >
                      <option value="">选择传记...</option>
                      {biographies.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAttach(rec.id, assignBio[rec.id] || filterBioId)}
                      disabled={processing === rec.id}
                      className="btn-secondary text-sm py-1 px-3"
                    >
                      关联传记
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'local' && (
        <div className="card p-6 space-y-3">
          {filteredLocal.length === 0 ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-muted">暂无本地录音</p>
              <Link to="/record" className="btn-primary text-sm py-2 px-4 no-underline inline-block">
                去录音
              </Link>
            </div>
          ) : (
            filteredLocal.map((rec) => (
              <div key={rec.id} className="card-muted p-4 space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium">{formatDate(rec.timestamp)}</p>
                    <p className="text-sm text-muted">
                      时长 {Math.floor(rec.duration / 60)}:{(rec.duration % 60).toString().padStart(2, '0')}
                      {rec.synced ? <span className="ml-2 text-accent">已上传</span> : <span className="ml-2 text-muted">未上传</span>}
                      {rec.biographyId && <span className="ml-2">· {bioTitle(rec.biographyId)}</span>}
                      {localDrafts[rec.id] && <span className="ml-2 text-accent">· 已有手输转写</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={() => playLocal(rec)} className="btn-secondary text-sm py-1 px-3">播放</button>
                    <button
                      type="button"
                      onClick={() => openManualTranscribe(rec)}
                      className="btn-secondary text-sm py-1 px-3"
                    >
                      手动输入转写
                    </button>
                    {localDrafts[rec.id] && (
                      <button
                        type="button"
                        onClick={() => setSelectedTranscript(localDrafts[rec.id])}
                        className="btn-secondary text-sm py-1 px-3"
                      >
                        查看转写
                      </button>
                    )}
                    {!rec.synced && !isOfflineMode() && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncAndTranscribe(rec, false)}
                          disabled={processing === rec.id}
                          className="btn-primary text-sm py-1 px-3"
                        >
                          {processing === rec.id ? '处理中...' : '上传并转写'}
                        </button>
                        {localDrafts[rec.id] && (
                          <button
                            type="button"
                            onClick={() => handleSyncAndTranscribe(rec, true)}
                            disabled={processing === rec.id}
                            className="btn-primary text-sm py-1 px-3"
                          >
                            上传并提交转写
                          </button>
                        )}
                      </>
                    )}
                    {rec.synced && (
                      <button type="button" onClick={() => setTab('server')} className="btn-secondary text-sm py-1 px-3">
                        去服务器录音
                      </button>
                    )}
                    <button type="button" onClick={() => handleDeleteLocal(rec.id)} className="btn-danger text-sm py-1 px-3">删除</button>
                  </div>
                </div>
                {localDrafts[rec.id] && (
                  <p className="text-sm text-muted text-left line-clamp-2 border-t border-[var(--border)] pt-2">
                    {localDrafts[rec.id]}
                  </p>
                )}
                {!rec.synced && !isOfflineMode() && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">关联传记（上传时一并关联）：</span>
                    <select
                      className="input-field text-sm py-1 flex-1 min-w-[160px]"
                      value={localBioPick[rec.id] || rec.biographyId || filterBioId || ''}
                      onChange={(e) => setLocalBioPick((prev) => ({ ...prev, [rec.id]: e.target.value }))}
                    >
                      <option value="">不关联</option>
                      {biographies.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {isOfflineMode() && (
                  <p className="text-xs text-muted">离线模式：请用手动输入转写，切换在线后可上传。</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'entries' && (
        <div className="card p-6 space-y-4">
          {!filterBioId ? (
            <p className="text-muted">请在上方选择一本传记以查看 AI 整理后的章节</p>
          ) : entries.length === 0 ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-muted">该传记尚无章节，请完成录音转写并进行 AI 整理</p>
              <button type="button" onClick={() => setTab('server')} className="btn-primary text-sm py-2 px-4">
                去处理录音
              </button>
            </div>
          ) : (
            entries.map((entry) => (
              <article key={entry.id} className="card-muted p-4 text-left">
                <h3 className="font-medium mb-2">{entry.title || '未命名章节'}</h3>
                <p className="text-muted whitespace-pre-wrap line-clamp-4">{entry.content}</p>
                {entry.original_transcript && (
                  <button type="button" onClick={() => setSelectedTranscript(entry.original_transcript!)} className="btn-secondary text-sm mt-2 py-1 px-3">
                    查看原始转写
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {selectedTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3">转写文本</h3>
            <p className="whitespace-pre-wrap text-left">{selectedTranscript}</p>
            <button type="button" onClick={() => setSelectedTranscript(null)} className="btn-primary mt-4">关闭</button>
          </div>
        </div>
      )}

      {editingLocalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-semibold">手动输入转写</h3>
            <p className="text-sm text-muted text-left">
              播放录音后，将您讲述的内容输入下方。保存后可上传并提交到服务器进行 AI 整理。
            </p>
            <textarea
              className="input-field min-h-[200px]"
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              placeholder="在此输入或粘贴转写文字..."
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveManualTranscript}
                disabled={processing === editingLocalId}
                className="btn-primary flex-1"
              >
                {processing === editingLocalId ? '保存中...' : '保存转写'}
              </button>
              <button type="button" onClick={() => setEditingLocalId(null)} className="btn-secondary">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
