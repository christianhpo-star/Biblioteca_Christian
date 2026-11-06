/** Compact record workflow. Legacy content remains in its original fields; drafts persist separately. */
window.StudyNotebook = /* @__PURE__ */ (() => {
  let shell, workId, context, failed = false, editing = false;
  const el = (id) => document.getElementById(id), esc = (value) => escapeHtml(String(value ?? ""));
  const current = () => appState.fichamentos[workId] || {};
  const draft = () => current().registroRascunho || {};
  function commit(change) {
    const previous = structuredClone(appState);
    try {
      change();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      saveAppState();
      failed = false;
      el("studySaveStatus").textContent = "Salvo neste dispositivo · " + (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR");
      return true;
    } catch (error) {
      appState = previous;
      failed = true;
      el("studySaveStatus").textContent = "Falha ao salvar. Mantenha esta tela aberta e copie sua escrita antes de sair.";
      return false;
    }
  }
  function saveDraft() {
    if (!editing) return true;
    const value = { key: el("recordKey").value, page: el("recordPage").value, quote: el("recordQuote").value, note: el("recordNote").value, quoteOpen: !el("recordQuoteField").hidden, noteOpen: !el("recordNoteField").hidden };
    return commit(() => {
      appState.fichamentos[workId] = { ...current(), registroRascunho: value };
    });
  }
  function field(kind, open2) {
    el("record" + kind + "Field").hidden = !open2;
    el("recordAdd" + kind).hidden = open2;
    if (open2) el("record" + kind).focus();
  }
  function launch(kind, record = null) {
    const existing = record || draft();
    el("recordKey").value = existing.key || "";
    el("recordPage").value = existing.page || "";
    el("recordQuote").value = existing.quote || "";
    el("recordNote").value = existing.note || "";
    const hasDraft = Boolean(existing.quote || existing.note);
    field("Quote", record ? Boolean(record.quote) : hasDraft ? existing.quoteOpen !== false && Boolean(existing.quote) : kind === "quote");
    field("Note", record ? Boolean(record.note) : hasDraft ? existing.noteOpen !== false && Boolean(existing.note) : kind === "note");
    el("recordEditorTitle").textContent = existing.key ? "Editar registro" : "Novo registro";
    el("recordEditor").hidden = false;
    el("recordLaunchers").hidden = true;
    el("recordError").textContent = "";
    editing = true;
    (!el("recordNoteField").hidden ? el("recordNote") : el("recordQuote")).focus();
  }
  function closeEditor() {
    el("recordEditor").hidden = true;
    el("recordLaunchers").hidden = false;
    editing = false;
    el("recordResume").hidden = !(draft().quote || draft().note);
  }
  function renderRecords() {
    const records = StudyRecords.listRecords(appState, workId);
    el("recordCount").textContent = records.length + " registros";
    el("studyRecords").replaceChildren(...records.map((record) => {
      const article = document.createElement("article");
      article.className = "study-record";
      const header = document.createElement("div");
      header.className = "study-record-header";
      const label = document.createElement("span");
      label.textContent = (record.page ? "p. " + record.page : "Sem página") + " · " + (record.quote ? record.note ? "Trecho + comentário" : "Trecho literal" : "Anotação");
      const edit = document.createElement("button");
      edit.className = "btn-action-secondary";
      edit.textContent = "Editar";
      edit.setAttribute("aria-label", "Editar registro " + record.key);
      edit.onclick = () => {
        if (editing && !saveDraft()) return;
        if ((draft().quote || draft().note) && draft().key !== record.key && !confirm("Há um rascunho em andamento. Deseja substituí-lo para editar este registro?")) return;
        launch(null, record);
        saveDraft();
      };
      header.append(label, edit);
      const details = document.createElement("details"), summary = document.createElement("summary");
      summary.textContent = record.quote || record.note;
      summary.className = "study-record-preview";
      details.append(summary);
      details.addEventListener("toggle", () => {
        summary.textContent = details.open ? "Recolher registro" : record.quote || record.note;
      });
      if (record.quote) {
        const quote = document.createElement("blockquote");
        quote.textContent = record.quote;
        details.append(quote);
      }
      if (record.note) {
        const note = document.createElement("p");
        note.textContent = record.quote ? "Meu comentário: " + record.note : record.note;
        details.append(note);
      }
      article.append(header, details);
      return article;
    }));
    if (!records.length) el("studyRecords").textContent = "Nenhum registro ainda. Comece com uma anotação ou um trecho.";
  }
  function render() {
    const o = getObraById(workId), f = current(), base = getFichamento(workId) || {}, l = getLeitura(workId), url = context.safeUrl(o.drive_url || o.uri);
    shell.innerHTML = `<div class="study-notebook"><header class="study-top"><div><span class="study-muted">Caderno de leitura · ${url ? "Obra digital" : "Livro em papel"}</span><h1>${esc(o.titulo)}</h1><p>${esc(o.autor)}</p></div><div class="study-actions"><button id="studyDocument" class="btn-action-primary">Ver documento</button><button id="studyBack" class="btn-action-secondary">Voltar à biblioteca</button></div></header><p id="studySaveStatus" class="study-status" role="status">Registros guardados neste dispositivo; confira a sincronização da conta na versão web.</p><div id="notebookBody"><div class="study-reference-row"><details class="study-reference"><summary>Referência bibliográfica</summary><label for="studyRef">Referência da edição (revise antes de exportar)</label><textarea id="studyRef">${esc(f.referencia ?? base.referencia ?? "")}</textarea></details><details class="study-reference"><summary>Exemplar e leitura</summary>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir texto em outra aba</a>` : "<p>Leia no papel e registre suas ideias neste caderno.</p>"}<label for="studyEdition">Edição, editora e ano</label><input id="studyEdition" value="${esc(o.edicao || "")}"><label for="studyLocation">Localização do exemplar</label><input id="studyLocation" value="${esc(o.localizacao || "")}"><label for="studyPages">Total de páginas</label><input id="studyPages" type="number" min="0" value="${o.paginas || 0}"><label for="studyPage">Página atual do livro</label><input id="studyPage" type="number" min="0" value="${l.paginasLidas || 0}"><label for="studyReading">Situação da leitura</label><select id="studyReading"><option value="nao_iniciado">Não iniciada</option><option value="quero_ler">Quero ler</option><option value="lendo">Em leitura</option><option value="lido">Concluída</option></select></details></div><div class="study-record-header"><h2>Meus registros</h2><span id="recordCount" class="study-muted"></span></div><div id="recordLaunchers" class="study-actions"><button id="recordNewNote" class="btn-action-primary">+ Anotação livre</button><button id="recordNewQuote" class="btn-action-secondary">+ Trecho literal</button><button id="recordResume" class="btn-action-secondary" hidden>Retomar rascunho</button></div><form id="recordEditor" class="study-record-editor" hidden><input id="recordKey" type="hidden"><div class="study-record-header"><h3 id="recordEditorTitle">Novo registro</h3><label for="recordPage">Página / intervalo <input id="recordPage" placeholder="42–43"></label></div><div id="recordQuoteField"><div class="study-record-header"><label for="recordQuote">Trecho literal</label><button id="recordHideQuote" type="button" class="btn-action-secondary">Recolher trecho</button></div><textarea id="recordQuote" placeholder="Copie as palavras do autor…"></textarea></div><div id="recordNoteField"><div class="study-record-header"><label for="recordNote">Anotação / meu comentário</label><button id="recordHideNote" type="button" class="btn-action-secondary">Recolher comentário</button></div><textarea id="recordNote" placeholder="Uma ideia, pergunta ou comentário sobre a leitura…"></textarea></div><div class="study-actions"><button type="button" id="recordAddQuote" class="btn-action-secondary">+ Acrescentar trecho literal</button><button type="button" id="recordAddNote" class="btn-action-secondary">+ Acrescentar comentário</button></div><p id="recordError" role="alert"></p><div class="study-record-header"><span class="study-status">Rascunho automático; guarde para incluir no documento.</span><div class="study-actions"><button type="button" id="recordClose" class="btn-action-secondary">Recolher entrada</button><button type="submit" class="btn-action-primary">Guardar registro</button></div></div></form><div id="studyRecords" class="study-record-list"></div><div id="studyPrevious"></div></div><div id="studyDocumentView" hidden></div></div>`;
    el("studyReading").value = l.status;
    ["studyRef", "studyEdition", "studyLocation", "studyPages", "studyPage", "studyReading"].forEach((id) => el(id).addEventListener("input", saveMetadata));
    el("studyBack").onclick = () => {
      if (flush()) {
        context.hide(shell);
        context.refresh();
      }
    };
    el("recordNewNote").onclick = () => launch("note");
    el("recordNewQuote").onclick = () => launch("quote");
    el("recordResume").onclick = () => launch("note");
    for (const kind of ["Quote", "Note"]) {
      el("recordHide" + kind).onclick = () => {
        field(kind, false);
        saveDraft();
      };
      el("recordAdd" + kind).onclick = () => {
        field(kind, true);
        saveDraft();
      };
    }
    ["recordPage", "recordQuote", "recordNote"].forEach((id) => el(id).addEventListener("input", saveDraft));
    el("recordClose").onclick = () => {
      if (saveDraft()) closeEditor();
    };
    el("recordEditor").onsubmit = (e) => {
      e.preventDefault();
      const input = { key: el("recordKey").value || null, page: el("recordPage").value, quote: el("recordQuote").value, note: el("recordNote").value };
      try {
        const next = structuredClone(appState);
        StudyRecords.saveRecord(next, workId, input);
        next.fichamentos[workId] = { ...next.fichamentos[workId] || {}, registroRascunho: null, quoteDraft: null };
        if (commit(() => {
          appState = next;
        })) {
          closeEditor();
          renderRecords();
        }
      } catch (error) {
        el("recordError").textContent = error.message;
      }
    };
    el("studyDocument").onclick = () => {
      if (!flush()) return;
      el("notebookBody").hidden = true;
      el("studyDocumentView").hidden = false;
      el("studyDocument").hidden = true;
      StudyDocumentView.mount(el("studyDocumentView"), StudyRecords.documentModel(appState, { ...getObraById(workId), referencia: el("studyRef").value }), workId, () => {
        el("notebookBody").hidden = false;
        el("studyDocumentView").hidden = true;
        el("studyDocument").hidden = false;
        el("studyDocument").focus();
      }, Boolean(draft().quote || draft().note));
    };
    const previous = StudyRecords.previousFields.filter(([key]) => String(base[key] || "").trim());
    if (previous.length) {
      const details = document.createElement("details");
      details.className = "study-reference";
      const summary = document.createElement("summary");
      summary.textContent = previous.some(([key]) => String(f[key] || "").trim()) ? "Conteúdo anterior preservado" : "Base pré-preenchida para consulta";
      details.append(summary);
      for (const [key, label] of previous) {
        const heading = document.createElement("h3"), p = document.createElement("p");
        heading.textContent = label;
        p.textContent = base[key];
        details.append(heading, p);
      }
      el("studyPrevious").append(details);
    }
    renderRecords();
    closeEditor();
    editing = false;
  }
  function saveMetadata() {
    return commit(() => {
      appState.fichamentos[workId] = { ...current(), referencia: el("studyRef").value, dataAtualizacao: (/* @__PURE__ */ new Date()).toISOString() };
      const total = Math.max(0, Number(el("studyPages").value) || 0), pages = Math.max(0, Number(el("studyPage").value) || 0);
      appState.metaOverrides[workId] = { ...appState.metaOverrides[workId], edicao: el("studyEdition").value, localizacao: el("studyLocation").value, paginas: total };
      appState.leituras[workId] = { ...getLeitura(workId), status: el("studyReading").value, paginasLidas: pages, progresso: total ? Math.min(100, Math.round(pages / total * 100)) : 0 };
    });
  }
  function flush() {
    if (editing) return saveDraft();
    return !failed;
  }
  function open(node, id, handlers) {
    shell = node;
    workId = Number(id);
    context = handlers;
    failed = false;
    editing = false;
    const f = current();
    if (!f.registroRascunho && f.quoteDraft && (f.quoteDraft.texto || f.quoteDraft.comentario)) appState.fichamentos[workId] = { ...f, registroRascunho: { quote: f.quoteDraft.texto || "", note: f.quoteDraft.comentario || "", page: f.quoteDraft.pagina || "", quoteOpen: true, noteOpen: Boolean(f.quoteDraft.comentario) } };
    render();
    context.show(shell);
  }
  return { open, flush, hasUnsaved: () => failed };
})();
