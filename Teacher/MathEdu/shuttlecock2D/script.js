import { ReportManager } from "../js/report-core.js";

const report = new ReportManager("Shuttlecock2D-report-v1");

// ============ State ============
let trajChart = null;
let velChart = null;
let simChart = null;

// ============ Math Utilities ============
const MathUtils = {
  finiteDiff2D: (t, x, y) => {
    const n = t.length;
    const vx = new Array(n).fill(NaN);
    const vy = new Array(n).fill(NaN);
    const ax = new Array(n).fill(NaN);
    const ay = new Array(n).fill(NaN);

    for (let i = 1; i < n - 1; i++) {
      const dt = t[i + 1] - t[i - 1];
      if (dt !== 0) {
        vx[i] = (x[i + 1] - x[i - 1]) / dt;
        vy[i] = (y[i + 1] - y[i - 1]) / dt;
      }
    }
    for (let i = 2; i < n - 2; i++) {
      const dt = t[i + 1] - t[i - 1];
      if (dt !== 0) {
        ax[i] = (vx[i + 1] - vx[i - 1]) / dt;
        ay[i] = (vy[i + 1] - vy[i - 1]) / dt;
      }
    }
    return { vx, vy, ax, ay };
  },

  findColumn: (cols, candidates) => {
    const lower = cols.map((c) => String(c).trim().toLowerCase());
    for (const cand of candidates) {
      const i = lower.findIndex((c) => c === cand || c.includes(cand));
      if (i !== -1) return cols[i];
    }
    return null;
  },
};

// ============ Chart Helper ============
const GraphUtils = {
  createScatterChart: (canvasId, title) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return new Chart(ctx, {
      type: "scatter",
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!title,
            text: title,
            font: { size: 14, weight: "bold" },
          },
          legend: { display: true },
        },
        scales: {
          x: { type: "linear", position: "bottom", grid: { color: "#e5e7eb" } },
          y: { grid: { color: "#e5e7eb" } },
        },
      },
    });
  },
  updateChart: (chart, datasets) => {
    if (!chart) return;
    chart.data.datasets = datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || getColor(i),
      backgroundColor: ds.color || getColor(i),
      showLine: ds.showLine !== false,
      borderWidth: ds.borderWidth || 2,
      pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : 2,
      borderDash: ds.borderDash || [],
    }));
    chart.update();
  },
};

function getColor(i) {
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#f59e0b"];
  return colors[i % colors.length];
}

// ============ Main Init ============
document.addEventListener("DOMContentLoaded", () => {
  report.init();
  report.initGallery(
    "gallery1",
    "gallery1-input",
    "gallery1-drop",
    "gallery1-clear",
    "gallery1-add"
  );

  trajChart = GraphUtils.createScatterChart("chartTraj", "궤적 분석 (y vs x)");
  velChart = GraphUtils.createScatterChart("chartVel", "속도 분석 (v vs t)");
  simChart = GraphUtils.createScatterChart(
    "simTrajChart",
    "2D 수치 시뮬레이션 결과"
  );

  setupCSVAnalysis();
  setupSimulation();
});

function setupCSVAnalysis() {
  const runFit = document.getElementById("runFit");
  if (!runFit) return;

  runFit.addEventListener("click", () => {
    const file = document.getElementById("csvFile")?.files?.[0];
    if (!file) {
      alert("CSV 파일을 선택하세요.");
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data;
        const cols = Object.keys(rows[0]);
        const tCol = MathUtils.findColumn(cols, ["t", "time"]);
        const xCol = MathUtils.findColumn(cols, ["x", "posx"]);
        const yCol = MathUtils.findColumn(cols, ["y", "posy"]);

        if (!tCol || !xCol || !yCol) {
          alert("t, x, y 열을 찾지 못했습니다.");
          return;
        }

        const t = rows.map((r) => Number(r[tCol]));
        const x = rows.map((r) => Number(r[xCol]));
        const y = rows.map((r) => Number(r[yCol]));

        const { vx, vy } = MathUtils.finiteDiff2D(t, x, y);

        GraphUtils.updateChart(trajChart, [
          {
            label: "Measured 궤적",
            data: t.map((val, i) => ({ x: x[i], y: y[i] })),
          },
        ]);

        GraphUtils.updateChart(velChart, [
          {
            label: "vx (m/s)",
            data: t.map((val, i) => ({ x: val, y: vx[i] })),
          },
          {
            label: "vy (m/s)",
            data: t.map((val, i) => ({ x: val, y: vy[i] })),
          },
        ]);

        document.getElementById(
          "fitResult"
        ).innerText = `데이터 로드 완료: ${t.length} 프레임`;
      },
    });
  });
}

function setupSimulation() {
  const runSim = document.getElementById("runSim");
  if (!runSim) return;

  runSim.addEventListener("click", () => {
    const v0 = parseFloat(document.getElementById("simV0").value);
    const angleDeg = parseFloat(document.getElementById("simAngle").value);
    const g = parseFloat(document.getElementById("simG").value);
    const k = parseFloat(document.getElementById("simK").value);

    const angleRad = (angleDeg * Math.PI) / 180;
    let vx = v0 * Math.cos(angleRad);
    let vy = v0 * Math.sin(angleRad);
    let x = 0,
      y = 0,
      t = 0;
    const dt = 0.01;

    const trajRes = [{ x: 0, y: 0 }];
    const trajIdeal = [];
    const vx0 = vx,
      vy0 = vy;

    // Model: Resistance
    while (t < 20) {
      const v = Math.sqrt(vx * vx + vy * vy);
      const ax = -k * v * vx;
      const ay = -g - k * v * vy;

      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
      t += dt;

      if (y < 0) break;
      trajRes.push({ x, y });
    }

    // Model: Ideal
    for (let it = 0; it < t + 1; it += 0.1) {
      const ix = vx0 * it;
      const iy = vy0 * it - 0.5 * g * it * it;
      if (iy < 0 && it > 0) break;
      trajIdeal.push({ x: ix, y: iy });
    }

    GraphUtils.updateChart(simChart, [
      { label: "항력 모델 (k=" + k + ")", data: trajRes, pointRadius: 0 },
      {
        label: "이상적 포물선 (k=0)",
        data: trajIdeal,
        pointRadius: 0,
        color: "#94a3b8",
        borderDash: [5, 5],
      },
    ]);

    document.getElementById("simStats").innerText = `결과: 사거리 ${x.toFixed(
      2
    )}m, 비행시간 ${t.toFixed(2)}s`;
  });
}
