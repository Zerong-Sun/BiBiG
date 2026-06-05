import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  questions: string[];
  onAnswer: (questionId: number, answer: string) => void;
}

export default function ChatInterface({ questions, onAnswer }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    onAnswer(currentQuestion, input);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        const next = currentQuestion + 1;
        setCurrentQuestion(next);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: questions[next] },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '太好了！我已经收集了足够的信息，可以开始整理您的传记了。',
          },
        ]);
      }
    }, 500);

    setInput('');
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] text-left">
            <p className="text-gray-800">你好！我是您的传记助手。让我来帮您整理人生故事。</p>
            {questions.length > 0 && (
              <p className="text-gray-600 mt-2">{questions[0]}</p>
            )}
          </div>
        </div>

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 max-w-[80%] text-left ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入您的回答..."
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-lg"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
