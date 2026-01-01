
import { ReportManager } from "../js/report-core.js";

// Initialize Report Manager
const report = new ReportManager("CoffeeStain-Report-v1");

// State
let massChart = null;
let simulationData = null;

// ============ Monte Carlo Simulation ============
const CoffeeRingSim = {
    // Run Simulation
    // N: number of particles
    // lambda: evaporation profile parameter (0.5 = diffusive, ~0 = kinetic)
    run: (N, lambda) => {
        const xmax = 1.0;
        const c = 1.0;

        // 1. Generate Particles
        // Distribution: f_X(x) = 2x / xmax^2  => X = xmax * sqrt(U)
        const particles = [];
        for (let i = 0; i < N; i++) {
            const u = Math.random();
            const x = xmax * Math.sqrt(u); // Initial position

            // 2. Transport Time
            // Scaling: T ~ X^(1+lambda)
            const t = c * Math.pow(x, 1 + lambda);

            // Random angle for visualization (2D disk)
            const theta = Math.random() * 2 * Math.PI;

            particles.push({
                x_init: x,
                t_arrival: t,
                theta: theta
            });
        }

        // 3. Sort by Arrival Time for Cumulative Mass M(t)
        particles.sort((a, b) => a.t_arrival - b.t_arrival);

        // 4. Calculate M(t)
        // We select discrete time steps for the chart
        const t_min = 1e-4;
        const t_max = 1.0; // Normalized max time
        const steps = 50;
        const timeGrid = [];
        const massGrid = [];

        // Logspace time grid
        for (let i = 0; i < steps; i++) {
            const logT = Math.log10(t_min) + (Math.log10(t_max) - Math.log10(t_min)) * (i / (steps - 1));
            timeGrid.push(Math.pow(10, logT));
        }

        let pIdx = 0;
        timeGrid.forEach(t => {
            // Count particles arrived before t
            while (pIdx < N && particles[pIdx].t_arrival <= t) {
                pIdx++;
            }
            // Cumulative mass (fraction)
            massGrid.push(pIdx / N);
        });

        // 5. Linear Regression on Log-Log (Middle Region)
        // Select region where t in [0.01, 0.5] to avoid initial noise and saturation
        const fitX = [];
        const fitY = [];
        for (let i = 0; i < steps; i++) {
            const t = timeGrid[i];
            const m = massGrid[i];
            if (t > 0.01 && t < 0.5 && m > 0) {
                fitX.push(Math.log(t));
                fitY.push(Math.log(m));
            }
        }

        const slope = linearRegression(fitX, fitY).slope;

        return {
            particles,
            timeGrid,
            massGrid,
            slope,
            lambda
        };
    }
};

// Utilities
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

// ============ UI & Visualization ============

document.addEventListener("DOMContentLoaded", () => {
    report.init();
    report.initGallery("result-gallery", "result-upload", "result-dropzone");

    // Init Chart
    initChart();

    // Event Listeners
    document.getElementById('btn-run').addEventListener('click', runSimulation);
    document.getElementById('param-lambda').addEventListener('input', updateLabels);
    document.getElementById('param-N').addEventListener('input', updateLabels);

    // Initial Run
    updateLabels();
    runSimulation();
});

function updateLabels() {
    const lambda = document.getElementById('param-lambda').value;
    const N = document.getElementById('param-N').value;

    document.getElementById('val-lambda').innerText = lambda;
    document.getElementById('val-N').innerText = N;

    // Theoretical Slope
    const thSlope = 2 / (1 + parseFloat(lambda));
    document.getElementById('val-th-slope').innerText = thSlope.toFixed(3);
}

function runSimulation() {
    const lambda = parseFloat(document.getElementById('param-lambda').value);
    const N = parseInt(document.getElementById('param-N').value);

    simulationData = CoffeeRingSim.run(N, lambda);

    // Update UI Stats
    document.getElementById('res-slope').innerText = simulationData.slope.toFixed(3);
    document.getElementById('res-slope').className =
        Math.abs(simulationData.slope - (2 / (1 + lambda))) < 0.1 ? "text-green-600 font-bold" : "text-red-600 font-bold";

    // Draw Visualization
    drawRing(simulationData.particles);

    // Update Chart
    updateChart(simulationData);
}

function drawRing(particles) {
    const canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 * 0.9;

    ctx.clearRect(0, 0, w, h);

    // Draw Drop Boundary
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Particles
    // To simulate "ring formation", we can map arrival time to color or just draw them
    // But physically, they pile up at R.
    // For visualization, we will draw them at their ORIGINAL positions initially?
    // No, the teacher guide says "Particles are transported to the edge".
    // So let's draw a "Ring" that gets darker.
    // Actually, drawing the individual particles stacking at the edge is hard in 2D top down without collision.
    // Let's visualize the "Initial Positions" of the particles that HAVE ARRIVED vs NOT ARRIVED?
    // Or just draw the final state? 
    // The "Monte Carlo" calculates arrival time based on initial position.
    // All particles eventually arrive at edge (in this model).
    // Let's draw the particles at the edge (with some jitter for thickness) to show the ring.

    ctx.fillStyle = 'rgba(120, 53, 15, 0.15)'; // Coffee color transparent

    // We'll draw only a subset if N is too large to keep it fast
    const drawLimit = 5000;
    const step = Math.ceil(particles.length / drawLimit);

    for (let i = 0; i < particles.length; i += step) {
        const p = particles[i];
        // In reality they jam. We simulate jamming by putting them in a band near R.
        // Band width roughly depends on pile up, but for simple viz:
        // Just put them at R with slight random noise inside
        const r_pos = R - (Math.random() * R * 0.05);

        const px = cx + r_pos * Math.cos(p.theta);
        const py = cy + r_pos * Math.sin(p.theta);

        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function initChart() {
    const ctx = document.getElementById('chart-loglog').getContext('2d');
    massChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Simulation M(t)',
                    data: [],
                    borderColor: '#78350f', // Coffee color
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
                x: {
                    type: 'logarithmic',
                    title: { display: true, text: 'Time t' },
                    min: 0.001,
                    max: 1.0
                },
                y: {
                    type: 'logarithmic',
                    title: { display: true, text: 'Cumulative Mass M(t)' },
                    min: 0.001,
                    max: 1.1
                }
            },
            plugins: {
                title: { display: true, text: "Log-Log Growth: M(t) ~ t^p" }
            }
        }
    });
}

function updateChart(data) {
    if (!massChart) return;

    // Data Points
    const points = data.timeGrid.map((t, i) => ({
        x: t,
        y: data.massGrid[i] > 0 ? data.massGrid[i] : null
    })).filter(p => p.y !== null);

    // Theory Line (approx intercept to match mid point)
    const midIdx = Math.floor(points.length / 2);
    if (midIdx >= 0 && points[midIdx]) {
        const midT = points[midIdx].x;
        const midM = points[midIdx].y;
        const theoreticalSlope = 2 / (1 + data.lambda);

        // logM = p * logT + C  => C = logM - p * logT
        // M = 10^C * T^p
        // We just draw a line segment around the middle
        const theoryPoints = [];
        const tStart = points[0].x;
        const tEnd = points[points.length - 1].x;

        // Anchor at middle
        const factor = midM / Math.pow(midT, theoreticalSlope);

        theoryPoints.push({ x: tStart, y: factor * Math.pow(tStart, theoreticalSlope) });
        theoryPoints.push({ x: tEnd, y: factor * Math.pow(tEnd, theoreticalSlope) });

        massChart.data.datasets[1].data = theoryPoints;
        massChart.data.datasets[1].label = `Theory (p=${theoreticalSlope.toFixed(2)})`;
    }

    massChart.data.datasets[0].data = points;
    massChart.update();
}
