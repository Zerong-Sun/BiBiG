import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWorks, listBiographies, getBiography, generateBook, getApiErrorMessage, type WorkItem } from '../services/api';
import { useAppStore } from '../hooks/useAppStore';
import { useAuth } from '../hooks/useAuth';

const WORK_STATUS_LABELS: Record<WorkItem['work_status'], string> = {
  draft: '草稿',
  in_progress: '进行中',
  published: '已成书',
};

const WORK_STATUS_CLASSES: Record<WorkItem['work_status'], string> = {
  draft: 'border-[var(--border)] text-muted',
  in_progress: 'border-[var(--accent-tech)] text-accent',
  published: 'border-[var(--accent-warm)] text-accent',
};

const BOOK_STATUS_LABELS: Record<string, string> = {
  ready: 'PDF 可下载',
  generating: 'PDF 生成中',
  failed: 'PDF 生成失败',
};

export default function Books() {
  const { requireAuth } = useAuth();
  const { userId, setUserId, setBiographyId } = useAppStore();
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorks = async (id: string) => {
    setError(null);
    try {
      const list = await listWorks(id);
      if (list.length > 0) {
        setWorks(list);
        return;
      }
    } catch (err) {
      setError(`加载作品失败：${getApiErrorMessage(err)}`);
    }

    // 回退：直接从传记列表组装（避免 /works 异常时页面空白）
    try {
      const bios = await listBiographies(id);
      const merged = await Promise.all(
        bios.map(async (bio: { id: string; title: string; description?: string; style?: string; status: string }) => {
          try {
            const full = await getBiography(bio.id);
            const entryCount = full.entries?.length || 0;
            let workStatus: WorkItem['work_status'] = 'draft';
            if (entryCount > 0) workStatus = 'in_progress';
            return {
              id: bio.id,
              title: bio.title,
              description: bio.description,
              style: bio.style,
              status: bio.status,
              entry_count: entryCount,
              work_status: workStatus,
              book: null,
            } satisfies WorkItem;
          } catch {
            return {
              id: bio.id,
              title: bio.title,
              description: bio.description,
              style: bio.style,
              status: bio.status,
              entry_count: 0,
              work_status: 'draft' as const,
              book: null,
            } satisfies WorkItem;
          }
        }),
      );
      setWorks(merged);
    } catch (err) {
      if (!error) setError(getApiErrorMessage(err));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const id = userId || (await requireAuth());
        if (!userId) setUserId(id);
        await loadWorks(id);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, setUserId, requireAuth]);

  const handleGenerateBook = async (biographyId: string) => {
    setGeneratingId(biographyId);
    setError(null);
    try {
      await generateBook(biographyId);
      await loadWorks(userId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return <p className="text-muted text-center py-12">加载中...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的作品</h1>
        <p className="text-sm text-muted mt-1">
          创建传记 → 录音/添加已有录音 → 转写 → AI 整理 → 生成 PDF
        </p>
      </div>

      {error && <div className="alert-warning">{error}</div>}

      {works.length === 0 ? (
        <div className="card p-8 text-center space-y-4">
          <p className="text-muted">还没有作品</p>
          <p className="text-sm text-muted">
            先在首页创建传记，然后录音讲述故事。AI 整理成章节后，即可在此生成 PDF 书籍。
          </p>
          <Link to="/" className="btn-primary inline-block no-underline">
            去创建传记
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map((work) => (
            <div key={work.id} className="card p-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-lg">{work.title}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs border ${WORK_STATUS_CLASSES[work.work_status]}`}
                  >
                    {WORK_STATUS_LABELS[work.work_status]}
                  </span>
                </div>
                {work.description && (
                  <p className="text-sm text-muted mt-1 line-clamp-1">{work.description}</p>
                )}
                <p className="text-sm text-muted mt-1">
                  {work.entry_count} 个章节
                  {work.book && (
                    <>
                      {' · '}
                      {BOOK_STATUS_LABELS[work.book.status] || work.book.status}
                      {work.book.word_count ? ` · ${work.book.word_count} 字` : ''}
                    </>
                  )}
                  {work.book?.created_at &&
                    ` · ${new Date(work.book.created_at).toLocaleDateString('zh-CN')}`}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {work.work_status === 'draft' && (
                  <>
                    <Link
                      to="/record"
                      onClick={() => setBiographyId(work.id)}
                      className="btn-primary text-sm py-2 px-4 no-underline"
                    >
                      开始录音
                    </Link>
                    <Link
                      to={`/archive?bio=${work.id}`}
                      className="btn-secondary text-sm py-2 px-4 no-underline"
                    >
                      添加已有录音
                    </Link>
                    <Link to={`/biography/${work.id}`} className="btn-secondary text-sm py-2 px-4 no-underline">
                      查看
                    </Link>
                  </>
                )}
                {work.work_status === 'in_progress' && (
                  <>
                    <Link to={`/biography/${work.id}`} className="btn-primary text-sm py-2 px-4 no-underline">
                      查看传记
                    </Link>
                    <Link
                      to={`/archive?bio=${work.id}`}
                      className="btn-secondary text-sm py-2 px-4 no-underline"
                    >
                      添加已有录音
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleGenerateBook(work.id)}
                      disabled={generatingId === work.id}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      {generatingId === work.id ? '生成中...' : '生成 PDF'}
                    </button>
                    <Link
                      to="/record"
                      onClick={() => setBiographyId(work.id)}
                      className="btn-secondary text-sm py-2 px-4 no-underline"
                    >
                      继续录音
                    </Link>
                  </>
                )}
                {work.book && work.work_status !== 'published' && (
                  <>
                    {work.book.status === 'ready' && (
                      <Link to={`/book/${work.book.id}`} className="btn-primary text-sm py-2 px-4 no-underline">
                        查看书籍
                      </Link>
                    )}
                    {work.book.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleGenerateBook(work.id)}
                        disabled={generatingId === work.id || work.entry_count === 0}
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        重新生成 PDF
                      </button>
                    )}
                  </>
                )}
                {work.work_status === 'published' && work.book && (
                  <>
                    <Link to={`/book/${work.book.id}`} className="btn-primary text-sm py-2 px-4 no-underline">
                      查看书籍
                    </Link>
                    <Link to={`/biography/${work.id}`} className="btn-secondary text-sm py-2 px-4 no-underline">
                      编辑传记
                    </Link>
                    {work.book.status === 'ready' && (
                      <a
                        href={`/api/books/${work.book.id}/download`}
                        className="btn-secondary text-sm py-2 px-4 no-underline"
                      >
                        下载 PDF
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
