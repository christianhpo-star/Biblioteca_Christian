/**
 * E1/E2 experimental: PDF.js na mesma origem, renderizacao por pagina e tinta
 * VOLATIL. O PDF e os tracos ficam somente em memoria; nenhuma API remota,
 * appState, IndexedDB, exportacao ou escrita de volta no arquivo e utilizada.
 *
 * O canvas de cada pagina e independente do SVG de tinta. A S Pen desenha
 * apenas se PointerEvent.pointerType === "pen"; dedos rolam/pincam. Apoio
 * da palma recebe heuristica, nao garantia de rejeicao nativa.
 */
(() => {
    'use strict';
    const get = id => document.getElementById(id);
    const container = get('pdfPrototypePages');
    if (!container) return;

    const maxBytes = 50 * 1024 * 1024;
    const pageLimit = 500;
    const maxPainted = 6;
    const maxPixelRatio = 2;
    const minZoom = 0.75, maxZoom = 2.25;
    const ns = 'http://www.w3.org/2000/svg';
    const state = {
        task: null, pdf: null, observer: null, records: [], queue: [],
        inFlight: 0, generation: 0, zoom: 1, tool: 'pen',
        activePen: null, touches: new Map(), pinch: null,
        nextStrokeId: 0, history: [], loading: null, loadLibrary: null
    };

    function clamp(value, low, high) {
        return Math.min(high, Math.max(low, value));
    }

    function safeStatus(value) {
        get('pdfPrototypeStatus').textContent = value;
    }

    function setTool(tool) {
        if (!['pen', 'highlight', 'erase'].includes(tool)) return;
        state.tool = tool;
        for (const [id, current] of [
            ['pdfInkPen', 'pen'], ['pdfInkHighlight', 'highlight'], ['pdfInkErase', 'erase']
        ]) {
            get(id)?.setAttribute('aria-pressed', String(tool === current));
        }
    }

    function setZoom(next) {
        if (!state.pdf) return;
        const zoom = Math.round(clamp(Number(next) || 1, minZoom, maxZoom) * 20) / 20;
        state.zoom = zoom;
        get('pdfZoomLabel').textContent = Math.round(zoom * 100) + '%';
        state.queue.length = 0;
        for (const record of state.records) {
            if (record.task) {
                try { record.task.cancel(); } catch { /* tarefa ja terminou */ }
            }
            record.renderedZoom = 0;
            record.version++;
            resizeStage(record);
        }
        queueVisiblePages();
    }

    function distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function pointOnPage(record, event) {
        const rect = record.svg.getBoundingClientRect();
        const width = rect.width || 1, height = rect.height || 1;
        return {
            x: clamp(((event.clientX - rect.left) / width) * record.baseWidth, 0, record.baseWidth),
            y: clamp(((event.clientY - rect.top) / height) * record.baseHeight, 0, record.baseHeight)
        };
    }

    function pathData(points) {
        return points.map((point, index) =>
            (index ? 'L' : 'M') + point.x.toFixed(1) + ' ' + point.y.toFixed(1)
        ).join(' ');
    }

    function makePath(stroke) {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', pathData(stroke.points));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', stroke.tool === 'highlight' ? '#facc15' : '#2563eb');
        path.setAttribute('stroke-width', String(stroke.tool === 'highlight' ? 12 : 2.3));
        path.setAttribute('stroke-opacity', stroke.tool === 'highlight' ? '0.45' : '1');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('pointer-events', 'none');
        return path;
    }

    function repaintInk(record) {
        record.svg.replaceChildren(...record.strokes.map(makePath));
    }

    function commitStroke(record, stroke) {
        if (stroke.points.length === 1) {
            // Um toque isolado deve produzir um ponto visivel.
            stroke.points.push({x: stroke.points[0].x + 0.05, y: stroke.points[0].y + 0.05});
        }
        record.strokes.push(stroke);
        state.history.push({kind: 'add', index: record.index, stroke});
        repaintInk(record);
    }

    function nearestStroke(record, point) {
        let nearest = null, smallest = Infinity;
        const tolerance = 13 / (record.scale || 1);
        for (const stroke of record.strokes) {
            const points = stroke.points;
            for (let i = 0; i < points.length; i++) {
                const a = points[i], b = points[Math.min(i + 1, points.length - 1)];
                const dx = b.x - a.x, dy = b.y - a.y;
                const fraction = (dx || dy) ? clamp(
                    ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
                    0, 1
                ) : 0;
                const dist = Math.hypot(point.x - a.x - fraction * dx, point.y - a.y - fraction * dy);
                if (dist < smallest) { smallest = dist; nearest = stroke; }
            }
        }
        return smallest <= tolerance ? nearest : null;
    }

    function eraseStroke(record, point) {
        const stroke = nearestStroke(record, point);
        if (!stroke) return;
        record.strokes.splice(record.strokes.indexOf(stroke), 1);
        state.history.push({kind: 'erase', index: record.index, stroke});
        repaintInk(record);
    }

    function undoStroke() {
        const action = state.history.pop();
        if (!action) return;
        if (action.kind === 'clear') {
            for (const item of action.snapshot) {
                const r = state.records[item.index - 1];
                if (r) { r.strokes = item.strokes; repaintInk(r); }
            }
            return;
        }
        const record = state.records[action.index - 1];
        if (!record) return;
        if (action.kind === 'add') {
            record.strokes = record.strokes.filter(item => item.id !== action.stroke.id);
        } else if (!record.strokes.some(item => item.id === action.stroke.id)) {
            record.strokes.push(action.stroke);
        }
        repaintInk(record);
    }

    function clearAllInk() {
        const snapshot = state.records.filter(record => record.strokes.length)
            .map(record => ({index: record.index, strokes: record.strokes.slice()}));
        if (!snapshot.length) return;
        if (typeof window.confirm === 'function' &&
            !window.confirm('Apagar os riscos temporários deste PDF?')) return;
        state.history.push({kind: 'clear', snapshot});
        for (const record of state.records) { record.strokes = []; repaintInk(record); }
        safeStatus('Riscos temporários apagados. Use Desfazer para recuperar nesta sessão.');
    }

    function recordPenDown(record, event) {
        if (state.activePen) return;
        const allow = event.pointerType === 'pen' ||
            (event.pointerType === 'mouse' && get('pdfPrototypeMouse').checked);
        if (!allow) return;
        event.preventDefault();
        try { record.svg.setPointerCapture(event.pointerId); } catch { /* opcional */ }
        const position = pointOnPage(record, event);
        if (state.tool === 'erase') {
            eraseStroke(record, position);
            return;
        }
        const stroke = {
            id: ++state.nextStrokeId, tool: state.tool,
            points: [position]
        };
        const line = makePath(stroke);
        record.svg.append(line);
        state.activePen = {pointerId: event.pointerId, record, stroke, line};
        state.touches.clear();
        state.pinch = null;
    }

    function recordPenMove(event) {
        const active = state.activePen;
        if (!active || event.pointerId !== active.pointerId) return false;
        event.preventDefault();
        const point = pointOnPage(active.record, event);
        const prev = active.stroke.points[active.stroke.points.length - 1];
        if (distance(prev, point) < 0.4) return true;
        active.stroke.points.push(point);
        active.line.setAttribute('d', pathData(active.stroke.points));
        return true;
    }

    function endPen(event, canceled = false) {
        const active = state.activePen;
        if (!active || active.pointerId !== event.pointerId) return false;
        state.activePen = null;
        active.line.remove();
        if (!canceled) commitStroke(active.record, active.stroke);
        else safeStatus('Um traço foi interrompido pelo navegador e não foi mantido.');
        return true;
    }

    function touchStart(record, event) {
        if (state.activePen) return; // Palma nunca inicia um traço ou rolagem durante escrita.
        try { record.svg.setPointerCapture(event.pointerId); } catch { /* opcional */ }
        state.touches.set(event.pointerId, {x: event.clientX, y: event.clientY});
        if (state.touches.size === 2) {
            const [a, b] = [...state.touches.values()];
            state.pinch = {start: distance(a, b), zoom: state.zoom, next: state.zoom};
        }
    }

    function touchMove(event) {
        const last = state.touches.get(event.pointerId);
        if (!last) return;
        event.preventDefault();
        if (state.activePen) return;
        const next = {x: event.clientX, y: event.clientY};
        if (state.touches.size === 1) {
            container.scrollTop -= next.y - last.y;
            container.scrollLeft -= next.x - last.x;
        }
        state.touches.set(event.pointerId, next);
        if (state.touches.size > 1 && state.pinch && state.pinch.start) {
            const [a, b] = [...state.touches.values()];
            state.pinch.next = clamp(state.pinch.zoom * distance(a, b) / state.pinch.start,
                minZoom, maxZoom);
            get('pdfZoomLabel').textContent = Math.round(state.pinch.next * 100) + '%';
        }
        updatePageIndicator();
    }

    function touchEnd(event) {
        if (!state.touches.has(event.pointerId)) return;
        state.touches.delete(event.pointerId);
        if (state.pinch && state.touches.size < 2) {
            const zoom = state.pinch.next;
            state.pinch = null;
            if (Math.abs(zoom - state.zoom) >= 0.04) setZoom(zoom);
            else get('pdfZoomLabel').textContent = Math.round(state.zoom * 100) + '%';
        }
    }

    function bindOverlay(record) {
        const svg = record.svg;
        svg.addEventListener('pointerdown', event => {
            if (event.pointerType === 'touch') touchStart(record, event);
            else recordPenDown(record, event);
        });
        svg.addEventListener('pointermove', event => {
            if (!recordPenMove(event) && event.pointerType === 'touch') touchMove(event);
        });
        svg.addEventListener('pointerup', event => {
            endPen(event);
            if (event.pointerType === 'touch') touchEnd(event);
        });
        svg.addEventListener('pointercancel', event => {
            endPen(event, true);
            if (event.pointerType === 'touch') touchEnd(event);
        });
    }

    function resizeStage(record) {
        const rootWidth = Math.max(260, container.clientWidth - 32);
        record.scale = (rootWidth / record.baseWidth) * state.zoom;
        const width = Math.max(1, Math.round(record.baseWidth * record.scale));
        const height = Math.max(1, Math.round(record.baseHeight * record.scale));
        record.stage.style.width = width + 'px';
        record.stage.style.height = height + 'px';
        record.canvas.style.width = width + 'px';
        record.canvas.style.height = height + 'px';
        record.svg.setAttribute('viewBox', '0 0 ' + record.baseWidth + ' ' + record.baseHeight);
        record.svg.style.width = width + 'px';
        record.svg.style.height = height + 'px';
    }

    function updatePageIndicator() {
        if (!state.records.length) return;
        const viewportTop = container.getBoundingClientRect().top;
        let page = 1, best = Infinity;
        for (const record of state.records) {
            const distanceToTop = Math.abs(record.element.getBoundingClientRect().top - viewportTop);
            if (distanceToTop < best) { best = distanceToTop; page = record.index; }
        }
        get('pdfPageIndicator').textContent = 'Página ' + page + ' de ' + state.records.length;
    }

    async function renderRecord(record) {
        const gen = state.generation, version = ++record.version;
        if (!state.pdf) return;
        record.rendering = true;
        try {
            const page = await state.pdf.getPage(record.index);
            if (gen !== state.generation || version !== record.version) return;
            const original = page.getViewport({scale:1});
            record.baseWidth = original.width;
            record.baseHeight = original.height;
            resizeStage(record);
            const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
            const viewport = page.getViewport({scale:record.scale * ratio});
            const canvas = record.canvas;
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext('2d', {alpha:false});
            if (!ctx) throw new Error('Canvas 2D indisponível.');
            const task = page.render({canvas, canvasContext:ctx, viewport});
            record.task = task;
            await task.promise;
            if (gen !== state.generation || version !== record.version) return;
            record.renderedZoom = state.zoom;
            record.element.classList.remove('pdf-page-loading');
            record.error.hidden = true;
            updatePageIndicator();
        } catch (error) {
            if (gen !== state.generation || version !== record.version) return;
            if (error?.name !== 'RenderingCancelledException') {
                const reason = String(error?.message || 'falha de renderização');
                record.error.textContent = 'Não foi possível renderizar a página ' +
                    record.index + ': ' + reason;
                record.error.hidden = false;
                safeStatus('Falha de renderização: ' + reason);
            }
        } finally {
            record.rendering = false;
            record.task = null;
            if (gen === state.generation) { queueVisiblePages(); pump(); }
        }
    }

    const queued = new Set();
    function queueRecord(record) {
        if (!state.pdf || !record || record.rendering ||
            record.renderedZoom === state.zoom || queued.has(record.index)) return;
        queued.add(record.index);
        state.queue.push(record);
        pump();
    }

    function pump() {
        while (state.pdf && state.inFlight < 2 && state.queue.length) {
            const record = state.queue.shift();
            queued.delete(record.index);
            if (record.rendering || record.renderedZoom === state.zoom) continue;
            state.inFlight++;
            const startedAt = state.generation;
            void renderRecord(record).finally(() => {
                if (startedAt !== state.generation) return;
                state.inFlight = Math.max(0, state.inFlight - 1);
                if (state.pdf) { evictCanvasCache(); pump(); }
            });
        }
    }

    function evictCanvasCache() {
        const painted = state.records.filter(record => record.renderedZoom === state.zoom);
        if (painted.length <= maxPainted) return;
        const center = container.getBoundingClientRect().top + container.clientHeight / 2;
        const sortable = painted.map(record => ({
            record,
            distance: Math.abs(record.element.getBoundingClientRect().top - center)
        })).sort((a, b) => b.distance - a.distance);
        for (const item of sortable.slice(0, painted.length - maxPainted)) {
            // Mantem SVG e memoria de traços; descarta somente pixels fora da tela.
            item.record.canvas.width = 1;
            item.record.canvas.height = 1;
            item.record.renderedZoom = 0;
            item.record.element.classList.add('pdf-page-loading');
        }
    }

    function queueVisiblePages() {
        if (!state.pdf) return;
        const root = container.getBoundingClientRect();
        for (const record of state.records) {
            const bounds = record.element.getBoundingClientRect();
            if (bounds.bottom >= root.top - 450 && bounds.top <= root.bottom + 450) {
                queueRecord(record);
            }
        }
    }

    function createRecord(index, firstViewport) {
        const element = document.createElement('section');
        element.className = 'pdf-rendered-page pdf-page-loading';
        element.setAttribute('aria-label', 'Página ' + index);
        element.dataset.page = String(index);
        const stage = document.createElement('div');
        stage.className = 'pdf-page-stage';
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        const svg = document.createElementNS(ns, 'svg');
        svg.classList.add('pdf-page-ink');
        svg.setAttribute('aria-label', 'Anotações temporárias da página ' + index);
        svg.setAttribute('role', 'img');
        const error = document.createElement('p');
        error.className = 'pdf-page-error';
        error.hidden = true;
        stage.append(canvas, svg);
        element.append(stage, error);
        const record = {
            index, element, stage, canvas, svg, error, strokes: [],
            baseWidth: firstViewport.width, baseHeight: firstViewport.height,
            scale: 1, renderedZoom: 0, rendering:false, task:null, version:0
        };
        bindOverlay(record);
        resizeStage(record);
        return record;
    }

    async function library() {
        if (!state.loadLibrary) {
            state.loadLibrary = import(new URL('vendor/pdfjs/pdf.min.mjs', document.baseURI).href)
                .then(lib => {
                    lib.GlobalWorkerOptions.workerSrc =
                        new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
                    return lib;
                }).catch(error => {
                    state.loadLibrary = null;
                    throw error;
                });
        }
        return state.loadLibrary;
    }

    async function load(file) {
        destroy();
        const gen = state.generation;
        if (!file || file.size > maxBytes) {
            throw new Error('PDF de teste deve ter no máximo 50 MB.');
        }
        safeStatus('Lendo PDF local dentro da Biblioteca…');
        const lib = await library();
        if (gen !== state.generation) return;
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (gen !== state.generation) return;
        const task = lib.getDocument({data:bytes, isEvalSupported:false});
        state.task = task;
        const pdf = await task.promise;
        if (gen !== state.generation) { await task.destroy(); return; }
        if (pdf.numPages > pageLimit) {
            await task.destroy();
            throw new Error('Protótipo limitado a PDFs com até 500 páginas.');
        }
        state.pdf = pdf;
        const first = await pdf.getPage(1);
        if (gen !== state.generation) return;
        const viewport = first.getViewport({scale:1});
        state.records = Array.from({length: pdf.numPages},
            (_, i) => createRecord(i + 1, viewport));
        container.replaceChildren(...state.records.map(r => r.element));
        container.hidden = false;
        get('pdfPrototypeEmpty').hidden = true;
        get('pdfPrototypeTools').hidden = false;
        state.observer = new IntersectionObserver(entries => {
            for (const entry of entries) if (entry.isIntersecting) {
                const record = state.records[Number(entry.target.dataset.page) - 1];
                queueRecord(record);
            }
            evictCanvasCache();
        }, {root:container, rootMargin:'400px 0px'});
        // A primeira página deve estar realmente pintada antes de iniciar observadores.
        // Evita dois renders concorrentes da primeira página no primeiro frame.
        await renderRecord(state.records[0]);
        if (gen !== state.generation) return;
        if (!state.records[0].error.hidden) {
            throw new Error('A primeira página não pôde ser renderizada.');
        }
        state.records.forEach(r => state.observer.observe(r.element));
        updatePageIndicator();
        safeStatus('PDF: ' + pdf.numPages + ' páginas. Dedo: navegar e pinçar. ' +
            'S Pen: escrever. Riscos temporários, sem salvamento.');
    }

    function destroy() {
        state.generation++;
        state.observer?.disconnect();
        state.observer = null;
        state.queue.length = 0;
        queued.clear();
        state.activePen = null;
        state.touches.clear();
        state.pinch = null;
        for (const r of state.records) {
            if (r.task) {
                try { r.task.cancel(); } catch { /* tarefa pode ter terminado */ }
            }
        }
        if (state.task) {
            void state.task.destroy().catch(() => {});
        }
        state.task = null;
        state.pdf = null;
        state.records = [];
        state.history = [];
        state.inFlight = 0;
        state.zoom = 1;
        state.tool = 'pen';
        get('pdfZoomLabel').textContent = '100%';
        get('pdfPageIndicator').textContent = '';
        setTool('pen');
        container.replaceChildren();
        container.hidden = true;
        get('pdfPrototypeTools').hidden = true;
    }

    get('pdfInkPen').addEventListener('click', () => setTool('pen'));
    get('pdfInkHighlight').addEventListener('click', () => setTool('highlight'));
    get('pdfInkErase').addEventListener('click', () => setTool('erase'));
    get('pdfInkUndo').addEventListener('click', undoStroke);
    get('pdfInkClear').addEventListener('click', clearAllInk);
    get('pdfZoomIn').addEventListener('click', () => setZoom(state.zoom + 0.2));
    get('pdfZoomOut').addEventListener('click', () => setZoom(state.zoom - 0.2));
    container.addEventListener('scroll', updatePageIndicator, {passive:true});
    window.addEventListener('resize', () => {
        if (!state.pdf) return;
        state.queue.length = 0;
        for (const r of state.records) { r.renderedZoom = 0; resizeStage(r); }
        queueVisiblePages();
    });

    // Exposicao minima de ciclo de vida ao modulo legado; nenhum dado persiste.
    window.PdfPagePrototype = {load, destroy};
})();
