import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listBiographies, getUserSettings } from '../services/api';
import { useAppStore } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';
import CreateBiographyModal from '../components/CreateBiographyModal';

export default function Home() {
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const { userId, setUserId, biographyId, setBiographyId, userName, offlineMode } = useAppStore();
  const [biographies, setBiographies] = useState<
    Array<{ id: string; title: string; status: string; description?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiConfigHint, setShowAiConfigHint] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const id = userId || (await requireAuth());
        if (!userId) setUserId(id);
        const list = await listBiographies(id);
        setBiographies(list);
        if (list.length > 0 && !biographyId) {
          setBiographyId(list[0].id);
        }
        if (!offlineMode) {
          const settings = await getUserSettings(id);
          const needsAiConfig =
            !settings.llm_api_key_set &&
            settings.llm_provider !== 'mock' &&
            settings.stt_provider !== 'mock';
          setShowAiConfigHint(needsAiConfig);
        }
      } catch {
        /* redirect to login */
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, setUserId, setBiographyId, biographyId, requireAuth, offlineMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted">加载中...</p>
      </div>
    );
  }

  const recentBiographies = biographies.slice(0, 3);

  return (
    <div className="space-y-8">
      {userName && (
        <p className="text-muted">欢迎，{userName}</p>
      )}

      {showAiConfigHint && (
        <div className="card-muted p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            您已选择云端 AI 服务，但尚未配置 API Key。录音转写与整理需要先完成设置。
          </p>
          <Link to="/settings" className="btn-secondary text-sm py-2 px-4 no-underline shrink-0">
            去配置 AI
          </Link>
        </div>
      )}

      <section className="card p-8 text-left">
        <h2 className="text-xl font-semibold mb-4">开始您的传记</h2>
        <p className="text-muted mb-6 leading-relaxed">
          {offlineMode
            ? '纯离线模式：录音与传记均保存在本机浏览器，无需网络与服务器。'
            : '随时录音讲述人生故事，AI 会帮您整理成书。录音自动保存在本地，不会丢失。'}
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/record" className="btn-primary inline-block no-underline">
            开始录音
          </Link>
          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-secondary">
            新建传记
          </button>
        </div>
      </section>

      {biographies.length > 0 && (
        <section className="card p-8 text-left">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold">最近作品</h2>
            <Link to="/books" className="text-accent text-sm no-underline">
              查看全部作品 →
            </Link>
          </div>
          <ul className="space-y-3">
            {recentBiographies.map((bio) => (
              <li key={bio.id} className="card-muted flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{bio.title}</p>
                  {bio.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-1">{bio.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/biography/${bio.id}`} className="btn-primary text-sm py-2 px-4 no-underline">
                    查看
                  </Link>
                  <Link
                    to="/record"
                    onClick={() => setBiographyId(bio.id)}
                    className="btn-secondary text-sm py-2 px-4 no-underline"
                  >
                    继续录音
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showCreateModal && (
        <CreateBiographyModal
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(bio) => {
            setBiographies((prev) => [...prev, bio]);
            setBiographyId(bio.id);
          }}
          onStartRecording={(bioId) => {
            setShowCreateModal(false);
            setBiographyId(bioId);
            navigate('/record');
          }}
          onViewWorks={() => {
            setShowCreateModal(false);
            navigate('/books');
          }}
        />
      )}
    </div>
  );
}
