import { useState, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';

interface MiniVoiceRecorderProps {
  onTranscript: (text: string) => void;
}

export default function MiniVoiceRecorder({ onTranscript }: MiniVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [time, setTime] = useState(0);
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new RecordRTC(stream, {
      type: 'audio',
      mimeType: 'audio/wav',
      recorderType: RecordRTC.StereoAudioRecorder,
      numberOfAudioChannels: 1,
      desiredSampRate: 16000,
    });
    recorder.startRecording();
    recorderRef.current = recorder;
    setIsRecording(true);
    setTime(0);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };

  const stop = useCallback(() => {
    if (!recorderRef.current) return;
    recorderRef.current.stopRecording(() => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      onTranscript(`[语音回答 ${time}秒]`);
    });
  }, [onTranscript, time]);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={isRecording ? stop : start}
        className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isRecording ? 'bg-[var(--recording-active)] animate-pulse' : 'bg-[var(--accent-warm)]'
        }`}
      >
        {isRecording ? <div className="w-5 h-5 bg-white rounded-sm" /> : <span>🎙</span>}
      </button>
      <span className="text-muted">{isRecording ? `录音中 ${time}s，点击停止` : '点击开始语音回答'}</span>
    </div>
  );
}
