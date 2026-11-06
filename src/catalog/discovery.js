/** Índices por autor, subárea e tema, com revisão de metadados. */
function renderSubareasView() {
    const container = document.getElementById('subareasFullGrid');
    const subareas = getAllUniqueSubareas();

    container.innerHTML = subareas.map(sub => {
        const obrasSub = getAllWorks().filter(o => o.subarea === sub);
        const totalPags = obrasSub.reduce((acc, o) => acc + (o.paginas || 0), 0);
        const cat = obrasSub[0] ? obrasSub[0].categoria : '';
        return `
            <div class="section-box" style="margin-bottom:0;cursor:pointer;border-left:4px solid var(--primary);" onclick="filterBySubarea('${escapeJs(sub)}')">
                <span class="badge" style="background:var(--bg-body);color:var(--text-muted);margin-bottom:6px;">${escapeHtml(cat)}</span>
                <h3 style="font-family:var(--font-serif);font-size:16px;font-weight:700;color:var(--text-primary);">${escapeHtml(sub)}</h3>
                <div style="font-size:12.5px;color:var(--text-muted);margin-top:6px;"><b>${obrasSub.length}</b> obras indexadas · <b>${totalPags}</b> páginas</div>
            </div>
        `;
    }).join('');
}

// VISTA DE FICHAMENTOS (COM OS 137 PRÉ-PREENCHIDOS)
function renderAuthors() {
    const container = document.getElementById('authorsContainer');
    const authorMap = {};

    getAllWorks().forEach(o => {
        if (!authorMap[o.autor]) {
            authorMap[o.autor] = { autor: o.autor, obras: [], totalPags: 0 };
        }
        authorMap[o.autor].obras.push(o);
        authorMap[o.autor].totalPags += o.paginas;
    });

    const sortedAuthors = Object.values(authorMap).sort((a, b) => a.autor.localeCompare(b.autor));

    container.innerHTML = sortedAuthors.map(a => `
        <div class="section-box" style="margin-bottom:0;cursor:pointer;" onclick="filterByAuthor('${escapeJs(a.autor)}')">
            <h3 style="font-family:var(--font-serif);font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">${escapeHtml(a.autor)}</h3>
            <span style="font-size:12px;color:var(--text-muted);">${a.obras.length} obra(s) · ${a.totalPags} páginas</span>
        </div>
    `).join('');
}

function renderTopics() {
    const container = document.getElementById('allTopicsContainer');
    const tagCounts = {};

    getAllWorks().forEach(o => {
        (o.palavras_chave || []).forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

    container.innerHTML = sorted.map(([tag, count]) => `
        <span class="tag-pill" style="font-size:13.5px;padding:6px 14px;" onclick="toggleTagFilter('${escapeJs(tag)}'); switchView('explorer');">
            ${escapeHtml(tag)} <span class="tag-pill-count">${count}</span>
        </span>
    `).join('');
}

// AUDITORIA E REVISÃO DE METADADOS
function renderAuditCenter() {
    const container = document.getElementById('auditItemsContainer');
    const flagged = getAllWorks().map(o => getObraById(o.id)).filter(o => o.metadataQuality !== 'completo');

    container.innerHTML = flagged.map(o => `
        <div class="section-box" style="margin-bottom:0;border-left:4px solid ${o.metadataQuality === 'inconsistente' ? '#ef4444' : '#f59e0b'};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <span class="badge" style="background:${o.metadataQuality === 'inconsistente' ? '#fee2e2;color:#991b1b' : '#fef3c7;color:#92400e'};">
                        ${o.metadataQuality.toUpperCase()}
                    </span>
                    <h3 style="font-family:var(--font-serif);font-size:16px;font-weight:700;color:var(--text-primary);margin-top:4px;">${escapeHtml(o.titulo)}</h3>
                    <div style="font-size:12.5px;color:var(--text-muted);">${escapeHtml(o.autor)} · Sub-Área: ${escapeHtml(o.subarea)}</div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-action-primary" onclick="openEditMetadata(${o.id})">Revisar / Corrigir</button>
                    <button class="btn-action-secondary" onclick="openWorkSheet(${o.id})">Ver Ficha</button>
                </div>
            </div>
            <div style="margin-top:10px;font-size:12.5px;color:var(--text-secondary);background:var(--bg-body);padding:8px 12px;border-radius:var(--radius-sm);">
                <b>Diagnóstico da Auditoria:</b> ${escapeHtml(o.nota_auditoria || 'Resumo preliminar que necessita de refinamento contínuo.')}
            </div>
        </div>
    `).join('');
}

function filterAuditQuality(quality) {
    switchView('explorer', 'Auditoria: ' + quality);
    const items = getAllWorks().filter(o => o.metadataQuality === quality);
    renderCards(items);
    renderList(items);
    renderTable(items);
}

// COLEÇÕES
