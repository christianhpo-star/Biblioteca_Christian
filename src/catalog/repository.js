/** Consulta unificada ao catálogo base e às obras manuais, preservando IDs e sobrescritas. */
function getAllWorks() {
  const added = Object.values(appState.metaOverrides || {}).filter((o) => o.catalogManual);
  return [...OBRAS_BASE, ...added].map((o) => ({ ...o, ...appState.metaOverrides[o.id] || {} }));
}
function getObraById(id) {
  const base = getAllWorks().find((o) => o.id === Number(id));
  if (!base) return null;
  const overrides = appState.metaOverrides[id] || {};
  return { ...base, ...overrides };
}
function getLeitura(id) {
  return appState.leituras[id] || {
    status: "lido",
    progresso: 100,
    paginasLidas: (getObraById(id) || {}).paginas || 0,
    favorito: false,
    avaliacao: 0,
    motivo: ""
  };
}
function getFichamento(id) {
  const base = FICHAMENTOS_BASE[String(id)] || FICHAMENTOS_BASE[Number(id)];
  const saved = appState.fichamentos[id];
  return base || saved ? { ...base || {}, ...saved || {} } : null;
}


/**
 * Reconhece apenas um instante ISO explicitamente armazenado em adicionadoEm.
 * IDs, ordem de importação, data do arquivo e últimas leituras não comprovam inclusão.
 * Datas ausentes ou inválidas não são interpretadas como "recentes".
 */
function getWorkAddedAtTimestamp(obra) {
  const raw = obra && obra.adicionadoEm;
  if (typeof raw !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) {
    return null;
  }
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Critério estável para obras legadas sem data e empates de inclusão. */
function compareHomeWorkLabels(a, b) {
  return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR") ||
    String(a.autor || "").localeCompare(String(b.autor || ""), "pt-BR") ||
    String(a.id ?? "").localeCompare(String(b.id ?? ""), "pt-BR");
}

/**
 * Escolhe até cinco referências: inclusões efetivamente datadas primeiro,
 * e depois obras sem data em ordem alfabética. Não altera o catálogo.
 */
function selectHomeWorks(works = getAllWorks(), limit = 5) {
  const maximum = Math.max(0, Math.min(5, Number.isFinite(limit) ? Math.floor(limit) : 5));
  const recent = [], legacy = [];
  for (const work of works) {
    const timestamp = getWorkAddedAtTimestamp(work);
    if (timestamp === null) legacy.push(work);
    else recent.push({ work, timestamp });
  }
  recent.sort((a, b) => (b.timestamp - a.timestamp) || compareHomeWorkLabels(a.work, b.work));
  legacy.sort(compareHomeWorkLabels);
  const dated = recent.slice(0, maximum).map(entry => entry.work);
  const undated = legacy.slice(0, maximum - dated.length);
  return { recent: dated, undated, total: works.length };
}
