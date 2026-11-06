// Contract between catalog state and optional authenticated synchronization.
window.libraryBridge = {
  setCatalog(obras, fichamentos, uid) {
    OBRAS_BASE = obras; FICHAMENTOS_BASE = fichamentos; STORAGE_KEY = 'BIBLIOTECA_CLOUD_STATE_' + uid;
    window.libraryCloudCacheKey = 'BIBLIOTECA_CLOUD_CACHE_' + uid;
  },
  defaultState: createDefaultAppState,
  getState: () => structuredClone(appState),
  start(state) { appState = state; initializeLibrary(); },
  replaceState(state) {
    appState = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyTheme(appState.config.theme || 'light');
    updateBadgesAndKpis(); renderDashboard(); filterCatalog(); renderFichamentosList();
    renderSubareasView(); renderAuthors(); renderTopics();
    if(currentView === 'collections') renderCollections();
    if(currentView === 'quotes') renderQuotesFeed();
  },
  clear() {
    OBRAS_BASE = []; FICHAMENTOS_BASE = {}; appState = createDefaultAppState();
    document.querySelectorAll('.study-shell').forEach(node => { node.hidden = true; });
    document.body.style.overflow = '';
  }
};
