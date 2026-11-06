/** Consulta unificada ao catálogo base e às obras manuais, preservando IDs e sobrescritas. */
function getAllWorks() {
    const added = Object.values(appState.metaOverrides || {}).filter(o => o.catalogManual);
    return [...OBRAS_BASE, ...added].map(o => ({...o, ...(appState.metaOverrides[o.id] || {})}));
}

function getObraById(id) {
    const base = getAllWorks().find(o => o.id === Number(id));
    if (!base) return null;
    const overrides = appState.metaOverrides[id] || {};
    return { ...base, ...overrides };
}

function getLeitura(id) {
    return appState.leituras[id] || {
        status: 'lido',
        progresso: 100,
        paginasLidas: (getObraById(id) || {}).paginas || 0,
        favorito: false,
        avaliacao: 0,
        motivo: ''
    };
}

function getFichamento(id) {
    return appState.fichamentos[id] || FICHAMENTOS_BASE[String(id)] || FICHAMENTOS_BASE[Number(id)] || null;
}
