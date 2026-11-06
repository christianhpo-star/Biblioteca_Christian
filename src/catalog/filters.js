/** Atalhos de navegação que aplicam filtros e atualizam o explorador. */
function filterBySubarea(subarea) {
    selectedSubareas.clear();
    selectedSubareas.add(subarea);
    renderSubareaChips();
    updateActiveFiltersBar();
    switchView('explorer', 'Sub-Área: ' + subarea);
    filterCatalog();
}

function filterByTagDirect(tag) {
    selectedTags.clear();
    selectedTags.add(tag);
    updateActiveFiltersBar();
    switchView('explorer', 'Tag: ' + tag);
    filterCatalog();
}

function filterByCategory(code) {
    switchView('explorer', 'Área ' + code);
    document.getElementById('filterCategorySelect').value = code;
    filterCatalog();
}

function filterByReadingStatus(status) {
    switchView('explorer', 'Status: ' + status);
    document.getElementById('filterStatusSelect').value = status;
    filterCatalog();
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
    selectedSubareas.clear();
    selectedTags.clear();
    renderSubareaChips();
    updateActiveFiltersBar();
    filterCatalog();
}

// AUTORES & TEMAS
