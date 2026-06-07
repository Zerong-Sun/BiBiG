import { useEffect, useState } from 'react';
import {
  getUserSettings,
  updateUserSettings,
  testLLMConnection,
  testSTTConnection,
  checkBackendHealth,
  exportOfflineBackup,
  importOfflineBackup,
  getApiErrorMessage,
} from '../services/api';
import { useAppStore } from '../hooks/useAppStore';
import { useTheme, type ThemeId } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { TestResultBanner, type TestResult } from '../components/TestResultBanner';

const STT_PROVIDERS = [
  { id: 'mock', label: 'Mock（测试用，返回示例文字）' },
  { id: 'whisper_local', label: '本地 Whisper（免费，需安装）' },
  { id: 'openai_api', label: 'OpenAI Whisper API（云端，按量计费）' },
];

const OPENAI_WHISPER_PRESET = {
  stt_provider: 'openai_api',
  stt_base_url: 'https://api.openai.com/v1',
};

const DEEPSEEK_PRESET = {
  llm_provider: 'openai_compatible',
  llm_base_url: 'https://api.deepseek.com/v1',
  llm_model: 'deepseek-v4-flash',
};

const LLM_PROVIDERS = [
  { id: 'mock', label: 'Mock（开发模式）' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openai_compatible', label: 'OpenAI 兼容（DeepSeek 等）' },
  { id: 'claude', label: 'Claude' },
];

const STYLES = [
  { id: 'story', label: '故事体' },
  { id: 'lyrical', label: '抒情体' },
  { id: 'rigorous', label: '纪实体' },
  { id: 'chronological', label: '时间线' },
];

const THEMES: { id: ThemeId; label: string; desc: string }[] = [
  { id: 'ink', label: '墨韵流光', desc: '深色科技 + 暖色人文' },
  { id: 'paper', label: '纸墨新生', desc: '宣纸质感 + 现代极简' },
  { id: 'star', label: '星河记忆', desc: '深空渐变 + 星光粒子' },
];

function applySettingsToState(
  settings: Awaited<ReturnType<typeof getUserSettings>>,
  setters: {
    setSttProvider: (v: string) => void;
    setSttBaseUrl: (v: string) => void;
    setSttApiKeySet: (v: boolean) => void;
    setSttApiKeyMasked: (v: string | null) => void;
    setLlmProvider: (v: string) => void;
    setLlmBaseUrl: (v: string) => void;
    setLlmModel: (v: string) => void;
    setLlmApiKeySet: (v: boolean) => void;
    setLlmApiKeyMasked: (v: string | null) => void;
    setDefaultStyle: (v: string) => void;
    setDefaultQuestionMode: (v: string) => void;
    setTheme: (v: ThemeId) => void;
  },
) {
  setters.setSttProvider(settings.stt_provider);
  setters.setSttBaseUrl(settings.stt_base_url || '');
  setters.setSttApiKeySet(settings.stt_api_key_set);
  setters.setSttApiKeyMasked(settings.stt_api_key_masked);
  setters.setLlmProvider(settings.llm_provider);
  setters.setLlmBaseUrl(settings.llm_base_url || '');
  setters.setLlmModel(settings.llm_model || 'gpt-4o');
  setters.setLlmApiKeySet(settings.llm_api_key_set);
  setters.setLlmApiKeyMasked(settings.llm_api_key_masked);
  setters.setDefaultStyle(settings.default_style);
  setters.setDefaultQuestionMode(settings.default_question_mode);
  if (settings.theme) setters.setTheme(settings.theme as ThemeId);
}

export default function Settings() {
  const navigate = useNavigate();
  const { requireAuth, signOut, startOffline, startDemo } = useAuth();
  const { userId, setUserId, offlineMode, setOfflineMode } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);
  const [testingStt, setTestingStt] = useState(false);
  const [message, setMessage] = useState('');
  const [llmTestResult, setLlmTestResult] = useState<TestResult>(null);
  const [sttTestResult, setSttTestResult] = useState<TestResult>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [sttProvider, setSttProvider] = useState('mock');
  const [sttApiKey, setSttApiKey] = useState('');
  const [sttBaseUrl, setSttBaseUrl] = useState('');
  const [sttApiKeySet, setSttApiKeySet] = useState(false);
  const [sttApiKeyMasked, setSttApiKeyMasked] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState('mock');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModel, setLlmModel] = useState('gpt-4o');
  const [llmApiKeySet, setLlmApiKeySet] = useState(false);
  const [llmApiKeyMasked, setLlmApiKeyMasked] = useState<string | null>(null);
  const [defaultStyle, setDefaultStyle] = useState('story');
  const [defaultQuestionMode, setDefaultQuestionMode] = useState('ai');

  useEffect(() => {
    (async () => {
      try {
        const id = userId || (await requireAuth());
        if (!userId) setUserId(id);
        const settings = await getUserSettings(id);
        applySettingsToState(settings, {
          setSttProvider,
          setSttBaseUrl,
          setSttApiKeySet,
          setSttApiKeyMasked,
          setLlmProvider,
          setLlmBaseUrl,
          setLlmModel,
          setLlmApiKeySet,
          setLlmApiKeyMasked,
          setDefaultStyle,
          setDefaultQuestionMode,
          setTheme,
        });
        if (!offlineMode) {
          setBackendOnline(await checkBackendHealth());
        }
      } catch (err) {
        setMessage(`加载设置失败：${getApiErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, setUserId, setTheme, requireAuth, offlineMode]);

  const applyDeepSeekPreset = () => {
    setLlmProvider(DEEPSEEK_PRESET.llm_provider);
    setLlmBaseUrl(DEEPSEEK_PRESET.llm_base_url);
    setLlmModel(DEEPSEEK_PRESET.llm_model);
    setSttProvider('mock');
    setMessage('已填入 DeepSeek LLM 配置（deepseek-v4-flash），STT 已设为 Mock。请填写 DeepSeek API Key 并测试 LLM 连接。');
  };

  const applyWhisperPreset = () => {
    setSttProvider(OPENAI_WHISPER_PRESET.stt_provider);
    setSttBaseUrl(OPENAI_WHISPER_PRESET.stt_base_url);
    setMessage('已填入 OpenAI Whisper 配置。请填写 OpenAI API Key（与 DeepSeek Key 不同），保存后测试 STT。');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, string> = {
        stt_provider: sttProvider,
        stt_base_url: sttBaseUrl,
        llm_provider: llmProvider,
        llm_base_url: llmBaseUrl,
        llm_model: llmModel,
        default_style: defaultStyle,
        default_question_mode: defaultQuestionMode,
        theme,
      };
      if (sttApiKey) payload.stt_api_key = sttApiKey;
      if (llmApiKey) payload.llm_api_key = llmApiKey;
      const updated = await updateUserSettings(userId, payload);
      applySettingsToState(updated, {
        setSttProvider,
        setSttBaseUrl,
        setSttApiKeySet,
        setSttApiKeyMasked,
        setLlmProvider,
        setLlmBaseUrl,
        setLlmModel,
        setLlmApiKeySet,
        setLlmApiKeyMasked,
        setDefaultStyle,
        setDefaultQuestionMode,
        setTheme,
      });
      setMessage('设置已保存');
      setSttApiKey('');
      setLlmApiKey('');
    } catch (err) {
      setMessage(`保存失败：${getApiErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestLLM = async () => {
    setTestingLlm(true);
    setLlmTestResult(null);
    if (!offlineMode) {
      const online = await checkBackendHealth();
      setBackendOnline(online);
      if (!online) {
        setLlmTestResult({
          ok: false,
          message: '后端服务未连接。请先启动 backend（端口 8000 或 docker compose up）',
        });
        setTestingLlm(false);
        return;
      }
    }
    try {
      const result = await testLLMConnection({
        api_key: llmApiKey || undefined,
        base_url: llmBaseUrl || undefined,
        model: llmModel,
        provider: llmProvider,
      });
      setLlmTestResult({
        ok: result.success,
        message: result.success ? result.message : result.message,
      });
    } catch (err) {
      setLlmTestResult({ ok: false, message: getApiErrorMessage(err) });
    } finally {
      setTestingLlm(false);
    }
  };

  const handleTestSTT = async () => {
    setTestingStt(true);
    setSttTestResult(null);
    try {
      const result = await testSTTConnection({
        api_key: sttApiKey || undefined,
        base_url: sttBaseUrl || undefined,
        provider: sttProvider,
      });
      setSttTestResult({
        ok: result.success,
        message: result.message,
      });
    } catch (err) {
      setSttTestResult({ ok: false, message: getApiErrorMessage(err) });
    } finally {
      setTestingStt(false);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const handleExportBackup = async () => {
    const json = await exportOfflineBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibig-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('备份已下载');
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importOfflineBackup(text);
        setMessage('备份已恢复');
      } catch {
        setMessage('导入失败，请检查文件格式');
      }
    };
    input.click();
  };

  const switchToOffline = async () => {
    await startOffline();
    setMessage('已切换为纯离线模式');
    navigate(0);
  };

  const switchToOnline = async () => {
    setOfflineMode(false);
    await startDemo();
    setMessage('已切换为在线演示模式');
    navigate(0);
  };

  if (loading) {
    return <p className="text-muted text-center py-12">加载中...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">设置</h1>

      {message && (
        <div className={message.includes('失败') ? 'alert-error' : 'alert-success'} role="status">
          {message}
        </div>
      )}

      {!offlineMode && backendOnline === false && (
        <div className="alert-error" role="alert">
          后端服务未连接。LLM 测试与云端转写需要 backend 运行中（端口 8000，或执行 docker compose up）。
        </div>
      )}

      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">运行模式</h2>
        <p className="text-sm text-muted">
          {offlineMode
            ? '当前为纯离线模式：不连接服务器，所有数据存在本机浏览器。转写需手动输入文字。'
            : '当前为在线模式：需要后端服务，可使用 AI 转写与整理。'}
        </p>
        <div className="flex flex-wrap gap-3">
          {!offlineMode && (
            <button type="button" onClick={switchToOffline} className="btn-primary">
              切换为纯离线
            </button>
          )}
          {offlineMode && (
            <button type="button" onClick={switchToOnline} className="btn-secondary">
              切换为在线模式
            </button>
          )}
          {offlineMode && (
            <>
              <button type="button" onClick={handleExportBackup} className="btn-secondary">
                导出备份
              </button>
              <button type="button" onClick={handleImportBackup} className="btn-secondary">
                导入备份
              </button>
            </>
          )}
        </div>
      </section>

      {!offlineMode && (
      <>
      <section className="card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">AI 服务（LLM）</h2>
          <button type="button" onClick={applyDeepSeekPreset} className="btn-secondary text-sm py-1 px-3">
            填入 DeepSeek 预设
          </button>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">提供商</label>
          <select className="input-field" value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
            {LLM_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">API Key（留空则不修改）</label>
          <input className="input-field" type="password" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-..." />
          <p className="text-xs text-muted mt-1">
            {llmApiKeySet && llmApiKeyMasked
              ? `已保存：${llmApiKeyMasked}`
              : '未配置 API Key'}
          </p>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Base URL</label>
          <input className="input-field" value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1" />
          <p className="text-xs text-muted mt-1">DeepSeek 填 https://api.deepseek.com/v1，不要加 /chat/completions</p>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Model</label>
          <input className="input-field" value={llmModel} onChange={(e) => setLlmModel(e.target.value)} placeholder="gpt-4o" />
        </div>
        <p className="text-xs text-muted mt-2">
          DeepSeek 仅用于文字整理（LLM）。语音转写（STT）需使用 Mock 或 OpenAI Whisper，不能填 DeepSeek 地址。
        </p>
        <button type="button" onClick={handleTestLLM} disabled={testingLlm} className="btn-secondary">
          {testingLlm ? '测试中...' : '测试 LLM 连接'}
        </button>
        <TestResultBanner result={llmTestResult} />
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">语音转写（STT）</h2>
          <button type="button" onClick={applyWhisperPreset} className="btn-secondary text-sm py-1 px-3">
            填入 OpenAI Whisper 预设
          </button>
        </div>
        <div className="card-muted p-3 text-xs text-muted space-y-1 text-left">
          <p><strong className="text-[var(--text-primary)]">DeepSeek 没有 STT</strong>，不能把 DeepSeek Key/地址填在这里。</p>
          <p>· <strong>Mock</strong>：测试流程，返回固定示例文字，无需 Key</p>
          <p>· <strong>OpenAI Whisper API</strong>：真实转写，需 OpenAI API Key</p>
          <p>· <strong>本地 Whisper</strong>：免费离线转写，backend 需执行 <code>pip install openai-whisper</code> 并安装 ffmpeg</p>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">模式</label>
          <select className="input-field" value={sttProvider} onChange={(e) => setSttProvider(e.target.value)}>
            {STT_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        {sttProvider === 'openai_api' && (
          <>
            <div>
              <label className="block text-sm text-muted mb-1">OpenAI API Key（留空则不修改）</label>
              <input className="input-field" type="password" value={sttApiKey} onChange={(e) => setSttApiKey(e.target.value)} placeholder="sk-..." />
              <p className="text-xs text-muted mt-1">
                {sttApiKeySet && sttApiKeyMasked
                  ? `已保存：${sttApiKeyMasked}`
                  : '使用 OpenAI 账号的 Key，不是 DeepSeek Key'}
              </p>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Base URL</label>
              <input className="input-field" value={sttBaseUrl} onChange={(e) => setSttBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
          </>
        )}
        {sttProvider === 'whisper_local' && (
          <p className="text-xs text-muted">
            首次使用需在 backend 目录安装：<code>pip install openai-whisper</code>，系统需有 ffmpeg。转写在服务器本机运行，无需 API Key。
          </p>
        )}
        {sttProvider === 'mock' && (
          <p className="text-xs text-muted">
            Mock 模式会返回示例转写文字，适合验证「上传 → 转写 → AI 整理」流程，不能替代真实语音识别。
          </p>
        )}
        <button type="button" onClick={handleTestSTT} disabled={testingStt} className="btn-secondary">
          {testingStt ? '测试中...' : '测试 STT 连接'}
        </button>
        <TestResultBanner result={sttTestResult} />
      </section>
      </>
      )}

      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">传记偏好</h2>
        <div>
          <label className="block text-sm text-muted mb-1">默认写作风格</label>
          <select className="input-field" value={defaultStyle} onChange={(e) => setDefaultStyle(e.target.value)}>
            {STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">默认问答模式</label>
          <select className="input-field" value={defaultQuestionMode} onChange={(e) => setDefaultQuestionMode(e.target.value)}>
            <option value="ai">AI 自动生成</option>
            <option value="synopsis">从梗概提取</option>
            <option value="template">人生阶段模板</option>
            <option value="custom">自定义问题</option>
          </select>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">外观主题</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`p-4 rounded-lg text-left border transition-colors ${
                theme === t.id ? 'border-[var(--accent-tech)]' : 'border-[var(--border)]'
              }`}
            >
              <p className="font-medium">{t.label}</p>
              <p className="text-sm text-muted">{t.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold">账户</h2>
        <button type="button" onClick={handleLogout} className="btn-secondary">退出登录</button>
      </section>

      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? '保存中...' : '保存所有设置'}
      </button>
    </div>
  );
}
