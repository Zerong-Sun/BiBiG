import { useState } from 'react';
import { Link } from 'react-router-dom';
import AudioRecorder from '../components/AudioRecorder';
import ChatInterface from '../components/ChatInterface';
import {
  uploadRecording,
  getSuggestedQuestions,
  saveAnswer,
  processRecording,
} from '../services/api';
import { useAppStore } from '../hooks/useAppStore';

type Step = 'record' | 'chat' | 'processing';

export default function Recording() {
  const { userId, biographyId } = useAppStore();
  const [step, setStep] = useState<Step>('record');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = async (blob: Blob, localRecordingId: string) => {
    setStep('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.wav');
      formData.append('recording_id', localRecordingId);
      formData.append('user_id', userId);
      if (biographyId) {
        formData.append('biography_id', biographyId);
      }

      const result = await uploadRecording(formData);
      setRecordingId(result.id);

      if (biographyId) {
        await processRecording(biographyId, result.id);
        const questionsResult = await getSuggestedQuestions(biographyId);
        setQuestions(questionsResult.questions);
      } else {
        setQuestions([
          '您小时候最难忘的一件事是什么？',
          '能说说您的家人吗？',
          '您想对后辈说些什么？',
        ]);
      }

      setStep('chat');
    } catch (err) {
      console.error(err);
      setError('上传失败，录音已保存在本地，可稍后同步');
      setStep('record');
    }
  };

  const handleAnswer = async (questionId: number, answer: string) => {
    if (biographyId) {
      await saveAnswer(biographyId, questionId, answer, recordingId || undefined);
    }
  };

  const steps = ['record', 'chat', 'processing'] as const;
  const stepLabels = ['录音', '对话', '生成'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">开始记录您的故事</h1>
          <Link to="/" className="text-blue-600 hover:underline">
            返回首页
          </Link>
        </div>

        <div className="flex justify-center gap-4 mb-12">
          {stepLabels.map((label, idx) => (
            <div
              key={label}
              className={`flex items-center gap-2 ${
                idx === steps.indexOf(step)
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  idx <= steps.indexOf(step)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {idx + 1}
              </div>
              {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-xl">{error}</div>
        )}

        {step === 'record' && (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            biographyId={biographyId || undefined}
          />
        )}

        {step === 'chat' && (
          <ChatInterface questions={questions} onAnswer={handleAnswer} />
        )}

        {step === 'processing' && (
          <div className="text-center p-12 bg-white rounded-2xl shadow-lg">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">正在处理您的录音...</p>
          </div>
        )}
      </div>
    </div>
  );
}
