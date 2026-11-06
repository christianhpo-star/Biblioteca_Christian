/** Consulta e cópia de citações vinculadas às obras. */
function renderQuotesFeed() {
    const feed = document.getElementById('quotesFeed');
    const quotes = appState.citacoes;

    if (quotes.length === 0) {
        feed.innerHTML = `<p style="text-align:center;padding:40px;color:var(--text-muted);">Nenhuma citação registrada ainda. Use o modal da Ficha da Obra para salvar trechos com número de página!</p>`;
        return;
    }

    feed.innerHTML = quotes.map(c => {
        const obra = getObraById(c.obraId);
        return `
            <div class="section-box" style="border-left:4px solid var(--primary);margin-bottom:0;">
                <div style="font-family:var(--font-serif);font-size:16px;font-style:italic;line-height:1.6;color:var(--text-primary);margin-bottom:8px;">
                    “${escapeHtml(c.texto)}”
                </div>
                <div style="font-size:12.5px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;">
                    <span><b>${obra ? escapeHtml(obra.autor) : 'Autor'}</b> — <i>${obra ? escapeHtml(obra.titulo) : ''}</i> (${c.pagina ? 'pág. ' + c.pagina : 'sem página'})</span>
                    <button class="btn-action-secondary" style="padding:4px 8px;font-size:11px;" onclick="copyQuoteFormatted('${escapeJs(c.texto)}', '${obra ? escapeJs(obra.autor) : ''}', '${obra ? escapeJs(obra.titulo) : ''}', '${c.pagina || ''}')">Copiar Citação</button>
                </div>
            </div>
        `;
    }).join('');
}

function copyQuoteFormatted(text, autor, titulo, pagina) {
    const formatted = `"${text}" (${autor.toUpperCase()}, p. ${pagina || '[s.p.]'}).`;
    navigator.clipboard.writeText(formatted).then(() => alert('Citação formatada copiada para a área de transferência!'));
}

// BACKUP & RESTAURAÇÃO
