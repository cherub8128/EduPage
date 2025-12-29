/**
 * Shuttlecock1D Student Report - Page-Specific Script
 * Uses atomic modules from ../js/ for common functionality
 */

// ============ Configuration ============
const CONFIG = {
    storagePrefix: 'shuttlecock_report_',
    themeButtonId: 'themeBtn',
    imageIds: [1, 2],
    requiredFields: ['student-id', 'student-name', 'observations'],
    requiredImages: [1],
    pdfPrefix: '셔틀콕_탐구보고서',
    validationMessageId: 'validation-message',
    validationMessage: '학번, 이름, 관찰 내용, 사진은 필수입니다.'
};

// ============ Page State ============
let storage, chart1, chart2, simChart;

// ============ CSV Analysis Utilities ============
function findColumn(cols, candidates) {
    const lower = cols.map(c => String(c).trim().toLowerCase());
    for (const cand of candidates) {
        const i = lower.findIndex(c => c === cand || c.includes(cand));
        if (i !== -1) return cols[i];
    }
    return null;
}

function finiteDiff(t, y) {
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
}

function polyFit2(t, y) {
    let S0 = 0, S1 = 0, S2 = 0, S3 = 0, S4 = 0, T0 = 0, T1 = 0, T2 = 0;
    for (let i = 0; i < t.length; i++) {
        const ti = t[i], yi = y[i], t2 = ti * ti;
        S0++; S1 += ti; S2 += t2; S3 += t2 * ti; S4 += t2 * t2;
        T0 += yi; T1 += yi * ti; T2 += yi * t2;
    }
    const A = [[S4, S3, S2], [S3, S2, S1], [S2, S1, S0]], B = [T2, T1, T0];
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
}

function linFit(x, y) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < x.length; i++) {
        if (!isFinite(x[i]) || !isFinite(y[i])) continue;
        n++; sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i];
    }
    const q = (n * sxy - sx * sy) / ((n * sxx - sx * sx) || 1e-12);
    const p = (sy - q * sx) / (n || 1);
    return { p, q, n };
}

// ============ CSV Analysis ============
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
                const tCol = findColumn(cols, ['t', 'time', 'timestamp', 'seconds']);
                const yCol = findColumn(cols, ['y', 'posy', 'height', 'vertical']);
                if (!tCol || !yCol) { alert('t, y 열을 찾지 못했습니다.'); return; }

                let t = rows.map(r => Number(r[tCol]));
                let y = rows.map(r => Number(r[yCol]));
                if (document.getElementById('signMode')?.value === 'up') y = y.map(v => -v);

                // Filter valid data
                const ft = [], fy = [];
                for (let i = 0; i < t.length; i++) {
                    if (isFinite(t[i]) && isFinite(y[i])) { ft.push(t[i]); fy.push(y[i]); }
                }
                const t0 = ft[0];
                t = ft.map(v => v - t0);
                y = fy;

                const { v, a } = finiteDiff(t, y);
                const fitMode = document.getElementById('fitMode')?.value;
                const fitResult = document.getElementById('fitResult');

                ChartUtils.updateChart(chart1, [
                    { label: 'y(t)', data: ChartUtils.toPoints(t, y), borderWidth: 2, pointRadius: 0 },
                    { label: 'v(t)', data: ChartUtils.toPoints(t, v), borderWidth: 2, pointRadius: 0 }
                ]);

                if (fitMode === 'freefall') {
                    const fit = polyFit2(t, y);
                    const gEst = 2 * fit.a;
                    const yFit = t.map(tt => fit.a * tt * tt + fit.b * tt + fit.c);
                    ChartUtils.updateChart(chart2, [
                        { label: 'a(t)', data: ChartUtils.toPoints(t, a), borderWidth: 2, pointRadius: 0 },
                        { label: 'y_fit', data: ChartUtils.toPoints(t, yFit), borderWidth: 2, pointRadius: 0 }
                    ]);
                    fitResult.textContent = `g ≈ ${gEst.toFixed(4)} m/s² (a=${fit.a.toFixed(6)})`;
                } else {
                    const v2 = v.map(x => x * x);
                    const fit = linFit(v2, a);
                    const vT = fit.q < 0 ? Math.sqrt(fit.p / -fit.q) : NaN;
                    const pts = [], line = [];
                    for (let i = 0; i < t.length; i++) {
                        if (isFinite(v2[i]) && isFinite(a[i])) pts.push({ x: v2[i], y: a[i] });
                    }
                    if (pts.length) {
                        const xmin = Math.min(...pts.map(p => p.x)), xmax = Math.max(...pts.map(p => p.x));
                        line.push({ x: xmin, y: fit.p + fit.q * xmin }, { x: xmax, y: fit.p + fit.q * xmax });
                    }
                    ChartUtils.updateChart(chart2, [
                        { label: 'a vs v²', data: pts, showLine: false, pointRadius: 2 },
                        { label: 'fit', data: line, borderWidth: 2, pointRadius: 0 }
                    ]);
                    fitResult.textContent = `v_T ≈ ${isFinite(vT) ? vT.toFixed(3) : 'NaN'} m/s (g≈${fit.p.toFixed(3)})`;
                }
            }
        });
    });
}

// ============ Simulation ============
function setupSimulation() {
    const runSim = document.getElementById('runSim');
    if (!runSim) return;

    runSim.addEventListener('click', () => {
        const g = Number(document.getElementById('simG')?.value) || 9.8;
        const H = Number(document.getElementById('simH')?.value) || 2.0;
        const dt = Number(document.getElementById('simDt')?.value) || 0.01;
        const b = Number(document.getElementById('simB')?.value) || 0.7;
        const k = Number(document.getElementById('simK')?.value) || 0.22;
        const model = document.getElementById('simModel')?.value || 'none';

        let t = 0, y = 0, v = 0;
        const T = [], Y = [], V = [], A = [];
        while (y < H && t < 30 && T.length < 50000) {
            const a = model === 'none' ? g : (model === 'linear' ? g - b * v : g - k * v * v);
            v += a * dt; y += v * dt; t += dt;
            T.push(t); Y.push(y); V.push(v); A.push(a);
        }

        ChartUtils.updateChart(simChart, [
            { label: 'y(t)', data: ChartUtils.toPoints(T, Y), borderWidth: 2, pointRadius: 0 },
            { label: 'v(t)', data: ChartUtils.toPoints(T, V), borderWidth: 2, pointRadius: 0 },
            { label: 'a(t)', data: ChartUtils.toPoints(T, A), borderWidth: 2, pointRadius: 0 }
        ]);

        let vT = model === 'quad' && k > 0 ? Math.sqrt(g / k) : (model === 'linear' && b > 0 ? g / b : NaN);
        document.getElementById('simSummary').textContent =
            `t=${t.toFixed(3)}s, v_end=${v.toFixed(3)}m/s, v_T≈${isFinite(vT) ? vT.toFixed(3) : '—'}`;
    });
}

// ============ Initialize ============
window.addEventListener('DOMContentLoaded', () => {
    // Initialize with atomic modules
    storage = new StorageManager(CONFIG.storagePrefix);

    // Theme
    ThemeManager.init();
    ThemeManager.bindButton(CONFIG.themeButtonId);

    // Markdown
    MarkdownPreview.init();

    // Image upload global handler
    ImageUpload.createGlobalHandler(storage);
    ImageUpload.loadAll(CONFIG.imageIds, storage);

    // Load saved fields
    storage.loadFields(document.querySelectorAll('.editable-field'));

    // Autosave
    AutosaveStatus.setup('.editable-field', storage);

    // Markdown editors
    MarkdownPreview.setupAll();

    // PDF export
    PDFExport.createGlobalHandler(
        CONFIG.pdfPrefix,
        () => FormValidator.validate(CONFIG.requiredFields, CONFIG.requiredImages),
        CONFIG.validationMessageId,
        CONFIG.validationMessage
    );

    // Initialize charts
    const chart1El = document.getElementById('chart1');
    const chart2El = document.getElementById('chart2');
    const simChartEl = document.getElementById('simChart');

    if (chart1El) chart1 = ChartUtils.createLineChart(chart1El, [], 'y, v vs t');
    if (chart2El) chart2 = ChartUtils.createLineChart(chart2El, [], 'a vs t');
    if (simChartEl) simChart = ChartUtils.createLineChart(simChartEl, [], '시뮬레이션');

    ChartUtils.observeTheme([chart1, chart2, simChart]);

    // Setup page-specific features
    setupCSVAnalysis();
    setupSimulation();

    // Render math and previews after KaTeX loads
    MathRenderer.onReady(() => {
        MathRenderer.renderPage();
        MarkdownPreview.updateAll();
    });
});
