/** Filtros conceituais e renderização do acervo em cartões, lista e tabela. */
function getAllUniqueSubareas() {
    const set = new Set();
    getAllWorks().forEach(obra => { if (obra.subarea) set.add(String(obra.subarea)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Adaptador legado: subáreas são opções de uma única seleção, não dezenas de chips. */
function renderSubareaChips() {
    const select = document.getElementById('filterSubareaSelect');
    if (!select) return;
    const subareas = getAllUniqueSubareas();
    const selected = selectedSubareas.values().next().value || 'all';
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = 'Todas as subáreas';
    const options = [all, ...subareas.map(name => {
        const item = document.createElement('option');
        item.value = name;
        item.textContent = name;
        return item;
    })];
    // Uma seleção removida do catálogo ainda pode ser retirada, sem desaparecimento silencioso.
    if (selected !== 'all' && !subareas.includes(selected)) {
        const missing = document.createElement('option');
        missing.value = selected;
        missing.textContent = selected + ' (não encontrada)';
        options.push(missing);
    }
    select.replaceChildren(...options);
    select.value = selected;
}

function onSubareaSelectChange(value) {
    selectedSubareas.clear();
    if (value && value !== 'all') selectedSubareas.add(value);
    updateActiveFiltersBar();
    filterCatalog();
}

/** Compatibilidade para atalhos antigos de cartão, dashboard e coleção. */
function toggleSubareaFilter(subarea) {
    onSubareaSelectChange(selectedSubareas.has(subarea) ? 'all' : subarea);
    renderSubareaChips();
}

function toggleTagFilter(tag) {
    if (selectedTags.has(tag)) selectedTags.delete(tag);
    else selectedTags.add(tag);
    updateActiveFiltersBar();
    filterCatalog();
}

/** Painel de filtros é opcional e devolve o foco ao seu acionador. */
function toggleExplorerFilters(show) {
    const panel = document.getElementById('explorerFilterPanel');
    const trigger = document.getElementById('explorerFiltersToggle');
    if (!panel || !trigger) return;
    const open = typeof show === 'boolean' ? show : panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) document.getElementById('filterSubareaSelect')?.focus();
    else trigger.focus();
}

function setupExplorerFilters() {
    if (window.libraryExplorerFiltersReady) return;
    window.libraryExplorerFiltersReady = true;
    document.addEventListener('keydown', event => {
        const panel = document.getElementById('explorerFilterPanel');
        if (event.key !== 'Escape' || !panel || panel.hidden || currentView !== 'explorer') return;
        if (!document.getElementById('catalogSuggestions')?.hidden) return;
        if (document.querySelector('.modal-overlay.open, .study-shell:not([hidden])')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleExplorerFilters(false);
    }, true);
}

/** Resumo dos critérios com botões seguros e acessíveis, sem HTML inline de dados pessoais. */
function updateActiveFiltersBar() {
    const bar = document.getElementById('activeFiltersBar');
    const list = document.getElementById('activeFilterChipsList');
    const counter = document.getElementById('explorerFilterCount');
    if (!bar || !list) return;
    const category = document.getElementById('filterCategorySelect');
    const status = document.getElementById('filterStatusSelect');
    const entries = [];
    for (const sub of selectedSubareas) entries.push({
        label: 'Subárea: ' + sub,
        remove() { selectedSubareas.clear(); renderSubareaChips(); }
    });
    for (const tag of selectedTags) entries.push({
        label: 'Tag: ' + tag, remove() { selectedTags.delete(tag); }
    });
    if (category?.value && category.value !== 'all') entries.push({
        label: 'Área: ' + (category.selectedOptions[0]?.textContent || category.value),
        remove() { category.value = 'all'; }
    });
    if (status?.value && status.value !== 'all') entries.push({
        label: 'Leitura: ' + (status.selectedOptions[0]?.textContent || status.value),
        remove() { status.value = 'all'; }
    });
    list.replaceChildren(...entries.map(entry => {
        const chip = document.createElement('span');
        chip.className = 'active-filter-chip';
        const label = document.createElement('span');
        label.textContent = entry.label;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-chip';
        remove.textContent = '✕';
        remove.setAttribute('aria-label', 'Remover filtro ' + entry.label);
        remove.addEventListener('click', () => {
            entry.remove();
            updateActiveFiltersBar();
            filterCatalog();
        });
        chip.append(label, remove);
        return chip;
    }));
    bar.hidden = entries.length === 0;
    if (counter) {
        counter.hidden = !entries.length;
        counter.textContent = String(entries.length);
    }
}

function onCategorySelectChange() {
    updateActiveFiltersBar();
    filterCatalog();
}

function renderExplorer() {
    renderSubareaChips();
    updateActiveFiltersBar();
    filterCatalog();
}

/** Retorna obras com critérios de faceta, sem texto: compartilhável com sugestões da busca (#2). */
function getCatalogFacetedWorks() {
    const category = document.getElementById('filterCategorySelect')?.value || 'all';
    const status = document.getElementById('filterStatusSelect')?.value || 'all';
    const subarea = selectedSubareas.values().next().value;
    const tags = [...selectedTags].map(tag => String(tag).toLocaleLowerCase('pt-BR'));
    return getAllWorks().filter(obra => {
        if (category !== 'all' && obra.codigo !== category) return false;
        const leitura = getLeitura(obra.id);
        if (status === 'favoritos' && !leitura.favorito) return false;
        if (['lendo', 'quero_ler', 'lido', 'nao_iniciado'].includes(status) && leitura.status !== status) return false;
        if (subarea && obra.subarea !== subarea) return false;
        const ownTags = new Set((obra.palavras_chave || []).map(t => String(t).toLocaleLowerCase('pt-BR')));
        return tags.every(t => ownTags.has(t));
    });
}

function normalizeExplorerQuery(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function filterCatalog() {
    const query = normalizeExplorerQuery(document.getElementById('globalSearchInput')?.value);
    const author = normalizeExplorerQuery(catalogSearchState.author);
    const sort = document.getElementById('filterSortSelect')?.value || 'autor_asc';
    const filtered = getCatalogFacetedWorks().filter(obra => {
        // Ao escolher Autor nas sugestões, filtrar pela autoria exata, não por menções no resumo.
        if (author) return normalizeExplorerQuery(obra.autor) === author;
        return !query || normalizeExplorerQuery([
            obra.autor, obra.titulo, obra.subarea, obra.resumo,
            (obra.palavras_chave || []).join(' ')
        ].join(' ')).includes(query);
    });
    filtered.sort((a, b) => {
        if (sort === 'autor_asc') return (a.autor || '').localeCompare(b.autor || '', 'pt-BR');
        if (sort === 'titulo_asc') return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR');
        if (sort === 'pags_desc') return (b.paginas || 0) - (a.paginas || 0);
        if (sort === 'pags_asc') return (a.paginas || 0) - (b.paginas || 0);
        if (sort === 'codigo_asc') return (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR');
        return 0;
    });
    const total = getAllWorks().length;
    document.getElementById('resultsCount').textContent = filtered.length
        ? 'Exibindo ' + filtered.length + ' de ' + total + ' obras'
        : 'Nenhuma obra corresponde aos filtros (' + total + ' no acervo)';
    updateActiveFiltersBar();
    updateCatalogSearchSummary();
    renderCards(filtered);
    renderList(filtered);
    renderTable(filtered);
}

function renderCards(obras) {
    const container = document.getElementById('cardsContainer');
    if (obras.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Nenhuma obra encontrada com a combinação atual de filtros.</p>`;
        return;
    }

    container.innerHTML = obras.map(o => {
        const lei = getLeitura(o.id);
        const catClass = o.codigo === '1.2' ? 'cat-12' : 'cat-' + o.codigo;
        const uri = o.uri || 'file:///' + o.caminho.replace(/\\/g, '/');

        return `
            <div class="work-card">
                <div class="card-top">
                    <div class="card-badges">
                        <span class="badge badge-${catClass}">${o.codigo} · ${escapeHtml(o.categoria)}</span>
                        <span class="badge badge-subarea" onclick="filterBySubarea('${escapeJs(o.subarea)}')">${escapeHtml(o.subarea)}</span>
                        <span class="badge badge-status ${lei.status}">${lei.status === 'lido' ? '✅ Lido' : (lei.status === 'lendo' ? '📖 Lendo' : '⚪ Não Lido')}</span>
                    </div>
                    <button class="card-favorite-btn ${lei.favorito ? 'favorited' : ''}" onclick="toggleFavoriteQuick(${o.id}, this)" title="Favoritar">★</button>
                </div>
                <div class="card-author">${escapeHtml(o.autor)}</div>
                <h3 class="card-title" onclick="openWorkSheet(${o.id})">${escapeHtml(o.titulo)}</h3>
                <p class="card-abstract">${escapeHtml(o.resumo)}</p>
                <div class="card-tags">
                    ${(o.palavras_chave || []).map(t => `<span class="card-tag ${selectedTags.has(t) ? 'active' : ''}" onclick="toggleTagFilter('${escapeJs(t)}')">${escapeHtml(t)}</span>`).join('')}
                </div>
                <div class="card-footer">
                    <span class="card-meta-text">${o.paginas} págs · ${o.tamanho_mb} MB</span>
                    <div class="card-actions">
                        <button class="btn-action-primary" onclick="openStudy(${o.id})">Estudar</button>
                        <button class="btn-action-secondary" onclick="openWorkSheet(${o.id})">Ficha</button>
                        <button class="btn-action-secondary" onclick="openFichamento(${o.id})">Fichamento</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderList(obras) {
    const container = document.getElementById('listContainer');
    container.innerHTML = obras.map(o => {
        const lei = getLeitura(o.id);
        const uri = o.uri || 'file:///' + o.caminho.replace(/\\/g, '/');
        return `
            <div class="academic-list-item">
                <span class="item-list-code">${o.codigo}</span>
                <div class="item-list-content">
                    <div class="item-list-author">${escapeHtml(o.autor)} · <span style="color:var(--primary);font-weight:600;">${escapeHtml(o.subarea)}</span></div>
                    <h3 class="item-list-title" onclick="openWorkSheet(${o.id})">${escapeHtml(o.titulo)}</h3>
                    <p class="item-list-resumo">${escapeHtml(o.resumo)}</p>
                    <div class="item-list-meta">
                        <span><b>${o.paginas}</b> páginas</span>
                        <span><b>${o.tamanho_mb}</b> MB</span>
                        <span><b>Área:</b> ${escapeHtml(o.categoria)}</span>
                        <span class="badge badge-status ${lei.status}">${lei.status === 'lido' ? '✅ Lido' : lei.status}</span>
                    </div>
                </div>
                <div class="item-list-actions">
                    <button class="btn-action-primary" onclick="openStudy(${o.id})">Estudar</button>
                    <button class="btn-action-secondary" style="width:100%;" onclick="openWorkSheet(${o.id})">Ver Ficha</button>
                    <button class="btn-action-secondary" style="width:100%;" onclick="openFichamento(${o.id})">Fichamento</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderTable(obras) {
    const tbody = document.getElementById('tableBodyContainer');
    tbody.innerHTML = obras.map(o => {
        const lei = getLeitura(o.id);
        const uri = o.uri || 'file:///' + o.caminho.replace(/\\/g, '/');
        return `
            <tr>
                <td><span class="badge" style="background:var(--bg-body);color:var(--text-muted);">${o.codigo}</span></td>
                <td>
                    <div>${escapeHtml(o.categoria)}</div>
                    <span class="badge badge-subarea" onclick="filterBySubarea('${escapeJs(o.subarea)}')">${escapeHtml(o.subarea)}</span>
                </td>
                <td style="font-weight:700;">${escapeHtml(o.autor)}</td>
                <td><a href="javascript:void(0)" onclick="openWorkSheet(${o.id})" style="color:var(--text-primary);font-weight:600;">${escapeHtml(o.titulo)}</a></td>
                <td style="text-align:right;">${o.paginas}</td>
                <td><span class="badge badge-status ${lei.status}">${lei.status === 'lido' ? '✅ Lido' : lei.status}</span></td>
                <td style="text-align:center;white-space:nowrap;">
                    <button class="btn-action-primary" onclick="openStudy(${o.id})">Estudar</button>
                    <button class="btn-action-secondary" style="padding:4px 8px;font-size:11px;" onclick="openWorkSheet(${o.id})">Ficha</button>
                    <button class="btn-action-secondary" style="padding:4px 8px;font-size:11px;" onclick="openFichamento(${o.id})">Fichamento</button>
                </td>
            </tr>
        `;
    }).join('');
}

// RENDERIZAÇÃO DO DASHBOARD
