// Қолданушының өз музыка файлы: тек осы браузердің IndexedDB жадында сақталады (серверге/GitHub-қа жіберілмейді).
const DB = 'drivevault-music', STORE = 'files', KEY = 'track';
const open = () => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(STORE, mode), q = fn(t.objectStore(STORE)); t.oncomplete = () => res(q.result); t.onerror = () => rej(t.error); }); };
export const saveTrack = (file) => tx('readwrite', s => s.put({name: file.name, data: file}, KEY));
export const loadTrack = () => tx('readonly', s => s.get(KEY)).catch(() => null);
export const clearTrack = () => tx('readwrite', s => s.delete(KEY));
