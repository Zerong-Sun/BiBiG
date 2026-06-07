import { useState, useRef } from 'react';
import { generateQuestions } from '../services/api';
import MiniVoiceRecorder from './MiniVoiceRecorder';
import SkillAttribution, { DEFAULT_SKILLS, type BiographySkill } from './SkillAttribution';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  skipped?: boolean;
}

interface ChatInterfaceProps {
  questions: string[];
  skills?: BiographySkill[];
  onAnswer: (questionId: number, answer: string) => void;
  onComplete?: () => void;
  questionMode?: string;
  onQuestionModeChange?: (mode: string) => void;
  biographyId?: string;
}

export default function ChatInterface({
  questions: initialQuestions,
  skills: initialSkills = DEFAULT_SKILLS,
  onAnswer,
  onComplete,
  questionMode = 'ai',
  onQuestionModeChange,
  biographyId,
}: ChatInterfaceProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [skills, setSkills] = useState(initialSkills);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>('text');
  const [customQuestion, setCustomQuestion] = useState('');
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    onAnswer(currentQuestion, text);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        const next = currentQuestion + 1;
        setCurrentQuestion(next);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: questions[next] },
        ]);
      } else {
        setCompleted(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '太好了！我已经收集了足够的信息。您可以查看整理后的传记了。',
          },
        ]);
      }
    }, 400);

    setInput('');
  };

  const skipQuestion = () => {
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `[已跳过] ${questions[currentQuestion]}`, skipped: true },
    ]);
    if (currentQuestion < questions.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      setMessages((prev) => [...prev, { role: 'assistant', content: questions[next] }]);
    } else {
      setCompleted(true);
    }
  };

  const handleModeChange = async (mode: string) => {
    onQuestionModeChange?.(mode);
    if (biographyId && mode !== 'custom') {
      const result = await generateQuestions(biographyId, mode);
      setQuestions(result.questions);
      setSkills(result.skills ?? DEFAULT_SKILLS);
      setCurrentQuestion(0);
      setMessages([]);
    }
  };

  const addCustomQuestion = () => {
    if (!customQuestion.trim()) return;
    setQuestions((prev) => [...prev, customQuestion.trim()]);
    setCustomQuestion('');
  };

  return (
    <div className="card flex flex-col overflow-hidden" style={{ height: '600px' }}>
      <div className="p-4 border-b border-[var(--border)] space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted">问题来源：</span>
          {[
            { id: 'ai', label: 'AI 生成' },
            { id: 'synopsis', label: '梗概' },
            { id: 'template', label: '模板' },
            { id: 'custom', label: '自定义' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m.id)}
              className={`px-3 py-1 rounded-full text-sm border ${
                questionMode === m.id ? 'border-[var(--accent-tech)]' : 'border-[var(--border)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {questionMode === 'ai' && <SkillAttribution skills={skills} />}
        {questionMode === 'custom' && (
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="输入自定义问题..."
            />
            <button type="button" onClick={addCustomQuestion} className="btn-secondary text-sm">
              添加
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-start">
          <div className="card-muted rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] text-left">
            <p>你好！我是您的传记助手。让我来帮您整理人生故事。</p>
            {questions.length > 0 && <p className="text-muted mt-2">{questions[0]}</p>}
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
                  ? 'bg-[var(--accent-warm)] text-[var(--text-inverse)] rounded-tr-none'
                  : `card-muted rounded-tl-none ${msg.skipped ? 'opacity-60' : ''}`
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {!completed && (
        <div className="border-t border-[var(--border)] p-4 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAnswerMode('text')}
              className={`px-3 py-1 rounded text-sm ${answerMode === 'text' ? 'btn-primary py-1' : 'btn-secondary py-1'}`}
            >
              文字
            </button>
            <button
              type="button"
              onClick={() => setAnswerMode('voice')}
              className={`px-3 py-1 rounded text-sm ${answerMode === 'voice' ? 'btn-primary py-1' : 'btn-secondary py-1'}`}
            >
              语音
            </button>
            <button type="button" onClick={skipQuestion} className="btn-secondary text-sm py-1 ml-auto">
              跳过
            </button>
          </div>

          {answerMode === 'text' ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder="输入您的回答..."
                className="input-field flex-1"
              />
              <button type="button" onClick={() => sendMessage(input)} className="btn-primary">
                发送
              </button>
            </div>
          ) : (
            <MiniVoiceRecorder onTranscript={(text) => sendMessage(text)} />
          )}
        </div>
      )}

      {completed && onComplete && (
        <div className="border-t border-[var(--border)] p-4">
          <button type="button" onClick={onComplete} className="btn-primary w-full">
            查看传记
          </button>
        </div>
      )}
    </div>
  );
}
