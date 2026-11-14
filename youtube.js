// YouTube Data API арқылы тікелей жүктеу (Google OAuth, аккаунт таңдау терезесімен).
// Client ID — пайдаланушының өз Google Cloud жобасынан; тек осы браузерде сақталады.

const CID_KEY = 'drivevault-yt-client';
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email';
const TOK_KEY = 'drivevault-yt-token', HINT_KEY = 'drivevault-yt-hint', GRANT_KEY = 'drivevault-yt-granted';
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* жад өшірулі */ } },
  del: k => { try { localStorage.removeItem(k); } catch { /* жад өшірулі */ } }
};
let gsiPromise, token = null, tokenExp = 0;
// Бір сағат жарамды токен бет қайта ашылса да сақталады (тек осы браузерде)
try { const t = JSON.parse(ls.get(TOK_KEY) || 'null'); if (t && t.exp > Date.now() + 30000) { token = t.tok; tokenExp = t.exp; } } catch { /* бос */ }
export const rememberedAccount = () => ls.get(HINT_KEY) || (ls.get(GRANT_KEY) ? '(сақталған аккаунт)' : '');
/** Сақталған рұқсатты ұмыту (басқа аккаунтқа ауысу үшін) */
export function forgetAccount() { [TOK_KEY, HINT_KEY, GRANT_KEY].forEach(ls.del); token = null; tokenExp = 0; }

export const hasToken = () => !!token && Date.now() < tokenExp;
export const getClientId = () => { try { return localStorage.getItem(CID_KEY) || ''; } catch { return ''; } };
export const setClientId = v => { try { localStorage.setItem(CID_KEY, v.trim()); } catch {} token = null; };

function loadGsi() {
  return gsiPromise ||= new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = res; s.onerror = () => { gsiPromise = null; rej(new Error('Google кіру скрипті жүктелмеді (интернетті тексеріңіз)')); };
    document.head.appendChild(s);
  });
}

/** Алғаш рет аккаунт таңдап рұқсат береді; бұдан кейін сақталған аккаунтпен ешбір сұраусыз кіреді. forceSelect — міндетті түрде қайта таңдату. */
export async function signIn(forceSelect = false) {
  const client_id = getClientId(); if (!client_id) throw new Error('Алдымен Client ID енгізіңіз');
  if (!forceSelect && token && Date.now() < tokenExp) return token;
  await loadGsi();
  const granted = !!ls.get(GRANT_KEY) && !forceSelect, hint = ls.get(HINT_KEY) || undefined;
  return new Promise((res, rej) => {
    const tc = google.accounts.oauth2.initTokenClient({
      client_id, scope: SCOPES, prompt: granted ? '' : 'select_account consent', hint,
      callback: async r => {
        if (r.error) return rej(new Error(r.error_description || r.error));
        token = r.access_token; tokenExp = Date.now() + (r.expires_in - 60) * 1000;
        ls.set(TOK_KEY, JSON.stringify({tok: token, exp: tokenExp})); ls.set(GRANT_KEY, '1');
        if (!hint || forceSelect) { try { const u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {headers: {Authorization: `Bearer ${token}`}})).json(); if (u.email) ls.set(HINT_KEY, u.email); } catch { /* email қажет емес */ } }
        res(token);
      },
      error_callback: e => rej(new Error(e.type === 'popup_closed' ? 'Терезе жабылды' : e.message || e.type))
    });
    tc.requestAccessToken();
  });
}

export async function channelInfo(tok) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {headers: {Authorization: `Bearer ${tok}`}});
  if (!r.ok) throw new Error('Арна туралы мәлімет алынбады (' + r.status + ')');
  const it = (await r.json()).items?.[0]; if (!it) throw new Error('Бұл Google аккаунтта YouTube арнасы жоқ');
  return {id: it.id, title: it.snippet.title};
}

/** Resumable upload: прогрессті onProgress(0..1) арқылы қайтарады. Нәтиже: {id, url} */
export async function uploadVideo(tok, blob, {title, description, tags = [], privacy = 'private', onProgress = () => {}}) {
  const meta = {
    snippet: {title: title.slice(0, 100), description: description.slice(0, 4900), tags: tags.slice(0, 15), categoryId: '2'},
    status: {privacyStatus: privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true}
  };
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': blob.type || 'video/mp4', 'X-Upload-Content-Length': String(blob.size)},
    body: JSON.stringify(meta)
  });
  if (!init.ok) throw new Error(await apiError(init));
  const loc = init.headers.get('Location'); if (!loc) throw new Error('Жүктеу сессиясы ашылмады');
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open('PUT', loc); x.setRequestHeader('Content-Type', blob.type || 'video/mp4');
    x.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) { const j = JSON.parse(x.responseText); res({id: j.id, url: `https://www.youtube.com/shorts/${j.id}`, studio: `https://studio.youtube.com/video/${j.id}/edit`}); }
      else rej(new Error(`YouTube қатесі ${x.status}: ${x.responseText.slice(0, 200)}`));
    };
    x.onerror = () => rej(new Error('Желі қатесі жүктеу кезінде')); x.send(blob);
  });
}

async function apiError(r) {
  let m = ''; try { m = (await r.json()).error?.message || ''; } catch {}
  if (r.status === 403 && /quota/i.test(m)) return 'YouTube API күндік квотасы таусылды (бір жүктеу ~1600 ұпай, күніне шамамен 6 видео).';
  return `YouTube қатесі ${r.status}: ${m}`;
}
