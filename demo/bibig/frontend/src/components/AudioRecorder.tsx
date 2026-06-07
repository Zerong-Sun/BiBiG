import { useState, useRef, useEffect, useCallback } from 'react';
import RecordRTC from 'recordrtc';
import {
  saveRecordingLocally,
  getLocalRecordings,
  deleteLocalRecording,
  type LocalRecording,
} from '../utils/localStorage';
import { uploadRecording } from '../services/api';
import { useAppStore } from '../hooks/useAppStore';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, recordingId: string) => void;
  biographyId?: string;
}

export default function AudioRecorder({ onRecordingComplete, biographyId }: AudioRecorderProps) {
  const userId = useAppStore((s) => s.userId);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [localRecordings, setLocalRecordings] = useState<LocalRecording[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeRef = useRef(0);

  const loadLocalRecordings = useCallback(async () => {
    const recordings = await getLocalRecordings(biographyId);
    setLocalRecordings(recordings);
  }, [biographyId]);

  useEffect(() => {
    loadLocalRecordings();
  }, [loadLocalRecordings]);

  const generateId = () => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        timeSlice: 5000,
        ondataavailable: (blob: Blob) => {
          chunksRef.current.push(blob);
        },
      });

      recorder.startRecording();
      recorderRef.current = recorder;

      const recordingId = generateId();
      setCurrentRecordingId(recordingId);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      chunksRef.current = [];
      setStatusMessage('录音已自动保存到本地');

      await saveRecordingLocally({
        id: recordingId,
        blob: new Blob([]),
        timestamp: Date.now(),
        duration: 0,
        synced: false,
        biographyId,
      });

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      autoSaveTimerRef.current = setInterval(async () => {
        if (chunksRef.current.length > 0) {
          const intermediateBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
          await saveRecordingLocally({
            id: recordingId,
            blob: intermediateBlob,
            timestamp: Date.now(),
            duration: recordingTimeRef.current,
            synced: false,
            biographyId,
          });
          setStatusMessage('每30秒自动保存');
        }
      }, 30000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current || !currentRecordingId) return;

    setIsSaving(true);
    setStatusMessage('正在保存...');

    recorderRef.current.stopRecording(async () => {
      const blob = recorderRef.current!.getBlob();
      const finalBlob = new Blob([...chunksRef.current, blob], { type: 'audio/wav' });

      await saveRecordingLocally({
        id: currentRecordingId,
        blob: finalBlob,
        timestamp: Date.now(),
        duration: recordingTimeRef.current,
        synced: false,
        biographyId,
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);

      setIsRecording(false);
      setIsSaving(false);
      setStatusMessage('录音已保存，正在上传...');

      onRecordingComplete(finalBlob, currentRecordingId);
      await loadLocalRecordings();
    });
  }, [currentRecordingId, biographyId, onRecordingComplete, loadLocalRecordings]);

  const handleDeleteRecording = async (recordingId: string) => {
    if (confirm('确定要删除这条录音吗？删除后无法恢复。')) {
      await deleteLocalRecording(recordingId);
      await loadLocalRecordings();
    }
  };

  const syncToServer = async (recording: LocalRecording) => {
    try {
      const formData = new FormData();
      formData.append('file', recording.blob, `recording_${recording.id}.wav`);
      formData.append('recording_id', recording.id);
      formData.append('user_id', userId);
      if (recording.biographyId) {
        formData.append('biography_id', recording.biographyId);
      }

      await uploadRecording(formData);
      await saveRecordingLocally({ ...recording, synced: true });
      await loadLocalRecordings();
      setStatusMessage('已同步到服务器');
    } catch (err) {
      console.error('Sync failed:', err);
      setStatusMessage('录音已保存在本地，可稍后同步');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN');

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col items-center gap-6 p-8">
        <div className="text-4xl font-mono">{formatTime(recordingTime)}</div>

        {statusMessage && <div className="text-sm text-accent">{statusMessage}</div>}
        {isSaving && <div className="text-sm text-accent animate-pulse">正在保存...</div>}

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSaving}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-[var(--recording-active)] hover:opacity-90 animate-pulse'
              : 'bg-[var(--accent-warm)] hover:opacity-90'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-white rounded-sm" />
          ) : (
            <span className="text-2xl">🎙</span>
          )}
        </button>

        <p className="text-muted text-lg">{isRecording ? '点击停止录音' : '点击开始录音'}</p>
        <p className="text-xs text-muted text-center">录音将自动保存到本地，即使关闭页面也不会丢失</p>
      </div>

      {localRecordings.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 text-left">已保存的录音</h3>
          <div className="space-y-3">
            {localRecordings.map((recording) => (
              <div key={recording.id} className="card-muted flex items-center justify-between p-3">
                <div className="text-left">
                  <p className="font-medium">{formatDate(recording.timestamp)}</p>
                  <p className="text-sm text-muted">
                    时长: {formatTime(recording.duration)}
                    {recording.synced && <span className="ml-2 text-accent">已同步</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!recording.synced && (
                    <button type="button" onClick={() => syncToServer(recording)} className="btn-primary text-sm py-1 px-3">
                      同步
                    </button>
                  )}
                  <button type="button" onClick={() => handleDeleteRecording(recording.id)} className="btn-danger">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
