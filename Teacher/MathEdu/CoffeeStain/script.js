import { ReportManager } from "../js/report-core.js";

// Initialize Report Manager
const report = new ReportManager("CoffeeStain-Report-v1");

// State
let massChart = null;
let simulationData = null;
let canvas = null;
let ctx = null;

// ============ Monte Carlo Simulation ============
const CoffeeRingSim = {
    run: (N, lambda) => {
        const xmax = 1.0;
        const c = 1.0;

        const particles = [];
        for (let i = 0; i < N; i++) {
            const u = Math.random();
            const x = xmax * Math.sqrt(u);
            const t = c * Math.pow(x, 1 + lambda);
            const theta = Math.random() * 2 * Math.PI;
            particles.push({ x_init: x, t_arrival: t, theta });
        }

        particles.sort((a, b) => a.t_arrival - b.t_arrival);

        const t_min = 1e-4;
        const t_max = 1.0;
        const steps = 50;
        const timeGrid = [];
        const massGrid = [];

        for (let i = 0; i < steps; i++) {
            const logT = Math.log10(t_min) + (Math.log10(t_max) - Math.log10(t_min)) * (i / (steps - 1));
            timeGrid.push(Math.pow(10, logT));
        }

        let pIdx = 0;
        timeGrid.forEach(t => {
            while (pIdx < N && particles[pIdx].t_arrival <= t) pIdx++;
            massGrid.push(pIdx / N);
        });

        const fitX = [], fitY = [];
        for (let i = 0; i < steps; i++) {
            const t = timeGrid[i];
            const m = massGrid[i];
            if (t > 0.01 && t < 0.5 && m > 0) {
                fitX.push(Math.log(t));
                fitY.push(Math.log(m));
            }
        }

        const slope = linearRegression(fitX, fitY).slope;
        return { particles, timeGrid, massGrid, slope, lambda };
    }
};

function linearRegression(x, y) {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumXX += x[i] * x[i];
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

// ============ Canvas Setup (Tractrix Pattern) ============
function setupCanvas() {
    canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const container = canvas.parentElement;
    let lastWidth = 0, lastHeight = 0;

    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const w = container.clientWidth;
        const h = container.clientHeight;

        // Guard: only resize if dimensions actually changed
        if (w === lastWidth && h === lastHeight) return;
        lastWidth = w;
        lastHeight = h;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        if (simulationData) drawRing(simulationData.particles);
    };

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);
    resizeCanvas(); // Initial call
}

// ============ UI & Visualization ============
document.addEventListener("DOMContentLoaded", () => {
    report.init();
    setupCanvas();
    initChart();

    document.getElementById('btn-run').addEventListener('click', runSimulation);
    document.getElementById('param-lambda').addEventListener('input', updateLabels);
    document.getElementById('param-N').addEventListener('input', updateLabels);

    updateLabels();
    runSimulation();
});

function updateLabels() {
    const lambda = document.getElementById('param-lambda').value;
    const N = document.getElementById('param-N').value;
    document.getElementById('val-lambda').innerText = lambda;
    document.getElementById('val-N').innerText = N;
    const thSlope = 2 / (1 + parseFloat(lambda));
    document.getElementById('val-th-slope').innerText = thSlope.toFixed(3);
}

function runSimulation() {
    const lambda = parseFloat(document.getElementById('param-lambda').value);
    const N = parseInt(document.getElementById('param-N').value);
    simulationData = CoffeeRingSim.run(N, lambda);

    document.getElementById('res-slope').innerText = simulationData.slope.toFixed(3);
    document.getElementById('res-slope').className =
        Math.abs(simulationData.slope - (2 / (1 + lambda))) < 0.1 ? "text-green-600 font-bold" : "text-red-600 font-bold";

    drawRing(simulationData.particles);
    updateChart(simulationData);
}

function drawRing(particles) {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 * 0.9;

    ctx.clearRect(0, 0, w, h);

    // Drop Boundary
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Particles
    ctx.fillStyle = 'rgba(120, 53, 15, 0.15)';
    const drawLimit = 5000;
    const step = Math.ceil(particles.length / drawLimit);

    for (let i = 0; i < particles.length; i += step) {
        const p = particles[i];
        const r_pos = R - (Math.random() * R * 0.05);
        const px = cx + r_pos * Math.cos(p.theta);
        const py = cy + r_pos * Math.sin(p.theta);
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function initChart() {
    const chartCanvas = document.getElementById('chart-loglog');
    if (!chartCanvas) return;
    const chartCtx = chartCanvas.getContext('2d');
    massChart = new Chart(chartCtx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Simulation M(t)',
                    data: [],
                    borderColor: '#78350f',
                    backgroundColor: '#78350f',
                    showLine: true,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'Theory slope',
                    data: [],
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    showLine: true,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'logarithmic', title: { display: true, text: 'Time t' }, min: 0.001, max: 1.0 },
                y: { type: 'logarithmic', title: { display: true, text: 'Cumulative Mass M(t)' }, min: 0.001, max: 1.1 }
            },
            plugins: { title: { display: true, text: "Log-Log Growth: M(t) ~ t^p" } }
        }
    });
}

function updateChart(data) {
    if (!massChart) return;

    const points = data.timeGrid.map((t, i) => ({
        x: t,
        y: data.massGrid[i] > 0 ? data.massGrid[i] : null
    })).filter(p => p.y !== null);

    const midIdx = Math.floor(points.length / 2);
    if (midIdx >= 0 && points[midIdx]) {
        const midT = points[midIdx].x;
        const midM = points[midIdx].y;
        const theoreticalSlope = 2 / (1 + data.lambda);
        const factor = midM / Math.pow(midT, theoreticalSlope);
        const tStart = points[0].x;
        const tEnd = points[points.length - 1].x;

        massChart.data.datasets[1].data = [
            { x: tStart, y: factor * Math.pow(tStart, theoreticalSlope) },
            { x: tEnd, y: factor * Math.pow(tEnd, theoreticalSlope) }
        ];
        massChart.data.datasets[1].label = `Theory (p=${theoreticalSlope.toFixed(2)})`;
    }

    massChart.data.datasets[0].data = points;
    massChart.update();
}
