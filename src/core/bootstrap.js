/** Inicialização do catálogo; o modo autenticado aguarda o carregamento pela ponte. */
function initializeLibrary() {
    applyTheme(appState.config.theme || 'light');
    if (appState.config.sidebarCollapsed) {
        document.body.classList.add('sidebar-collapsed');
    }
    setViewMode(appState.config.viewMode || 'cards', false);
    updateBadgesAndKpis();
    renderSubareaChips();
    renderDashboard();
    renderExplorer();
    renderSubareasView();
    renderFichamentosList();
    renderAuthors();
    renderTopics();
    renderAuditCenter();
    setupExplorerFilters();
    if (!window.libraryShortcutsReady) { setupKeyboardShortcuts(); window.libraryShortcutsReady = true; }
}

// Local mode starts after deferred feature scripts; Firebase starts through the bridge.
document.addEventListener('DOMContentLoaded', () => {
  if (window.LIBRARY_CONFIG.mode !== 'firebase') {
    loadAppState(); initializeLibrary();
    document.body.classList.remove('auth-locked');
    document.getElementById('authGate').hidden = true;
    document.getElementById('cloudBar').hidden = true;
  }
});
