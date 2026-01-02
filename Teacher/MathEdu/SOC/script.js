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
        let activeSet = new Set([1]); // Start with position 1 (where grain was added)

        while (activeSet.size > 0) {
            const nextActive = new Set();
            const topples = [];

            // Check all active positions for instability
            for (let i of activeSet) {
                if (i < 1 || i > this.L) continue; // Bounds check

                // For boundary: h[L+1] is effectively 0 (open boundary)
                const rightHeight = (i === this.L) ? 0 : this.h[i + 1];
                const slope = this.h[i] - rightHeight;

                let shouldTopple = false;
                if (slope > this.S2) {
                    shouldTopple = true; // Unconditional toppling
                } else if (slope > this.S1 && Math.random() < this.p) {
                    shouldTopple = true; // Probabilistic toppling
                }

                if (shouldTopple) {
                    topples.push(i);
                }
            }

            // Execute all topples
            if (topples.length > 0) {
                duration++; // Only increment when toppling actually occurs

                for (let i of topples) {
                    this.h[i]--;
                    avalancheSize++;

                    if (i === this.L) {
                        // Grain falls off the edge
                        discharge++;
                    } else {
                        // Grain moves to next position
                        this.h[i + 1]++;
                        // Add neighbors to active set
                        nextActive.add(i + 1);
                    }

                    // Also check positions that might be affected
                    if (i > 1) nextActive.add(i - 1);
                    nextActive.add(i);
                }
            }

            activeSet = nextActive;
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

    // Canvas size is set in HTML - don't touch it!
    // Just initialize the context
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    console.log('SOC: Initializing...');

    try {
        report.init();
    } catch (e) {
        console.warn('Report init failed:', e);
    }

    setupCanvas();

    const params = getParams();
    sim = new Sandpile1D(params.L, params.S1, params.S2, params.p);
    console.log('SOC: Simulation created', sim);

    initChart();
    drawLoop();

    const btnStart = document.getElementById('btn-start');
    const btnStep = document.getElementById('btn-step');
    const btnReset = document.getElementById('btn-reset');
    const btnFast = document.getElementById('btn-fast');

    console.log('Buttons found:', { btnStart, btnStep, btnReset, btnFast });

    if (btnStart) btnStart.addEventListener('click', toggleRun);
    if (btnStep) btnStep.addEventListener('click', stepOnce);
    if (btnReset) btnReset.addEventListener('click', resetSim);
    if (btnFast) btnFast.addEventListener('click', runFastBatch);

    ['param-L', 'param-S1', 'param-S2', 'param-p'].forEach(id => {
        document.getElementById(id).addEventListener('change', resetSim);
    });

    document.getElementById('param-L').addEventListener('input', (e) => updateLabel('val-L', e.target.value));
    document.getElementById('param-p').addEventListener('input', (e) => updateLabel('val-p', e.target.value));
    document.getElementById('param-speed').addEventListener('input', (e) => updateLabel('val-speed', e.target.value + 'x'));

    updateStats();
    updateViz();
    updateChart();

    console.log('SOC: Initialization complete. Buttons ready.');

    // Expose test function
    window.testSOC = {
        toggleRun,
        stepOnce,
        isRunning: () => isRunning,
        sim: () => sim
    };
    console.log('Test functions available: window.testSOC');
});

function updateLabel(id, val) {
    document.getElementById(id).innerText = val;
}

function toggleRun() {
    console.log('toggleRun called, isRunning:', isRunning);
    isRunning = !isRunning;
    const btn = document.getElementById('btn-start');
    btn.innerText = isRunning ? "⏸ Pause" : "▶ Start";
    btn.className = isRunning ? "m-btn secondary w-full" : "m-btn primary w-full";
    console.log('Now isRunning:', isRunning);
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
    if (!canvas || !ctx || !sim) return;

    const w = canvas.width;
    const h = canvas.height;

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
            responsive: false,
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
