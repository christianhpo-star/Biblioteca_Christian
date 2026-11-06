/**
 * Busca única do catálogo: sugestões locais por obra/autor, interação por
 * teclado/toque e estado efêmero. Nunca grava consultas no estado sincronizado.
 */
const catalogSearchState = {
    activeIndex: -1,
    suggestions: [],
    author: null,
    openedFromDashboard: false
};

function normalizeCatalogSearch(value) {
    return String(value || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .replace(/\s+/g, ' ').trim();
}

/** Gera até seis sugestões únicas, sempre usando somente obras já filtradas. */
function buildCatalogSuggestions(query, obras) {
    const term = normalizeCatalogSearch(query);
    if (!term) return [];

    const authors = new Map();
    const works = [];

    (obras || []).forEach(obra => {
        const author = String(obra.autor || '').trim();
        const title = String(obra.titulo || '').trim();
        const normalizedAuthor = normalizeCatalogSearch(author);
        const normalizedTitle = normalizeCatalogSearch(title);

        if (normalizedAuthor) {
            if (!authors.has(normalizedAuthor)) {
                authors.set(normalizedAuthor, { kind: 'author', label: author, count: 0, rank: 99 });
            }
            const entry = authors.get(normalizedAuthor);
            entry.count += 1;
            if (normalizedAuthor.startsWith(term)) entry.rank = 0;
            else if (normalizedAuthor.includes(term)) entry.rank = Math.min(entry.rank, 1);
        }

        let rank = 99;
        if (normalizedTitle.startsWith(term)) rank = 0;
        else if (normalizedAuthor.startsWith(term)) rank = 1;
        else if (normalizedTitle.includes(term)) rank = 2;
        else if (normalizedAuthor.includes(term)) rank = 3;
        if (rank < 99) works.push({
            kind: 'work', id: obra.id, label: title, author, rank
        });
    });

    const compare = (a, b) => a.rank - b.rank
        || a.label.localeCompare(b.label, 'pt-BR')
        || String(a.id || '').localeCompare(String(b.id || ''));
    const rankedWorks = works.sort(compare);
    const rankedAuthors = [...authors.values()].filter(a => a.rank < 99).sort(compare);

    // Reservar espaço para autores evita que várias obras do mesmo autor
    // ocultem a única sugestão de autoria disponível.
    const selected = [...rankedWorks.slice(0, 4), ...rankedAuthors.slice(0, 2)];
    for (const extra of [...rankedWorks.slice(4), ...rankedAuthors.slice(2)]) {
        if (selected.length >= 6) break;
        selected.push(extra);
    }
    return selected;
}

function hasActiveCatalogFilters() {
    const category = document.getElementById('filterCategorySelect');
    const status = document.getElementById('filterStatusSelect');
    return (category && category.value !== 'all')
        || (status && status.value !== 'all')
        || selectedSubareas.size > 0 || selectedTags.size > 0;
}

/** Atualiza a pista de busca no explorador sem criar um segundo campo. */
function updateCatalogSearchSummary() {
    const input = document.getElementById('globalSearchInput');
    const summary = document.getElementById('catalogSearchSummary');
    const clear = document.getElementById('searchClearBtn');
    if (!input || !summary || !clear) return;
    const query = input.value.trim();
    summary.textContent = catalogSearchState.author
        ? 'Autor: ' + catalogSearchState.author
        : query ? 'Busca: ' + query : 'Digite no campo do cabeçalho';
    clear.style.display = query ? 'inline-flex' : 'none';
}

function closeCatalogSuggestions() {
    const panel = document.getElementById('catalogSuggestions');
    const input = document.getElementById('globalSearchInput');
    if (panel) panel.hidden = true;
    if (input) {
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
    }
    catalogSearchState.activeIndex = -1;
}

/** Regenera somente a pequena lista flutuante, sem trocar de tela ao digitar. */
function renderCatalogSuggestions() {
    const input = document.getElementById('globalSearchInput');
    const panel = document.getElementById('catalogSuggestions');
    if (!input || !panel) return;
    updateCatalogSearchSummary();
    const query = input.value.trim();
    if (!query) {
        catalogSearchState.suggestions = [];
        closeCatalogSuggestions();
        return;
    }
    const available = getCatalogFacetedWorks();
    catalogSearchState.suggestions = buildCatalogSuggestions(query, available);
    catalogSearchState.activeIndex = -1;
    const items = catalogSearchState.suggestions;

    let content = '<div class="catalog-suggestions-context">'
        + (hasActiveCatalogFilters() ? 'Sugestões respeitam os filtros ativos' : 'Sugestões do acervo')
        + '</div>';
    if (!items.length) {
        content += '<div class="catalog-suggestions-empty" role="status">'
            + 'Nenhum título ou autor sugerido. Pressione Enter para procurar também em temas e resumos.'
            + '</div>';
    } else {
        for (const kind of ['work', 'author']) {
            const group = items.map((item, index) => ({ item, index }))
                .filter(entry => entry.item.kind === kind);
            if (!group.length) continue;
            content += '<div class="catalog-suggestions-heading" role="presentation">'
                + (kind === 'work' ? 'Obras' : 'Autores') + '</div>';
            for (const entry of group) {
                const item = entry.item;
                const detail = kind === 'work'
                    ? item.author
                    : item.count + (item.count === 1 ? ' obra' : ' obras');
                content += '<div class="catalog-suggestion-option" role="option" aria-selected="false"'
                    + ' id="catalogSuggestion' + entry.index + '" data-suggestion-index="' + entry.index + '">'
                    + '<span class="catalog-suggestion-label">' + escapeHtml(item.label) + '</span>'
                    + '<span class="catalog-suggestion-detail">' + escapeHtml(detail) + '</span>'
                    + '</div>';
            }
        }
    }
    panel.innerHTML = content;
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
}

function highlightCatalogSuggestion(index) {
    const input = document.getElementById('globalSearchInput');
    const panel = document.getElementById('catalogSuggestions');
    if (!input || !panel || !catalogSearchState.suggestions.length) return;
    const total = catalogSearchState.suggestions.length;
    catalogSearchState.activeIndex = ((index % total) + total) % total;
    panel.querySelectorAll('[role="option"]').forEach(option => {
        const active = Number(option.dataset.suggestionIndex) === catalogSearchState.activeIndex;
        option.classList.toggle('active', active);
        option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const activeOption = document.getElementById('catalogSuggestion' + catalogSearchState.activeIndex);
    input.setAttribute('aria-activedescendant', activeOption.id);
    activeOption.scrollIntoView({ block: 'nearest' });
}

function selectCatalogSuggestion(index) {
    const item = catalogSearchState.suggestions[index];
    if (!item) return;
    closeCatalogSuggestions();
    if (item.kind === 'work') {
        openWorkSheet(item.id);
        return;
    }
    showWorksByAuthor(item.label);
}

function showWorksByAuthor(author) {
    const input = document.getElementById('globalSearchInput');
    catalogSearchState.author = String(author || '');
    input.value = catalogSearchState.author;
    closeCatalogSuggestions();
    switchView('explorer', 'Autor: ' + catalogSearchState.author);
    filterCatalog();
}

function submitCatalogSearch() {
    const query = document.getElementById('globalSearchInput').value.trim();
    catalogSearchState.author = null;
    catalogSearchState.openedFromDashboard = currentView === 'dashboard';
    closeCatalogSuggestions();
    if (!query) {
        switchView('dashboard');
        return;
    }
    switchView('explorer', 'Busca no Acervo');
    filterCatalog();
}

/** Enter sem seleção executa a busca textual; setas percorrem as sugestões. */
function handleCatalogSearchKeydown(event) {
    const panel = document.getElementById('catalogSuggestions');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (panel.hidden) renderCatalogSuggestions();
        if (catalogSearchState.suggestions.length) {
            event.preventDefault();
            const shift = event.key === 'ArrowDown' ? 1 : -1;
            highlightCatalogSuggestion(catalogSearchState.activeIndex + shift);
        }
    } else if (event.key === 'Enter') {
        event.preventDefault();
        if (!panel.hidden && catalogSearchState.activeIndex >= 0) {
            selectCatalogSuggestion(catalogSearchState.activeIndex);
        } else {
            submitCatalogSearch();
        }
    } else if (event.key === 'Escape' && !panel.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeCatalogSuggestions();
    }
}

function focusCatalogSearch() {
    const input = document.getElementById('globalSearchInput');
    input.focus();
    if (input.value.trim()) renderCatalogSuggestions();
}

/** Eventos registrados uma vez; seleção por índice evita HTML com handlers de dados. */
function setupCatalogSearch() {
    if (window.librarySearchReady) return;
    window.librarySearchReady = true;
    const panel = document.getElementById('catalogSuggestions');
    panel.addEventListener('click', event => {
        const option = event.target.closest('[data-suggestion-index]');
        if (option) selectCatalogSuggestion(Number(option.dataset.suggestionIndex));
    });
    document.addEventListener('pointerdown', event => {
        if (!event.target.closest('.header-search-bar')) closeCatalogSuggestions();
    });
    document.addEventListener('focusin', event => {
        if (!event.target.closest('.header-search-bar')) closeCatalogSuggestions();
    });
    updateCatalogSearchSummary();
}
