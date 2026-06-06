import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ensureDemoUser,
  listBiographies,
  createBiography,
} from '../services/api';
import { useAppStore } from '../hooks/useAppStore';

export default function Home() {
  const { userId, setUserId, biographyId, setBiographyId } = useAppStore();
  const [biographies, setBiographies] = useState<
    Array<{ id: string; title: string; status: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('我的人生故事');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await ensureDemoUser();
      setUserId(id);
      const list = await listBiographies(id);
      setBiographies(list);
      if (list.length > 0 && !biographyId) {
        setBiographyId(list[0].id);
      }
      setLoading(false);
    })();
  }, [setUserId, setBiographyId, biographyId]);

  const handleCreateBiography = async () => {
    const title = newTitle.trim();
    if (!title) return;

    setCreating(true);
    try {
      const bio = await createBiography(userId, title);
      setBiographies((prev) => [...prev, bio]);
      setBiographyId(bio.id);
      setShowCreateModal(false);
      setNewTitle('我的人生故事');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-700">BiBiG 人生传记</h1>
          <span className="text-gray-500 text-sm">为长辈记录一生</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <section className="bg-white rounded-2xl shadow-lg p-8 text-left">
          <h2 className="text-xl font-semibold mb-4">开始您的传记</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            随时录音讲述人生故事，AI 会帮您整理成书。录音自动保存在本地，不会丢失。
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/record"
              className="px-8 py-4 bg-blue-500 text-white rounded-xl text-lg hover:bg-blue-600"
            >
              开始录音
            </Link>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 border border-blue-500 text-blue-600 rounded-xl text-lg hover:bg-blue-50"
            >
              新建传记
            </button>
          </div>
        </section>

        {biographies.length > 0 && (
          <section className="bg-white rounded-2xl shadow-lg p-8 text-left">
            <h2 className="text-xl font-semibold mb-4">我的传记</h2>
            <ul className="space-y-3">
              {biographies.map((bio) => (
                <li
                  key={bio.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium">{bio.title}</p>
                    <p className="text-sm text-gray-500">状态: {bio.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/biography/${bio.id}`}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg"
                    >
                      查看
                    </Link>
                    <Link
                      to="/record"
                      onClick={() => setBiographyId(bio.id)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      继续录音
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">新建传记</h2>
            <label className="block text-sm text-gray-600 mb-2" htmlFor="biography-title">
              传记标题
            </label>
            <input
              id="biography-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBiography()}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="我的人生故事"
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle('我的人生故事');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                disabled={creating}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateBiography}
                disabled={creating || !newTitle.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
