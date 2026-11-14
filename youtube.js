// YouTube Data API арқылы тікелей жүктеу (Google OAuth, аккаунт таңдау терезесімен).
// Client ID — пайдаланушының өз Google Cloud жобасынан; тек осы браузерде сақталады.

const CID_KEY = 'drivevault-yt-client';
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
let gsiPromise, token = null, tokenExp = 0;

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

/** Google аккаунт таңдау терезесін ашып, рұқсат алады. forceSelect — әрқашан аккаунт сұрау. */
export async function signIn(forceSelect = true) {
  const client_id = getClientId(); if (!client_id) throw new Error('Алдымен Client ID енгізіңіз');
  if (!forceSelect && token && Date.now() < tokenExp) return token;
  await loadGsi();
  return new Promise((res, rej) => {
    const tc = google.accounts.oauth2.initTokenClient({
      client_id, scope: SCOPES, prompt: forceSelect ? 'select_account consent' : '',
      callback: r => { if (r.error) return rej(new Error(r.error_description || r.error)); token = r.access_token; tokenExp = Date.now() + (r.expires_in - 60) * 1000; res(token); },
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
