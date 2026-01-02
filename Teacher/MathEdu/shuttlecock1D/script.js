import { ReportManager } from '../js/report-core.js';

const report = new ReportManager('Shuttlecock-report-v2');

// ============ State ============
let chart1 = null;
let chart2 = null;
let simChart = null;

// ============ Math Utilities ============
const MathUtils = {
    findColumn: (cols, candidates) => {
        const lower = cols.map(c => String(c).trim().toLowerCase());
        for (const cand of candidates) {
            const i = lower.findIndex(c => c === cand || c.includes(cand));
            if (i !== -1) return cols[i];
        }
        return null;
    },

    finiteDiff: (t, y) => {
        const n = t.length;
        const v = new Array(n).fill(NaN);
        const a = new Array(n).fill(NaN);
        for (let i = 1; i < n - 1; i++) {
            const dt = t[i + 1] - t[i - 1];
            if (dt !== 0) v[i] = (y[i + 1] - y[i - 1]) / dt;
        }
        for (let i = 2; i < n - 2; i++) {
            const dt = t[i + 1] - t[i - 1];
            if (dt !== 0) a[i] = (v[i + 1] - v[i - 1]) / dt;
        }
        return { v, a };
    },

    polyFit2: (t, y) => {
        let S0 = 0, S1 = 0, S2 = 0, S3 = 0, S4 = 0, T0 = 0, T1 = 0, T2 = 0;
        for (let i = 0; i < t.length; i++) {
            const ti = t[i], yi = y[i], t2 = ti * ti;
            S0++; S1 += ti; S2 += t2; S3 += t2 * ti; S4 += t2 * t2;
            T0 += yi; T1 += yi * ti; T2 += yi * t2;
        }
        const A = [[S4, S3, S2], [S3, S2, S1], [S2, S1, S0]], B = [T2, T1, T0];
        // Gaussian Elimination
        for (let i = 0; i < 3; i++) {
            let max = i;
            for (let r = i + 1; r < 3; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
            if (max !== i) { [A[i], A[max]] = [A[max], A[i]];[B[i], B[max]] = [B[max], B[i]]; }
            const piv = A[i][i] || 1e-12;
            for (let j = i; j < 3; j++) A[i][j] /= piv;
            B[i] /= piv;
            for (let r = 0; r < 3; r++) {
                if (r === i) continue;
                const f = A[r][i];
                for (let j = i; j < 3; j++) A[r][j] -= f * A[i][j];
                B[r] -= f * B[i];
            }
        }
        return { a: B[0], b: B[1], c: B[2] };
    },

    linFit: (x, y) => {
        let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (let i = 0; i < x.length; i++) {
            if (isFinite(x[i]) && isFinite(y[i])) {
                n++; sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i];
            }
        }
        const q = (n * sxy - sx * sy) / ((n * sxx - sx * sx) || 1e-12);
        const p = (sy - q * sx) / (n || 1);
        return { p, q, n };
    }
};

// ============ Chart Helper ============
// ============ Chart Helper ============
const GraphUtils = {
    createLineChart: (canvasId, title) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Ensure Chart is available
        if (typeof Chart === 'undefined') {
            console.error("Chart.js not loaded");
            return null;
        }

        Chart.defaults.font.family = "'Inter', 'Noto Sans KR', sans-serif";
        Chart.defaults.color = '#64748b';

        return new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 10, right: 20, bottom: 0, left: 0 }
                },
                plugins: {
                    title: {
                        display: !!title,
                        text: title,
                        color: '#1e293b',
                        font: { size: 14, weight: '600' },
                        padding: { bottom: 20 }
                    },
                    legend: {
                        display: true,
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleFont: { size: 12 },
                        bodyFont: { size: 11 },
                        padding: 10,
                        cornerRadius: 6,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        grid: { color: '#f1f5f9', tickLength: 8 },
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        border: { display: false }
                    },
                    y: {
                        grid: { color: '#f1f5f9', tickLength: 8 },
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        border: { display: false } // clean look
                    }
                }
            }
        });
    },
    updateChart: (chart, datasets) => {
        if (!chart) return;
        chart.data.datasets = datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            borderColor: getColor(i),
            backgroundColor: getColor(i),
            showLine: ds.showLine !== false,
            borderWidth: 2,
            pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : 2,
            pointHoverRadius: 5,
            pointBackgroundColor: '#ffffff', // hollow point effect
            pointBorderWidth: 2,
            tension: 0.1 // slight curve for smoothness
        }));
        chart.update();
    },
    toPoints: (xArray, yArray) => {
        return xArray.map((x, i) => ({ x: x, y: yArray[i] })).filter(p => isFinite(p.x) && isFinite(p.y));
    }
};

function getColor(i) {
    // Harmonious modern palette
    const colors = [
        '#6366f1', // Indigo
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#0ea5e9', // Sky
    ];
    return colors[i % colors.length];
}

// ============ Main Init ============
document.addEventListener('DOMContentLoaded', () => {
    report.init();
    report.initGallery('gallery1', 'gallery1-input', 'gallery1-drop', 'gallery1-clear', 'gallery1-add');

    // Init Charts
    chart1 = GraphUtils.createLineChart('chart1', "위치(y) & 속력(v) 분석");
    chart2 = GraphUtils.createLineChart('chart2', "가속도(a) & 피팅");
    simChart = GraphUtils.createLineChart('simChart', "시뮬레이션 비교");

    setupCSVAnalysis();
    setupSimulation();

    // Explicit Math Rendering for Static Content
    // Wait for KaTeX to load if deferred
    const renderMath = () => {
        if (window.renderMathInElement) {
            renderMathInElement(document.body, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ]
            });
        }
    };

    if (window.katex) {
        renderMath();
    } else {
        const checkKatex = setInterval(() => {
            if (window.katex && window.renderMathInElement) {
                clearInterval(checkKatex);
                renderMath();
            }
        }, 100);
        // Fallback
        window.addEventListener('load', renderMath);
    }
});


// ============ Logic ============
function setupCSVAnalysis() {
    const runFit = document.getElementById('runFit');
    if (!runFit) return;

    runFit.addEventListener('click', () => {
        const file = document.getElementById('csvFile')?.files?.[0];
        if (!file) { alert('CSV 파일을 선택하세요.'); return; }

        Papa.parse(file, {
            header: true, dynamicTyping: true, skipEmptyLines: true,
            complete: (res) => {
                const rows = res.data;
                if (!rows?.length) { alert('CSV가 비어 있습니다.'); return; }

                const cols = Object.keys(rows[0]);
                const tCol = MathUtils.findColumn(cols, ['t', 'time', 'timestamp', 'seconds']);
                const yCol = MathUtils.findColumn(cols, ['y', 'posy', 'height', 'vertical']);
                if (!tCol || !yCol) { alert('t, y 열을 찾지 못했습니다. CSV 헤더를 확인하세요.'); return; }

                let t = rows.map(r => Number(r[tCol]));
                let y = rows.map(r => Number(r[yCol]));

                const ft = [], fy = [];
                for (let i = 0; i < t.length; i++) {
                    if (isFinite(t[i]) && isFinite(y[i])) { ft.push(t[i]); fy.push(y[i]); }
                }
                if (ft.length === 0) return;

                const t0 = ft[0];
                t = ft.map(v => v - t0);
                y = fy;

                const { v, a } = MathUtils.finiteDiff(t, y);
                const fitMode = document.getElementById('fitMode')?.value;
                const fitResult = document.getElementById('fitResult');

                GraphUtils.updateChart(chart1, [
                    { label: 'y(t)', data: GraphUtils.toPoints(t, y) },
                    { label: 'v(t)', data: GraphUtils.toPoints(t, v) }
                ]);

                if (fitMode === 'freefall') {
                    // Fit y = at^2 + bt + c => a corresponds to 0.5 g
                    const fit = MathUtils.polyFit2(t, y);
                    const gEst = Math.abs(2 * fit.a); // Accel is 2*coef of t^2

                    const yFit = t.map(tt => fit.a * tt * tt + fit.b * tt + fit.c);

                    GraphUtils.updateChart(chart2, [
                        { label: 'a(t) (Raw)', data: GraphUtils.toPoints(t, a), showLine: false },
                        { label: 'y_fit', data: GraphUtils.toPoints(t, yFit) }
                    ]);

                    if (fitResult) fitResult.textContent = `추정 중력가속도 g ≈ ${gEst.toFixed(4)} m/s²`;

                } else {
                    const v2 = v.map(val => val * val);
                    const fit = MathUtils.linFit(v2, a);

                    const pts = [];
                    const line = [];

                    for (let i = 0; i < t.length; i++) {
                        if (isFinite(v2[i]) && isFinite(a[i])) pts.push({ x: v2[i], y: a[i] });
                    }
                    if (pts.length > 0) {
                        const xMax = Math.max(...pts.map(p => p.x));
                        line.push({ x: 0, y: fit.p }, { x: xMax, y: fit.p + fit.q * xMax });
                    }

                    GraphUtils.updateChart(chart2, [
                        { label: 'a vs v²', data: pts, showLine: false },
                        { label: 'Linear Fit', data: line }
                    ]);

                    const vT = fit.q < 0 ? Math.sqrt(fit.p / -fit.q) : NaN;
                    if (fitResult) fitResult.textContent = `종단속도 v_T ≈ ${isFinite(vT) ? vT.toFixed(3) : 'NaN'} m/s (g절편=${fit.p.toFixed(2)})`;
                }
            }
        });
    });
}

function setupSimulation() {
    const runSim = document.getElementById('runSim');
    if (!runSim) return;

    // Setup falling animation canvas
    const fallCanvas = document.getElementById('fallCanvas');
    let fallCtx = null;
    let animId = null;
    let lastSimResult = null;
    let currentStepIndex = 0;

    const drawFallingFrame = () => {
        if (!fallCanvas || !fallCtx || !lastSimResult) return;
        const { T, Y, V, maxY } = lastSimResult;
        const dpr = window.devicePixelRatio || 1;
        const w = fallCanvas.width / dpr;
        const h = fallCanvas.height / dpr;

        const idx = Math.min(Math.floor(currentStepIndex), Y.length - 1);
        const posY = (Y[idx] / maxY) * (h - 40) + 20;

        fallCtx.clearRect(0, 0, w, h);
        const cx = w / 2;

        // Feathers
        fallCtx.fillStyle = '#e0f2fe';
        fallCtx.beginPath();
        fallCtx.moveTo(cx - 5, posY - 7);
        fallCtx.quadraticCurveTo(cx - 10, posY - 20, cx - 16, posY - 32);
        fallCtx.quadraticCurveTo(cx, posY - 36, cx + 16, posY - 32);
        fallCtx.quadraticCurveTo(cx + 10, posY - 20, cx + 5, posY - 7);
        fallCtx.closePath();
        fallCtx.fill();
        fallCtx.strokeStyle = '#94a3b8';
        fallCtx.stroke();

        // Cork
        fallCtx.fillStyle = '#f8fafc';
        fallCtx.beginPath();
        fallCtx.arc(cx, posY, 8, 0, Math.PI * 2);
        fallCtx.fill();
        fallCtx.strokeStyle = '#64748b';
        fallCtx.stroke();

        // Info
        const playbackSpeed = Number(document.getElementById('simSpeed')?.value) || 1.0;
        fallCtx.fillStyle = '#0ea5e9';
        fallCtx.font = '11px Inter, sans-serif';
        fallCtx.textAlign = 'right';
        fallCtx.fillText(`x${playbackSpeed.toFixed(1)} t=${T[idx].toFixed(2)}s  v=${V[idx].toFixed(2)}m/s`, w - 10, 18);
    };

    if (fallCanvas) {
        fallCtx = fallCanvas.getContext('2d');
        const container = fallCanvas.parentElement;

        // Critical Fix: Prevent container from growing with canvas
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        fallCanvas.style.position = 'absolute';
        fallCanvas.style.top = '0';
        fallCanvas.style.left = '0';
        fallCanvas.style.width = '100%';
        fallCanvas.style.height = '100%';

        const updateCanvasSize = () => {
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // Use Math.round to avoid sub-pixel oscillation
            const newW = Math.round(rect.width * dpr);
            const newH = Math.round(rect.height * dpr);

            // Only update buffer size if significantly different (threshold > 2px)
            if (Math.abs(fallCanvas.width - newW) > 2 || Math.abs(fallCanvas.height - newH) > 2) {
                fallCanvas.width = newW;
                fallCanvas.height = newH;
                fallCtx.setTransform(1, 0, 0, 1, 0, 0);
                fallCtx.scale(dpr, dpr);
                // Force a redraw of the current frame
                if (lastSimResult && !animId) {
                    drawFallingFrame();
                }
            }
        };

        // Use ResizeObserver for robust sizing, but debounce with rAF to avoid loops
        let resizeTimeout;
        const observer = new ResizeObserver(() => {
            if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
            resizeTimeout = requestAnimationFrame(updateCanvasSize);
        });
        observer.observe(container);
    }

    runSim.addEventListener('click', () => {
        const g = Number(document.getElementById('simG')?.value) || 9.8;
        const dt = 0.01;
        const k = Number(document.getElementById('simK')?.value) || 0.22;
        const model = document.getElementById('simModel')?.value || 'none';
        const playbackSpeed = Number(document.getElementById('simSpeed')?.value) || 1.0;

        // Pre-compute trajectory
        let t = 0, y = 0, v = 0;
        const T = [], Y = [], V = [], A = [];

        while (t < 10 && y < 2000) { // Safety limit
            let a = g;
            if (model === 'quad') a = g - k * v * v;
            else if (model === 'linear') a = g - k * v;

            v += a * dt;
            y += v * dt;
            t += dt;
            T.push(t); Y.push(y); V.push(v); A.push(a);
        }

        GraphUtils.updateChart(simChart, [
            { label: 'y(t)', data: GraphUtils.toPoints(T, Y) },
            { label: 'v(t)', data: GraphUtils.toPoints(T, V) },
            { label: 'a(t)', data: GraphUtils.toPoints(T, A) }
        ]);

        const simSummary = document.getElementById('simSummary');
        if (simSummary) simSummary.textContent = `Simulation End: t=${t.toFixed(1)}s, v=${v.toFixed(2)}m/s, y=${y.toFixed(1)}m`;

        // Animate falling shuttlecock
        if (fallCanvas && fallCtx) {
            if (animId) cancelAnimationFrame(animId);

            lastSimResult = { T, Y, V, maxY: Math.max(...Y) };
            currentStepIndex = 0;
            const stepsPerFrame = (1 / 60) / dt * playbackSpeed;

            const animate = () => {
                drawFallingFrame();
                currentStepIndex += stepsPerFrame;

                if (currentStepIndex < lastSimResult.Y.length) {
                    animId = requestAnimationFrame(animate);
                } else {
                    animId = null;
                }
            };
            animate();
        }
    });
}
