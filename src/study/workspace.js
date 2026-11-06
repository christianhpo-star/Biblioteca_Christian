/** Caderno de estudo: cadastro físico, escrita, citações, busca e exportação no estado existente. */
(() => {
  const esc = escapeHtml;
  const el = (id) => document.getElementById(id);
  let workId = null, returnFocus = null;

  const makeShell = (id, title) => {
    const node = document.createElement("section");
    node.id = id;
    node.className = "study-shell";
    node.hidden = true;
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-modal", "true");
    node.setAttribute("aria-label", title);
    document.body.append(node);
    return node;
  };
  const workspace = makeShell("studyWorkspace", "Caderno de estudo");
  const register = makeShell("studyRegister", "Adicionar obra");
  const search = makeShell("studySearch", "Buscar na biblioteca e nos cadernos");
  function show(node) {
    returnFocus = document.activeElement;
    node.hidden = false;
    document.body.style.overflow = "hidden";
    node.querySelector("button,input")?.focus();
  }
  function hide(node) {
    node.hidden = true;
    document.body.style.overflow = "";
    returnFocus?.focus();
  }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    saveAppState();
  }
  function safeUrl(value) {
    try {
      const u = new URL(value);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  }
  function refresh() {
    updateBadgesAndKpis();
    renderDashboard();
    renderExplorer();
    renderFichamentosList();
    renderSubareaChips();
    renderAuthors();
    renderTopics();
  }
  window.openNewWork = () => {
    register.innerHTML = `<div class="study-dialog study-panel"><div class="study-top"><h1>Adicionar obra</h1><button class="btn-action-secondary" id="newCancel">Voltar</button></div><p class="study-muted">Cadastre o livro que está em suas mãos. Só o título é obrigatório; complete os dados da edição quando quiser.</p><form id="newWorkForm"><label for="newTitle">Título *</label><input id="newTitle" required maxlength="500" autofocus><label for="newAuthor">Autor ou organizador</label><input id="newAuthor" maxlength="300"><div class="study-meta-grid"><div><label for="newFormat">Formato</label><select id="newFormat"><option value="fisico">Livro em papel</option><option value="digital">Digital / referência sem arquivo</option><option value="ambos">Papel e digital</option></select></div><div><label for="newPages">Total de páginas</label><input id="newPages" type="number" min="1" max="100000"></div></div><label for="newEdition">Edição, editora e ano</label><input id="newEdition" placeholder="Opcional — copie os dados do seu exemplar"><label for="newLocation">Onde está o exemplar?</label><input id="newLocation" placeholder="Ex.: estante da sala"><label for="newTheme">Tema / subárea</label><input id="newTheme"><label for="newUrl">Link do texto (opcional)</label><input id="newUrl" type="url" placeholder="https://…"><p id="newError" role="alert"></p><button type="submit" class="btn-action-primary">Adicionar e começar fichamento</button></form></div>`;
    el("newCancel").onclick = () => hide(register);
    el("newWorkForm").onsubmit = (e) => {
      e.preventDefault();
      const title = el("newTitle").value.trim();
      if (!title) {
        el("newTitle").focus();
        return;
      }
      const duplicate = getAllWorks().some((o) => o.titulo.trim().toLocaleLowerCase("pt-BR") === title.toLocaleLowerCase("pt-BR"));
      if (duplicate && !confirm("Já existe uma obra com esse título. Cadastrar outra edição?")) return;
      const id = Date.now() * 1e3 + crypto.getRandomValues(new Uint16Array(1))[0] % 1e3;
      const work = { id, catalogManual: true, titulo: title, autor: el("newAuthor").value.trim() || "Autoria a completar", formato: el("newFormat").value, paginas: Number(el("newPages").value) || 0, edicao: el("newEdition").value.trim(), localizacao: el("newLocation").value.trim(), subarea: el("newTheme").value.trim(), codigo: "3", categoria: "Ciências Humanas e Sociais", palavras_chave: [], resumo: "", arquivo: "", caminho: "", tamanho_mb: 0, uri: safeUrl(el("newUrl").value), metadataQuality: "revisar" };
      appState.metaOverrides[id] = work;
      appState.leituras[id] = { status: "nao_iniciado", paginasLidas: 0, progresso: 0, favorito: false, avaliacao: 0, motivo: "" };
      try {
        persist();
        refresh();
        hide(register);
        openStudy(id);
      } catch {
        el("newError").textContent = "Não foi possível salvar neste dispositivo. Libere espaço ou exporte um backup antes de continuar.";
      }
    };
    show(register);
    el("newTitle").focus();
  };
  window.openStudy = (id) => {
    workId=Number(id);
    if(getObraById(id)) StudyNotebook.open(workspace,id,{show,hide,refresh,safeUrl});
  };
  function saveStudy() { return workspace.hidden || StudyNotebook.flush(); }
  window.openFichamento = openStudy;
  window.openStudySearch = () => {
    search.innerHTML = '<div class="study-dialog"><div class="study-top"><h1>Buscar no acervo e na minha escrita</h1><button class="btn-action-secondary" id="searchBack">Voltar</button></div><label for="studySearchInput">Autor, título, conceito, trecho ou ideia</label><input class="form-input" id="studySearchInput" type="search"><p class="study-muted" id="studySearchCount" role="status"></p><div class="study-search-results" id="studySearchResults"></div></div>';
    el("searchBack").onclick = () => hide(search);
    el("studySearchInput").oninput = () => {
      const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const query = normalize(el("studySearchInput").value.trim());
      const found = query ? getAllWorks().filter((o) => normalize(JSON.stringify([o, getFichamento(o.id), appState.notas.filter((n) => Number(n.obraId) === o.id), appState.citacoes.filter((q) => Number(q.obraId) === o.id)])).includes(query)) : [];
      el("studySearchCount").textContent = query ? `${found.length} obras com resultados` : "Busque também dentro dos fichamentos, notas e citações.";
      el("studySearchResults").replaceChildren(...found.map((o) => {
        const b = document.createElement("button");
        b.className = "study-result";
        b.textContent = o.titulo;
        const small = document.createElement("small");
        small.textContent = o.autor;
        b.append(small);
        b.onclick = () => {
          hide(search);
          openStudy(o.id);
        };
        return b;
      }));
    };
    show(search);
    el("studySearchInput").focus();
  };
  document.querySelector(".header-right").insertAdjacentHTML("afterbegin", '<button class="btn-action-primary" onclick="openNewWork()">+ Adicionar obra</button>');
  document.querySelector(".sidebar-nav").insertAdjacentHTML("afterbegin", '<button class="nav-item" onclick="openStudySearch()">Buscar na minha escrita</button><button class="nav-item" onclick="openNewWork()">+ Obra física ou digital</button>');
  document.querySelectorAll(".nav-item").forEach((a) => {
    if (a.tagName === "A" && !a.hasAttribute("href")) {
      a.setAttribute("role", "button");
      a.tabIndex = 0;
      a.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          a.click();
        }
      });
    }
  });
  document.addEventListener("keydown", (e) => {
    const active = [register, search, workspace].find((n) => !n.hidden);
    if (!active) return;
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      if (active === workspace) {
        if (saveStudy()) {
          hide(active);
          refresh();
        }
      } else hide(active);
    }
    if (e.key === "Tab") {
      const nodes = [...active.querySelectorAll("button,a[href],input,select,textarea,summary")].filter((n) => n.getClientRects().length && !n.disabled);
      if (e.shiftKey && document.activeElement === nodes[0]) {
        e.preventDefault();
        nodes.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
        e.preventDefault();
        nodes[0]?.focus();
      }
    }
  }, true);
  window.addEventListener("beforeunload", (e) => {
    if (!workspace.hidden) {
      saveStudy();
      if (StudyNotebook.hasUnsaved()) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
  });
})();
