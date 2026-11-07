/**
 * Geometria efêmera do leitor: reconhece gestos de S Pen em coordenadas da página.
 * Não depende do DOM, não usa serviços externos e não guarda informações.
 *
 * Auto: endireita riscos próximos de uma reta e reconhece laços fechados
 * como retângulo/elipse quando a confiança é suficiente. Riscos ambíguos
 * continuam livres; os modos explícitos sempre transformam o gesto.
 */
(() => {
    'use strict';
    const max = Math.max, min = Math.min;
    const hypot = Math.hypot;
    const clamp = (value, low, high) => max(low, min(high, value));
    const fmt = n => Number(n).toFixed(2);

    function clean(points) {
        if (!Array.isArray(points)) return [];
        return points.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))
            .map(p => ({x:Number(p.x), y:Number(p.y)}));
    }

    function bounds(points) {
        return {
            minX:min(...points.map(p=>p.x)), maxX:max(...points.map(p=>p.x)),
            minY:min(...points.map(p=>p.y)), maxY:max(...points.map(p=>p.y))
        };
    }

    function length(points) {
        return points.slice(1).reduce((sum, point, i) =>
            sum + hypot(point.x - points[i].x, point.y - points[i].y), 0);
    }

    function strokePath(points) {
        return points.map((p, i) => (i ? 'L' : 'M') +
            fmt(p.x) + ' ' + fmt(p.y)).join(' ');
    }

    function rectPath(box) {
        return 'M' + fmt(box.minX) + ' ' + fmt(box.minY) +
            ' L' + fmt(box.maxX) + ' ' + fmt(box.minY) +
            ' L' + fmt(box.maxX) + ' ' + fmt(box.maxY) +
            ' L' + fmt(box.minX) + ' ' + fmt(box.maxY) + ' Z';
    }

    function ellipsePath(box) {
        const cx = (box.minX + box.maxX) / 2;
        const cy = (box.minY + box.maxY) / 2;
        const rx = (box.maxX - box.minX) / 2, ry = (box.maxY - box.minY) / 2;
        return 'M' + fmt(cx-rx) + ' ' + fmt(cy) +
            ' A' + fmt(rx) + ' ' + fmt(ry) + ' 0 1 0 ' + fmt(cx+rx) + ' ' + fmt(cy) +
            ' A' + fmt(rx) + ' ' + fmt(ry) + ' 0 1 0 ' + fmt(cx-rx) + ' ' + fmt(cy) + ' Z';
    }

    function trianglePath(box) {
        const midX = (box.minX + box.maxX) / 2;
        return 'M' + fmt(midX) + ' ' + fmt(box.minY) +
            ' L' + fmt(box.maxX) + ' ' + fmt(box.maxY) +
            ' L' + fmt(box.minX) + ' ' + fmt(box.maxY) + ' Z';
    }

    function lineConfidence(points, diagonal, pathLength) {
        const first = points[0], last = points[points.length - 1];
        const direct = hypot(last.x-first.x, last.y-first.y);
        if (direct < 12 || direct < 0.75 * diagonal || pathLength > direct * 1.28) return false;
        const deviation = max(...points.map(p => Math.abs(
            (last.y-first.y)*p.x - (last.x-first.x)*p.y +
            last.x*first.y - last.y*first.x
        ) / direct));
        return deviation <= max(3, diagonal*0.09);
    }

    function rectangleConfidence(points, box) {
        const width = box.maxX-box.minX, height = box.maxY-box.minY;
        const tolerance = max(3, min(width, height) * 0.13);
        const sideCounts = [0,0,0,0];
        let nearEdge = 0;
        for (const p of points) {
            const ds = [Math.abs(p.x-box.minX), Math.abs(p.x-box.maxX),
                Math.abs(p.y-box.minY), Math.abs(p.y-box.maxY)];
            const distance = min(...ds);
            if (distance <= tolerance) {
                nearEdge++;
                sideCounts[ds.indexOf(distance)]++;
            }
        }
        return nearEdge / points.length >= 0.78 &&
            sideCounts.every(count => count / points.length >= 0.065);
    }

    function ellipseConfidence(points, box) {
        const cx = (box.minX + box.maxX) / 2;
        const cy = (box.minY + box.maxY) / 2;
        const rx = (box.maxX - box.minX)/2, ry = (box.maxY - box.minY)/2;
        if (rx < 6 || ry < 6) return false;
        const error = points.reduce((sum, p) => {
            const radius = hypot((p.x-cx)/rx, (p.y-cy)/ry);
            return sum + Math.abs(1-radius);
        },0) / points.length;
        return error <= 0.19;
    }

    function transform(rawPoints, preference='auto') {
        const points = clean(rawPoints);
        if (!points.length) return {kind:'freehand', d:''};
        if (points.length === 1) return {kind:'freehand', d:strokePath(points)};
        const box = bounds(points), width = box.maxX-box.minX, height=box.maxY-box.minY;
        const diag = hypot(width,height);
        const first=points[0],last=points[points.length-1];
        const pathLength=length(points);
        if (preference === 'line' || (preference === 'auto' &&
            lineConfidence(points,diag,pathLength))) {
            return {kind:'line', d:strokePath([first,last])};
        }

        const closed = hypot(first.x-last.x,first.y-last.y) <= max(12,diag*0.23);
        const canClose = width>=13 && height>=13 && diag>=25 &&
            pathLength>=diag*2.15 && closed;
        if (preference === 'rect' || (preference === 'auto' && canClose &&
            rectangleConfidence(points,box))) {
            return {kind:'rect', d:rectPath(box)};
        }
        if (preference === 'ellipse' || (preference === 'auto' && canClose &&
            ellipseConfidence(points,box))) {
            return {kind:'ellipse', d:ellipsePath(box)};
        }
        if (preference === 'triangle') return {kind:'triangle', d:trianglePath(box)};
        return {kind:'freehand', d:strokePath(points)};
    }

    // Apenas geometria; a cor, a largura e o histórico pertencem ao leitor.
    window.PdfInkGeometry = Object.freeze({transform, strokePath});
})();
