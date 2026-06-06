import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

const USER_ID_KEY = 'bibig-user-id';
const USER_EMAIL_KEY = 'bibig-user-email';
const TOKEN_KEY = 'bibig-auth-token';
const DEMO_PASSWORD = 'demo123';

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
if (storedToken) {
  setAuthToken(storedToken);
}

async function loginWithCredentials(email: string, password: string): Promise<string> {
  const { data } = await api.post('/users/login', { email, password });
  setAuthToken(data.access_token);
  localStorage.setItem(USER_ID_KEY, data.user.id);
  localStorage.setItem(USER_EMAIL_KEY, email);
  return data.user.id;
}

export async function ensureDemoUser(): Promise<string> {
  const storedId = localStorage.getItem(USER_ID_KEY);
  const storedEmail = localStorage.getItem(USER_EMAIL_KEY);

  if (storedEmail) {
    try {
      return await loginWithCredentials(storedEmail, DEMO_PASSWORD);
    } catch {
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(USER_EMAIL_KEY);
      setAuthToken(null);
    }
  }

  if (storedId) {
    try {
      await api.get(`/users/${storedId}`);
      return storedId;
    } catch {
      localStorage.removeItem(USER_ID_KEY);
      setAuthToken(null);
    }
  }

  const email = `demo-${Date.now()}@bibig.local`;
  await api.post('/users/', {
    name: '演示用户',
    email,
    password: DEMO_PASSWORD,
  });
  return loginWithCredentials(email, DEMO_PASSWORD);
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
