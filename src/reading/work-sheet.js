/** Ficha da obra, progresso, notas e citações ligadas ao ID da referência. */
function openWorkSheet(id) {
    const obra = getObraById(id);
    if (!obra) return;
    currentModalWorkId = id;
    const leitura = getLeitura(id);

    // Links locais e esquemas executáveis nunca são passados ao navegador como URL do texto.
    let textUrl = '';
    try {
        const parsed = new URL(obra.drive_url || obra.uri || '');
        if (['http:', 'https:'].includes(parsed.protocol)) textUrl = parsed.href;
    } catch {
        // Livro físico ou digital sem link acessível.
    }
    const statusNames = {
        nao_iniciado: 'Não iniciada',
        quero_ler: 'Quero ler',
        lendo: 'Em leitura',
        lido: 'Concluída',
        reler: 'Reler futuramente'
    };

    document.getElementById('modalWorkAuthor').textContent = obra.autor || 'Autoria não informada';
    document.getElementById('modalWorkTitle').textContent = obra.titulo || 'Obra sem título';
    document.getElementById('modalWorkSubarea').textContent = obra.subarea || obra.categoria || 'Sem subárea';
    document.getElementById('modalWorkSummary').textContent = obra.resumo?.trim() || 'Resumo ainda não registrado.';
    document.getElementById('modalWorkFormat').textContent =
        obra.formato === 'ambos' ? 'Papel e digital' :
        obra.formato === 'fisico' ? 'Livro em papel' :
        obra.formato === 'digital' || textUrl ? 'Obra digital' : 'Sem arquivo vinculado';
    document.getElementById('modalReadingStatusText').textContent =
        statusNames[leitura.status] || 'Situação não informada';

    const catClass = obra.codigo === '1.2' ? 'cat-12' : 'cat-' + (obra.codigo || '3');
    document.getElementById('modalWorkBadges').innerHTML =
        '<span class="badge badge-' + catClass + '">' +
        escapeHtml(obra.categoria || 'Não classificada') + '</span>' +
        (obra.subarea ? '<span class="badge badge-subarea">' + escapeHtml(obra.subarea) + '</span>' : '');

    const link = document.getElementById('modalOpenPdfBtn');
    link.href = textUrl || '#';
    link.hidden = !textUrl;
    const copyLink = document.getElementById('modalCopyFilePathBtn');
    copyLink.hidden = !textUrl;
    document.getElementById('modalFileCopiedFeedback').textContent = '';

    const addedTimestamp = getWorkAddedAtTimestamp(obra);
    document.getElementById('modalWorkAddedAt').textContent = addedTimestamp === null
        ? 'Data de inclusão não registrada'
        : new Date(addedTimestamp).toLocaleDateString('pt-BR');
    document.getElementById('modalFileName').textContent = obra.arquivo || 'Não informado';
    document.getElementById('modalFilePath').textContent = obra.caminho || obra.localizacao || 'Não informada';
    document.getElementById('modalFilePages').textContent = obra.paginas ? obra.paginas + ' páginas' : 'Não informadas';
    document.getElementById('modalFileSize').textContent = obra.tamanho_mb ? obra.tamanho_mb + ' MB' : 'Tamanho não informado';

    document.getElementById('modalReadingStatusSelect').value = leitura.status || 'nao_iniciado';
    document.getElementById('modalPagesReadInput').value = leitura.paginasLidas ?? 0;
    document.getElementById('modalTotalPagesLabel').textContent = 'de ' + (obra.paginas || '?') + ' págs';
    document.getElementById('modalReadingReasonInput').value = leitura.motivo || '';
    updateModalProgressUI(leitura.paginasLidas ?? 0, obra.paginas);
    setModalStarRatingUI(leitura.avaliacao || 0);

    const fav = document.getElementById('modalFavoriteBtn');
    fav.classList.toggle('favorited', Boolean(leitura.favorito));
    fav.setAttribute('aria-pressed', String(Boolean(leitura.favorito)));
    fav.setAttribute('aria-label', leitura.favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos');

    const keywords = document.getElementById('modalWorkKeywords');
    keywords.innerHTML = (obra.palavras_chave || []).map(k =>
        '<button type="button" class="tag-pill" onclick="toggleTagFilter(\'' +
        escapeJs(k) + '\'); closeModal(\'modalWorkSheet\'); switchView(\'explorer\');">' +
        escapeHtml(k) + '</button>'
    ).join('') || '<p class="modal-work-description">Nenhuma palavra-chave cadastrada.</p>';

    renderModalCollectionsCheckboxes();
    renderModalRelatedWorks(obra);

    // Cada abertura começa pela identificação e ações essenciais; seções permanecem recolhidas.
    const modal = document.getElementById('modalWorkSheet');
    modal.querySelectorAll('.modal-work-section').forEach(section => { section.open = false; });
    modal.querySelector('.modal-card').scrollTop = 0;
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
    const read = Math.max(0, Math.min(obra.paginas || 0, parseInt(val, 10) || 0));
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
    const names = { nao_iniciado: 'Não iniciada', quero_ler: 'Quero ler', lendo: 'Em leitura', lido: 'Concluída', reler: 'Reler futuramente' };
    document.getElementById('modalReadingStatusText').textContent = names[status] || 'Situação não informada';
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
        s.setAttribute('aria-pressed', String(idx + 1 === rating));
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
    const btn = document.getElementById('modalFavoriteBtn');
    btn.classList.toggle('favorited', next);
    btn.setAttribute('aria-pressed', String(next));
    btn.setAttribute('aria-label', next ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    saveAppState();
    filterCatalog();
}

function copyFilePathModal() {
    const obra = getObraById(currentModalWorkId);
    const textUrl = obra?.drive_url || obra?.uri;
    const feedback = document.getElementById('modalFileCopiedFeedback');
    if (!textUrl) {
        feedback.textContent = 'Esta obra não tem link disponível.';
        return;
    }
    if (!navigator.clipboard?.writeText) {
        feedback.textContent = 'Não foi possível copiar. Abra o texto e copie o endereço no navegador.';
        return;
    }
    navigator.clipboard.writeText(textUrl).then(() => {
        feedback.textContent = 'Link copiado.';
    }).catch(() => {
        feedback.textContent = 'Não foi possível copiar. Abra o texto e copie o endereço no navegador.';
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

// Notas e trechos são criados e editados somente no caderno; registros antigos permanecem no estado.

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

    container.innerHTML = scored.length ? scored.map(s => `
        <button type="button" class="modal-work-related-item" onclick="openWorkSheet(${s.obra.id})">
            <span class="modal-work-related-author">${escapeHtml(s.obra.autor || 'Autoria não informada')}</span>
            <strong>${escapeHtml(s.obra.titulo || 'Obra sem título')}</strong>
            <small>${escapeHtml(s.obra.subarea || s.obra.categoria || 'Sem subárea')}</small>
        </button>
    `).join('') :
        '<p class="modal-work-description">Nenhuma leitura relacionada encontrada.</p>';
}

// EDITOR DE METADADOS
