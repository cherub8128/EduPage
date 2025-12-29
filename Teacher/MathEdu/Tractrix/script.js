import { ReportManager } from '../js/report-core.js';

const report = new ReportManager('Tractrix-report-v2');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Report System
    report.init();

    // 2. Init Galleries
    report.initGallery('gallery1', 'gallery1-input', 'gallery1-drop', 'gallery1-clear', 'gallery1-add');
    report.initGallery('gallery2', 'gallery2-input', 'gallery2-drop', 'gallery2-clear', 'gallery2-add');
    report.initGallery('results-gallery', 'results-gallery-input', 'results-gallery-drop', 'results-gallery-clear', 'results-gallery-add');

    // 3. Init Simulation
    initTractrixSim(report);
});

// --- Tractrix Simulation ---
function initTractrixSim(reportManager) {
    const canvas = document.getElementById('tractrixCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const lSlider = document.getElementById('l-slider');
    const tSlider = document.getElementById('t-slider');
    const lValue = document.getElementById('l-value');
    const tValue = document.getElementById('t-value');

    let sim = {
        L: 100,
        pullerY: 0,
        isDragging: false,
        path: []
    };

    // Calculate initial state from DOM
    if (lSlider) sim.L = parseFloat(lSlider.value);

    // Initial draw
    update();

    function update() {
        if (!ctx) return;
        draw();
    }

    function calculateObjectPos(pullerY, L) {
        // Tractrix parametric:
        // x = L * sin(t)
        // y = L * cos(t) + pullerY
        // t is angle from Y axis.
        // Relationship between y_puller and t:
        // y_puller = L * ln(tan(t/2))
        // So t = 2 * atan(exp(y_puller / L))

        const t = 2 * Math.atan(Math.exp(pullerY / L));
        const x = L * Math.sin(t);
        const y = L * Math.cos(t) + pullerY;
        return { x, y, t };
    }

    function draw() {
        const w = canvas.width = 500;
        const h = canvas.height = 600;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // 1. Axis
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.stroke();

        // 2. Current State
        const { x, y, t } = calculateObjectPos(sim.pullerY, sim.L);

        // Coords: Y up (Math) vs Y down (Canvas)
        // Let's use: CanvasY = cy - MathY

        const pullerCx = cx;
        const pullerCy = cy - sim.pullerY;
        const objCx = cx + x;
        const objCy = cy - y;

        // 3. Path (Green)
        if (sim.path.length > 1) {
            ctx.strokeStyle = 'rgba(22, 163, 74, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Right Path
            sim.path.forEach((p, i) => {
                const px = cx + p.x;
                const py = cy - p.y;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Left Path (Generic symmetry)
            ctx.beginPath();
            sim.path.forEach((p, i) => {
                const px = cx - p.x; // Symmetry
                const py = cy - p.y;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        }

        // 4. String (Red)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pullerCx, pullerCy);
        ctx.lineTo(objCx, objCy);
        // Symmetric string
        ctx.moveTo(pullerCx, pullerCy);
        ctx.lineTo(cx - x, objCy);
        ctx.stroke();

        // 5. Points
        // Puller (Blue)
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath(); ctx.arc(pullerCx, pullerCy, 8, 0, 2 * Math.PI); ctx.fill();

        // Object (Red)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(objCx, objCy, 6, 0, 2 * Math.PI); ctx.fill();
        // Symmetric Object
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.beginPath(); ctx.arc(cx - x, objCy, 6, 0, 2 * Math.PI); ctx.fill();

        // Update UI Text
        const t_deg = t * 180 / Math.PI;
        if (lValue) lValue.textContent = sim.L;
        if (tValue) tValue.textContent = t_deg.toFixed(0) + '°';
        if (tSlider) tSlider.value = t_deg; // Sync slider to current state if dragged
    }

    // Interactions
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        // Handle touch/mouse
        const clientY = (e.touches && e.touches.length) ? e.touches[0].clientY : e.clientY;
        return { y: clientY - rect.top };
    }

    const onMove = (e) => {
        if (!sim.isDragging) return;
        e.preventDefault();
        const pos = getPos(e);
        const cy = canvas.height / 2;

        // Math Y = cy - Canvas Y
        sim.pullerY = cy - pos.y;

        // Record Path
        const obj = calculateObjectPos(sim.pullerY, sim.L);
        sim.path.push(obj);
        if (sim.path.length > 2000) sim.path.shift();

        draw();
    };

    canvas.addEventListener('mousedown', (e) => {
        const pos = getPos(e); // Need X too for hit test
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

        const w = canvas.width;
        const h = canvas.height;
        const cy = h / 2;
        const pullerCy = cy - sim.pullerY;

        // Hit test radius 30
        if (Math.abs(cx - w / 2) < 30 && Math.abs(pos.y - pullerCy) < 30) {
            sim.isDragging = true;
            canvas.style.cursor = 'grabbing';
            sim.path = []; // Reset path on new drag
        }
    });

    ['mousemove', 'touchmove'].forEach(ev => canvas.addEventListener(ev, onMove, { passive: false }));
    ['mouseup', 'mouseleave', 'touchend'].forEach(ev => canvas.addEventListener(ev, () => {
        sim.isDragging = false;
        canvas.style.cursor = 'grab';
    }));

    // Sliders
    if (lSlider) lSlider.addEventListener('input', (e) => {
        sim.L = parseFloat(e.target.value);
        sim.path = [];
        draw();
        reportManager.saveContent();
    });

    if (tSlider) tSlider.addEventListener('input', (e) => {
        if (sim.isDragging) return;
        const t_deg = parseFloat(e.target.value);
        const t_rad = t_deg * Math.PI / 180;
        // Inverse: pullerY = L * ln(tan(t/2))
        sim.pullerY = sim.L * Math.log(Math.tan(t_rad / 2));
        sim.path = [];
        draw();
        reportManager.saveContent();
    });
}
