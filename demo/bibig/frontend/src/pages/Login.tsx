import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import { useAppStore } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { startDemo, startOffline } = useAuth();
  const { setUserId, setUserName, setUserEmail, setAuthenticated, setOfflineMode } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setOfflineMode(false);
      if (mode === 'register') {
        await register(name, email, password);
      }
      const user = await login(email, password);
      localStorage.setItem('bibig-password', password);
      setUserId(user.id);
      setUserName(user.name);
      setUserEmail(email);
      setAuthenticated(true);
      navigate('/');
    } catch {
      setError(mode === 'login' ? '登录失败，请检查邮箱和密码' : '注册失败，邮箱可能已被使用');
    } finally {
      setLoading(false);
    }
  };

  const handleOffline = async () => {
    setLoading(true);
    try {
      await startOffline();
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await startDemo();
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-accent mb-2">BiBiG 人生传记</h1>
        <p className="text-muted mb-6">{mode === 'login' ? '登录您的账户' : '创建新账户'}</p>

        <button
          type="button"
          onClick={handleOffline}
          disabled={loading}
          className="btn-primary w-full mb-4"
        >
          纯离线模式（无需服务器）
        </button>
        <p className="text-xs text-muted text-center mb-6">
          数据保存在本机浏览器，录音存 IndexedDB，可导出备份
        </p>

        <div className="border-t border-[var(--border)] pt-6">
          <p className="text-sm text-muted mb-4 text-center">或使用在线模式（需后端服务）</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-muted mb-1">姓名</label>
                <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="block text-sm text-muted mb-1">邮箱</label>
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">密码</label>
              <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <div className="alert-warning">{error}</div>}

            <button type="submit" className="btn-secondary w-full" disabled={loading}>
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <button type="button" onClick={handleDemo} disabled={loading} className="btn-secondary w-full mt-3">
            在线演示模式
          </button>
        </div>

        <p className="text-center text-muted mt-6 text-sm">
          {mode === 'login' ? '还没有账户？' : '已有账户？'}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-accent ml-2 bg-transparent border-none cursor-pointer underline"
          >
            {mode === 'login' ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
