import { useState } from 'react';
import { createBiography } from '../services/api';

const STYLES = [
  { id: 'story', label: '故事体', desc: '引人入胜，注重情节' },
  { id: 'lyrical', label: '抒情体', desc: '优美散文，情感细腻' },
  { id: 'rigorous', label: '纪实体', desc: '客观严谨，事实准确' },
  { id: 'chronological', label: '时间线', desc: '按年代顺序记录' },
];

const RECORDING_METHODS = [
  { id: 'guided', label: '引导式问答', desc: 'AI 逐步引导回忆' },
  { id: 'free', label: '自由叙述', desc: '随意讲述，不打断' },
  { id: 'timeline', label: '按时间线', desc: '从童年到当下逐段' },
];

const LIFE_EVENTS = ['童年', '求学', '工作', '婚姻', '子女', '退休', '旅行', '爱好'];

interface CreateBiographyModalProps {
  userId: string;
  onClose: () => void;
  onCreated: (bio: { id: string; title: string; status: string }) => void;
  onStartRecording: (bioId: string) => void;
  onViewWorks: () => void;
}

export default function CreateBiographyModal({
  userId,
  onClose,
  onCreated,
  onStartRecording,
  onViewWorks,
}: CreateBiographyModalProps) {
  const [title, setTitle] = useState('我的人生故事');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('story');
  const [recordingMethod, setRecordingMethod] = useState('guided');
  const [birthYear, setBirthYear] = useState('');
  const [hometown, setHometown] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [customEvent, setCustomEvent] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdBio, setCreatedBio] = useState<{ id: string; title: string; status: string } | null>(
    null,
  );

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const keyEvents = [...selectedEvents];
      if (customEvent.trim()) keyEvents.push(customEvent.trim());

      const bio = await createBiography({
        userId,
        title: title.trim(),
        style,
        description: description.trim() || undefined,
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
        hometown: hometown.trim() || undefined,
        keyEvents: keyEvents.length > 0 ? keyEvents : undefined,
        recordingMethod,
      });
      onCreated(bio);
      setCreatedBio(bio);
    } finally {
      setCreating(false);
    }
  };

  if (createdBio) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="card w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">传记已创建</h2>
          <p className="text-muted mb-6">
            「{createdBio.title}」已加入您的作品库。下一步：开始录音讲述故事。
          </p>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => onStartRecording(createdBio.id)} className="btn-primary">
              立即录音
            </button>
            <button type="button" onClick={onViewWorks} className="btn-secondary">
              查看作品库
            </button>
            <button type="button" onClick={onClose} className="text-sm text-muted bg-transparent border-none cursor-pointer">
              稍后再说
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="card w-full max-w-lg p-6 my-8">
        <h2 className="text-xl font-semibold mb-4">新建传记</h2>

        <label className="block text-sm text-muted mb-1">传记标题</label>
        <input
          className="input-field mb-4"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="我的人生故事"
        />

        <label className="block text-sm text-muted mb-1">故事梗概</label>
        <textarea
          className="input-field mb-4 min-h-[80px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简要描述您想记录的人生主题..."
        />

        <label className="block text-sm text-muted mb-2">写作风格</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`p-3 rounded-lg text-left border transition-colors ${
                style === s.id ? 'border-[var(--accent-tech)] bg-[var(--bg-surface-hover)]' : 'border-[var(--border)]'
              }`}
            >
              <p className="font-medium">{s.label}</p>
              <p className="text-sm text-muted">{s.desc}</p>
            </button>
          ))}
        </div>

        <label className="block text-sm text-muted mb-2">记录方法</label>
        <div className="space-y-2 mb-4">
          {RECORDING_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setRecordingMethod(m.id)}
              className={`w-full p-3 rounded-lg text-left border transition-colors ${
                recordingMethod === m.id ? 'border-[var(--accent-tech)] bg-[var(--bg-surface-hover)]' : 'border-[var(--border)]'
              }`}
            >
              <p className="font-medium">{m.label}</p>
              <p className="text-sm text-muted">{m.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm text-muted mb-1">出生年份</label>
            <input
              className="input-field"
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="1950"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">籍贯</label>
            <input
              className="input-field"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
              placeholder="浙江杭州"
            />
          </div>
        </div>

        <label className="block text-sm text-muted mb-2">关键人生阶段</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {LIFE_EVENTS.map((event) => (
            <button
              key={event}
              type="button"
              onClick={() => toggleEvent(event)}
              className={`px-3 py-1 rounded-full text-sm border ${
                selectedEvents.includes(event)
                  ? 'border-[var(--accent-warm)] bg-[var(--bg-surface-hover)]'
                  : 'border-[var(--border)]'
              }`}
            >
              {event}
            </button>
          ))}
        </div>
        <input
          className="input-field mb-6"
          value={customEvent}
          onChange={(e) => setCustomEvent(e.target.value)}
          placeholder="其他想记录的主题..."
        />

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={creating}>
            取消
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="btn-primary"
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
