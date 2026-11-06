/** Pure adapters over the existing state: no migration, network access or hidden data deletion. */
const text = (value) => value == null ? "" : String(value);
export const previousFields = [["problema", "Problema de pesquisa"], ["objetivo", "Objetivo"], ["argumento", "Tese / argumento central"], ["conceitos", "Conceitos"], ["metodologia", "Método e fontes"], ["conclusoes", "Conclusões"], ["analise", "Análise crítica"], ["conexoes", "Relações com a pesquisa"], ["perguntas", "Perguntas"]];
export function pageOrder(value) {
  const label = text(value).trim().replace(/^p(?:p|ág(?:ina)?s?)?\.?\s*/i, "");
  if (!label) return [3, 0, ""];
  if (/^\d+/.test(label)) return [1, Number(label.match(/^\d+/)[0]), label];
  const roman = label.match(/^([ivxlcdm]+)(?:\s*[–—-].*)?$/i)?.[1];
  if (roman) {
    const values = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1e3 };
    let n = 0;
    const s = roman.toLowerCase();
    for (let i = 0; i < s.length; i++) n += values[s[i]] < (values[s[i + 1]] || 0) ? -values[s[i]] : values[s[i]];
    return [0, n, label];
  }
  return [2, 0, label];
}
function timestamp(value) {
  const s = text(value);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])) : Date.parse(s) || 0;
}
export function listRecords(state, workId) {
  const records = [];
  for (const [collection, kind] of [["notas", "note"], ["citacoes", "quote"]]) {
    const items = state[collection] || [];
    items.forEach((item, index) => {
      if (Number(item.obraId) !== Number(workId)) return;
      records.push({ key: collection + ":" + item.id, id: item.id, collection, page: text(item.pagina), quote: kind === "quote" ? text(item.texto) : "", note: kind === "quote" ? text(item.comentario) : text(item.texto), createdAt: timestamp(item.criadoEm || item.data), order: item.ordemCriacao ?? -index });
    });
  }
  const f = state.fichamentos[workId];
  if (f?.livre?.trim()) records.push({ key: "legacy:livre", collection: "legacy", page: text(f.paginaLivre), quote: "", note: f.livre, createdAt: timestamp(f.dataAtualizacao), order: -Infinity });
  return records.sort((a, b) => {
    const pa = pageOrder(a.page), pb = pageOrder(b.page);
    return pa[0] - pb[0] || pa[1] - pb[1] || (pa[0] === 2 ? pa[2].localeCompare(pb[2], "pt-BR", { numeric: true }) : 0) || a.createdAt - b.createdAt || a.order - b.order || a.key.localeCompare(b.key);
  });
}
export function saveRecord(state, workId, input, now = (/* @__PURE__ */ new Date()).toISOString(), id = globalThis.crypto.randomUUID()) {
  const page = text(input.page).trim(), quote = text(input.quote).trim(), note = text(input.note).trim();
  if (!quote && !note) throw Error("Escreva uma anotação ou um trecho antes de guardar.");
  if (quote && !page) throw Error("Informe a página do trecho literal.");
  const records = listRecords(state, workId), existing = input.key ? records.find((r) => r.key === input.key) : null;
  if (input.key && !existing) throw Error("Este registro foi alterado ou removido. Reabra o caderno antes de editar.");
  if (existing?.collection === "legacy" && !quote) {
    state.fichamentos[workId] = { ...state.fichamentos[workId], livre: note, paginaLivre: page, dataAtualizacao: now };
    return existing.key;
  }
  const collection = quote ? "citacoes" : "notas";
  const original = existing && existing.collection !== "legacy" ? state[existing.collection].find((r) => r.id === existing.id) : null;
  const item = { ...original, id: existing?.id || id, obraId: Number(workId), pagina: page || null, texto: quote || note, criadoEm: original?.criadoEm || original?.data || now, ordemCriacao: original?.ordemCriacao ?? Math.max(0, ...records.map((r) => Number.isFinite(r.order) ? r.order : 0)) + 1, data: original?.data || now, atualizadoEm: now };
  if (quote) item.comentario = note;
  else delete item.comentario;
  if (existing?.collection === "legacy") state.fichamentos[workId] = { ...state.fichamentos[workId], livre: "", paginaLivre: "" };
  if (existing && existing.collection !== collection && existing.collection !== "legacy") state[existing.collection] = state[existing.collection].filter((r) => r.id !== existing.id);
  const index = state[collection].findIndex((r) => r.id === item.id);
  if (index < 0) state[collection].unshift(item);
  else state[collection][index] = item;
  return collection + ":" + item.id;
}
export function documentModel(state, work) {
  const f = state.fichamentos[work.id] || {}, groups = [];
  for (const record of listRecords(state, work.id)) {
    const heading = record.page ? "Página " + record.page : "Sem página indicada";
    let group = groups.at(-1);
    if (group?.heading !== heading) {
      group = { heading, records: [] };
      groups.push(group);
    }
    group.records.push(record);
  }
  return { title: work.titulo, author: work.autor, reference: text(f.referencia ?? work.referencia).trim() || "Referência bibliográfica não informada.", groups, appendix: previousFields.filter(([key]) => text(f[key]).trim()).map(([key, label]) => ({ label, text: text(f[key]) })) };
}
export function documentBlocks(model) {
  const blocks = [{ kind: "title", text: model.title }, { kind: "meta", text: model.author }, { kind: "heading", text: "Referência bibliográfica" }, { kind: "body", text: model.reference }];
  for (const group of model.groups) {
    blocks.push({ kind: "heading", text: group.heading });
    for (const record of group.records) {
      if (record.quote) blocks.push({ kind: "quote", text: record.quote });
      if (record.note) {
        if (record.quote) blocks.push({ kind: "label", text: "Meu comentário" });
        blocks.push({ kind: "body", text: record.note });
      }
    }
  }
  if (!model.groups.length) blocks.push({ kind: "body", text: "Nenhum registro guardado nesta obra." });
  if (model.appendix.length) {
    blocks.push({ kind: "heading", text: "Conteúdo anterior preservado" });
    for (const item of model.appendix) blocks.push({ kind: "label", text: item.label }, { kind: "body", text: item.text });
  }
  return blocks;
}
