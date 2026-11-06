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

/** Exibe a lista do autor escolhido, preservando os filtros ativos. */
function filterByAuthor(author) {
    showWorksByAuthor(author);
}

function clearExplorerSearch() {
    clearCatalogSearch();
}

/** Compatibilidade com atalhos legados que enviam uma pesquisa pronta. */
function handleGlobalSearch(value) {
    const input = document.getElementById('globalSearchInput');
    if (!input) return;
    input.value = value;
    onCatalogSearchInput();
    submitCatalogSearch();
}

function executeHeroSearch() {
    focusCatalogSearch();
}

function resetAllFilters() {
    const input = document.getElementById('globalSearchInput');
    if (input) input.value = '';
    catalogSearchState.author = null;
    closeCatalogSuggestions();
    document.getElementById('filterCategorySelect').value = 'all';
    document.getElementById('filterStatusSelect').value = 'all';
    document.getElementById('filterSortSelect').value = 'autor_asc';
    updateCatalogSearchSummary();
    selectedSubareas.clear();
    selectedTags.clear();
    renderSubareaChips();
    updateActiveFiltersBar();
    filterCatalog();
}

// AUTORES & TEMAS
