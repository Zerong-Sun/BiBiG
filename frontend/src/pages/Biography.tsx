import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getBiography,
  generateBook,
  getSuggestedQuestions,
  updateBiographyEntry,
  listRecordings,
  transcribeRecording,
  processRecording,
  attachRecordingToBiography,
  getApiErrorMessage,
} from '../services/api';
import { useAppStore } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';

const STYLE_LABELS: Record<string, string> = {
  story: '故事体',
  lyrical: '抒情体',
  rigorous: '纪实体',
  chronological: '时间线',
};

const STATUS_LABELS: Record<string, string> = {
  uploading: '已上传',
  processing: '转写中',
  transcribed: '已转写',
  failed: '转写失败',
};

type ServerRecording = {
  id: string;
  title: string;
  status: string;
  transcript?: string;
  biography_id?: string;
};

export default function BiographyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const { userId, setUserId, setBiographyId } = useAppStore();
  const [biography, setBiography] = useState<{
    id: string;
    title: string;
    style: string;
    status: string;
    description?: string;
    entries: Array<{ id: string; title: string; content: string; original_transcript?: string }>;
  } | null>(null);
  const [recordings, setRecordings] = useState<ServerRecording[]>([]);
  const [orphanRecordings, setOrphanRecordings] = useState<ServerRecording[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadBiography = async () => {
    if (!id) return;
    const data = await getBiography(id);
    setBiography(data);
    const q = await getSuggestedQuestions(id);
    setQuestions(q.questions);
  };

  const loadRecordings = async (uid: string) => {
    if (!id) return;
    const [linked, all] = await Promise.all([
      listRecordings(uid, id),
      listRecordings(uid),
    ]);
    setRecordings(linked);
    setOrphanRecordings(all.filter((r: ServerRecording) => !r.biography_id && r.status !== 'processing'));
  };

  useEffect(() => {
    (async () => {
      const uid = userId || (await requireAuth());
      if (!userId) setUserId(uid);
      await loadBiography();
      await loadRecordings(uid);
    })();
  }, [id]);

  const handleGenerateBook = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const book = await generateBook(id);
      navigate(`/book/${book.id}`);
    } catch (err) {
      setMessage({ ok: false, text: getApiErrorMessage(err) || '生成书籍失败，请确保已有传记内容' });
    } finally {
      setGenerating(false);
    }
  };

  const handleTranscribe = async (recordingId: string) => {
    setProcessing(recordingId);
    try {
      await transcribeRecording(recordingId);
      setMessage({ ok: true, text: '转写完成' });
      if (userId) await loadRecordings(userId);
    } catch (err) {
      setMessage({ ok: false, text: getApiErrorMessage(err) });
    } finally {
      setProcessing(null);
    }
  };

  const handleAttachAndRefresh = async (recordingId: string) => {
    if (!id) return;
    setProcessing(recordingId);
    try {
      await attachRecordingToBiography(recordingId, id);
      setMessage({ ok: true, text: '录音已关联到本传记' });
      if (userId) {
        await loadRecordings(userId);
        await loadBiography();
      }
    } catch (err) {
      setMessage({ ok: false, text: getApiErrorMessage(err) });
    } finally {
      setProcessing(null);
    }
  };

  const handleAiProcess = async (recordingId: string) => {
    if (!id) return;
    setProcessing(recordingId);
    try {
      await processRecording(id, recordingId);
      setMessage({ ok: true, text: 'AI 整理完成' });
      await loadBiography();
      if (userId) await loadRecordings(userId);
    } catch (err) {
      setMessage({ ok: false, text: getApiErrorMessage(err) });
    } finally {
      setProcessing(null);
    }
  };

  const startEdit = (entry: { id: string; title: string; content: string }) => {
    setEditingId(entry.id);
    setEditTitle(entry.title || '');
    setEditContent(entry.content);
  };

  const saveEdit = async () => {
    if (!id || !editingId) return;
    setSaving(true);
    try {
      await updateBiographyEntry(id, editingId, {
        title: editTitle,
        content: editContent,
      });
      setEditingId(null);
      await loadBiography();
    } finally {
      setSaving(false);
    }
  };

  const goRecord = () => {
    if (id) setBiographyId(id);
  };

  if (!biography) {
    return <p className="text-muted text-center py-12">加载中...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{biography.title}</h1>
        <p className="text-muted mt-1">
          风格: {STYLE_LABELS[biography.style] || biography.style} · 状态: {biography.status}
        </p>
        {biography.description && <p className="text-muted mt-2">{biography.description}</p>}
      </div>

      {message && (
        <div className={message.ok ? 'alert-success' : 'alert-error'} role="status">
          {message.text}
        </div>
      )}

      <section className="card p-6 text-left space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">录音素材</h2>
          <div className="flex gap-2 flex-wrap">
            <Link to="/record" onClick={goRecord} className="btn-primary text-sm py-2 px-4 no-underline">
              新录音
            </Link>
            <Link to={`/archive?bio=${id}`} className="btn-secondary text-sm py-2 px-4 no-underline">
              档案管理
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted">
          将已有录音关联到本传记 → 转文字 → AI 整理，即可生成章节。
        </p>

        {recordings.length === 0 && orphanRecordings.length === 0 ? (
          <p className="text-muted text-sm">暂无录音，请先录制或从档案同步。</p>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div key={rec.id} className="card-muted p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-xs text-muted">{STATUS_LABELS[rec.status] || rec.status}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {rec.status !== 'transcribed' && rec.status !== 'processing' && (
                    <button
                      type="button"
                      onClick={() => handleTranscribe(rec.id)}
                      disabled={processing === rec.id}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      {processing === rec.id ? '转写中...' : '转文字'}
                    </button>
                  )}
                  {(rec.status === 'transcribed' || rec.transcript) && (
                    <button
                      type="button"
                      onClick={() => handleAiProcess(rec.id)}
                      disabled={processing === rec.id}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      {processing === rec.id ? '整理中...' : 'AI 整理'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {orphanRecordings.length > 0 && (
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <p className="text-sm text-muted">未关联的录音（可添加到本传记）：</p>
                {orphanRecordings.map((rec) => (
                  <div key={rec.id} className="card-muted p-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">{rec.title}</p>
                    <button
                      type="button"
                      onClick={() => handleAttachAndRefresh(rec.id)}
                      disabled={processing === rec.id}
                      className="btn-secondary text-sm py-1 px-3"
                    >
                      {processing === rec.id ? '处理中...' : '添加到本传记'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {recordings.length > 0 && (
          <p className="text-xs text-muted">提示：转写完成后点击「AI 整理」将内容写入下方章节。</p>
        )}
      </section>

      {questions.length > 0 && (
        <section className="card p-6 text-left">
          <h2 className="text-lg font-semibold mb-3">AI 建议补充的问题</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <Link to="/record" onClick={goRecord} className="btn-primary inline-block mt-4 no-underline text-sm py-2 px-4">
            继续录音补充
          </Link>
        </section>
      )}

      <section className="card p-6 text-left space-y-6">
        <h2 className="text-lg font-semibold">传记章节</h2>
        {biography.entries.length === 0 ? (
          <p className="text-muted">尚无章节。请转写录音并进行 AI 整理，或继续录音。</p>
        ) : (
          biography.entries.map((entry) => (
            <article key={entry.id} className="border-b border-[var(--border)] pb-6 last:border-0">
              {editingId === entry.id ? (
                <div className="space-y-3">
                  <input className="input-field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="章节标题" />
                  <textarea className="input-field min-h-[200px]" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} disabled={saving} className="btn-primary text-sm py-2 px-4">
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-2 px-4">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-medium text-lg mb-2">{entry.title || '未命名章节'}</h3>
                    <button type="button" onClick={() => startEdit(entry)} className="btn-secondary text-sm py-1 px-3 shrink-0">
                      编辑
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-muted">{entry.content}</div>
                </>
              )}
            </article>
          ))
        )}
      </section>

      <button
        type="button"
        onClick={handleGenerateBook}
        disabled={generating || biography.entries.length === 0}
        className="btn-primary w-full py-4 text-lg disabled:opacity-50"
      >
        {generating ? '正在生成书籍...' : '生成完整书籍 (PDF)'}
      </button>
    </div>
  );
}
