import { ReportManager } from '../js/report-core.js';

const report = new ReportManager('CausticCurve-report-v2');

document.addEventListener('DOMContentLoaded', () => {
    report.init();
    report.initGallery('gallery', 'gallery-input', 'gallery-drop', 'gallery-clear', 'gallery-add');
    report.initGallery('results-gallery', 'results-gallery-input', 'results-gallery-drop', 'results-gallery-clear', 'results-gallery-add');

    initReflectionSim(report);
    initEpicycloidSim(report);
});

// --- Simulation 1: Reflection (Cardioid/Caustic) ---
function initReflectionSim(reportManager) {
    const canvas = document.getElementById('reflectionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const slider = document.getElementById('theta-slider');
    const valueDisp = document.getElementById('theta-value');

    // Resize Helper
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = entry.contentRect.width * dpr;
            canvas.height = entry.contentRect.height * dpr;
            draw();
        }
    });
    resizeObserver.observe(canvas);

    const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.35;

        ctx.clearRect(0, 0, w, h);

        // Grid / Axis
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

        // Cup (Circle)
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#6b7280'; // Neutral-500
        ctx.lineWidth = 2;
        ctx.stroke();

        // Input
        let val = parseFloat(slider.value) - 90; // 0 to 180
        if (valueDisp) valueDisp.textContent = `${val}°`;

        // Math Angle: 0 is Right, 90 is Top.
        // We want to simulate ray from Left.
        // Rays usually hit the left side of cup (180 deg) to right side (0 deg)?
        // Or if light comes from Left, it hits the LEFT side of the circle?
        // No, light from left hits the convex side? Or concave?
        // "Coffee cup" usually means light oblique into a cup.
        // Let's assume Parallel Rays from Left.
        // They hit the LEFT hemisphere: 90 deg to 270 deg.
        // Let's map slider 0..180 to angle 90..270?
        // Or simpler: Just map to the standard angle and let user sweep.

        const angleDeg = val;
        const angleRad = angleDeg * Math.PI / 180;

        // Point P
        // Canvas Y is inverted.
        const px = cx + r * Math.cos(angleRad);
        const py = cy - r * Math.sin(angleRad);

        // 1. Incident Ray (From Left, Horizontal)
        // Travels to P(px, py). Start x = 0.
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(px, py);
        ctx.strokeStyle = '#f59e0b'; // Amber-500
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Reflected Ray
        // Normal Angle at P is angleRad.
        // Reflection Formula: r = i - 2(i.n)n
        // i = (1, 0). n = (Math.cos(angleRad), Math.sin(angleRad)) [Outward]
        // Actually for internal reflection (mirror), n is inward? 
        // Law of reflection holds regardless of n direction if we use angles correctly.
        // Angle of i = 0.
        // Angle of n = angleRad.
        // r_angle = 2*theta - 0 = 2*theta. (If we consider angles wrt normal)
        // Vector algebra result: (-cos 2t, -sin 2t).

        const rx = -Math.cos(2 * angleRad);
        const ry = -Math.sin(2 * angleRad);

        // Draw Ray
        const RayLen = w; // Long enough to cross

        // End point. Canvas Y logic: y_canvas = cy - (y_math)
        // end_y_math = p_y_math + ry
        // end_y_canvas = cy - (r*sin(t) + ry*Len) = py - ry*Len
        // Since ry already contains the Math direction, we SUBTRACT it for Canvas Y if ry is positive up.
        // Yes, py is already flipped. We need to move in (rx, -ry) direction (Canvas coords).

        const ex = px + RayLen * rx;
        const ey = py - RayLen * ry;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = '#10b981'; // Emerald-500
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw P
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444'; // Red-500
        ctx.fill();
    };

    if (slider) {
        slider.addEventListener('input', () => { draw(); reportManager.saveContent(); });
        draw();
    }
}

// --- Simulation 2: Epicycloid (Cardioid/Nephroid) ---
function initEpicycloidSim(reportManager) {
    const canvas = document.getElementById('epicycloidCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const kSlider = document.getElementById('k-slider');
    const rSlider = document.getElementById('size-slider');
    const angleSlider = document.getElementById('epicycloid-slider');

    const kVal = document.getElementById('k-value');
    const rVal = document.getElementById('size-value');
    const angVal = document.getElementById('epicycloid-value');

    // Resize Helper
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = entry.contentRect.width * dpr;
            canvas.height = entry.contentRect.height * dpr;
            draw();
        }
    });
    resizeObserver.observe(canvas);

    const draw = () => {
        const k = parseInt(kSlider.value);
        const r = parseInt(rSlider.value);
        const animDeg = parseFloat(angleSlider.value);
        const animRad = animDeg * Math.PI / 180;

        if (kVal) kVal.textContent = k;
        if (rVal) rVal.textContent = r;
        if (angVal) angVal.textContent = `${animDeg.toFixed(0)}°`;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const R = k * r; // Fixed circle radius

        ctx.clearRect(0, 0, w, h);

        // 1. Fixed Circle (Gray)
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, 2 * Math.PI);
        ctx.strokeStyle = '#d1d5db'; // Neutral-300
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Epicycloid Curve (Purple)
        ctx.beginPath();
        ctx.strokeStyle = '#8b5cf6'; // Violet-500
        ctx.lineWidth = 2;

        const maxT = 2 * Math.PI * (k < 1 ? 10 : 1); // Enough loops

        // Plot Parametric
        // x = (R+r)cos t - r cos((R+r)/r t) = r(k+1)cos t - r cos(k+1)t
        // y = r(k+1)sin t - r sin(k+1)t

        let first = true;
        for (let t = 0; t <= maxT + 0.1; t += 0.05) {
            const xMath = r * (k + 1) * Math.cos(t) - r * Math.cos((k + 1) * t);
            const yMath = r * (k + 1) * Math.sin(t) - r * Math.sin((k + 1) * t);

            // Canvas Coords
            const px = cx + xMath;
            const py = cy - yMath; // Flip Y

            if (first) { ctx.moveTo(px, py); first = false; }
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 3. Rolling Circle (Cyan)
        // Center position angle t = animRad
        const centerDist = R + r;
        const mcxMath = centerDist * Math.cos(animRad);
        const mcyMath = centerDist * Math.sin(animRad);

        const mcx = cx + mcxMath;
        const mcy = cy - mcyMath;

        ctx.beginPath();
        ctx.arc(mcx, mcy, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#06b6d4'; // Cyan-500
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4. Trace Point (Red)
        const txMath = r * (k + 1) * Math.cos(animRad) - r * Math.cos((k + 1) * animRad);
        const tyMath = r * (k + 1) * Math.sin(animRad) - r * Math.sin((k + 1) * animRad);

        const tx = cx + txMath;
        const ty = cy - tyMath;

        // Radius Line (Center to Point)
        ctx.beginPath();
        ctx.moveTo(mcx, mcy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.stroke();

        // Point
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
