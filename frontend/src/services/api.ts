import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

const USER_ID_KEY = 'bibig-user-id';

export async function ensureDemoUser(): Promise<string> {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored) {
    try {
      await api.get(`/users/${stored}`);
      return stored;
    } catch {
      localStorage.removeItem(USER_ID_KEY);
    }
  }

  const { data } = await api.post('/users/', {
    name: '演示用户',
    email: `demo-${Date.now()}@bibig.local`,
    password: 'demo123',
  });
  localStorage.setItem(USER_ID_KEY, data.id);
  return data.id;
}

export async function uploadRecording(formData: FormData) {
  const { data } = await api.post('/recordings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function createBiography(userId: string, title: string, style = 'story') {
  const { data } = await api.post('/biography/', { user_id: userId, title, style });
  return data;
}

export async function getSuggestedQuestions(biographyId: string) {
  const { data } = await api.get(`/biography/${biographyId}/questions`);
  return data;
}

export async function processRecording(biographyId: string, recordingId: string) {
  const { data } = await api.post(`/biography/${biographyId}/process`, {
    recording_id: recordingId,
  });
  return data;
}

export async function saveAnswer(
  biographyId: string,
  questionIndex: number,
  answer: string,
  recordingId?: string,
) {
  const { data } = await api.post(`/biography/${biographyId}/answers`, {
    question_index: questionIndex,
    answer,
    recording_id: recordingId,
  });
  return data;
}

export async function getBiography(biographyId: string) {
  const { data } = await api.get(`/biography/${biographyId}`);
  return data;
}

export async function listBiographies(userId: string) {
  const { data } = await api.get(`/biography/user/${userId}`);
  return data;
}

export async function generateBook(biographyId: string) {
  const { data } = await api.post(`/books/generate/${biographyId}`);
  return data;
}

export async function getBook(bookId: string) {
  const { data } = await api.get(`/books/${bookId}`);
  return data;
}

export default api;
