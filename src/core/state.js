/** Estado e padrões de leitura; os IDs e o esquema são compatíveis com os backups existentes. */

// BASE DE DADOS DO CATÁLOGO EMBUTIDA (100% OFFLINE)
let OBRAS_BASE = window.LIBRARY_DATA.obras;

// BASE DE 137 FICHAMENTOS ACADÊMICOS PRÉ-PREENCHIDOS
let FICHAMENTOS_BASE = window.LIBRARY_DATA.fichamentos;

// CHAVE DE ARMAZENAMENTO LOCAL
let STORAGE_KEY = window.LIBRARY_CONFIG.storageKey;

// INICIALIZA ESTADO PADRÃO COM OBRAS ATUAIS MARCADAS COMO LIDAS
function createDefaultReadState() {
    const leituras = {};
    OBRAS_BASE.forEach(o => {
        leituras[o.id] = {
            status: 'lido',
            progresso: 100,
            paginasLidas: o.paginas,
            favorito: false,
            avaliacao: 0,
            motivo: 'Leitura inicial integrada ao acervo.',
            dataConclusao: '2026-09-19'
        };
    });
    return leituras;
}

// ESTADO GLOBAL DA APLICAÇÃO
function createDefaultAppState() { return {
    leituras: createDefaultReadState(),
    notas: [],
    citacoes: [],
    fichamentos: {},
    colecoes: [],
    metaOverrides: {},
    config: {
        theme: 'light',
        viewMode: 'cards',
        sidebarCollapsed: false
    }
};
}
let appState = createDefaultAppState();

// VARIÁVEIS DE CONTROLE DE FILTROS FACETADOS MULTI-TAG
let currentView = 'dashboard';
let currentModalWorkId = null;
let selectedSubareas = new Set();
let selectedTags = new Set();
let filterLogic = 'AND'; // 'AND' ou 'OR'
let currentSelectedCollectionId = null;

// INICIALIZAÇÃO
