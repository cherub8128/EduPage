
import { ReportManager } from "../js/report-core.js";

// Initialize Report Manager
const report = new ReportManager("SOC-Sandpile-Report-v1");

// Simulation State
let sim = null;
let chartCCDF = null;
let animationId = null;
let isRunning = false;

// ============ 1D Sandpile Model (Amaral-Lauritsen) ============
class Sandpile1D {
    constructor(L, S1, S2, p) {
        this.L = L;
        this.S1 = S1; // Lower critical slope
        this.S2 = S2; // Upper critical slope (unconditional)
        this.p = p;   // Probability to topple if S1 < slope <= S2

        this.h = new Int32Array(L + 2); // Heights (pad boundaries)
        // h[0] is wall, h[L+1] is sink
        this.totalDrops = 0;
        this.history = {
            s: [], // Avalanche sizes
            m: [], // Discharged mass
            t: []  // Duration
        };
    }

    reset() {
        this.h.fill(0);
        this.totalDrops = 0;
        this.history = { s: [], m: [], t: [] };
    }

    // Single drop at i=1
    drop() {
        this.h[1]++;
        this.totalDrops++;

        return this.relax();
    }

    // Relaxation process
    relax() {
        let avalancheSize = 0; // Number of topplings
        let duration = 0;      // Number of sweeps
        let discharge = 0;     // Grains leaving system

        let active = true;
        while (active) {
            active = false;
            // We use a temporary array or update in place? 
            // Standard sandpile updates in parallel or random sequential.
            // For simple educational 1D models, often sequential sweep from left to right is used,
            // or parallel update. Parallel is easier to define deterministically for "steps".
            // Let's use parallel update conceptually (calculate changes, then apply).

            // To simplify implementation and make it fast:
            // We check slope at i. If topple, we move grains.
            // Since toppling i changes i-1 and i+1, sequential order matters.
            // Let's use a queue or stack for "active sites" to be efficient (like Abelian Sandpile),
            // OR just sweep. Sweeping is O(L) per step.
            // Given L ~ 100, sweeping is fine.

            let didTopple = false;
            // Scan slopes
            // Slope[i] = h[i] - h[i+1]
            // We define "unstable" based on pre-topple heights.

            // To be robust:
            // We'll iterate L times? No, we iterate until no more toppling.
            // One "Step" of time T is one full sweep or calculation of all unstable sites.

            // Note: If we update in-place left-to-right, an avalanche can propagate fast.
            // Let's try "Parallel Update" for time definition.
            const topples = new Int8Array(this.L + 1); // 1 if topples

            let unstableFound = false;
            for (let i = 1; i <= this.L; i++) {
                const slope = this.h[i] - this.h[i + 1];
                if (slope > this.S2) {
                    topples[i] = 1;
                    unstableFound = true;
                } else if (slope > this.S1) {
                    if (Math.random() < this.p) {
                        topples[i] = 1;
                        unstableFound = true;
                    }
                }
            }

            if (unstableFound) {
                duration++;
                active = true;
                for (let i = 1; i <= this.L; i++) {
                    if (topples[i]) {
                        this.h[i]--;
                        // If i=L, it falls out (h[L+1] is sink, effectively disappears or accumulates)
                        if (i === this.L) {
                            discharge++;
                        } else {
                            this.h[i + 1]++;
                        }
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
        // Calculate P(S >= s)
        // 1. Sort S
        const S = this.history.s;
        const N = S.length;
        if (N === 0) return { x: [], y: [] };

        // Optimization: Bin counts
        // Since s is integer, we can just count frequencies
        const maxS = Math.max(...S);
        const counts = new Uint32Array(maxS + 1);
        for (let s of S) counts[s]++;

        // Calculate Cumulative from right
        const ccdfX = [];
        const ccdfY = [];

        // Log-Log efficient binning or just all points?
        // Let's do raw points but filter for log-log viz
        let cumulative = 0;
        for (let s = maxS; s >= 1; s--) {
            cumulative += counts[s];
            if (cumulative > 0) {
                // Store P(>=s)
                // Filter to reduce points for Chart.js performance
                // We keep points that are "corners" or loosely log spaced
                if (s < 100 || s % Math.floor(s / 10) === 0) {
                    ccdfX.push(s);
                    ccdfY.push(cumulative / N);
                }
            }
        }

        return { x: ccdfX.reverse(), y: ccdfY.reverse() };
    }
}

// ============ Helper Functions ============

function getParams() {
    return {
        L: parseInt(document.getElementById('param-L').value),
        S1: parseInt(document.getElementById('param-S1').value),
        S2: parseInt(document.getElementById('param-S2').value),
        p: parseFloat(document.getElementById('param-p').value),
        speed: parseInt(document.getElementById('param-speed').value)
    };
}

// ============ UI & Interaction ============

document.addEventListener("DOMContentLoaded", () => {
    report.init();

    // Init Sim
    const params = getParams();
    sim = new Sandpile1D(params.L, params.S1, params.S2, params.p);

    // Init Chart
    initChart();

    // Loop
    drawLoop();

    // Events
    document.getElementById('btn-start').addEventListener('click', toggleRun);
    document.getElementById('btn-step').addEventListener('click', stepOnce);
    document.getElementById('btn-reset').addEventListener('click', resetSim);
    document.getElementById('btn-fast').addEventListener('click', runFastBatch);

    // Input listeners
    ['param-L', 'param-S1', 'param-S2', 'param-p'].forEach(id => {
        document.getElementById(id).addEventListener('change', resetSim);
    });

    // Display updates
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
    // Run 1000 drops instantly
    const N = 1000;
    for (let i = 0; i < N; i++) sim.drop();
    updateStats();
    updateViz();
    updateChart();
}

function drawLoop() {
    if (isRunning) {
        const speed = parseInt(document.getElementById('param-speed').value);
        // Execute multiple drops per frame based on speed
        for (let i = 0; i < speed; i++) {
            sim.drop();
        }
        updateStats();
        updateViz();
        // Update Chart less frequently
        if (sim.totalDrops % 50 === 0) updateChart();
    }
    requestAnimationFrame(drawLoop);
}

function updateStats() {
    document.getElementById('stat-drops').innerText = sim.totalDrops.toLocaleString();
    if (sim.history.s.length > 0) {
        const lastS = sim.history.s[sim.history.s.length - 1];
        document.getElementById('stat-last-s').innerText = lastS;
    }
}

// Visualization
function updateViz() {
    const canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Grid
    const L = sim.L;
    const maxH = Math.max(L * sim.S1 * 1.5, 50); // Auto scale height

    const pad = 20;
    const plotW = w - 2 * pad;
    const plotH = h - 2 * pad;

    const barW = plotW / L;

    ctx.fillStyle = '#d97706'; // Amber-600

    for (let i = 1; i <= L; i++) {
        const hi = sim.h[i];
        const barH = (hi / maxH) * plotH;

        const x = pad + (i - 1) * barW;
        const y = h - pad - barH;

        ctx.fillRect(x, y, Math.max(1, barW - 1), barH);
    }

    // Draw Axis
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad); // X axis
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, pad); // Y axis
    ctx.stroke();
}

// Chart
function initChart() {
    const ctx = document.getElementById('chart-ccdf').getContext('2d');
    chartCCDF = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'CCDF P(S >= s)',
                data: [],
                borderColor: '#2563eb', // Blue-600
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
                x: {
                    type: 'logarithmic',
                    title: { display: true, text: 'Avalanche Size (s)' }
                },
                y: {
                    type: 'logarithmic',
                    title: { display: true, text: 'P(>= s)' },
                    min: 1e-4,
                    max: 1.1
                }
            },
            plugins: {
                title: { display: true, text: 'Avalanche Size Distribution (Log-Log)' }
            }
        }
    });
}

function updateChart() {
    if (!chartCCDF) return;
    const data = sim.computeCCDF();

    chartCCDF.data.datasets[0].data = data.x.map((x, i) => ({ x: x, y: data.y[i] }));
    chartCCDF.update('none'); // Update without animation for performance
}
