import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBook } from '../services/api';

export default function BookPreview() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<{
    id: string;
    title: string;
    status: string;
    word_count: number;
    file_url: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    getBook(id).then(setBook);
  }, [id]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <h1 className="text-3xl font-bold">{book.title}</h1>
        <p className="text-gray-500">
          状态: {book.status} · 字数: {book.word_count || 0}
        </p>

        {book.status === 'ready' && (
          <a
            href={`/api/books/${book.id}/download`}
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl text-lg"
          >
            下载 PDF
          </a>
        )}

        <Link to="/" className="block text-blue-600 hover:underline">
          返回首页
        </Link>
      </div>
    </div>
  );
}
