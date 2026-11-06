/** Atalhos de navegação que aplicam filtros e atualizam o explorador. */
function filterBySubarea(subarea) {
    selectedSubareas.clear();
    selectedSubareas.add(subarea);
    renderSubareaChips();
    updateActiveFiltersBar();
    switchView('explorer', 'Subárea: ' + subarea);
}

function filterByTagDirect(tag) {
    selectedTags.clear();
    selectedTags.add(tag);
    updateActiveFiltersBar();
    switchView('explorer', 'Tag: ' + tag);
}

function filterByCategory(code) {
    document.getElementById('filterCategorySelect').value = code;
    updateActiveFiltersBar();
    switchView('explorer', 'Área ' + code);
}

function filterByReadingStatus(status) {
    document.getElementById('filterStatusSelect').value = status;
    updateActiveFiltersBar();
    switchView('explorer', 'Status: ' + status);
}

function filterByAuthor(author) {
    switchView('explorer', 'Autor: ' + author);
    document.getElementById('explorerSearchInput').value = author;
    filterCatalog();
}

function clearExplorerSearch() {
    document.getElementById('explorerSearchInput').value = '';
    filterCatalog();
}

function handleGlobalSearch(val) {
    switchView('explorer', 'Busca no Acervo');
    document.getElementById('explorerSearchInput').value = val;
    filterCatalog();
}

function executeHeroSearch() {
    const q = document.getElementById('heroSearchInput').value.trim();
    handleGlobalSearch(q);
}

function resetAllFilters() {
    document.getElementById('explorerSearchInput').value = '';
    document.getElementById('filterCategorySelect').value = 'all';
    document.getElementById('filterStatusSelect').value = 'all';
    document.getElementById('filterSortSelect').value = 'autor_asc';
    const global = document.getElementById('globalSearchInput');
    if (global) global.value = '';
    selectedSubareas.clear();
    selectedTags.clear();
    renderSubareaChips();
    updateActiveFiltersBar();
    filterCatalog();
}

// AUTORES & TEMAS
