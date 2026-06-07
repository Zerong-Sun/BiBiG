import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBook, downloadOfflineBook } from '../services/api';
import { isOfflineMode } from '../hooks/useAppStore';

export default function BookPreview() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<{
    id: string;
    title: string;
    status: string;
    word_count: number;
    file_url: string;
    content?: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    getBook(id).then(setBook);
  }, [id]);

  if (!book) {
    return <p className="text-muted text-center py-12">加载中...</p>;
  }

  const handleDownload = () => {
    if (isOfflineMode() && book.content) {
      downloadOfflineBook(book.content, `${book.title}.md`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto card p-8 text-center space-y-6">
      <h1 className="text-3xl font-bold">{book.title}</h1>
      <p className="text-muted">
        状态: {book.status} · 字数: {book.word_count || 0}
      </p>

      {book.status === 'ready' && (
        isOfflineMode() ? (
          <button type="button" onClick={handleDownload} className="btn-primary text-lg py-4 px-8">
            下载 Markdown
          </button>
        ) : (
          <a href={`/api/books/${book.id}/download`} className="btn-primary inline-block no-underline text-lg py-4 px-8">
            下载 PDF
          </a>
        )
      )}

      {isOfflineMode() && book.content && (
        <pre className="card-muted p-4 text-left text-sm whitespace-pre-wrap max-h-96 overflow-y-auto text-muted">
          {book.content.slice(0, 2000)}{book.content.length > 2000 ? '...' : ''}
        </pre>
      )}

      <Link to="/books" className="block text-accent hover:underline">
        返回书库
      </Link>
    </div>
  );
}
