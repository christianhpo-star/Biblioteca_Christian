/** Tema, navegação e modos de visualização; preserva os handlers existentes do HTML. */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    appState.config.theme = next;
    saveAppState();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const label = document.getElementById('themeToggleLabel');
    if (label) {
        label.textContent = theme === 'dark' ? 'Tema Escuro' : 'Tema Claro';
    }
}

function toggleSidebarCollapse() {
    if (matchMedia('(max-width: 900px)').matches) { document.body.classList.toggle('mobile-menu-open'); return; }
    document.body.classList.toggle('sidebar-collapsed');
    appState.config.sidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
    saveAppState();
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            document.getElementById('globalSearchInput').focus();
        } else if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function switchView(viewName, title = '') {
    currentView = viewName;
    document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetPane = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (targetPane) targetPane.classList.add('active');

    const viewTitles = {
        dashboard: 'Início (Dashboard)',
        explorer: 'Explorar Acervo de Obras',
        subareas: 'Sub-Áreas Acadêmicas de Pesquisa',
        collections: 'Coleções de Pesquisa',
        fichamentos: 'Cadernos e Fichamentos',
        quotes: 'Mural de Notas & Citações',
        authors: 'Autores (A-Z)',
        topics: 'Nuvens de Temas & Conceitos',
        maintenance: 'Central de Auditoria de Metadados',
        backup: 'Backup & Gestão de Dados'
    };

    document.getElementById('currentViewTitle').textContent = title || viewTitles[viewName] || 'Biblioteca';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'explorer') filterCatalog();
    if (viewName === 'subareas') renderSubareasView();
    if (viewName === 'collections') renderCollections();
    if (viewName === 'fichamentos') renderFichamentosList();
    if (viewName === 'quotes') renderQuotesFeed();
}

function setViewMode(mode, save = true) {
    document.querySelectorAll('.btn-view-mode').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btnMode' + mode.charAt(0).toUpperCase() + mode.slice(1));
    if (btn) btn.classList.add('active');

    const cards = document.getElementById('cardsContainer');
    const list = document.getElementById('listContainer');
    const table = document.getElementById('tableContainer');

    cards.style.display = mode === 'cards' ? 'grid' : 'none';
    list.style.display = mode === 'list' ? 'flex' : 'none';
    table.style.display = mode === 'table' ? 'block' : 'none';

    if (save) {
        appState.config.viewMode = mode;
        saveAppState();
    }
}
