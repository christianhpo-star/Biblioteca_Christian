/** Alterações rápidas de favorito e situação de leitura, com persistência. */
function toggleFavoriteQuick(id, btn) {
    const lei = getLeitura(id);
    const next = !lei.favorito;
    appState.leituras[id] = { ...lei, favorito: next };
    btn.classList.toggle('favorited', next);
    saveAppState();
}

function setQuickReadingStatus(id, status) {
    appState.leituras[id] = { ...getLeitura(id), status };
    saveAppState();
    renderDashboard();
    filterCatalog();
}
