/** Exportação e restauração do estado; a validação é compartilhada com a sincronização. */
function exportFullBackup() {
    const backupData = {
        versao: '2.0',
        dataExportacao: new Date().toISOString(),
        state: appState
    };
    const str = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(`backup_biblioteca_pesquisa_${dateStr}.json`, str, 'application/json');
}

function exportCatalogCSV() {
    let csv = "ID;Código;Área;SubÁrea;Autor;Título;Páginas;Tamanho_MB;Status_Leitura;Arquivo\n";
    getAllWorks().forEach(o => {
        const lei = getLeitura(o.id);
        csv += `${o.id};${o.codigo};"${o.categoria}";"${o.subarea}";"${o.autor}";"${o.titulo.replace(/"/g, '""')}";${o.paginas};${o.tamanho_mb};"${lei.status}";"${o.arquivo}"\n`;
    });
    downloadFile("Catalogo_Biblioteca_Completo.csv", csv, 'text/csv;charset=utf-8;');
}

function importBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.state) {
                appState = window.libraryValidateState(parsed.state);
                saveAppState();
                alert(window.LIBRARY_CONFIG.mode === 'firebase' ? 'Backup importado neste dispositivo. A sincronização será retomada ao recarregar.' : 'Backup restaurado neste dispositivo.');
                location.reload();
            } else {
                alert('Arquivo de backup inválido.');
            }
        } catch (err) {
            alert('Erro ao processar arquivo JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function confirmResetStore() {
    const message = window.LIBRARY_CONFIG.mode === 'firebase' ? 'Isso recarregará seus dados salvos na nuvem e descartará alterações locais ainda não sincronizadas. Deseja continuar?' : 'Isso apagará seus cadernos, obras cadastradas e progresso deste navegador. Exporte um backup antes de continuar. Deseja continuar?';
    if (confirm(message)) {
        localStorage.removeItem(STORAGE_KEY);
        if (window.libraryCloudCacheKey) localStorage.removeItem(window.libraryCloudCacheKey);
        location.reload();
    }
}
