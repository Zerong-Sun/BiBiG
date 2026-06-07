import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AudioRecorder from '../components/AudioRecorder';
import ChatInterface from '../components/ChatInterface';
import {
  uploadRecording,
  transcribeRecording,
  updateTranscript,
  getSuggestedQuestions,
  saveAnswer,
  processRecording,
  getBiography,
  listBiographies,
  getApiErrorMessage,
} from '../services/api';
import { useAppStore, isOfflineMode } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';

type Step = 'prep' | 'record' | 'transcribe' | 'organize' | 'chat' | 'processing';

const STEP_LABELS = ['准备', '录音', '转写', '整理', '对话'];

const METHOD_LABELS: Record<string, string> = {
  guided: '引导式问答',
  free: '自由叙述',
  timeline: '按时间线',
};

const STYLE_LABELS: Record<string, string> = {
  story: '故事体',
  lyrical: '抒情体',
  rigorous: '纪实体',
  chronological: '时间线',
};

export default function Recording() {
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const { userId, setUserId, biographyId, setBiographyId } = useAppStore();
  const [step, setStep] = useState<Step>('prep');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionMode, setQuestionMode] = useState('ai');
  const [error, setError] = useState<string | null>(null);
  const [processingMsg, setProcessingMsg] = useState('');
  const [biographies, setBiographies] = useState<Array<{ id: string; title: string }>>([]);
  const [bioInfo, setBioInfo] = useState<{
    title?: string;
    description?: string;
    style?: string;
    key_events?: string[];
    recording_method?: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    (async () => {
      try {
        const id = userId || (await requireAuth());
        if (!userId) setUserId(id);
        const list = await listBiographies(id);
        setBiographies(list);
        if (biographyId) {
          const bio = await getBiography(biographyId);
          setBioInfo(bio);
        }
      } catch {
        /* redirect handled by requireAuth */
      }
    })();
  }, [userId, setUserId, biographyId, requireAuth]);

  const loadBiography = async (id: string) => {
    setBiographyId(id);
    const bio = await getBiography(id);
    setBioInfo(bio);
  };

  const handleRecordingComplete = async (blob: Blob, localRecordingId: string) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(blob));
    setStep('processing');
    setProcessingMsg(isOfflineMode() ? '正在保存到本地...' : '正在上传并转写...');
    setError(null);

    let uploadedId: string | null = null;

    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.wav');
      formData.append('recording_id', localRecordingId);
      formData.append('user_id', userId);
      if (biographyId) formData.append('biography_id', biographyId);

      const uploadResult = await uploadRecording(formData, {
        autoTranscribe: !isOfflineMode(),
      });
      const rid = uploadResult.id as string;
      uploadedId = rid;
      setRecordingId(rid);

      if (isOfflineMode()) {
        setProcessingMsg('请准备输入转写文字...');
        const transcribeResult = await transcribeRecording(rid);
        setTranscript(transcribeResult.transcript || '');
        setSegments(transcribeResult.segments || []);
        setStep('transcribe');
        return;
      }

      if (uploadResult.transcript != null && uploadResult.status === 'transcribed') {
        setTranscript(uploadResult.transcript || '');
        setSegments(uploadResult.segments || []);
        setStep('transcribe');
        return;
      }

      if (uploadResult.transcribe_error) {
        const errMsg =
          typeof uploadResult.transcribe_error === 'object'
            ? uploadResult.transcribe_error.message
            : String(uploadResult.transcribe_error);
        setError(`${errMsg}。您仍可手动输入转写文字，或前往设置页配置 STT。`);
        setStep('transcribe');
        return;
      }

      setProcessingMsg('正在转写语音...');
      const transcribeResult = await transcribeRecording(rid);
      setTranscript(transcribeResult.transcript || '');
      setSegments(transcribeResult.segments || []);
      setStep('transcribe');
    } catch (err) {
      console.error(err);
      const msg = getApiErrorMessage(err);
      if (uploadedId) {
        setRecordingId(uploadedId);
        setError(`${msg}。您仍可手动输入转写文字，或前往设置页配置 STT。`);
        setStep('transcribe');
      } else {
        setError(
          isOfflineMode()
            ? '保存失败，录音仍在本地列表中'
            : `${msg}。录音已保存在本地，可稍后从档案页同步。`,
        );
        setStep('record');
      }
    }
  };

  const handleConfirmTranscript = async () => {
    if (!recordingId) return;
    setStep('processing');
    setProcessingMsg('正在保存转写文本...');

    try {
      await updateTranscript(recordingId, transcript);

      if (biographyId) {
        setProcessingMsg(isOfflineMode() ? '正在整理传记...' : 'AI 正在整理传记...');
        await processRecording(biographyId, recordingId, transcript);
        const mode = bioInfo?.recording_method === 'timeline' ? 'template' : questionMode;
        const questionsResult = await getSuggestedQuestions(biographyId, mode);
        setQuestions(questionsResult.questions);
      } else {
        setQuestions([
          '您小时候最难忘的一件事是什么？',
          '能说说您的家人吗？',
          '您想对后辈说些什么？',
        ]);
      }
      setStep('chat');
    } catch (err) {
      console.error(err);
      setError(
        isOfflineMode()
          ? '整理失败，请确保已输入转写文字'
          : `${getApiErrorMessage(err)}。请检查设置页中的 LLM 配置。`,
      );
      setStep('transcribe');
    }
  };

  const handleAnswer = async (questionId: number, answer: string) => {
    if (biographyId) {
      await saveAnswer(biographyId, questionId, answer, recordingId || undefined);
    }
  };

  const handleChatComplete = () => {
    if (biographyId) navigate(`/biography/${biographyId}`);
  };

  const stepIndex: Record<Step, number> = {
    prep: 0,
    record: 1,
    transcribe: 2,
    organize: 3,
    chat: 4,
    processing: 1,
  };

  const currentIdx = stepIndex[step];
  const suggestedTopic =
    bioInfo?.key_events && bioInfo.key_events.length > 0
      ? bioInfo.key_events[0]
      : null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">开始记录您的故事</h1>

      <div className="flex flex-wrap justify-center gap-4">
        {STEP_LABELS.map((label, idx) => (
          <div
            key={label}
            className={`flex items-center gap-2 ${idx === currentIdx ? 'step-active' : 'step-inactive'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                idx < currentIdx ? 'step-dot-done' : idx === currentIdx ? 'step-dot-active' : 'step-dot-pending'
              }`}
            >
              {idx + 1}
            </div>
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="alert-warning">
          {error}
          {!isOfflineMode() && error.includes('STT') && (
            <>
              {' '}
              <Link to="/settings" className="text-accent underline">去设置页</Link>
            </>
          )}
          {!isOfflineMode() && error.includes('设置页') && !error.includes('STT') && (
            <>
              {' '}
              <Link to="/settings" className="text-accent underline">去设置页</Link>
            </>
          )}
        </div>
      )}

      {step === 'prep' && (
        <div className="card p-6 space-y-6 text-left">
          <h2 className="text-lg font-semibold">录音准备</h2>

          <div>
            <label className="block text-sm text-muted mb-2">选择传记</label>
            {biographies.length === 0 ? (
              <p className="text-muted">
                还没有传记，请先在
                <Link to="/" className="text-accent mx-1">首页</Link>
                创建
              </p>
            ) : (
              <select
                className="input-field"
                value={biographyId || ''}
                onChange={(e) => loadBiography(e.target.value)}
              >
                <option value="">不关联传记（仅录音）</option>
                {biographies.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            )}
          </div>

          {bioInfo && biographyId && (
            <div className="card-muted p-4 space-y-2">
              {bioInfo.description && (
                <p><span className="text-muted">梗概：</span>{bioInfo.description}</p>
              )}
              <p>
                <span className="text-muted">风格：</span>
                {STYLE_LABELS[bioInfo.style || 'story'] || bioInfo.style}
                {' · '}
                <span className="text-muted">方式：</span>
                {METHOD_LABELS[bioInfo.recording_method || 'guided'] || bioInfo.recording_method}
              </p>
              {bioInfo.key_events && bioInfo.key_events.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {bioInfo.key_events.map((ev) => (
                    <span key={ev} className="px-2 py-1 rounded-full text-sm border border-[var(--border)]">
                      {ev}
                    </span>
                  ))}
                </div>
              )}
              {suggestedTopic && (
                <p className="text-accent mt-2">建议从「{suggestedTopic}」开始讲述</p>
              )}
            </div>
          )}

          <button type="button" onClick={() => setStep('record')} className="btn-primary w-full">
            开始录音
          </button>
        </div>
      )}

      {step === 'record' && (
        <>
          {suggestedTopic && (
            <div className="card p-4 text-accent text-center">建议话题：{suggestedTopic}</div>
          )}
          <AudioRecorder onRecordingComplete={handleRecordingComplete} biographyId={biographyId || undefined} />
          <button type="button" onClick={() => setStep('prep')} className="btn-secondary w-full">
            返回准备
          </button>
        </>
      )}

      {step === 'transcribe' && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">转写预览</h2>
          <p className="text-sm text-muted">
            {isOfflineMode()
              ? '离线模式无自动转写，请收听录音后手动输入或粘贴文字'
              : '请检查并修正转写文本，确认后提交 AI 整理'}
          </p>

          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />
          )}

          {segments.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {segments.map((seg, i) => (
                <div key={i} className="card-muted p-2 text-sm text-left">
                  <span className="text-accent">{Math.floor(seg.start)}s - {Math.floor(seg.end)}s</span>
                  <span className="ml-2">{seg.text}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="input-field min-h-[200px]"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isOfflineMode() ? '在此输入您讲述的内容...' : undefined}
          />

          <button type="button" onClick={handleConfirmTranscript} className="btn-primary w-full">
            {isOfflineMode() ? '确认并整理传记' : '确认并提交 AI 整理'}
          </button>
        </div>
      )}

      {step === 'chat' && (
        <ChatInterface
          questions={questions}
          onAnswer={handleAnswer}
          onComplete={handleChatComplete}
          questionMode={questionMode}
          onQuestionModeChange={setQuestionMode}
          biographyId={biographyId || undefined}
        />
      )}

      {step === 'processing' && (
        <div className="card p-12 text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-muted">{processingMsg || '正在处理...'}</p>
        </div>
      )}
    </div>
  );
}
