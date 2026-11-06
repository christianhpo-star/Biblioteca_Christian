/* Caderno de estudo. Usa o mesmo estado e os mesmos backups do catálogo. */
(() => {
  const esc = escapeHtml;
  const el = id => document.getElementById(id);
  let workId = null, returnFocus = null;
  const fields = [['livre','Anotações livres'],['problema','Problema de pesquisa'],['objetivo','Objetivo'],['argumento','Tese / argumento central'],['conceitos','Conceitos'],['metodologia','Método e fontes'],['conclusoes','Conclusões do autor'],['analise','Minha análise crítica'],['conexoes','Relações com minha pesquisa e outras obras'],['perguntas','Perguntas para retomar']];
  const makeShell = (id, title) => { const node = document.createElement('section'); node.id=id; node.className='study-shell'; node.hidden=true; node.setAttribute('role','dialog'); node.setAttribute('aria-modal','true'); node.setAttribute('aria-label',title); document.body.append(node); return node; };
  const workspace = makeShell('studyWorkspace','Caderno de estudo');
  const register = makeShell('studyRegister','Adicionar obra');
  const search = makeShell('studySearch','Buscar na biblioteca e nos cadernos');
  function show(node) { returnFocus=document.activeElement; node.hidden=false; document.body.style.overflow='hidden'; node.querySelector('button,input')?.focus(); }
  function hide(node) { node.hidden=true; document.body.style.overflow=''; returnFocus?.focus(); }
  function persist() { // Não sinalizar sucesso se o armazenamento local falhar.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    saveAppState();
  }
  function safeUrl(value) { try { const u=new URL(value); return ['https:','http:'].includes(u.protocol)?u.href:''; } catch { return ''; } }
  function refresh() { updateBadgesAndKpis(); renderDashboard(); renderExplorer(); renderFichamentosList(); renderSubareaChips(); renderAuthors(); renderTopics(); }
  window.openNewWork = () => {
    register.innerHTML=`<div class="study-dialog study-panel"><div class="study-top"><h1>Adicionar obra</h1><button class="btn-action-secondary" id="newCancel">Voltar</button></div><p class="study-muted">Cadastre o livro que está em suas mãos. Só o título é obrigatório; complete os dados da edição quando quiser.</p><form id="newWorkForm"><label for="newTitle">Título *</label><input id="newTitle" required maxlength="500" autofocus><label for="newAuthor">Autor ou organizador</label><input id="newAuthor" maxlength="300"><div class="study-meta-grid"><div><label for="newFormat">Formato</label><select id="newFormat"><option value="fisico">Livro em papel</option><option value="digital">Digital / referência sem arquivo</option><option value="ambos">Papel e digital</option></select></div><div><label for="newPages">Total de páginas</label><input id="newPages" type="number" min="1" max="100000"></div></div><label for="newEdition">Edição, editora e ano</label><input id="newEdition" placeholder="Opcional — copie os dados do seu exemplar"><label for="newLocation">Onde está o exemplar?</label><input id="newLocation" placeholder="Ex.: estante da sala"><label for="newTheme">Tema / subárea</label><input id="newTheme"><label for="newUrl">Link do texto (opcional)</label><input id="newUrl" type="url" placeholder="https://…"><p id="newError" role="alert"></p><button type="submit" class="btn-action-primary">Adicionar e começar fichamento</button></form></div>`;
    el('newCancel').onclick=()=>hide(register);
    el('newWorkForm').onsubmit=e=>{
      e.preventDefault(); const title=el('newTitle').value.trim(); if(!title){el('newTitle').focus();return;}
      const duplicate=getAllWorks().some(o=>o.titulo.trim().toLocaleLowerCase('pt-BR')===title.toLocaleLowerCase('pt-BR'));
      if(duplicate && !confirm('Já existe uma obra com esse título. Cadastrar outra edição?'))return;
      const id=Date.now()*1000+crypto.getRandomValues(new Uint16Array(1))[0]%1000;
      const work={id,catalogManual:true,titulo:title,autor:el('newAuthor').value.trim()||'Autoria a completar',formato:el('newFormat').value,paginas:Number(el('newPages').value)||0,edicao:el('newEdition').value.trim(),localizacao:el('newLocation').value.trim(),subarea:el('newTheme').value.trim(),codigo:'3',categoria:'Ciências Humanas e Sociais',palavras_chave:[],resumo:'',arquivo:'',caminho:'',tamanho_mb:0,uri:safeUrl(el('newUrl').value),metadataQuality:'revisar'};
      appState.metaOverrides[id]=work; appState.leituras[id]={status:'nao_iniciado',paginasLidas:0,progresso:0,favorito:false,avaliacao:0,motivo:''};
      try{persist();refresh();hide(register);openStudy(id);}catch{el('newError').textContent='Não foi possível salvar neste dispositivo. Libere espaço ou exporte um backup antes de continuar.';}
    }; show(register); el('newTitle').focus();
  };
  window.openStudy = id => {
    workId=Number(id); const o=getObraById(id); if(!o)return;
    const f=getFichamento(id)||{}, l=getLeitura(id), url=safeUrl(o.drive_url||o.uri), physical=o.formato==='fisico'||!url;
    workspace.innerHTML=`<header class="study-top"><div><span class="study-muted">Caderno de estudo · ${physical?'Leitura em papel':'Leitura digital'}</span><h1>${esc(o.titulo)}</h1><span>${esc(o.autor)}</span></div><div class="study-actions"><span id="studySaveStatus" class="study-status" role="status">${appState.fichamentos[id]?'Seu caderno salvo neste dispositivo':'Base pré-preenchida · confira no original'}</span><button id="studyExport" class="btn-action-secondary">Exportar fichamento .md</button><button id="studyBack" class="btn-action-secondary">Voltar à biblioteca</button></div></header><div class="study-grid"><section class="study-panel study-source"><h2>${physical?'Meu exemplar':'Texto de referência'}</h2>${physical?`<div class="study-paper"><strong>${esc(o.titulo)}</strong><p class="study-muted">Leia no papel e registre suas ideias no caderno ao lado.</p></div>`:`<a class="btn-action-secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir texto em outra aba</a><p class="study-muted">A prévia depende da permissão do arquivo. Se não carregar, use o link acima.</p>${o.drive_id&&/^[\w-]+$/.test(o.drive_id)?`<iframe title="Texto da obra" src="https://drive.google.com/file/d/${o.drive_id}/preview" allow="fullscreen"></iframe>`:''}`}
      <label for="studyEdition">Edição, editora e ano do exemplar</label><input id="studyEdition" value="${esc(o.edicao||'')}"><label for="studyLocation">Localização do exemplar</label><input id="studyLocation" value="${esc(o.localizacao||'')}"><label for="studyPages">Total de páginas (opcional)</label><input id="studyPages" type="number" min="0" max="100000" value="${o.paginas||0}"><label for="studyPage">Página atual do livro</label><input id="studyPage" type="number" min="0" value="${l.paginasLidas||0}"><label for="studyReading">Situação da leitura</label><select id="studyReading"><option value="nao_iniciado">Não iniciada</option><option value="quero_ler">Quero ler</option><option value="lendo">Em leitura</option><option value="lido">Concluída</option></select><p class="study-muted">Use a paginação impressa para suas citações. As edições podem ter páginas diferentes.</p></section>
      <section class="study-panel"><h2>Meu fichamento</h2><label for="studyRef">Referência bibliográfica</label><input id="studyRef" value="${esc(f.referencia||`${o.autor}. ${o.titulo}.`)}"><small class="study-muted">Confira os dados da edição; esta referência não foi validada automaticamente.</small>
      ${fields.map(([key,label],i)=>i===0?`<label for="study_${key}">${label}</label><textarea class="study-free" id="study_${key}" placeholder="O que esta leitura faz você pensar?">${esc(f[key]||'')}</textarea>`:`<details ${f[key]?'open':''}><summary>${label}</summary><label class="sr-only" for="study_${key}">${label}</label><textarea id="study_${key}">${esc(f[key]||'')}</textarea></details>`).join('')}
      <h2>Citações e evidências</h2><div id="studyQuotes"></div><div class="study-quote-form"><label for="studyQuote">Trecho literal</label><textarea id="studyQuote">${esc(f.quoteDraft?.texto||'')}</textarea><label for="studyQuotePage">Página / intervalo</label><input id="studyQuotePage" placeholder="Ex.: 42–43" value="${esc(f.quoteDraft?.pagina||'')}"><label for="studyQuoteComment">Meu comentário / onde usar</label><textarea id="studyQuoteComment">${esc(f.quoteDraft?.comentario||'')}</textarea><button id="studyAddQuote" class="btn-action-secondary">Adicionar citação</button><p id="studyQuoteError" role="alert"></p></div><p class="study-muted">A escrita é salva neste dispositivo a cada alteração. Na versão web, acompanhe também o indicador de sincronização da conta. Exportar baixa um arquivo; não envia ao Drive.</p></section></div>`;
    el('studyReading').value=l.status;
    workspace.querySelectorAll('input,select,textarea').forEach(input=>{input.addEventListener('input',saveStudy);});
    el('studyBack').onclick=()=>{if(saveStudy()){hide(workspace);refresh();}};
    el('studyExport').onclick=exportStudy;
    el('studyAddQuote').onclick=()=>{
      const text=el('studyQuote').value.trim(), page=el('studyQuotePage').value.trim();
      if(!text||!page){el('studyQuoteError').textContent='Informe o trecho e a página para preservar a origem da citação.';return;}
      const quote={id:crypto.randomUUID(),obraId:workId,texto:text,pagina:page,comentario:el('studyQuoteComment').value.trim(),data:new Date().toISOString()};
      appState.citacoes.unshift(quote);
      try{persist();['studyQuote','studyQuotePage','studyQuoteComment','studyQuoteError'].forEach(k=>{if('value' in el(k))el(k).value='';else el(k).textContent='';});saveStudy();renderStudyQuotes();}catch{el('studyQuoteError').textContent='Falha ao salvar. Copie o trecho e exporte um backup.';}
    };
    renderStudyQuotes(); show(workspace);
  };
  function renderStudyQuotes(){el('studyQuotes').innerHTML=appState.citacoes.filter(q=>Number(q.obraId)===workId).map(q=>`<blockquote class="study-quote">${esc(q.texto)}<footer>p. ${esc(String(q.pagina||'não registrada'))}${q.comentario?` · ${esc(q.comentario)}`:''}</footer></blockquote>`).join('')||'<p class="study-muted">Suas citações aparecerão aqui, junto da origem.</p>';}
  function saveStudy(){
    if(workspace.hidden||!workId)return true;
    const previous=appState.fichamentos[workId]||getFichamento(workId)||{};
    const f={...previous,referencia:el('studyRef').value,subarea:getObraById(workId).subarea,dataAtualizacao:new Date().toISOString(),revisao:'em_elaboracao'};
    fields.forEach(([key])=>f[key]=el('study_'+key).value);
    f.quoteDraft={texto:el('studyQuote').value,pagina:el('studyQuotePage').value,comentario:el('studyQuoteComment').value};
    appState.fichamentos[workId]=f;
    appState.metaOverrides[workId]={...appState.metaOverrides[workId],edicao:el('studyEdition').value,localizacao:el('studyLocation').value,paginas:Math.max(0,Number(el('studyPages').value)||0)};
    const pages=Math.max(0,Number(el('studyPage').value)||0), total=Number(el('studyPages').value)||0;
    appState.leituras[workId]={...getLeitura(workId),status:el('studyReading').value,paginasLidas:pages,progresso:total?Math.min(100,Math.round(pages/total*100)):0};
    try{persist();el('studySaveStatus').textContent='Salvo neste dispositivo · '+new Date().toLocaleTimeString('pt-BR');return true;}catch{el('studySaveStatus').textContent='Falha no salvamento local. Exporte sua escrita antes de sair.';return false;}
  }
  function exportStudy(){saveStudy();const o=getObraById(workId),f=appState.fichamentos[workId];let md=`# ${o.titulo}\n\nAutor: ${o.autor}\nReferência: ${f.referencia}\nEdição: ${o.edicao||'A completar'}\nFormato: ${o.formato||'digital'}\nAtualizado: ${f.dataAtualizacao}\n\n`;
    fields.forEach(([key,label])=>md+=`## ${label}\n\n${f[key]||''}\n\n`);
    md+='## Citações\n\n';appState.citacoes.filter(q=>Number(q.obraId)===workId).forEach(q=>md+=`> ${q.texto.replace(/\n/g,'\n> ')}\n\nPágina: ${q.pagina||'não registrada'}\n\nMeu comentário: ${q.comentario||''}\n\n`);
    if(f.quoteDraft?.texto)md+=`## Citação em rascunho (a conferir)\n\n${f.quoteDraft.texto}\n\nPágina: ${f.quoteDraft.pagina}\n${f.quoteDraft.comentario}\n\n`;
    md+='## Notas anteriores da obra\n\n';appState.notas.filter(n=>Number(n.obraId)===workId).forEach(n=>md+=`${n.texto}\n\n`);
    downloadFile(`fichamento_${workId}.md`,md,'text/markdown');
  }
  window.openFichamento=openStudy;
  window.openStudySearch=()=>{
    search.innerHTML='<div class="study-dialog"><div class="study-top"><h1>Buscar no acervo e na minha escrita</h1><button class="btn-action-secondary" id="searchBack">Voltar</button></div><label for="studySearchInput">Autor, título, conceito, trecho ou ideia</label><input class="form-input" id="studySearchInput" type="search"><p class="study-muted" id="studySearchCount" role="status"></p><div class="study-search-results" id="studySearchResults"></div></div>';
    el('searchBack').onclick=()=>hide(search);el('studySearchInput').oninput=()=>{
      const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const query=normalize(el('studySearchInput').value.trim());
      const found=query?getAllWorks().filter(o=>normalize(JSON.stringify([o,getFichamento(o.id),appState.notas.filter(n=>Number(n.obraId)===o.id),appState.citacoes.filter(q=>Number(q.obraId)===o.id)])).includes(query)):[];
      el('studySearchCount').textContent=query?`${found.length} obras com resultados`:'Busque também dentro dos fichamentos, notas e citações.';
      el('studySearchResults').replaceChildren(...found.map(o=>{const b=document.createElement('button');b.className='study-result';b.textContent=o.titulo;const small=document.createElement('small');small.textContent=o.autor;b.append(small);b.onclick=()=>{hide(search);openStudy(o.id);};return b;}));
    };show(search);el('studySearchInput').focus();
  };
  document.querySelector('.header-right').insertAdjacentHTML('afterbegin','<button class="btn-action-primary" onclick="openNewWork()">+ Adicionar obra</button>');
  document.querySelector('.sidebar-nav').insertAdjacentHTML('afterbegin','<button class="nav-item" onclick="openStudySearch()">Buscar na minha escrita</button><button class="nav-item" onclick="openNewWork()">+ Obra física ou digital</button>');
  document.querySelectorAll('.nav-item').forEach(a=>{if(a.tagName==='A'&&!a.hasAttribute('href')){a.setAttribute('role','button');a.tabIndex=0;a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();a.click();}});}});
  document.addEventListener('keydown',e=>{const active=[register,search,workspace].find(n=>!n.hidden);if(!active)return;if(e.key==='Escape'){e.stopImmediatePropagation();if(active===workspace){if(saveStudy()){hide(active);refresh();}}else hide(active);}if(e.key==='Tab'){const nodes=[...active.querySelectorAll('button,a[href],input,select,textarea,summary')].filter(n=>n.getClientRects().length&&!n.disabled);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus();}}},true);
  window.addEventListener('beforeunload',e=>{if(!workspace.hidden){saveStudy();if(el('studyQuote').value.trim()){e.preventDefault();e.returnValue='';}}});
})();
