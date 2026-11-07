/**
 * Prototipo E1: visualiza páginas com PDF.js, mantendo fallback externo.
 * O experimento com PointerEvent ocorre fora das paginas: nao anota PDFs,
 * nao envia arquivos ao Drive e nao grava estado ou amostras da caneta.
 */
(() => {
    'use strict';

    const get = id => document.getElementById(id);
    const shell = get('pdfPrototype');
    if (!shell) return;

    const frame = get('pdfPrototypeFrame');
    const empty = get('pdfPrototypeEmpty');
    const fileInput = get('pdfPrototypeFile');
    const status = get('pdfPrototypeStatus');
    const originLink = get('pdfPrototypeExternal');
    const localLink = get('pdfPrototypeNewTab');
    const canvas = get('pdfPrototypeCanvas');
    const context = canvas.getContext('2d');

    let blobUrl = '';
    let activeWorkId = null;
    let returnFocus = null;
    let previousOverflow = '';
    let inactiveBackground = [];
    let requestId = 0;
    let activePointer = null;
    let lastPoint = null;
    const counts = { pen: 0, touch: 0, mouse: 0, other: 0, canceled: 0 };

    function safeWebUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return '';
        try {
            const url = new URL(value);
            return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
        } catch {
            return '';
        }
    }

    /** Blob de arquivo escolhido e usado somente durante esta sessao de leitura. */
    function releaseLocalPdf() {
        // Sem visualizador PDF nativo embutido: descarte das paginas e tinta volátil.
        window.PdfPagePrototype?.destroy();
        frame.removeAttribute('src');
        frame.hidden = true;
        empty.hidden = false;
        localLink.hidden = true;
        localLink.removeAttribute('href');
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = '';
        }
    }

    function clearPenTest() {
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
        activePointer = null;
        lastPoint = null;
        for (const key of Object.keys(counts)) counts[key] = 0;
        get('pdfPrototypePenStatus').textContent = 'Sem contato detectado neste teste.';
    }

    function releaseBackground() {
        inactiveBackground.forEach(({ element, inert }) => { element.inert = inert; });
        inactiveBackground = [];
        document.body.style.overflow = previousOverflow;
    }

    /** Abre a demonstracao com dados de exibicao apenas; nunca carrega URL privada no iframe. */
    window.openPdfPrototype = function openPdfPrototype(workId = null) {
        if (!shell.hidden) return;
        const work = workId == null ? null : getObraById(workId);
        activeWorkId = work?.id ?? null;
        returnFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        shell.hidden = false;
        document.body.style.overflow = 'hidden';

        inactiveBackground = [...document.querySelectorAll('.app-main, .app-sidebar, #cloudBar')]
            .map(element => ({ element, inert: element.inert }));
        inactiveBackground.forEach(({ element }) => { element.inert = true; });
        get('pdfPrototypeWork').textContent = work?.titulo || 'Documento local de teste';
        const url = safeWebUrl(work?.drive_url || work?.uri || '');
        originLink.hidden = !url;
        if (url) originLink.href = url;
        else originLink.removeAttribute('href');

        requestId++;
        releaseLocalPdf();
        fileInput.value = '';
        status.textContent = url
            ? 'O original vinculado pode exigir login. Escolha uma copia PDF salva no dispositivo para testar o leitor interno.'
            : 'Escolha um PDF local. Nada sera enviado ou salvo.';
        get('pdfPrototypeMouse').checked = false;
        clearPenTest();
        const details = shell.querySelector('.pdf-prototype-pen');
        if (details) details.open = false;
        get('pdfPrototypePick').focus();
    };

    window.openPdfPrototypeFromModal = function openPdfPrototypeFromModal() {
        const work = getObraById(currentModalWorkId);
        if (!work) return;
        closeModal('modalWorkSheet');
        window.openPdfPrototype(work.id);
    };

    function closePdfPrototype() {
        if (shell.hidden) return;
        const returnToWork = activeWorkId;
        requestId++;
        releaseLocalPdf();
        clearPenTest();
        fileInput.value = '';
        shell.hidden = true;
        releaseBackground();
        activeWorkId = null;
        // Restaurar antes de reabrir a ficha: a origem de foco dela nao pode ser
        // um botao que acabou de ser escondido dentro do prototipo.
        if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus();
        returnFocus = null;
        if (returnToWork && getObraById(returnToWork)) openWorkSheet(returnToWork);
    }

    /**
     * A assinatura PDF e verificada sem ler o arquivo inteiro.
     * A renderizacao interna ocorre por PDF.js, sem iframe ou plugin Android.
     * O blob fica disponivel somente para o fallback "Ver em outra aba".
     */
    async function inspectSelectedFile(file) {
        if (!file) return;
        const request = ++requestId;
        // A selecao de outro arquivo descarta a visualizacao anterior antes da validacao.
        // Isso evita deixar um PDF antigo na tela com aviso de arquivo invalido.
        releaseLocalPdf();
        if (!file.size) {
            status.textContent = 'Arquivo vazio. Escolha outro PDF.';
            return;
        }
        try {
            const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
            if (request !== requestId || shell.hidden) return;
            const signature = String.fromCharCode(...header);
            if (signature.indexOf('%PDF-') < 0) {
                status.textContent = 'O arquivo escolhido nao parece ser um PDF valido.';
                return;
            }
            const nextUrl = URL.createObjectURL(file);
            releaseLocalPdf();
            blobUrl = nextUrl;
            localLink.href = blobUrl;
            localLink.hidden = false;
            status.textContent = 'Renderizando o PDF local por páginas. Nenhum dado será enviado.';
            if (!window.PdfPagePrototype?.load) {
                throw new Error('Módulo de páginas PDF indisponível.');
            }
            await window.PdfPagePrototype.load(file);
            if (request !== requestId || shell.hidden) return;
            // O PDF interno é desenhado em canvas; iframe permanece sempre desativado.
            frame.hidden = true;
        } catch (error) {
            if (request === requestId && !shell.hidden) {
                window.PdfPagePrototype?.destroy();
                empty.hidden = false;
                status.textContent = 'Não foi possível abrir o PDF dentro da Biblioteca: ' +
                    (error?.message || 'erro desconhecido') +
                    '. Use Ver PDF em outra aba ou escolha outro PDF.';
            }
        }
    }

    /** A amostra registra apenas contagens e pressao agregada na tela; nao transmite dados. */
    function updatePenStatus(description = '') {
        get('pdfPrototypePenStatus').textContent =
            'Caneta: ' + counts.pen + ' | Dedo/toque: ' + counts.touch +
            ' | Mouse: ' + counts.mouse + ' | Outros: ' + counts.other +
            ' | Cancelamentos: ' + counts.canceled +
            (description ? '. ' + description : '.');
    }

    function pointFor(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / (rect.width || 1)),
            y: (event.clientY - rect.top) * (canvas.height / (rect.height || 1))
        };
    }

    canvas.addEventListener('pointerdown', event => {
        const type = ['pen', 'touch', 'mouse'].includes(event.pointerType)
            ? event.pointerType : 'other';
        counts[type] += 1;
        const pressure = typeof event.pressure === 'number'
            ? event.pressure.toFixed(2) : 'nao informada';
        updatePenStatus('Ultimo contato: ' + type + '; pressao: ' + pressure);
        const allowed = type === 'pen' ||
            (type === 'mouse' && get('pdfPrototypeMouse').checked);
        if (!allowed || activePointer !== null || !context) return;
        event.preventDefault();
        activePointer = event.pointerId;
        lastPoint = pointFor(event);
        try { canvas.setPointerCapture(event.pointerId); } catch { /* opcional */ }
        context.strokeStyle = '#2563eb';
        context.fillStyle = '#2563eb';
        context.lineWidth = 3;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.beginPath();
        context.arc(lastPoint.x, lastPoint.y, 1.5, 0, Math.PI * 2);
        context.fill();
    });

    function drawPointer(event) {
        if (activePointer !== event.pointerId || !lastPoint || !context) return;
        event.preventDefault();
        const next = pointFor(event);
        const pressure = Number.isFinite(event.pressure) ? event.pressure : 0.5;
        context.lineWidth = Math.max(1.5, 2 + 3 * pressure);
        context.beginPath();
        context.moveTo(lastPoint.x, lastPoint.y);
        context.lineTo(next.x, next.y);
        context.stroke();
        lastPoint = next;
    }

    canvas.addEventListener('pointermove', drawPointer);
    canvas.addEventListener('pointerup', event => {
        if (event.pointerId !== activePointer) return;
        drawPointer(event);
        activePointer = null;
        lastPoint = null;
    });
    canvas.addEventListener('pointercancel', event => {
        counts.canceled += 1;
        if (event.pointerId === activePointer) {
            activePointer = null;
            lastPoint = null;
        }
        updatePenStatus('O navegador cancelou um gesto.');
    });

    get('pdfPrototypePick').addEventListener('click', () => fileInput.click());
    get('pdfPrototypeClose').addEventListener('click', closePdfPrototype);
    get('pdfPrototypeClear').addEventListener('click', clearPenTest);
    fileInput.addEventListener('change', () => { void inspectSelectedFile(fileInput.files?.[0]); });

    // Escape e foco ficam confinados ao experimento, sem acionar a ficha subjacente.
    document.addEventListener('keydown', event => {
        if (shell.hidden) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            closePdfPrototype();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusables = [...shell.querySelectorAll('button, a[href], input:not([hidden]), summary')]
            .filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]') &&
                !el.closest('details:not([open])') && el.getClientRects().length);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (!shell.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }, true);
    window.addEventListener('pagehide', releaseLocalPdf);
})();
