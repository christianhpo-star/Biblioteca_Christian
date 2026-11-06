/** Sobrescritas bibliográficas sem alterar o catálogo de origem. */
function openEditMetadataFromModal() {
    closeModal('modalWorkSheet');
    openEditMetadata(currentModalWorkId);
}

function openEditMetadata(id) {
    currentModalWorkId = id;
    const obra = getObraById(id);
    if (!obra) return;

    document.getElementById('editMetaAutor').value = obra.autor;
    document.getElementById('editMetaTitulo').value = obra.titulo;
    document.getElementById('editMetaSubarea').value = obra.subarea || '';
    document.getElementById('editMetaCodigo').value = obra.codigo;
    document.getElementById('editMetaResumo').value = obra.resumo;
    document.getElementById('editMetaTags').value = (obra.palavras_chave || []).join(', ');

    openModal('modalEditMetadata');
}

function saveMetadataOverrides() {
    if (!currentModalWorkId) return;

    const autor = document.getElementById('editMetaAutor').value.trim();
    const titulo = document.getElementById('editMetaTitulo').value.trim();
    const subarea = document.getElementById('editMetaSubarea').value.trim();
    const codigo = document.getElementById('editMetaCodigo').value;
    const resumo = document.getElementById('editMetaResumo').value.trim();
    const tags = document.getElementById('editMetaTags').value.split(',').map(t => t.trim()).filter(Boolean);

    const catMap = {
        '1': 'Educação',
        '1.2': 'Educação e História',
        '2': 'História',
        '3': 'Ciências Humanas e Sociais',
        '4': 'Linguística e Literatura'
    };

    appState.metaOverrides[currentModalWorkId] = {
        autor: autor,
        titulo: titulo,
        subarea: subarea,
        codigo: codigo,
        categoria: catMap[codigo] || 'Geral',
        resumo: resumo,
        palavras_chave: tags,
        metadataQuality: 'completo'
    };

    saveAppState();
    closeModal('modalEditMetadata');
    alert('Metadados atualizados com sucesso na biblioteca!');
    filterCatalog();
    renderAuditCenter();
}

// AÇÕES DE FILTRO RÁPIDO
