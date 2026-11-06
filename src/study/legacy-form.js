/** Lista de fichamentos e formulário legado; o caderno substitui sua abertura em workspace.js. */
function renderFichamentosList() {
            const container = document.getElementById('fichamentosList');
            const query = (document.getElementById('fichamentoFilterInput').value || '').toLowerCase().trim();

            let items = getAllWorks().filter(o => {
                if (!query) return true;
                const fich = getFichamento(o.id) || {};
                const corpus = [
                    o.titulo,
                    o.autor,
                    o.subarea,
                    fich.argumento || '',
                    fich.conceitos || '',
                    fich.problema || ''
                ].join(' ').toLowerCase();
                return corpus.includes(query);
            });

            container.innerHTML = items.map(o => {
                const fich = getFichamento(o.id) || {};
                return `
                    <div class="section-box" style="margin-bottom:0;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                            <div>
                                <span class="badge badge-cat-1" style="margin-bottom:6px;">${escapeHtml(o.subarea || o.categoria)}</span>
                                <h3 style="font-family:var(--font-serif);font-size:17px;font-weight:700;color:var(--text-primary);cursor:pointer;" onclick="openFichamento(${o.id})">${escapeHtml(o.titulo)}</h3>
                                <div style="font-size:12.5px;color:var(--text-muted);">${escapeHtml(o.autor)} (${o.paginas} págs)</div>
                            </div>
                            <div style="display:flex;gap:8px;">
                                <button class="btn-action-primary" onclick="openFichamento(${o.id})">Abrir Fichamento</button>
                                <button class="btn-action-secondary" onclick="openWorkSheet(${o.id})">Ver Ficha</button>
                            </div>
                        </div>
                        <div style="margin-top:12px;font-size:13.5px;color:var(--text-secondary);background:var(--bg-body);padding:14px;border-radius:var(--radius-md);line-height:1.6;">
                            <div style="margin-bottom:6px;"><b>Tese Central:</b> ${escapeHtml(fich.argumento || o.resumo)}</div>
                            <div style="font-size:12.5px;color:var(--text-muted);"><b>Conceitos-Chave:</b> ${escapeHtml(fich.conceitos || (o.palavras_chave || []).join(', '))}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterFichamentos(query) {
            renderFichamentosList();
        }

        function openFichamentoFromModal() {
            closeModal('modalWorkSheet');
            openFichamento(currentModalWorkId);
        }

        function openFichamento(obraId) {
            currentModalWorkId = obraId;
            const obra = getObraById(obraId);
            if (!obra) return;

            document.getElementById('fichamentoModalTitle').textContent = `${obra.autor} — ${obra.titulo}`;

            const fich = getFichamento(obraId) || {};
            // O usuario informa e revisa a referencia da edicao, sem dados bibliograficos inventados.

            document.getElementById('fichamentoRefAbnt').value = fich.referencia || '';
            document.getElementById('fichamentoSubarea').value = fich.subarea || obra.subarea || obra.categoria;
            document.getElementById('fichamentoProblema').value = fich.problema || '';
            document.getElementById('fichamentoObjetivo').value = fich.objetivo || '';
            document.getElementById('fichamentoTese').value = fich.argumento || obra.resumo;
            document.getElementById('fichamentoConceitos').value = fich.conceitos || (obra.palavras_chave || []).join(', ');
            document.getElementById('fichamentoMetodologia').value = fich.metodologia || '';
            document.getElementById('fichamentoConclusoes').value = fich.conclusoes || '';

            openModal('modalFichamento');
        }

        function saveCurrentFichamento() {
            if (!currentModalWorkId) return;

            appState.fichamentos[currentModalWorkId] = {
                referencia: document.getElementById('fichamentoRefAbnt').value.trim(),
                subarea: document.getElementById('fichamentoSubarea').value.trim(),
                problema: document.getElementById('fichamentoProblema').value.trim(),
                objetivo: document.getElementById('fichamentoObjetivo').value.trim(),
                argumento: document.getElementById('fichamentoTese').value.trim(),
                conceitos: document.getElementById('fichamentoConceitos').value.trim(),
                metodologia: document.getElementById('fichamentoMetodologia').value.trim(),
                conclusoes: document.getElementById('fichamentoConclusoes').value.trim(),
                dataAtualizacao: new Date().toLocaleDateString('pt-BR')
            };

            saveAppState();
            closeModal('modalFichamento');
            if (currentView === 'fichamentos') renderFichamentosList();
            alert('Fichamento salvo com sucesso na biblioteca!');
        }

        function exportCurrentFichamentoMarkdown() {
            const obra = getObraById(currentModalWorkId);
            if (!obra) return;

            const ref = document.getElementById('fichamentoRefAbnt').value;
            const sub = document.getElementById('fichamentoSubarea').value;
            const prob = document.getElementById('fichamentoProblema').value;
            const obj = document.getElementById('fichamentoObjetivo').value;
            const tese = document.getElementById('fichamentoTese').value;
            const conc = document.getElementById('fichamentoConceitos').value;
            const met = document.getElementById('fichamentoMetodologia').value;
            const concl = document.getElementById('fichamentoConclusoes').value;

            const mdContent = `# Fichamento Acadêmico: ${obra.titulo}

**Autor:** ${obra.autor}  
**Sub-Área:** ${sub}  
**Referência bibliográfica:** ${ref || 'Não informada'}  
**Data do Fichamento:** ${new Date().toLocaleDateString('pt-BR')}

---

## 1. Problema de Pesquisa
${prob || 'Não informado'}

## 2. Objetivo Geral da Obra
${obj || 'Não informado'}

## 3. Tese / Argumento Central Defendido
${tese || 'Não informado'}

## 4. Conceitos e Categorias Teóricas Mobilizadas
${conc || 'Não informado'}

## 5. Metodologia e Fontes Documentais
${met || 'Não informado'}

## 6. Conclusões do Autor
${concl || 'Não informado'}

---
*Gerado via Biblioteca Digital de Pesquisa & Memória Acadêmica*
`;

            downloadFile(`fichamento_${obra.autor.split(',')[0].trim().toLowerCase()}_${obra.id}.md`, mdContent, 'text/markdown');
        }

        // FICHA DA OBRA (MODAL)
