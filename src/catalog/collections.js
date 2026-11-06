/** Coleções temáticas e referências, armazenadas no esquema de estado existente. */
function renderCollections() {
    const grid = document.getElementById('collectionsGrid');
    if (appState.colecoes.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">Nenhuma coleção criada ainda. Crie sua primeira coleção temática!</p>`;
        return;
    }

    grid.innerHTML = appState.colecoes.map(col => `
        <div class="section-box" style="margin-bottom:0;">
            <h3 style="font-family:var(--font-serif);font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">${escapeHtml(col.nome)}</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${escapeHtml(col.descricao || 'Sem descrição.')}</p>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">${(col.obras || []).length} obras nesta coleção</div>
            <div style="display:flex;gap:8px;">
                <button class="btn-action-primary" onclick="viewCollectionObras('${col.id}')">Ver Obras</button>
                <button class="btn-action-secondary" onclick="deleteCollection('${col.id}')">Excluir</button>
            </div>
        </div>
    `).join('');
}

function viewCollectionObras(colId) {
    currentSelectedCollectionId = colId;
    const col = appState.colecoes.find(c => c.id === colId);
    if (!col) return;

    document.getElementById('collectionDetailTitle').textContent = col.nome;
    document.getElementById('collectionDetailDesc').textContent = col.descricao || 'Sem descrição cadastrada.';

    const list = document.getElementById('collectionObrasList');
    const obras = (col.obras || []).map(id => getObraById(id)).filter(Boolean);

    if (obras.length === 0) {
        list.innerHTML = `<p style="color:var(--text-muted);font-size:13.5px;padding:10px 0;">Nenhuma obra nesta coleção ainda.</p>`;
    } else {
        list.innerHTML = obras.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-body);border-radius:var(--radius-md);">
                <div>
                    <div style="font-size:14px;font-weight:700;color:var(--text-primary);cursor:pointer;" onclick="openWorkSheet(${o.id})">${escapeHtml(o.titulo)}</div>
                    <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(o.autor)} · ${escapeHtml(o.subarea)}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn-action-secondary" onclick="openWorkSheet(${o.id})">Ficha</button>
                    <button class="btn-action-secondary" style="color:#ef4444;" onclick="removeWorkFromCollection('${col.id}', ${o.id})">Remover</button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('collectionDetailContainer').style.display = 'block';
}

function closeCollectionDetail() {
    document.getElementById('collectionDetailContainer').style.display = 'none';
}

function removeWorkFromCollection(colId, obraId) {
    const col = appState.colecoes.find(c => c.id === colId);
    if (!col) return;
    col.obras = (col.obras || []).filter(id => id !== obraId);
    saveAppState();
    viewCollectionObras(colId);
    renderCollections();
}

function exportCollectionAbnt() {
    const col = appState.colecoes.find(c => c.id === currentSelectedCollectionId);
    if (!col) return;
    const obras = (col.obras || []).map(id => getObraById(id)).filter(Boolean);
    const abntList = obras.map(o => `${o.autor.toUpperCase()}. ${o.titulo}. In: Acervo Pessoal de Pesquisa (${o.paginas} p.).`).join('\n\n');
    navigator.clipboard.writeText(abntList).then(() => alert(`Referências ABNT de ${obras.length} obras copiadas!`));
}

function openNewCollectionModal() {
    document.getElementById('newCollectionName').value = '';
    document.getElementById('newCollectionDesc').value = '';
    openModal('modalNewCollection');
}

function saveNewCollection() {
    const name = document.getElementById('newCollectionName').value.trim();
    const desc = document.getElementById('newCollectionDesc').value.trim();
    if (!name) return;

    appState.colecoes.push({
        id: 'col_' + Date.now(),
        nome: name,
        descricao: desc,
        obras: [],
        dataCriacao: new Date().toISOString()
    });

    saveAppState();
    closeModal('modalNewCollection');
    renderCollections();
}

function deleteCollection(id) {
    if (confirm('Deseja excluir esta coleção?')) {
        appState.colecoes = appState.colecoes.filter(c => c.id !== id);
        saveAppState();
        closeCollectionDetail();
        renderCollections();
    }
}

// MURAL DE CITAÇÕES
