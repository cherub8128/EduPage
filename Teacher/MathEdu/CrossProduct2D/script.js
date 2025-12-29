import { ReportManager } from '../js/report-core.js';

// Initialize Report Manager
const report = new ReportManager('Cross2D-report-v7');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Report System (Markdown, AutoSave, Gallery, PDF)
    report.init();

    // 2. Init Galleries (With Button IDs)
    report.initGallery('gallery', 'gallery-input', 'gallery-drop', 'gallery-clear', 'gallery-add');
    report.initGallery('results-gallery', 'results-gallery-input', 'results-gallery-drop', 'results-gallery-clear', 'results-gallery-add');

    // 3. Init Drawer (Simple UI logic)
    initDrawer();

    // 4. Init Simulation
    initPlayground(report);
});


// ---------- Drawer Logic ----------
function initDrawer() {
    const drawer = document.getElementById('drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const triggers = ['floatOpen', 'openControls'];
    const closers = ['floatClose', 'drawer-backdrop'];

    const open = () => {
        if (drawer) drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
    };
    const close = () => {
        if (drawer) drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
    };

    triggers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', open);
    });
    closers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', close);
    });
}


// --------- Interactive: perp·dot playground ----------
function initPlayground(reportManager) {
    const canvas = document.getElementById('playCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Access Elements
    const grid = document.getElementById('optGrid');
    const fill = document.getElementById('optFill');
    const angle = document.getElementById('optAngle');
    const guides = document.getElementById('optGuides');
    const magA = document.getElementById('magA');
    const angB = document.getElementById('angB');
    const snapOrtho = document.getElementById('btnSnapOrtho');
    const snapPara = document.getElementById('btnSnapPara');
    const resetBtn = document.getElementById('btnReset');

    const dAB = document.getElementById('dAB');
    const pAB = document.getElementById('pAB');
    const angOut = document.getElementById('angleAB');

    // Setup Canvas
    const DPR = window.devicePixelRatio || 1;
    const W0 = canvas.width, H0 = canvas.height;
    // Fix resolution for High DPI
    canvas.width = W0 * DPR;
    canvas.height = H0 * DPR;

    ctx.scale(DPR, DPR);

    const C = { x: W0 / 2, y: H0 / 2 };

    // State
    let aLen = 120, aAng = 0, bLen = 140, bAng = 35;

    function syncStateFromDOM() {
        if (magA) aLen = 48 * parseFloat(magA.value);
        if (angB) bAng = parseFloat(angB.value);
    }

    // Initial sync
    syncStateFromDOM();

    // Event Listeners for Interaction (Canvas Dragging)
    let dragging = null;
    canvas.addEventListener('pointerdown', (e) => {
        const p = getMouse(e);
        const A = vec(aLen, aAng);
        const B = vec(bLen, bAng);
        const hitA = dist(p, add(C, A)) < 14;
        const hitB = dist(p, add(C, B)) < 14;
        dragging = hitA ? 'a' : hitB ? 'b' : null;
        if (dragging) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const p = getMouse(e);
        const v = sub(p, C);
        const ang = Math.atan2(v.y, v.x) * 180 / Math.PI;
        const len = Math.hypot(v.x, v.y);

        if (dragging === 'a') {
            aAng = ang;
            aLen = len;
            if (magA) {
                magA.value = (aLen / 48).toFixed(2);
                reportManager.saveContent();
            }
        } else {
            bAng = ang;
            bLen = len;
            if (angB) {
                angB.value = ((bAng + 540) % 360) - 180;
                reportManager.saveContent();
            }
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        dragging = null;
        canvas.releasePointerCapture(e.pointerId);
    });

    // Event Listeners for UI Controls
    if (magA) magA.addEventListener('input', e => { aLen = 48 * parseFloat(e.target.value); });
    if (angB) angB.addEventListener('input', e => { bAng = parseFloat(e.target.value); });

    if (snapOrtho) snapOrtho.addEventListener('click', () => {
        bAng = aAng + 90;
        updateAngB();
    });
    if (snapPara) snapPara.addEventListener('click', () => {
        bAng = aAng;
        updateAngB();
    });
    if (resetBtn) resetBtn.addEventListener('click', () => {
        aLen = 120; aAng = 0; bLen = 140; bAng = 35;
        if (magA) magA.value = 2.5;
        if (angB) angB.value = 35;
        reportManager.saveContent();
    });

    function updateAngB() {
        if (angB) {
            angB.value = ((bAng + 540) % 360) - 180;
            reportManager.saveContent();
        }
    }

    // Mathematical Helpers
    function getMouse(e) {
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (W0 / r.width),
            y: (e.clientY - r.top) * (H0 / r.height)
        };
    }
    function vec(len, angDeg) { const r = angDeg * Math.PI / 180; return { x: len * Math.cos(r), y: len * Math.sin(r) }; }
    function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
    function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function pdot(ax, ay, bx, by) { return ax * by - ay * bx; }
    function dot(ax, ay, bx, by) { return ax * bx + ay * by; }
    function len2(x, y) { return Math.hypot(x, y); }
    function angleDeg(ax, ay, bx, by) {
        const cs = dot(ax, ay, bx, by) / (len2(ax, ay) * len2(bx, by));
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cs)));
        const angleDegrees = angleRad * 180 / Math.PI;
        const sign = Math.sign(pdot(ax, ay, bx, by));
        return sign * angleDegrees;
    }
    function getCSS(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function drawVec(V, color) {
        ctx.save();
        ctx.translate(C.x, C.y);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = color; ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(V.x, V.y); ctx.stroke();
        const th = Math.atan2(V.y, V.x); const ah = 10, aw = 6;
        ctx.beginPath(); ctx.moveTo(V.x, V.y);
        ctx.lineTo(V.x - ah * Math.cos(th) + aw * Math.sin(th), V.y - ah * Math.sin(th) - aw * Math.cos(th));
        ctx.lineTo(V.x - ah * Math.cos(th) - aw * Math.sin(th), V.y - ah * Math.sin(th) + aw * Math.cos(th));
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(V.x, V.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(V.x, V.y, 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.restore();
    }

    // Render Loop
    function draw() {
        ctx.clearRect(0, 0, W0, H0);

        // Grid
        if (grid && grid.checked) {
            ctx.save(); ctx.translate(C.x, C.y);
            ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
            for (let x = -W0; x <= W0; x += 20) { line(x, -H0, x, H0); }
            for (let y = -H0; y <= H0; y += 20) { line(-W0, y, W0, y); }
            ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2; line(-W0, 0, W0, 0); line(0, -H0, 0, H0);
            ctx.restore();
        }

        const A = vec(aLen, aAng);
        const B = vec(bLen, bAng);

        if (fill && fill.checked) {
            ctx.save(); ctx.translate(C.x, C.y);
            const sgn = Math.sign(pdot(A.x, A.y, B.x, B.y)) || 1;
            const grad = ctx.createLinearGradient(0, 0, A.x + B.x, A.y + B.y);
            grad.addColorStop(0, sgn > 0 ? 'rgba(16,185,129,.18)' : 'rgba(239, 68, 68, .18)');
            grad.addColorStop(1, sgn > 0 ? 'rgba(245, 158, 11,.28)' : 'rgba(239, 68, 68, .28)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(A.x, A.y); ctx.lineTo(A.x + B.x, A.y + B.y); ctx.lineTo(B.x, B.y); ctx.closePath();
            ctx.fill();
            ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
            ctx.strokeStyle = sgn > 0 ? '#10b981' : '#ef4444';
            ctx.stroke();
            ctx.restore();
        }

        if (guides && guides.checked) {
            ctx.save(); ctx.translate(C.x, C.y);
            ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94a3b8';
            line(A.x, A.y, A.x + B.x, A.y + B.y);
            line(B.x, B.y, A.x + B.x, A.y + B.y);
            ctx.restore();
        }

        if (angle && angle.checked) {
            ctx.save(); ctx.translate(C.x, C.y);
            const r = 36;
            const a0 = aAng * Math.PI / 180, a1 = bAng * Math.PI / 180;
            let angleDiff = a1 - a0;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            const counterClockwise = angleDiff < 0;
            ctx.beginPath(); ctx.arc(0, 0, r, a0, a1, counterClockwise);
            ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.stroke();
            ctx.restore();
        }

        drawVec(A, getCSS('--a') || '#10b981');
        drawVec(B, getCSS('--b') || '#f59e0b');

        const pd = pdot(A.x, A.y, B.x, B.y);
        const cs = dot(A.x, A.y, B.x, B.y);
        const angVal = angleDeg(A.x, A.y, B.x, B.y);
        const s = (v) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(3));
        if (dAB) dAB.textContent = s(cs);
        if (pAB) pAB.textContent = s(pd / (40 * 40));
        if (angOut) angOut.textContent = s(angVal);

        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
}
