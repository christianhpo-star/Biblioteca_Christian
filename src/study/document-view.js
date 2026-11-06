/** Continuous document view. Download libraries load only after an explicit export request. */
window.StudyDocumentView = /* @__PURE__ */ (() => {
  let exporterPromise;
  function exporters() {
    if (window.StudyDocuments) return Promise.resolve(window.StudyDocuments);
    if (!exporterPromise) exporterPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("document-export.js", document.baseURI).href;
      script.onload = () => {
        if (window.StudyDocuments) resolve(window.StudyDocuments);
        else {
          exporterPromise = null;
          reject(Error("O módulo de exportação não foi inicializado."));
        }
      };
      script.onerror = () => {
        exporterPromise = null;
        script.remove();
        reject(Error("Não foi possível carregar a exportação. Verifique a conexão e tente novamente."));
      };
      document.head.append(script);
    });
    return exporterPromise;
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function mount(container, model, workId, back, hasDraft = false) {
    container.innerHTML = `<div class="study-document-toolbar"><button id="documentBack" class="btn-action-secondary">Voltar aos registros</button><div class="study-actions"><button id="documentWord" class="btn-action-primary">Baixar Word (.docx)</button><button id="documentPdf" class="btn-action-secondary">Baixar PDF</button><button id="documentMd" class="btn-action-secondary">Markdown</button></div></div><p class="study-status" id="documentStatus" role="status">${hasDraft ? "Há um rascunho fora deste documento. Volte e guarde o registro para incluí-lo." : "Registros guardados em ordem de página. Os registros sem página ficam ao final."}</p><article class="study-document-paper" id="studyDocumentPaper" aria-label="Documento completo do fichamento"></article>`;
    const paper = container.querySelector("#studyDocumentPaper");
    for (const block of StudyRecords.documentBlocks(model)) {
      const tag = block.kind === "title" ? "h1" : block.kind === "heading" ? "h2" : block.kind === "label" ? "h3" : block.kind === "quote" ? "blockquote" : "p";
      const element = document.createElement(tag);
      element.textContent = block.text;
      paper.append(element);
    }
    container.querySelector("#documentBack").onclick = back;
    for (const [id, method, extension] of [["documentWord", "createWord", "docx"], ["documentPdf", "createPdf", "pdf"]]) {
      container.querySelector("#" + id).onclick = async () => {
        const buttons = [...container.querySelectorAll("button")], status = container.querySelector("#documentStatus");
        buttons.forEach((b) => b.disabled = true);
        status.textContent = "Preparando " + extension.toUpperCase() + " neste dispositivo…";
        try {
          const api = await exporters();
          const blob = await api[method](model);
          download(blob, `fichamento_${workId}.${extension}`);
          status.textContent = "Arquivo preparado para download. Nenhum conteúdo foi enviado ao Drive.";
        } catch (error) {
          status.textContent = "Falha na exportação: " + error.message;
        } finally {
          buttons.forEach((b) => b.disabled = false);
        }
      };
    }
    container.querySelector("#documentMd").onclick = () => {
      const md = StudyRecords.documentBlocks(model).map((b) => (b.kind === "title" ? "# " : b.kind === "heading" ? "## " : b.kind === "label" ? "### " : b.kind === "quote" ? "> " : "") + b.text.replace(/\n/g, b.kind === "quote" ? "\n> " : "\n")).join("\n\n");
      download(new Blob([md], { type: "text/markdown;charset=utf-8" }), `fichamento_${workId}.md`);
    };
  }
  return { mount };
})();
