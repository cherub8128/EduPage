import { ReportManager } from "../js/report-core.js";

const report = new ReportManager("SOC-Sandpile-Report-v1");

let sim = null;
let chartCCDF = null;
let isRunning = false;
let canvas = null;
let ctx = null;

// ============ 1D Sandpile Model ============
class Sandpile1D {
    constructor(L, S1, S2, p) {
        this.L = L;
        this.S1 = S1;
        this.S2 = S2;
        this.p = p;
        this.h = new Int32Array(L + 2);
        this.totalDrops = 0;
        this.history = { s: [], m: [], t: [] };
    }

    reset() {
        this.h.fill(0);
        this.totalDrops = 0;
        this.history = { s: [], m: [], t: [] };
    }

    drop() {
        this.h[1]++;
        this.totalDrops++;
        return this.relax();
    }

    relax() {
        let avalancheSize = 0, duration = 0, discharge = 0;
        let active = true;

        while (active) {
            active = false;
            const topples = new Int8Array(this.L + 1);
            let unstableFound = false;

            for (let i = 1; i <= this.L; i++) {
                const slope = this.h[i] - this.h[i + 1];
                if (slope > this.S2) {
                    topples[i] = 1;
                    unstableFound = true;
                } else if (slope > this.S1 && Math.random() < this.p) {
                    topples[i] = 1;
                    unstableFound = true;
                }
            }

            if (unstableFound) {
                duration++;
                active = true;
                for (let i = 1; i <= this.L; i++) {
                    if (topples[i]) {
                        this.h[i]--;
                        if (i === this.L) discharge++;
                        else this.h[i + 1]++;
                        avalancheSize++;
                    }
                }
            }
        }

        if (avalancheSize > 0) {
            this.history.s.push(avalancheSize);
            this.history.m.push(discharge);
            this.history.t.push(duration);
        }
        return { s: avalancheSize, m: discharge, t: duration };
    }

    computeCCDF() {
        const S = this.history.s;
        const N = S.length;
        if (N === 0) return { x: [], y: [] };

        const maxS = Math.max(...S);
        const counts = new Uint32Array(maxS + 1);
        for (let s of S) counts[s]++;

        const ccdfX = [], ccdfY = [];
        let cumulative = 0;
        for (let s = maxS; s >= 1; s--) {
            cumulative += counts[s];
            if (cumulative > 0 && (s < 100 || s % Math.floor(s / 10) === 0)) {
                ccdfX.push(s);
                ccdfY.push(cumulative / N);
            }
        }
        return { x: ccdfX.reverse(), y: ccdfY.reverse() };
    }
}

// ============ Canvas Setup ============
function setupCanvas() {
    canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const container = canvas.parentElement;
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const dpr = window.devicePixelRatio || 1;
            const rect = entry.contentRect;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            updateViz();
        }
    });
    resizeObserver.observe(container);
}

function getParams() {
    return {
        L: parseInt(document.getElementById('param-L').value),
        S1: parseInt(document.getElementById('param-S1').value),
        S2: parseInt(document.getElementById('param-S2').value),
        p: parseFloat(document.getElementById('param-p').value),
        speed: parseInt(document.getElementById('param-speed').value)
    };
}

// ============ UI ============
document.addEventListener("DOMContentLoaded", () => {
    report.init();
    setupCanvas();

    const params = getParams();
    sim = new Sandpile1D(params.L, params.S1, params.S2, params.p);

    initChart();
    drawLoop();

    document.getElementById('btn-start').addEventListener('click', toggleRun);
    document.getElementById('btn-step').addEventListener('click', stepOnce);
    document.getElementById('btn-reset').addEventListener('click', resetSim);
    document.getElementById('btn-fast').addEventListener('click', runFastBatch);

    ['param-L', 'param-S1', 'param-S2', 'param-p'].forEach(id => {
        document.getElementById(id).addEventListener('change', resetSim);
    });

    document.getElementById('param-L').addEventListener('input', (e) => updateLabel('val-L', e.target.value));
    document.getElementById('param-p').addEventListener('input', (e) => updateLabel('val-p', e.target.value));
    document.getElementById('param-speed').addEventListener('input', (e) => updateLabel('val-speed', e.target.value + 'x'));

    updateStats();
});

function updateLabel(id, val) {
    document.getElementById(id).innerText = val;
}

function toggleRun() {
    isRunning = !isRunning;
    const btn = document.getElementById('btn-start');
    btn.innerText = isRunning ? "⏸ Pause" : "▶ Start";
    btn.className = isRunning ? "m-btn secondary w-full" : "m-btn primary w-full";
}

function stepOnce() {
    sim.drop();
    updateStats();
    updateViz();
}

function resetSim() {
    isRunning = false;
    document.getElementById('btn-start').innerText = "▶ Start";
    document.getElementById('btn-start').className = "m-btn primary w-full";

    const params = getParams();
    sim = new Sandpile1D(params.L, params.S1, params.S2, params.p);
    updateStats();
    updateViz();
    updateChart();
}

function runFastBatch() {
    for (let i = 0; i < 1000; i++) sim.drop();
    updateStats();
    updateViz();
    updateChart();
}

function drawLoop() {
    if (isRunning) {
        const speed = parseInt(document.getElementById('param-speed').value);
        for (let i = 0; i < speed; i++) sim.drop();
        updateStats();
        updateViz();
        if (sim.totalDrops % 50 === 0) updateChart();
    }
    requestAnimationFrame(drawLoop);
}

function updateStats() {
    document.getElementById('stat-drops').innerText = sim.totalDrops.toLocaleString();
    if (sim.history.s.length > 0) {
        document.getElementById('stat-last-s').innerText = sim.history.s[sim.history.s.length - 1];
    }
}

function updateViz() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    const L = sim.L;
    const maxH = Math.max(L * sim.S1 * 1.5, 50);
    const pad = 20;
    const plotW = w - 2 * pad;
    const plotH = h - 2 * pad;
    const barW = plotW / L;

    ctx.fillStyle = '#d97706';
    for (let i = 1; i <= L; i++) {
        const hi = sim.h[i];
        const barH = (hi / maxH) * plotH;
        ctx.fillRect(pad + (i - 1) * barW, h - pad - barH, Math.max(1, barW - 1), barH);
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, pad);
    ctx.stroke();
}

function initChart() {
    const chartCanvas = document.getElementById('chart-ccdf');
    if (!chartCanvas) return;
    chartCCDF = new Chart(chartCanvas.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'CCDF P(S >= s)',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.5)',
                showLine: true,
                pointRadius: 2,
                borderWidth: 1.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: { type: 'logarithmic', title: { display: true, text: 'Avalanche Size (s)' } },
                y: { type: 'logarithmic', title: { display: true, text: 'P(>= s)' }, min: 1e-4, max: 1.1 }
            },
            plugins: { title: { display: true, text: 'Avalanche Size Distribution (Log-Log)' } }
        }
    });
}

function updateChart() {
    if (!chartCCDF) return;
    const data = sim.computeCCDF();
    chartCCDF.data.datasets[0].data = data.x.map((x, i) => ({ x, y: data.y[i] }));
    chartCCDF.update('none');
}
