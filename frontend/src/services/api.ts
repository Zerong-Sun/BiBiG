import axios from 'axios';
import { isOfflineMode } from '../hooks/useAppStore';
import * as offline from '../utils/offlineStore';

const api = axios.create({
  baseURL: '/api',
});

const USER_ID_KEY = 'bibig-user-id';
const USER_EMAIL_KEY = 'bibig-user-email';
const USER_NAME_KEY = 'bibig-user-name';
const TOKEN_KEY = 'bibig-auth-token';

export interface UserSettings {
  stt_provider: string;
  stt_base_url: string;
  stt_api_key_set: boolean;
  stt_api_key_masked: string | null;
  llm_provider: string;
  llm_base_url: string;
  llm_model: string;
  llm_api_key_set: boolean;
  llm_api_key_masked: string | null;
  default_style: string;
  default_question_mode: string;
  theme: string;
}

export interface CreateBiographyParams {
  userId: string;
  title: string;
  style?: string;
  description?: string;
  birthYear?: number;
  hometown?: string;
  keyEvents?: string[];
  recordingMethod?: string;
}

function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem(TOKEN_KEY);
  }
}

const storedToken = localStorage.getItem(TOKEN_KEY);
if (storedToken && !isOfflineMode()) {
  setAuthToken(storedToken);
}

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;
    if (typeof detail === 'object' && detail !== null && 'message' in detail) {
      return String((detail as { message: string }).message);
    }
    if (typeof detail === 'string') {
      if (detail === 'Not Found' && status === 404) {
        return '后端服务未连接或接口不存在，请确认 backend 已启动（端口 8000）';
      }
      return detail;
    }
    if (status === 404) return '后端服务未连接，请确认 backend 已启动（端口 8000）';
    if (status === 401) return '登录已过期，请重新登录';
    if (status === 403) return '没有权限执行此操作';
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return '请求失败，请稍后重试';
}

export function logout() {
  setAuthToken(null);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/users/login', { email, password });
  setAuthToken(data.access_token);
  localStorage.setItem(USER_ID_KEY, data.user.id);
  localStorage.setItem(USER_EMAIL_KEY, email);
  localStorage.setItem(USER_NAME_KEY, data.user.name);
  return data.user;
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/users/', { name, email, password });
  return login(email, password).then(() => data);
}

export async function ensureDemoUser(): Promise<string> {
  if (isOfflineMode()) {
    return offline.ensureOfflineUser();
  }

  const storedId = localStorage.getItem(USER_ID_KEY);
  const storedEmail = localStorage.getItem(USER_EMAIL_KEY);

  if (storedEmail) {
    try {
      const password = localStorage.getItem('bibig-password') || 'demo123';
      const user = await login(storedEmail, password);
      return user.id;
    } catch {
      logout();
    }
  }

  if (storedId && localStorage.getItem(TOKEN_KEY)) {
    try {
      await api.get(`/users/${storedId}`);
      return storedId;
    } catch {
      logout();
    }
  }

  const email = `demo-${Date.now()}@bibig.local`;
  const password = 'demo123';
  await api.post('/users/', { name: '演示用户', email, password });
  localStorage.setItem('bibig-password', password);
  const user = await login(email, password);
  return user.id;
}

export async function uploadRecording(formData: FormData, options?: { autoTranscribe?: boolean }) {
  if (isOfflineMode()) {
    const recordingId = (formData.get('recording_id') as string) || `rec_${Date.now()}`;
    const biographyId = (formData.get('biography_id') as string) || undefined;
    return offline.offlineUploadRecording(recordingId, biographyId);
  }
  if (options?.autoTranscribe) {
    formData.append('auto_transcribe', 'true');
  }
  const { data } = await api.post('/recordings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function transcribeRecording(recordingId: string) {
  if (isOfflineMode()) return offline.offlineTranscribeRecording(recordingId);
  const { data } = await api.post(`/recordings/${recordingId}/transcribe`);
  return data;
}

export async function updateTranscript(recordingId: string, transcript: string) {
  if (isOfflineMode()) return offline.offlineUpdateTranscript(recordingId, transcript);
  const { data } = await api.put(`/recordings/${recordingId}/transcript`, { transcript });
  return data;
}

export async function attachRecordingToBiography(recordingId: string, biographyId: string) {
  if (isOfflineMode()) {
    return offline.offlineAttachRecording(recordingId, biographyId);
  }
  const { data } = await api.patch(`/recordings/${recordingId}`, { biography_id: biographyId });
  return data;
}

export async function saveLocalTranscriptDraft(recordingId: string, transcript: string) {
  return offline.offlineUpdateTranscript(recordingId, transcript);
}

export async function getLocalTranscriptDraft(recordingId: string): Promise<string | null> {
  return offline.offlineGetRecordingTranscript(recordingId);
}

export async function getRecordingStatus(recordingId: string) {
  if (isOfflineMode()) return offline.offlineTranscribeRecording(recordingId);
  const { data } = await api.get(`/recordings/${recordingId}/status`);
  return data;
}

export async function getRecording(recordingId: string) {
  if (isOfflineMode()) {
    const list = await offline.offlineListRecordings(offline.getOfflineUserId());
    return list.find((r) => r.id === recordingId);
  }
  const { data } = await api.get(`/recordings/${recordingId}`);
  return data;
}

export async function listRecordings(userId: string, biographyId?: string) {
  if (isOfflineMode()) return offline.offlineListRecordings(userId, biographyId);
  const params = biographyId ? { biography_id: biographyId } : {};
  const { data } = await api.get(`/recordings/user/${userId}`, { params });
  return data;
}

export async function createBiography(params: CreateBiographyParams) {
  if (isOfflineMode()) return offline.offlineCreateBiography(params);
  const { data } = await api.post('/biography/', {
    user_id: params.userId,
    title: params.title,
    style: params.style || 'story',
    description: params.description,
    birth_year: params.birthYear,
    hometown: params.hometown,
    key_events: params.keyEvents,
    recording_method: params.recordingMethod || 'guided',
  });
  return data;
}

export async function getSuggestedQuestions(biographyId: string, mode = 'ai') {
  if (isOfflineMode()) return offline.offlineGetSuggestedQuestions(biographyId, mode);
  const { data } = await api.get(`/biography/${biographyId}/questions`, { params: { mode } });
  return data;
}

export async function generateQuestions(
  biographyId: string,
  mode: string,
  customQuestions?: string[],
) {
  if (isOfflineMode()) {
    if (mode === 'custom' && customQuestions) return { questions: customQuestions };
    return offline.offlineGetSuggestedQuestions(biographyId, mode);
  }
  const { data } = await api.post(`/biography/${biographyId}/questions`, {
    mode,
    custom_questions: customQuestions,
  });
  return data;
}

export async function processRecording(
  biographyId: string,
  recordingId: string,
  transcript?: string,
) {
  if (isOfflineMode()) return offline.offlineProcessRecording(biographyId, recordingId, transcript);
  const { data } = await api.post(`/biography/${biographyId}/process`, {
    recording_id: recordingId,
    transcript,
  });
  return data;
}

export async function saveAnswer(
  biographyId: string,
  questionIndex: number,
  answer: string,
  recordingId?: string,
) {
  if (isOfflineMode()) return offline.offlineSaveAnswer(biographyId, questionIndex, answer, recordingId);
  const { data } = await api.post(`/biography/${biographyId}/answers`, {
    question_index: questionIndex,
    answer,
    recording_id: recordingId,
  });
  return data;
}

export async function updateBiographyEntry(
  biographyId: string,
  entryId: string,
  data: { title?: string; content?: string },
) {
  if (isOfflineMode()) return offline.offlineUpdateEntry(biographyId, entryId, data);
  const { data: result } = await api.put(`/biography/${biographyId}/entries/${entryId}`, data);
  return result;
}

export async function getBiography(biographyId: string) {
  if (isOfflineMode()) return offline.offlineGetBiography(biographyId);
  const { data } = await api.get(`/biography/${biographyId}`);
  return data;
}

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  style?: string;
  status: string;
  entry_count: number;
  work_status: 'draft' | 'in_progress' | 'published';
  book?: {
    id: string;
    status: string;
    word_count: number;
    created_at?: string;
  } | null;
}

export async function listWorks(userId: string): Promise<WorkItem[]> {
  if (isOfflineMode()) {
    const bios = await offline.offlineListBiographies(userId);
    const books = await offline.offlineListBooks(userId);
    return Promise.all(
      bios.map(async (bio) => {
        const full = await offline.offlineGetBiography(bio.id);
        const entryCount = full.entries?.length || 0;
        const book = books.find((b) => b.biography_id === bio.id);
        let workStatus: WorkItem['work_status'] = 'draft';
        if (book && book.status === 'ready') workStatus = 'published';
        else if (entryCount > 0) workStatus = 'in_progress';
        return {
          id: bio.id,
          title: bio.title,
          description: bio.description,
          style: bio.style,
          status: bio.status,
          entry_count: entryCount,
          work_status: workStatus,
          book: book
            ? {
                id: book.id,
                status: book.status,
                word_count: book.word_count,
                created_at: new Date(book.created_at).toISOString(),
              }
            : null,
        };
      }),
    );
  }
  const { data } = await api.get(`/biography/user/${userId}/works`);
  return data as WorkItem[];
}

export async function listBiographies(userId: string) {
  if (isOfflineMode()) return offline.offlineListBiographies(userId);
  const { data } = await api.get(`/biography/user/${userId}`);
  return data;
}

export async function generateBook(biographyId: string) {
  if (isOfflineMode()) return offline.offlineGenerateBook(biographyId);
  const { data } = await api.post(`/books/generate/${biographyId}`);
  return data;
}

export async function getBook(bookId: string) {
  if (isOfflineMode()) return offline.offlineGetBook(bookId);
  const { data } = await api.get(`/books/${bookId}`);
  return data;
}

export async function listBooks(userId: string) {
  if (isOfflineMode()) return offline.offlineListBooks(userId);
  const { data } = await api.get(`/books/user/${userId}`);
  return data;
}

export async function getUserSettings(userId: string) {
  if (isOfflineMode()) {
    const s = await offline.offlineGetSettings();
    return {
      stt_provider: 'offline',
      stt_base_url: '',
      stt_api_key_set: false,
      stt_api_key_masked: null,
      llm_provider: 'offline',
      llm_base_url: '',
      llm_model: '',
      llm_api_key_set: false,
      llm_api_key_masked: null,
      default_style: s.default_style,
      default_question_mode: s.default_question_mode,
      theme: s.theme,
    } as UserSettings;
  }
  void userId;
  const { data } = await api.get(`/settings/users/${userId}/settings`);
  return data as UserSettings;
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>) {
  if (isOfflineMode()) {
    await offline.offlineUpdateSettings({
      theme: settings.theme,
      default_style: settings.default_style,
      default_question_mode: settings.default_question_mode,
    });
    return getUserSettings(userId);
  }
  const { data } = await api.put(`/settings/users/${userId}/settings`, settings);
  return data as UserSettings;
}

export async function checkBackendHealth(): Promise<boolean> {
  if (isOfflineMode()) return false;
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
}

export async function testLLMConnection(params?: {
  api_key?: string;
  base_url?: string;
  model?: string;
  provider?: string;
}) {
  if (isOfflineMode()) {
    return { success: true, message: '离线模式不使用云端 LLM' };
  }
  const { data } = await api.post('/settings/test-llm', params || {});
  return data as { success: boolean; message: string };
}

export async function testSTTConnection(params?: {
  api_key?: string;
  base_url?: string;
  provider?: string;
}) {
  if (isOfflineMode()) {
    return { success: true, message: '离线模式请手动输入转写文字' };
  }
  const { data } = await api.post('/settings/test-stt', params || {});
  return data as { success: boolean; message: string };
}

export { exportOfflineBackup, importOfflineBackup, downloadOfflineBook } from '../utils/offlineStore';

export default api;
