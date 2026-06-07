const DB_NAME = 'BiBiGOffline';
const DB_VERSION = 1;

export interface OfflineBiography {
  id: string;
  user_id: string;
  title: string;
  style: string;
  status: string;
  description?: string;
  birth_year?: number;
  hometown?: string;
  key_events?: string[];
  recording_method: string;
  created_at: number;
}

export interface OfflineEntry {
  id: string;
  biography_id: string;
  recording_id?: string;
  title: string;
  content: string;
  original_transcript?: string;
  created_at: number;
}

export interface OfflineRecordingMeta {
  id: string;
  biography_id?: string;
  title?: string;
  transcript?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
  status: string;
  created_at: number;
}

export interface OfflineBook {
  id: string;
  biography_id: string;
  title: string;
  status: string;
  word_count: number;
  content: string;
  created_at: number;
}

export interface OfflineSettings {
  theme: string;
  default_style: string;
  default_question_mode: string;
}

const STORES = ['biographies', 'entries', 'recordingMeta', 'books', 'settings'] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  }
  return dbPromise;
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function put<T extends { id: string }>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function getOne<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export function getOfflineUserId(): string {
  let id = localStorage.getItem('bibig-offline-user-id');
  if (!id) {
    id = genId('user');
    localStorage.setItem('bibig-offline-user-id', id);
  }
  return id;
}

export async function ensureOfflineUser(): Promise<string> {
  return getOfflineUserId();
}

const STYLE_INTROS: Record<string, string> = {
  story: '【故事】',
  lyrical: '【随笔】',
  rigorous: '【纪实】',
  chronological: '【年谱】',
};

const TEMPLATE_QUESTIONS = [
  '您小时候最难忘的一件事是什么？',
  '能说说您的家人吗？',
  '您的求学或工作经历是怎样的？',
  '您想对后辈说些什么人生感悟？',
];

const SYNOPSIS_QUESTIONS = (desc: string) => [
  `关于「${desc.slice(0, 20)}」，能再详细讲讲吗？`,
  '这件事对您后来的人生产生了什么影响？',
  '当时您身边有哪些重要的人？',
];

export async function offlineCreateBiography(params: {
  userId: string;
  title: string;
  style?: string;
  description?: string;
  birthYear?: number;
  hometown?: string;
  keyEvents?: string[];
  recordingMethod?: string;
}) {
  const bio: OfflineBiography = {
    id: genId('bio'),
    user_id: params.userId,
    title: params.title,
    style: params.style || 'story',
    status: 'draft',
    description: params.description,
    birth_year: params.birthYear,
    hometown: params.hometown,
    key_events: params.keyEvents,
    recording_method: params.recordingMethod || 'guided',
    created_at: Date.now(),
  };
  await put('biographies', bio);
  return {
    id: bio.id,
    user_id: bio.user_id,
    title: bio.title,
    style: bio.style,
    status: bio.status,
    description: bio.description,
  };
}

export async function offlineListBiographies(userId: string) {
  const all = await getAll<OfflineBiography>('biographies');
  return all
    .filter((b) => b.user_id === userId)
    .map((b) => ({
      id: b.id,
      title: b.title,
      style: b.style,
      status: b.status,
      description: b.description,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function offlineGetBiography(biographyId: string) {
  const bio = await getOne<OfflineBiography>('biographies', biographyId);
  if (!bio) throw new Error('Biography not found');
  const entries = (await getAll<OfflineEntry>('entries'))
    .filter((e) => e.biography_id === biographyId)
    .sort((a, b) => a.created_at - b.created_at);
  return {
    id: bio.id,
    user_id: bio.user_id,
    title: bio.title,
    description: bio.description,
    style: bio.style,
    status: entries.length > 0 ? 'in_progress' : bio.status,
    birth_year: bio.birth_year,
    hometown: bio.hometown,
    key_events: bio.key_events || [],
    recording_method: bio.recording_method,
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content,
      original_transcript: e.original_transcript,
    })),
  };
}

export async function offlineUploadRecording(recordingId: string, biographyId?: string) {
  const meta: OfflineRecordingMeta = {
    id: recordingId,
    biography_id: biographyId,
    status: 'uploading',
    created_at: Date.now(),
    title: `录音 ${new Date().toLocaleString('zh-CN')}`,
  };
  await put('recordingMeta', meta);
  return { id: recordingId, status: 'uploading' };
}

export async function offlineTranscribeRecording(recordingId: string) {
  const meta = await getOne<OfflineRecordingMeta>('recordingMeta', recordingId);
  if (!meta) {
    const created: OfflineRecordingMeta = {
      id: recordingId,
      status: 'transcribed',
      transcript: '',
      segments: [],
      created_at: Date.now(),
    };
    await put('recordingMeta', created);
    return { id: recordingId, status: 'transcribed', transcript: '', segments: [] };
  }
  meta.status = 'transcribed';
  if (meta.transcript === undefined) meta.transcript = '';
  if (!meta.segments) meta.segments = [];
  await put('recordingMeta', meta);
  return {
    id: recordingId,
    status: 'transcribed',
    transcript: meta.transcript,
    segments: meta.segments,
  };
}

export async function offlineUpdateTranscript(recordingId: string, transcript: string) {
  const meta = (await getOne<OfflineRecordingMeta>('recordingMeta', recordingId)) || {
    id: recordingId,
    status: 'transcribed',
    created_at: Date.now(),
  };
  meta.transcript = transcript;
  meta.status = 'transcribed';
  meta.segments = [{ start: 0, end: 0, text: transcript }];
  await put('recordingMeta', meta);
  return { id: recordingId, transcript, status: 'transcribed' };
}

export async function offlineGetRecordingTranscript(recordingId: string): Promise<string | null> {
  const meta = await getOne<OfflineRecordingMeta>('recordingMeta', recordingId);
  return meta?.transcript || null;
}

export async function offlineAttachRecording(recordingId: string, biographyId: string) {
  const meta = (await getOne<OfflineRecordingMeta>('recordingMeta', recordingId)) || {
    id: recordingId,
    status: 'uploading',
    created_at: Date.now(),
  };
  meta.biography_id = biographyId;
  await put('recordingMeta', meta);
  return {
    id: recordingId,
    biography_id: biographyId,
    status: meta.status,
    transcript: meta.transcript,
  };
}

export async function offlineListRecordings(userId: string, biographyId?: string) {
  void userId;
  const all = await getAll<OfflineRecordingMeta>('recordingMeta');
  return all
    .filter((r) => !biographyId || r.biography_id === biographyId)
    .map((r) => ({
      id: r.id,
      title: r.title || r.id,
      biography_id: r.biography_id,
      status: r.status,
      transcript: r.transcript,
      audio_url: undefined,
      created_at: new Date(r.created_at).toISOString(),
    }))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function offlineProcessRecording(
  biographyId: string,
  recordingId: string,
  transcript?: string,
) {
  const bio = await getOne<OfflineBiography>('biographies', biographyId);
  if (!bio) throw new Error('Biography not found');

  let text = transcript;
  if (!text) {
    const meta = await getOne<OfflineRecordingMeta>('recordingMeta', recordingId);
    text = meta?.transcript;
  }
  if (!text?.trim()) throw new Error('Recording not found or not transcribed');

  const intro = STYLE_INTROS[bio.style] || STYLE_INTROS.story;
  const dateStr = new Date().toLocaleDateString('zh-CN');
  const content = `${intro}\n\n${text.trim()}\n\n*（${dateStr} 离线整理）*`;

  const entry: OfflineEntry = {
    id: genId('entry'),
    biography_id: biographyId,
    recording_id: recordingId,
    title: `${bio.title} · 片段`,
    content,
    original_transcript: text,
    created_at: Date.now(),
  };
  await put('entries', entry);

  if (bio.status === 'draft') {
    bio.status = 'in_progress';
    await put('biographies', bio);
  }

  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    biography_id: biographyId,
  };
}

export async function offlineGetSuggestedQuestions(biographyId: string, mode = 'ai') {
  const bio = await getOne<OfflineBiography>('biographies', biographyId);
  if (!bio) return { questions: TEMPLATE_QUESTIONS };

  if (mode === 'synopsis' && bio.description) {
    return { questions: SYNOPSIS_QUESTIONS(bio.description) };
  }
  if (mode === 'template' || bio.recording_method === 'timeline') {
    return { questions: TEMPLATE_QUESTIONS };
  }
  if (bio.key_events && bio.key_events.length > 0) {
    return {
      questions: bio.key_events.slice(0, 4).map((ev) => `能详细讲讲关于「${ev}」的故事吗？`),
    };
  }
  return { questions: TEMPLATE_QUESTIONS };
}

export async function offlineSaveAnswer(
  biographyId: string,
  questionIndex: number,
  answer: string,
  recordingId?: string,
) {
  const entry: OfflineEntry = {
    id: genId('entry'),
    biography_id: biographyId,
    recording_id: recordingId,
    title: `追问回答 #${questionIndex + 1}`,
    content: answer,
    created_at: Date.now(),
  };
  await put('entries', entry);
  return { id: entry.id, saved: true };
}

export async function offlineUpdateEntry(
  biographyId: string,
  entryId: string,
  data: { title?: string; content?: string },
) {
  const entry = await getOne<OfflineEntry>('entries', entryId);
  if (!entry || entry.biography_id !== biographyId) throw new Error('Entry not found');
  if (data.title !== undefined) entry.title = data.title;
  if (data.content !== undefined) entry.content = data.content;
  await put('entries', entry);
  return entry;
}

export async function offlineGenerateBook(biographyId: string) {
  const bio = await offlineGetBiography(biographyId);
  if (bio.entries.length === 0) throw new Error('No content');

  const fullText = bio.entries.map((e) => `## ${e.title || '章节'}\n\n${e.content}`).join('\n\n');
  const book: OfflineBook = {
    id: genId('book'),
    biography_id: biographyId,
    title: bio.title,
    status: 'ready',
    word_count: fullText.length,
    content: `# ${bio.title}\n\n${fullText}`,
    created_at: Date.now(),
  };
  await put('books', book);
  return {
    id: book.id,
    biography_id: biographyId,
    title: book.title,
    status: 'ready',
    word_count: book.word_count,
  };
}

export async function offlineGetBook(bookId: string) {
  const book = await getOne<OfflineBook>('books', bookId);
  if (!book) throw new Error('Book not found');
  return {
    id: book.id,
    biography_id: book.biography_id,
    title: book.title,
    status: book.status,
    word_count: book.word_count,
    file_url: '',
    content: book.content,
  };
}

export async function offlineListBooks(userId: string) {
  void userId;
  const books = await getAll<OfflineBook>('books');
  return books
    .map((b) => ({
      id: b.id,
      biography_id: b.biography_id,
      title: b.title,
      status: b.status,
      word_count: b.word_count,
      created_at: new Date(b.created_at).toISOString(),
    }))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export function downloadOfflineBook(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportOfflineBackup(): Promise<string> {
  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    biographies: await getAll<OfflineBiography>('biographies'),
    entries: await getAll<OfflineEntry>('entries'),
    recordingMeta: await getAll<OfflineRecordingMeta>('recordingMeta'),
    books: await getAll<OfflineBook>('books'),
  };
  return JSON.stringify(data, null, 2);
}

export async function importOfflineBackup(json: string) {
  const data = JSON.parse(json) as {
    biographies?: OfflineBiography[];
    entries?: OfflineEntry[];
    recordingMeta?: OfflineRecordingMeta[];
    books?: OfflineBook[];
  };
  for (const bio of data.biographies || []) await put('biographies', bio);
  for (const entry of data.entries || []) await put('entries', entry);
  for (const meta of data.recordingMeta || []) await put('recordingMeta', meta);
  for (const book of data.books || []) await put('books', book);
}

export async function offlineGetSettings(): Promise<OfflineSettings> {
  const stored = await getOne<OfflineSettings & { id: string }>('settings', 'app');
  return stored || { theme: 'ink', default_style: 'story', default_question_mode: 'ai' };
}

export async function offlineUpdateSettings(partial: Partial<OfflineSettings>) {
  const current = await offlineGetSettings();
  const next = { id: 'app', ...current, ...partial };
  await put('settings', next);
  return next;
}
