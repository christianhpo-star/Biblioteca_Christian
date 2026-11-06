/** Persistência no navegador e evento usado pela sincronização; não grava arquivos no Drive. */
function loadAppState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            appState = { ...appState, ...parsed };
        }
    } catch (e) {
        console.error("Erro ao carregar localStorage:", e);
    }
}

function saveAppState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        updateBadgesAndKpis();
        window.dispatchEvent(new CustomEvent('library-state-changed'));
    } catch (e) {
        console.error("Erro ao salvar localStorage:", e);
    }
}
