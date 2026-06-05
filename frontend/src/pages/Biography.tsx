import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getBiography, generateBook, getSuggestedQuestions } from '../services/api';

export default function BiographyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [biography, setBiography] = useState<{
    id: string;
    title: string;
    style: string;
    status: string;
    entries: Array<{ id: string; title: string; content: string }>;
  } | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await getBiography(id);
      setBiography(data);
      const q = await getSuggestedQuestions(id);
      setQuestions(q.questions);
    })();
  }, [id]);

  const handleGenerateBook = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const book = await generateBook(id);
      navigate(`/book/${book.id}`);
    } catch (err) {
      console.error(err);
      alert('生成书籍失败，请确保已有传记内容');
    } finally {
      setGenerating(false);
    }
  };

  if (!biography) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{biography.title}</h1>
            <p className="text-gray-500 mt-1">
              风格: {biography.style} · 状态: {biography.status}
            </p>
          </div>
          <Link to="/" className="text-blue-600 hover:underline">
            返回首页
          </Link>
        </div>

        {questions.length > 0 && (
          <section className="bg-white rounded-2xl shadow-lg p-6 text-left">
            <h2 className="text-lg font-semibold mb-3">AI 建议补充的问题</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
            <Link
              to="/record"
              className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              继续录音补充
            </Link>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-lg p-6 text-left space-y-6">
          <h2 className="text-lg font-semibold">传记内容</h2>
          {biography.entries.length === 0 ? (
            <p className="text-gray-500">尚无内容，请先录音。</p>
          ) : (
            biography.entries.map((entry) => (
              <article key={entry.id} className="border-b pb-6 last:border-0">
                <h3 className="font-medium text-lg mb-2">{entry.title || '未命名章节'}</h3>
                <div className="prose text-gray-700 whitespace-pre-wrap">{entry.content}</div>
              </article>
            ))
          )}
        </section>

        <button
          type="button"
          onClick={handleGenerateBook}
          disabled={generating || biography.entries.length === 0}
          className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg disabled:opacity-50"
        >
          {generating ? '正在生成书籍...' : '生成完整书籍 (PDF)'}
        </button>
      </div>
    </div>
  );
}
