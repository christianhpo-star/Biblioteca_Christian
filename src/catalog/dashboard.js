/** Indicadores e resumos de leitura derivados do estado atual. */
function updateBadgesAndKpis() {
    document.getElementById('badgeTotalObras').textContent = getAllWorks().length;
    document.getElementById('kpiTotalObras').textContent = getAllWorks().length;
    let lendoCount = 0;
    let queroLerCount = 0;
    let lidosCount = 0;
    let favCount = 0;

    Object.values(appState.leituras).forEach(l => {
        if (l.status === 'lendo') lendoCount++;
        if (l.status === 'quero_ler') queroLerCount++;
        if (l.status === 'lido') lidosCount++;
        if (l.favorito) favCount++;
    });

    const fichamentosCount = new Set([...Object.keys(FICHAMENTOS_BASE), ...Object.keys(appState.fichamentos)]).size;
    const colecoesCount = appState.colecoes.length;
    const notasCount = appState.notas.length + appState.citacoes.length;

    document.getElementById('badgeLendo').textContent = lendoCount;
    document.getElementById('badgeQueroLer').textContent = queroLerCount;
    document.getElementById('badgeLidos').textContent = lidosCount;
    document.getElementById('badgeFavoritos').textContent = favCount;
    document.getElementById('badgeFichamentos').textContent = fichamentosCount;
    document.getElementById('badgeColecoes').textContent = colecoesCount;
    document.getElementById('badgeNotas').textContent = notasCount;

    document.getElementById('kpiLendo').textContent = lendoCount;
    document.getElementById('kpiLidos').textContent = lidosCount;
    document.getElementById('kpiFavoritos').textContent = favCount;
    document.getElementById('kpiFichamentos').textContent = fichamentosCount;
}

function markAllCurrentWorksAsRead() {
    for (const o of getAllWorks()) appState.leituras[o.id] = {...getLeitura(o.id), status:'lido', paginasLidas:o.paginas || 0, progresso:100};
    saveAppState();
    alert('As obras do acervo foram marcadas como lidas.');
    renderDashboard();
    filterCatalog();
}

/**
 * Abertura leve do acervo: até cinco cartões, todos acionáveis pelo teclado.
 * "Recentes" se aplica apenas a registros com adicionadoEm válido.
 */
function renderHomePreview() {
    const container = document.getElementById('dashboardHomeBooks');
    const title = document.getElementById('dashboardHomeTitle');
    const hint = document.getElementById('dashboardHomeHint');
    if (!container || !title || !hint) return;

    const selection = selectHomeWorks();
    const shown = selection.recent.length + selection.undated.length;
    title.textContent = selection.recent.length ? 'Últimas inclusões' : 'Do seu acervo';
    hint.textContent = !selection.total
        ? 'Ainda não há obras cadastradas.'
        : 'Mostrando ' + shown + ' de ' + selection.total + ' obras.' +
          (selection.undated.length ? ' Livros sem data registrada aparecem em ordem alfabética.' : '');
    container.replaceChildren();

    if (!selection.total) {
        const paragraph = document.createElement('p');
        paragraph.className = 'home-books-empty';
        paragraph.textContent = 'Adicione sua primeira obra para começar a organizar as leituras.';
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'btn-action-primary';
        add.textContent = 'Adicionar primeira obra';
        add.addEventListener('click', () => openNewWork());
        container.append(paragraph, add);
        return;
    }

    const formatLabels = { fisico: 'Livro em papel', digital: 'Digital', ambos: 'Papel e digital' };
    const statusLabels = {
        nao_iniciado: 'Não iniciada', quero_ler: 'Quero ler', lendo: 'Em leitura',
        lido: 'Concluída', reler: 'Reler futuramente'
    };
    const makeText = (tag, klass, value) => {
        const el = document.createElement(tag);
        el.className = klass;
        el.textContent = value;
        return el;
    };

    function appendGroup(label, works, hasDate) {
        if (!works.length) return;
        const section = document.createElement('section');
        section.className = 'home-books-group';
        section.setAttribute('aria-label', label);
        const heading = makeText('h4', 'home-books-group-heading', label);
        const grid = document.createElement('div');
        grid.className = 'home-books-grid';

        for (const obra of works) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'home-book-card';
            card.setAttribute('aria-label', 'Abrir ficha: ' + (obra.titulo || 'Obra sem título'));
            card.append(
                makeText('span', 'home-book-author', obra.autor || 'Autoria não informada'),
                makeText('strong', 'home-book-title', obra.titulo || 'Obra sem título')
            );

            const metadata = document.createElement('span');
            metadata.className = 'home-book-meta';
            const format = formatLabels[obra.formato] || (obra.uri ? 'Digital' : 'Formato não informado');
            metadata.append(
                makeText('span', 'home-book-pill', format),
                makeText('span', 'home-book-pill', statusLabels[getLeitura(obra.id).status] || 'Situação não informada')
            );
            card.append(metadata);
            if (hasDate) {
                const timestamp = getWorkAddedAtTimestamp(obra);
                card.append(makeText('span', 'home-book-added',
                    'Incluída em ' + new Date(timestamp).toLocaleDateString('pt-BR')));
            }
            card.addEventListener('click', () => openWorkSheet(obra.id));
            grid.append(card);
        }
        section.append(heading, grid);
        container.append(section);
    }

    appendGroup('Adicionados recentemente', selection.recent, true);
    appendGroup('Do seu acervo — inclusão sem data registrada', selection.undated, false);
}

/** "Ver todo o acervo" limpa apenas filtros efêmeros, sem alterar os livros. */
function openFullCatalogFromHome() {
    resetAllFilters();
    switchView('explorer', 'Todo o acervo');
}

function renderDashboard() {
    renderHomePreview();
    renderDashboardSubareas();
    renderReadingNowSection();
    renderQueroLerSection();
    renderRandomRecall();
    renderDashboardTagsCloud();
}

function renderDashboardSubareas() {
    const container = document.getElementById('dashboardSubareasGrid');
    const counts = {};
    getAllWorks().forEach(o => {
        if (o.subarea) counts[o.subarea] = (counts[o.subarea] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    container.innerHTML = sorted.map(([sub, count]) => `
        <div style="background:var(--bg-body);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:12px;cursor:pointer;transition:var(--transition);" onclick="filterBySubarea('${escapeJs(sub)}')">
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);">${escapeHtml(sub)}</div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">${count} obras</div>
        </div>
    `).join('');
}

function renderReadingNowSection() {
    const container = document.getElementById('dashboardReadingNowContainer');
    const readingObras = getAllWorks().filter(o => getLeitura(o.id).status === 'lendo');

    if (readingObras.length === 0) {
        container.innerHTML = `<p style="font-size:13.5px;color:var(--text-muted);padding:10px 0;">Todo o acervo inicial está marcado como lido! Quando iniciar uma releitura ou ingerir novos livros, selecione <b>"Em Leitura"</b> na ficha da obra.</p>`;
        return;
    }

    container.innerHTML = readingObras.map(o => {
        const lei = getLeitura(o.id);
        const pct = o.paginas ? Math.round((lei.paginasLidas / o.paginas) * 100) : 0;
        return `
            <div class="reading-now-item">
                <div class="reading-now-info">
                    <div class="reading-now-title" onclick="openWorkSheet(${o.id})" style="cursor:pointer;">${escapeHtml(o.titulo)}</div>
                    <div class="reading-now-author">${escapeHtml(o.autor)}</div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="progress-stats">
                        <span>${lei.paginasLidas || 0} de ${o.paginas} páginas lidas</span>
                        <span>${pct}% concluído</span>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <button class="btn-action-primary" onclick="openStudy(${o.id})">Continuar estudo</button>
                    <button class="btn-action-secondary" onclick="openWorkSheet(${o.id})">Ficha</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderQueroLerSection() {
    const container = document.getElementById('dashboardQueroLerContainer');
    const queroObras = getAllWorks().filter(o => getLeitura(o.id).status === 'quero_ler').slice(0, 4);

    if (queroObras.length === 0) {
        container.innerHTML = `<p style="font-size:13.5px;color:var(--text-muted);padding:10px 0;">Sua fila está vazia. Adicione obras à lista de <b>"Quero Ler"</b> para planejar seu itinerário de estudos.</p>`;
        return;
    }

    container.innerHTML = queroObras.map(o => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
            <div>
                <div style="font-size:14px;font-weight:700;color:var(--text-primary);cursor:pointer;" onclick="openWorkSheet(${o.id})">${escapeHtml(o.titulo)}</div>
                <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(o.autor)} (${o.paginas} págs)</div>
            </div>
            <button class="btn-action-secondary" onclick="setQuickReadingStatus(${o.id}, 'lendo')">Iniciar Leitura</button>
        </div>
    `).join('');
}

function renderRandomRecall() {
    const pool = getAllWorks();
    const obra = pool[Math.floor(Math.random() * pool.length)];
    if (!obra) return;

    const quoteEl = document.getElementById('recallQuote');
    const sourceEl = document.getElementById('recallSource');

    quoteEl.textContent = `“${obra.resumo}”`;
    sourceEl.innerHTML = `<b>${escapeHtml(obra.autor)}</b> — <i>${escapeHtml(obra.titulo)}</i> (${obra.subarea || obra.categoria})`;
    quoteEl.onclick = () => openWorkSheet(obra.id);
    quoteEl.style.cursor = 'pointer';
}

function renderDashboardTagsCloud() {
    const tagCounts = {};
    getAllWorks().forEach(o => {
        (o.palavras_chave || []).forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 18);

    const container = document.getElementById('dashboardTagsCloud');
    container.innerHTML = sortedTags.map(([tag, count]) => `
        <span class="tag-pill" onclick="filterByTagDirect('${escapeJs(tag)}')">
            ${escapeHtml(tag)} <span class="tag-pill-count">${count}</span>
        </span>
    `).join('');
}

// VISTA DEDICADA DE SUB-ÁREAS
