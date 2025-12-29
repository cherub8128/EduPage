import { ReportManager } from '../js/report-core.js';

const report = new ReportManager('CausticCurve-report-v2');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Report System
    report.init();

    // 2. Init Galleries
    report.initGallery('gallery', 'gallery-input', 'gallery-drop', 'gallery-clear', 'gallery-add');
    report.initGallery('results-gallery', 'results-gallery-input', 'results-gallery-drop', 'results-gallery-clear', 'results-gallery-add');

    // 3. Init Simulations
    initReflectionSim(report);
    initEpicycloidSim(report);
});

// --- Simulation 1: Reflection (Light Ray) ---
function initReflectionSim(reportManager) {
    const canvas = document.getElementById('reflectionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const slider = document.getElementById('theta-slider');
    const valueDisp = document.getElementById('theta-value');

    const draw = () => {
        const w = canvas.width = 400; // Fixed resolution for report consistency
        const h = canvas.height = 400;

        ctx.clearRect(0, 0, w, h);

        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.35;

        // Angle Logic
        let val = parseFloat(slider.value); // 0~180
        // Map 0 -> 90deg(Right), 90 -> 0deg(Top), 180 -> -90deg(Left)
        // Actually original logic was: value - 90.
        // Let's stick to original valid logic:
        const angleDeg = val - 90;
        const angleRad = angleDeg * Math.PI / 180;

        if (valueDisp) valueDisp.textContent = `${val}°`; // Display raw slider value for UX

        // 1. Cup (Circle)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Axis
        ctx.beginPath();
        ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.stroke();

        /*
           Wait, standard math coord: X right, Y up. Canvas: Y down.
           P(cos, sin). Canvas P(cx + r*cos, cy - r*sin).
        */
        const px = centerX + radius * Math.cos(angleRad);
        const py = centerY - radius * Math.sin(angleRad);

        // 3. Incident Ray (Horizontal from Left)
        // If angle is -90 ~ 90 (Right side), ray comes from left.
        // Current angle logic: 0(Right) -> -90(Top) -> -180(Left).
        // Let's rely on visual checkout. 
        // Original: const angleDeg = sliderValue - 90;
        // 135 -> 45deg. 

        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(px, py);
        ctx.strokeStyle = '#f59e0b'; // Amber
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Reflected Ray
        // Angle of incidence = Angle of reflection.
        // Surface normal angle at P is angleRad.
        // Incident Ray angle is 0 (Horizontal).
        // Actually let's use the vector reflection formula: r = i - 2(i.n)n
        // i = (1, 0). n = (-cos, -sin) (inward normal)
        // Wait, n at surface is outward (cos, sin) or inward (-cos, -sin).

        // Original Logic:
        const reflectedAngle = 2 * angleRad;
        let dirX = Math.cos(reflectedAngle);
        let dirY = -Math.sin(reflectedAngle); // Output: Canvas Space Y is inverted

        // Force inward
        const toCx = centerX - px;
        const toCy = centerY - py;
        if (dirX * toCx + dirY * toCy < 0) {
            dirX = -dirX;
            dirY = -dirY;
        }

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + w * dirX, py + h * dirY);
        ctx.strokeStyle = '#10b981'; // Green
        ctx.lineWidth = 2;
        ctx.stroke();

        // P
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    };

    if (slider) {
        slider.addEventListener('input', () => {
            draw();
            reportManager.saveContent();
        });
        // Initial load check
        if (localStorage.getItem(reportManager.storageKey)) {
            // ReportManager restores .savable inputs. We just need to sync visuals.
            // But 'input' event might not fire on load.
            // We can check value manually.
        }
        draw();
    }
}

// --- Simulation 2: Epicycloid ---
function initEpicycloidSim(reportManager) {
    const canvas = document.getElementById('epicycloidCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const kSlider = document.getElementById('k-slider');
    const rSlider = document.getElementById('size-slider'); // 'size' is r
    const angleSlider = document.getElementById('epicycloid-slider');

    // Value Displays
    const kVal = document.getElementById('k-value');
    const rVal = document.getElementById('size-value');
    const angVal = document.getElementById('epicycloid-value');

    const draw = () => {
        const k = parseInt(kSlider.value);
        const r = parseInt(rSlider.value);
        const animDeg = parseFloat(angleSlider.value);
        const animRad = animDeg * Math.PI / 180;

        if (kVal) kVal.textContent = k;
        if (rVal) rVal.textContent = r;
        if (angVal) angVal.textContent = `${animDeg.toFixed(0)}°`;

        const w = canvas.width = 400;
        const h = canvas.height = 400;
        const cx = w / 2;
        const cy = h / 2;
        const R = k * r; // Fixed circle radius

        ctx.clearRect(0, 0, w, h);

        // Fixed Circle (Gray)
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Epicycloid Curve (Purple)
        ctx.beginPath();
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;

        // Theoretical max t for closed curve depends on k.
        // For integer k, 2PI is enough.
        const maxT = 2 * Math.PI;

        for (let t = 0; t <= maxT; t += 0.05) {
            const x = cx + r * (k + 1) * Math.cos(t) - r * Math.cos((k + 1) * t);
            const y = cy + r * (k + 1) * Math.sin(t) - r * Math.sin((k + 1) * t); // Canvas Y + is down, but sin is up.. usually -sin.
            // Let's keep original: +sin -sin. Origin Y is down.
            // Wait, original code:
            // y = centerY + ... sin(t) ... - sin(...) 
            // In standard math y is up. In canvas y is down.
            // If we want standard orientation, we usually do centerY - (...).
            // But let's stick to original visualization which worked.
            if (t === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Moving Circle (Cyan)
        // Center position at animRad
        const mcx = cx + (R + r) * Math.cos(animRad);
        const mcy = cy + (R + r) * Math.sin(animRad);

        ctx.beginPath();
        ctx.arc(mcx, mcy, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Trace Point (Red)
        const tx = cx + r * (k + 1) * Math.cos(animRad) - r * Math.cos((k + 1) * animRad);
        const ty = cy + r * (k + 1) * Math.sin(animRad) - r * Math.sin((k + 1) * animRad);

        // Line from MC center to Trace Point
        ctx.beginPath();
        ctx.moveTo(mcx, mcy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    };

    [kSlider, rSlider, angleSlider].forEach(el => {
        if (el) el.addEventListener('input', () => {
            draw();
            reportManager.saveContent();
        });
    });
    draw();
}
