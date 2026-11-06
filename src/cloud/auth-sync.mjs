import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, onAuthStateChanged, signOut, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore';
import { mergeDelta, same, validateState } from './sync-core.mjs';

const {firebase: config, ownerEmail, databaseId = 'biblioteca'} = window.LIBRARY_CONFIG;
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, databaseId);
if (__EMULATORS__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  window.testFirebase = { auth, db, signIn: (email = ownerEmail) => signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({sub:email,email,email_verified:true,name:'Christian'}))) };
}
const bridge = window.libraryBridge;
window.libraryValidateState = validateState;
const gate = document.getElementById('authGate');
const message = document.getElementById('authMessage');
const status = document.getElementById('cloudStatus');
const login = document.getElementById('googleLogin');
const logout = document.getElementById('cloudLogout');
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ login_hint: ownerEmail, prompt: 'select_account' });
let uid = null, stateRef = null, unsubscribe = null, timer = null;
let baseline = null, revision = 0, savePromise = null, deferred = null, session = 0;
let cacheKey = '', ready = false;
function setStatus(text) { status.textContent = text; }
function cache() {
  if (!ready || !cacheKey) return;
  try { localStorage.setItem(cacheKey, JSON.stringify({ state: bridge.getState(), baseline, dirty: !same(baseline, bridge.getState()) })); }
  catch { setStatus('Sem espaço local. Exporte um backup.'); }
}
function errorText(error) {
  console.error('Biblioteca:', error.code || error.message);
  const messages = {
    'auth/popup-closed-by-user': 'O login foi fechado. Toque em Entrar para tentar novamente.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente novamente.',
    'auth/unauthorized-domain': 'Este endereço ainda não foi autorizado no login Google.',
    'permission-denied': 'Acesso negado. Use a conta proprietária configurada.',
    'unavailable': 'Não foi possível alcançar o banco. Seus dados locais foram preservados.'
  };
  return messages[error.code] || error.message || 'Não foi possível sincronizar. Tente novamente.';
}
async function flush() {
  if (savePromise) return savePromise;
  if (!ready || !stateRef || same(baseline, bridge.getState())) return;
  cache();
  if (!navigator.onLine) { setStatus('Offline · alterações guardadas neste dispositivo'); return; }
  const base = structuredClone(baseline), local = validateState(structuredClone(bridge.getState()));
  const ref = stateRef, generation = session;
  setStatus('Sincronizando…');
  savePromise = (async () => {
    try {
      const result = await runTransaction(db, async tx => {
        const snapshot = await tx.get(ref);
        const remote = snapshot.exists() ? validateState(JSON.parse(snapshot.data().payload)) : base;
        const merged = validateState(mergeDelta(base, local, remote));
        const nextRevision = (snapshot.exists() ? snapshot.data().revision : 0) + 1;
        tx.set(ref, { schema: 1, payload: JSON.stringify(merged), revision: nextRevision, updatedAt: serverTimestamp() });
        return { state: merged, revision: nextRevision };
      });
      if (generation !== session) return;
      const current = bridge.getState();
      baseline = result.state; revision = result.revision;
      const combined = validateState(mergeDelta(local, current, result.state));
      if (!same(current, combined)) bridge.replaceState(combined);
      cache(); setStatus(same(baseline, bridge.getState()) ? 'Sincronizado' : 'Alterações pendentes');
    } catch (error) { cache(); setStatus('Não sincronizado · ' + errorText(error)); }
  })();
  try { await savePromise; }
  finally {
    savePromise = null;
    if (deferred) { const next = deferred; deferred = null; receive(next); }
    // Only schedule again after a successful commit; errors require retry/online.
    if (generation === session && revision > 0 && !same(baseline, bridge.getState()) && status.textContent === 'Alterações pendentes') schedule();
  }
}
function receive(snapshot) {
  if (!ready || !snapshot.exists() || snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
  if (snapshot.data().revision <= revision) return;
  if (savePromise) { deferred = snapshot; return; }
  try {
    const remote = validateState(JSON.parse(snapshot.data().payload));
    const merged = validateState(mergeDelta(baseline, bridge.getState(), remote));
    baseline = remote; revision = snapshot.data().revision;
    if (!same(bridge.getState(), merged)) bridge.replaceState(merged);
    cache(); setStatus(same(baseline, merged) ? 'Sincronizado' : 'Alterações pendentes');
    if (!same(baseline, merged)) schedule();
  } catch (error) { setStatus(errorText(error)); }
}
function schedule() { clearTimeout(timer); cache(); timer = setTimeout(() => flush().catch(e => setStatus(errorText(e))), 700); }
window.addEventListener('library-state-changed', schedule);
window.addEventListener('online', () => flush().catch(e => setStatus(errorText(e))));
window.addEventListener('offline', () => setStatus('Offline · alterações guardadas neste dispositivo'));
document.addEventListener('visibilitychange', () => { if (document.hidden) { cache(); flush().catch(() => {}); } });
window.addEventListener('beforeunload', event => {
  if (ready && !same(baseline, bridge.getState())) { cache(); event.preventDefault(); event.returnValue = ''; }
});
document.getElementById('cloudRetry').onclick = () => flush().catch(e => setStatus(errorText(e)));
login.onclick = async () => {
  login.disabled = true; message.textContent = 'Abrindo sua conta Google…';
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider);
    else message.textContent = errorText(error);
  } finally { login.disabled = false; }
};
logout.onclick = async () => {
  if (ready && !same(baseline, bridge.getState())) {
    if (!navigator.onLine) { setStatus('Conecte-se para sincronizar antes de sair.'); return; }
    await flush();
    if (!same(baseline, bridge.getState())) { setStatus('Há alterações pendentes. Tente sincronizar antes de sair.'); return; }
  }
  await signOut(auth);
};
getRedirectResult(auth).catch(error => { message.textContent = errorText(error); });
onAuthStateChanged(auth, async user => {
  const generation = ++session;
  ready = false; clearTimeout(timer); unsubscribe?.(); unsubscribe = null;
  document.body.classList.add('auth-locked'); gate.hidden = false;
  if (!user) {
    uid = null; stateRef = null; baseline = null; revision = 0;
    bridge.clear(); message.textContent = 'Entre com sua conta Google para acessar a biblioteca.'; return;
  }
  if (user.email !== ownerEmail || !user.emailVerified) {
    await signOut(auth); message.textContent = 'Esta biblioteca é privada. Entre com a conta proprietária configurada.'; return;
  }
  message.textContent = 'Carregando seu catálogo e suas leituras…';
  try {
    uid = user.uid; stateRef = doc(db, 'users', uid, 'state', 'main');
    const [catalogSnapshot, stateSnapshot] = await Promise.all([getDocFromServer(doc(db, 'library', 'base')), getDocFromServer(stateRef)]);
    if (generation !== session) return;
    if (!catalogSnapshot.exists()) throw new Error('O catálogo ainda não foi carregado no servidor.');
    const catalog = JSON.parse(catalogSnapshot.data().payload);
    bridge.setCatalog(catalog.obras, catalog.fichamentos, uid);
    const defaults = bridge.defaultState();
    baseline = stateSnapshot.exists() ? validateState(JSON.parse(stateSnapshot.data().payload)) : defaults;
    revision = stateSnapshot.exists() ? stateSnapshot.data().revision : 0;
    cacheKey = 'BIBLIOTECA_CLOUD_CACHE_' + uid;
    let initial = structuredClone(baseline);
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached?.dirty) initial = validateState(mergeDelta(validateState(cached.baseline), validateState(cached.state), baseline));
    } catch { setStatus('Cache local inválido; usando a cópia da nuvem.'); }
    bridge.start(initial); ready = true; cache();
    gate.hidden = true; document.body.classList.remove('auth-locked');
    document.getElementById('cloudAccount').textContent = user.email;
    setStatus('Sincronizado');
    unsubscribe = onSnapshot(stateRef, { includeMetadataChanges: true }, receive, error => setStatus(errorText(error)));
    if (!stateSnapshot.exists()) {
      // Force creation without treating default reading statuses as user edits.
      await runTransaction(db, async tx => {
        const found = await tx.get(stateRef);
        if (!found.exists()) tx.set(stateRef, { schema: 1, payload: JSON.stringify(initial), revision: 1, updatedAt: serverTimestamp() });
      });
    } else if (!same(initial, baseline)) schedule();
  } catch (error) {
    message.textContent = errorText(error);
    login.textContent = 'Tentar entrar novamente'; login.disabled = false;
  }
});
if ('serviceWorker' in navigator && !__EMULATORS__) navigator.serviceWorker.register('/sw.js').catch(() => {});
