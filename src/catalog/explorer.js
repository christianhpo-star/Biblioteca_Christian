/** Filtros conceituais e renderização do acervo em cartões, lista e tabela. */
function getAllUniqueSubareas() {
    const set = new Set();
    getAllWorks().forEach(o => {
        if (o.subarea) set.add(o.subarea);
    });
    return Array.from(set).sort();
}

function renderSubareaChips() {
    const container = document.getElementById('subareasChipsContainer');
    const subareas = getAllUniqueSubareas();

    container.innerHTML = subareas.map(sub => `
        <span class="subarea-chip ${selectedSubareas.has(sub) ? 'active' : ''}" onclick="toggleSubareaFilter('${escapeJs(sub)}')">
            ${escapeHtml(sub)}
        </span>
    `).join('');
}

function toggleSubareaFilter(subarea) {
    if (selectedSubareas.has(subarea)) {
        selectedSubareas.delete(subarea);
    } else {
        selectedSubareas.add(subarea);
    }
    renderSubareaChips();
    updateActiveFiltersBar();
    filterCatalog();
}

function toggleTagFilter(tag) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
    } else {
        selectedTags.add(tag);
    }
    updateActiveFiltersBar();
    filterCatalog();
}

function toggleFilterLogic() {
    filterLogic = filterLogic === 'AND' ? 'OR' : 'AND';
    document.getElementById('logicOptAnd').classList.toggle('active', filterLogic === 'AND');
    document.getElementById('logicOptOr').classList.toggle('active', filterLogic === 'OR');
    filterCatalog();
}

function updateActiveFiltersBar() {
    const bar = document.getElementById('activeFiltersBar');
    const list = document.getElementById('activeFilterChipsList');

    const hasActive = selectedSubareas.size > 0 || selectedTags.size > 0;
    bar.style.display = hasActive ? 'flex' : 'none';

    let chipsHtml = '';
    selectedSubareas.forEach(sub => {
        chipsHtml += `
            <span class="active-filter-chip">
                Sub-Área: ${escapeHtml(sub)}
                <span class="remove-chip" onclick="toggleSubareaFilter('${escapeJs(sub)}')">✕</span>
            </span>
        `;
    });

    selectedTags.forEach(tag => {
        chipsHtml += `
            <span class="active-filter-chip">
                Tag: ${escapeHtml(tag)}
                <span class="remove-chip" onclick="toggleTagFilter('${escapeJs(tag)}')">✕</span>
            </span>
        `;
    });

    list.innerHTML = chipsHtml;
}

function onCategorySelectChange() {
    filterCatalog();
}

function renderExplorer() {
    filterCatalog();
}

// FILTRO PRINCIPAL DO ACERVO
function filterCatalog() {
    const query = (document.getElementById('explorerSearchInput').value || '').toLowerCase().trim();
    const cat = document.getElementById('filterCategorySelect').value || 'all';
    const status = document.getElementById('filterStatusSelect').value || 'all';
    const sort = document.getElementById('filterSortSelect').value || 'autor_asc';

    document.getElementById('searchClearBtn').style.display = query ? 'block' : 'none';

    let filtered = getAllWorks().map(o => getObraById(o.id)).filter(o => {
        // Categoria principal
        if (cat !== 'all' && o.codigo !== cat) return false;

        // Status de Leitura
        const lei = getLeitura(o.id);
        if (status === 'favoritos' && !lei.favorito) return false;
        if (['lendo', 'quero_ler', 'lido', 'nao_iniciado'].includes(status) && lei.status !== status) return false;

        // Busca Textual
        if (query) {
            const matchText = [
                o.autor,
                o.titulo,
                o.subarea || '',
                o.resumo || '',
                (o.palavras_chave || []).join(' ')
            ].join(' ').toLowerCase();

            if (!matchText.includes(query)) return false;
        }

        // Filtro Multi-Seleção de Sub-Áreas e Tags (Lógica E / OU)
        const obraTags = new Set((o.palavras_chave || []).map(t => t.toLowerCase()));
        const obraSubarea = o.subarea || '';

        const hasSubareaFilters = selectedSubareas.size > 0;
        const hasTagFilters = selectedTags.size > 0;

        if (hasSubareaFilters || hasTagFilters) {
            if (filterLogic === 'AND') {
                // No modo E, deve bater todas as sub-áreas selecionadas E todas as tags
                if (hasSubareaFilters && !selectedSubareas.has(obraSubarea)) return false;
                for (let t of selectedTags) {
                    if (!obraTags.has(t.toLowerCase())) return false;
                }
            } else {
                // No modo OU, basta bater qualquer uma das sub-áreas OU qualquer uma das tags
                let matchAny = false;
                if (hasSubareaFilters && selectedSubareas.has(obraSubarea)) matchAny = true;
                if (!matchAny && hasTagFilters) {
                    for (let t of selectedTags) {
                        if (obraTags.has(t.toLowerCase())) { matchAny = true; break; }
                    }
                }
                if (!matchAny) return false;
            }
        }

        return true;
    });

    // Ordenação
    filtered.sort((a, b) => {
        if (sort === 'autor_asc') return a.autor.localeCompare(b.autor);
        if (sort === 'titulo_asc') return a.titulo.localeCompare(b.titulo);
        if (sort === 'pags_desc') return b.paginas - a.paginas;
        if (sort === 'pags_asc') return a.paginas - b.paginas;
        if (sort === 'codigo_asc') return a.codigo.localeCompare(b.codigo);
        return 0;
    });

    document.getElementById('resultsCount').textContent = `Exibindo ${filtered.length} de ${getAllWorks().length} obras`;

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
