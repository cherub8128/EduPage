// --- Global Utilities & Markdown ---
const converter = new showdown.Converter({ tables: true, strikethrough: true });

function updateMarkdownPreviews() {
  document.querySelectorAll(".editable-container").forEach((container) => {
    const textarea = container.querySelector("textarea");
    const preview = container.querySelector(".markdown-preview");
    if (textarea && preview) {
      preview.innerHTML = converter.makeHtml(textarea.value);
      renderMathInElement(preview, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  });
}

// --- Local Storage (Autosave) ---
function saveToLocal() {
  const data = {};
  document.querySelectorAll(".savable").forEach((el) => {
    data[el.id] = el.value;
  });
  localStorage.setItem("shuttlecock2D_report", JSON.stringify(data));
  showAutosaveStatus();
}

function loadFromLocal() {
  const saved = localStorage.getItem("shuttlecock2D_report");
  if (saved) {
    const data = JSON.parse(saved);
    Object.keys(data).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = data[id];
    });
  }
  updateMarkdownPreviews();
}

function showAutosaveStatus() {
  const status = document.getElementById("autosave-status");
  const savedIcon = document.getElementById("autosave-icon-saved");
  status.style.opacity = "1";
  savedIcon.classList.remove("hidden");
  setTimeout(() => {
    status.style.opacity = "0";
  }, 2000);
}

// --- Charts Setup ---
let trajChart, velChart, simChart;

function initCharts() {
  const ctxTraj = document.getElementById("chartTraj").getContext("2d");
  trajChart = new Chart(ctxTraj, {
    type: "scatter",
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "x (m)" } },
        y: { title: { display: true, text: "y (m)" } },
      },
    },
  });

  const ctxVel = document.getElementById("chartVel").getContext("2d");
  velChart = new Chart(ctxVel, {
    type: "line",
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Time (s)" } },
        y: { title: { display: true, text: "Velocity (m/s)" } },
      },
    },
  });

  const ctxSim = document.getElementById("simTrajChart").getContext("2d");
  simChart = new Chart(ctxSim, {
    type: "scatter",
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "x (m)" } },
        y: { title: { display: true, text: "y (m)" }, min: 0 },
      },
    },
  });
}

// --- Tracker CSV Parsing ---
document.getElementById("csvFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      processTrackerData(results.data);
    },
  });
});

function processTrackerData(data) {
  // Filter out invalid rows
  const cleanData = data.filter(
    (d) => d.t !== null && d.x !== null && d.y !== null
  );

  const trajPoints = cleanData.map((d) => ({ x: d.x, y: d.y }));
  const velPointsX = cleanData.map((d) => ({ x: d.t, y: d.vx || 0 }));
  const velPointsY = cleanData.map((d) => ({ x: d.t, y: d.vy || 0 }));

  trajChart.data.datasets = [
    {
      label: "Measured Trajectory",
      data: trajPoints,
      borderColor: "rgba(54, 162, 235, 1)",
      backgroundColor: "rgba(54, 162, 235, 0.5)",
      showLine: true,
    },
  ];
  trajChart.update();

  velChart.data.datasets = [
    {
      label: "vx (m/s)",
      data: velPointsX,
      borderColor: "rgba(255, 99, 132, 1)",
      fill: false,
    },
    {
      label: "vy (m/s)",
      data: velPointsY,
      borderColor: "rgba(75, 192, 192, 1)",
      fill: false,
    },
  ];
  velChart.update();

  // Simple Fit Result (Placeholder logic for student to see)
  const v0x =
    cleanData.length > 1
      ? (cleanData[1].x - cleanData[0].x) / (cleanData[1].t - cleanData[0].t)
      : 0;
  const v0y =
    cleanData.length > 1
      ? (cleanData[1].y - cleanData[0].y) / (cleanData[1].t - cleanData[0].t)
      : 0;
  document.getElementById(
    "fitResult"
  ).innerHTML = `Initial Guess: v0x ≈ ${v0x.toFixed(2)}, v0y ≈ ${v0y.toFixed(
    2
  )}`;
}

// --- 2D Numerical Simulation (Euler Method) ---
function runSimulation() {
  const v0 = parseFloat(document.getElementById("simV0").value);
  const angleDeg = parseFloat(document.getElementById("simAngle").value);
  const g = parseFloat(document.getElementById("simG").value);
  const k = parseFloat(document.getElementById("simK").value);

  const angleRad = (angleDeg * Math.PI) / 180;
  let vx = v0 * Math.cos(angleRad);
  let vy = v0 * Math.sin(angleRad);
  let x = 0;
  let y = 0;
  let t = 0;
  const dt = 0.01;
  const traj = [{ x: 0, y: 0 }];

  // No resistance baseline
  const trajNoRes = [];
  const vx0 = vx;
  const vy0 = vy;

  while (t < 10) {
    const v = Math.sqrt(vx * vx + vy * vy);

    // Model: a = g - kv*v
    const ax = -k * v * vx;
    const ay = -g - k * v * vy;

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;

    if (y < 0) {
      // Linear interpolation for more accurate landing
      const fraction = (0 - (y - vy * dt)) / (vy * dt);
      traj.push({ x: x - vx * dt * (1 - fraction), y: 0 });
      break;
    }
    traj.push({ x, y });
  }

  // Parabolic baseline
  for (let st = 0; st <= t + 1; st += 0.1) {
    const px = vx0 * st;
    const py = vy0 * st - 0.5 * g * st * st;
    if (py < 0) break;
    trajNoRes.push({ x: px, y: py });
  }

  simChart.data.datasets = [
    {
      label: `Simulation (k=${k})`,
      data: traj,
      borderColor: "rgba(255, 99, 132, 1)",
      showLine: true,
      pointRadius: 0,
    },
    {
      label: "Ideal Parabola (k=0)",
      data: trajNoRes,
      borderColor: "rgba(200, 200, 200, 0.8)",
      borderDash: [5, 5],
      showLine: true,
      pointRadius: 0,
    },
  ];
  simChart.update();

  const last = traj[traj.length - 1];
  document.getElementById("simStats").innerText = `Flight Time: ${t.toFixed(
    2
  )}s\nRange: ${last.x.toFixed(2)}m\nMax Height: ${Math.max(
    ...traj.map((p) => p.y)
  ).toFixed(2)}m`;
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  loadFromLocal();

  document.querySelectorAll(".markdown-input").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      updateMarkdownPreviews();
      saveToLocal();
    });
  });

  document.querySelectorAll(".savable").forEach((el) => {
    el.addEventListener("change", saveToLocal);
  });

  document.getElementById("runSim").addEventListener("click", runSimulation);
  document.getElementById("runFit").addEventListener("click", () => {
    alert("CSV 데이터를 분석하여 모델 파라미터를 추정합니다. (구현 예시)");
  });

  document.getElementById("export-pdf").addEventListener("click", () => {
    window.print();
  });

  // Gallery Logic
  const galleryInput = document.getElementById("gallery1-input");
  const gallery = document.getElementById("gallery1");
  galleryInput.addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (re) => {
        const img = document.createElement("img");
        img.src = re.target.result;
        img.className = "gallery-img";
        gallery.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
});
