/** Ficha da obra, progresso, notas e citações ligadas ao ID da referência. */
function openWorkSheet(id) {
    currentModalWorkId = id;
    const obra = getObraById(id);
    if (!obra) return;

    const lei = getLeitura(id);

    document.getElementById('modalWorkAuthor').textContent = obra.autor;
    document.getElementById('modalWorkTitle').textContent = obra.titulo;
    document.getElementById('modalWorkSubarea').textContent = `Sub-Área: ${obra.subarea || obra.categoria}`;
    document.getElementById('modalWorkSummary').textContent = obra.resumo;

    const badgesContainer = document.getElementById('modalWorkBadges');
    const catClass = obra.codigo === '1.2' ? 'cat-12' : 'cat-' + obra.codigo;
    badgesContainer.innerHTML = `
        <span class="badge badge-${catClass}">${obra.codigo} · ${escapeHtml(obra.categoria)}</span>
        <span class="badge badge-subarea">${escapeHtml(obra.subarea)}</span>
        <span class="badge" style="background:var(--bg-body);color:var(--text-muted);">${obra.paginas} págs</span>
    `;

    const uri = obra.uri || 'file:///' + obra.caminho.replace(/\\/g, '/');
    document.getElementById('modalOpenPdfBtn').href = uri;
    document.getElementById('modalOpenPdfBtn').textContent = 'Abrir PDF no Drive';
    document.getElementById('modalOpenPdfBtn').hidden = !obra.uri;

    document.getElementById('modalFileName').textContent = obra.arquivo;
    document.getElementById('modalFilePath').textContent = obra.caminho;
    document.getElementById('modalFilePages').textContent = `${obra.paginas} páginas`;
    document.getElementById('modalFileSize').textContent = `${obra.tamanho_mb} MB`;

    document.getElementById('modalReadingStatusSelect').value = lei.status || 'lido';
    document.getElementById('modalPagesReadInput').value = lei.paginasLidas || obra.paginas;
    document.getElementById('modalTotalPagesLabel').textContent = `de ${obra.paginas} págs`;
    document.getElementById('modalReadingReasonInput').value = lei.motivo || '';
    updateModalProgressUI(lei.paginasLidas || obra.paginas, obra.paginas);
    setModalStarRatingUI(lei.avaliacao || 0);

    const favBtn = document.getElementById('modalFavoriteBtn');
    favBtn.classList.toggle('favorited', !!lei.favorito);

    const kwContainer = document.getElementById('modalWorkKeywords');
    kwContainer.innerHTML = (obra.palavras_chave || []).map(k => `
        <span class="tag-pill" onclick="toggleTagFilter('${escapeJs(k)}'); closeModal('modalWorkSheet'); switchView('explorer');">
            ${escapeHtml(k)}
        </span>
    `).join('');

    renderModalCollectionsCheckboxes();
    renderModalNotes();
    renderModalQuotes();
    renderModalRelatedWorks(obra);

    openModal('modalWorkSheet');
}

function updateModalProgressUI(read, total) {
    const pct = total ? Math.min(100, Math.round((read / total) * 100)) : 0;
    document.getElementById('modalProgressPercent').textContent = pct + '%';
    document.getElementById('modalProgressBarFill').style.width = pct + '%';
}

function updateModalPagesRead(val) {
    const obra = getObraById(currentModalWorkId);
    if (!obra) return;
    const read = Math.max(0, Math.min(obra.paginas, parseInt(val) || 0));
    appState.leituras[currentModalWorkId] = {
        ...getLeitura(currentModalWorkId),
        paginasLidas: read,
        progresso: obra.paginas ? Math.round((read / obra.paginas) * 100) : 0
    };
    updateModalProgressUI(read, obra.paginas);
    saveAppState();
    filterCatalog();
}

function updateModalReadingStatus(status) {
    appState.leituras[currentModalWorkId] = {
        ...getLeitura(currentModalWorkId),
        status: status,
        ultimaLeitura: new Date().toISOString()
    };
    saveAppState();
    filterCatalog();
}

function setModalStarRating(rating) {
    appState.leituras[currentModalWorkId] = {
        ...getLeitura(currentModalWorkId),
        avaliacao: rating
    };
    setModalStarRatingUI(rating);
    saveAppState();
}

function setModalStarRatingUI(rating) {
    const stars = document.querySelectorAll('#modalStarRating .star');
    stars.forEach((s, idx) => {
        s.classList.toggle('active', idx < rating);
    });
}

function saveModalReadingReason(reason) {
    appState.leituras[currentModalWorkId] = {
        ...getLeitura(currentModalWorkId),
        motivo: reason
    };
    saveAppState();
}

function toggleModalFavorite() {
    const lei = getLeitura(currentModalWorkId);
    const next = !lei.favorito;
    appState.leituras[currentModalWorkId] = { ...lei, favorito: next };
    document.getElementById('modalFavoriteBtn').classList.toggle('favorited', next);
    saveAppState();
    filterCatalog();
}

function copyFilePathModal() {
    const obra = getObraById(currentModalWorkId);
    if (!obra) return;
    navigator.clipboard.writeText(obra.drive_url || obra.uri).then(() => {
        const fb = document.getElementById('modalFileCopiedFeedback');
        fb.textContent = 'Caminho copiado!';
        fb.style.display = 'inline';
        setTimeout(() => fb.style.display = 'none', 2000);
    });
}

function copyWorkAbntModal() {
    const obra = getObraById(currentModalWorkId);
    if (!obra) return;
    const abnt = `${obra.autor.toUpperCase()}. ${obra.titulo}. Acervo de Pesquisa (${obra.paginas} p.).`;
    navigator.clipboard.writeText(abnt).then(() => {
        const fb = document.getElementById('modalFileCopiedFeedback');
        fb.textContent = 'ABNT copiado!';
        fb.style.display = 'inline';
        setTimeout(() => fb.style.display = 'none', 2000);
    });
}

function renderModalCollectionsCheckboxes() {
    const container = document.getElementById('modalWorkCollectionsContainer');
    if (appState.colecoes.length === 0) {
        container.innerHTML = `<span style="font-size:12.5px;color:var(--text-muted);">Nenhuma coleção criada ainda.</span>`;
        return;
    }

    container.innerHTML = appState.colecoes.map(col => {
        const has = (col.obras || []).includes(currentModalWorkId);
        return `
            <label style="font-size:12.5px;display:inline-flex;align-items:center;gap:6px;background:var(--bg-body);padding:4px 10px;border-radius:var(--radius-sm);cursor:pointer;border:1px solid var(--border-subtle);">
                <input type="checkbox" ${has ? 'checked' : ''} onchange="toggleWorkInCollection('${col.id}', ${currentModalWorkId}, this.checked)">
                ${escapeHtml(col.nome)}
            </label>
        `;
    }).join('');
}

function toggleWorkInCollection(colId, obraId, isChecked) {
    const col = appState.colecoes.find(c => c.id === colId);
    if (!col) return;
    col.obras = col.obras || [];
    if (isChecked && !col.obras.includes(obraId)) {
        col.obras.push(obraId);
    } else if (!isChecked) {
        col.obras = col.obras.filter(id => id !== obraId);
    }
    saveAppState();
}

function addModalNote() {
    const input = document.getElementById('modalNewNoteInput');
    const txt = input.value.trim();
    if (!txt) return;

    appState.notas.unshift({
        id: 'note_' + Date.now(),
        obraId: currentModalWorkId,
        texto: txt,
        data: new Date().toLocaleDateString('pt-BR')
    });

    input.value = '';
    saveAppState();
    renderModalNotes();
}

function deleteModalNote(id) {
    appState.notas = appState.notas.filter(n => n.id !== id);
    saveAppState();
    renderModalNotes();
}

function renderModalNotes() {
    const container = document.getElementById('modalNotesList');
    const notes = appState.notas.filter(n => n.obraId === currentModalWorkId);
    if (notes.length === 0) {
        container.innerHTML = `<p style="font-size:12px;color:var(--text-muted);padding:4px 0;">Nenhuma anotação registrada ainda.</p>`;
        return;
    }
    container.innerHTML = notes.map(n => `
        <div class="note-item">
            <div>${escapeHtml(n.texto)}</div>
            <div class="note-date">Registrado em ${n.data}</div>
            <button class="note-delete-btn" onclick="deleteModalNote('${n.id}')">Excluir</button>
        </div>
    `).join('');
}

function addModalQuote() {
    const text = document.getElementById('modalQuoteTextInput').value.trim();
    const page = document.getElementById('modalQuotePageInput').value.trim();
    const comment = document.getElementById('modalQuoteCommentInput').value.trim();
    if (!text) return;

    appState.citacoes.unshift({
        id: 'quote_' + Date.now(),
        obraId: currentModalWorkId,
        texto: text,
        pagina: page || null,
        comentario: comment,
        data: new Date().toLocaleDateString('pt-BR')
    });

    document.getElementById('modalQuoteTextInput').value = '';
    document.getElementById('modalQuotePageInput').value = '';
    document.getElementById('modalQuoteCommentInput').value = '';
    saveAppState();
    renderModalQuotes();
}

function deleteModalQuote(id) {
    appState.citacoes = appState.citacoes.filter(c => c.id !== id);
    saveAppState();
    renderModalQuotes();
}

function renderModalQuotes() {
    const container = document.getElementById('modalQuotesList');
    const quotes = appState.citacoes.filter(c => c.obraId === currentModalWorkId);
    if (quotes.length === 0) {
        container.innerHTML = `<p style="font-size:12px;color:var(--text-muted);padding:4px 0;">Nenhuma citação destacada ainda.</p>`;
        return;
    }
    container.innerHTML = quotes.map(c => `
        <div class="note-item" style="border-left:3px solid var(--primary);">
            <div style="font-family:var(--font-serif);font-style:italic;">“${escapeHtml(c.texto)}”</div>
            <div style="font-size:12px;font-weight:600;margin-top:4px;color:var(--text-secondary);">
                ${c.pagina ? 'Página ' + c.pagina : 'Sem página'} ${c.comentario ? '— ' + escapeHtml(c.comentario) : ''}
            </div>
            <button class="note-delete-btn" onclick="deleteModalQuote('${c.id}')">Excluir</button>
        </div>
    `).join('');
}

function renderModalRelatedWorks(currentObra) {
    const container = document.getElementById('modalRelatedWorksContainer');
    const currentTags = new Set((currentObra.palavras_chave || []).map(t => t.toLowerCase()));

    const scored = getAllWorks().filter(o => o.id !== currentObra.id).map(o => {
        let score = 0;
        if (o.subarea === currentObra.subarea) score += 6;
        if (o.codigo === currentObra.codigo) score += 2;
        if (o.autor === currentObra.autor) score += 5;
        (o.palavras_chave || []).forEach(t => {
            if (currentTags.has(t.toLowerCase())) score += 3;
        });
        return { obra: o, score };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    container.innerHTML = scored.map(s => `
        <div style="background:var(--bg-body);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px 12px;cursor:pointer;" onclick="openWorkSheet(${s.obra.id})">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">${escapeHtml(s.obra.autor)}</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-top:2px;">${escapeHtml(s.obra.titulo)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${s.obra.subarea || s.obra.categoria}</div>
        </div>
    `).join('');
}

// EDITOR DE METADADOS
