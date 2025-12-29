/**
 * CausticCurve - Page-Specific Script
 * Canvas animations for reflection and epicycloid
 */

// ============ Configuration ============
const CONFIG = {
    storagePrefix: 'caustic_report_',
    themeButtonId: null, // No theme toggle in original
    imageIds: [1, 2],
    requiredFields: ['student-id', 'student-name'], // Plus all editable-field
    requiredImages: [1],
    pdfPrefix: 'Caustic_Curve_탐구보고서',
    validationMessageId: 'validation-message',
    validationMessage: '모든 필수 항목을 작성하고 사진을 첨부해주세요.'
};

let storage;

// ============ Reflection Canvas ============
function drawReflection() {
    const canvas = document.getElementById('reflectionCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('theta-slider');
    const value = document.getElementById('theta-value');

    const sliderValue = parseFloat(slider?.value || 90);
    const angleDeg = sliderValue - 90;
    const angleRad = angleDeg * Math.PI / 180;

    const w = canvas.width, h = canvas.height;
    const centerX = w / 2, centerY = h / 2;
    const radius = Math.min(w, h) * 0.4;

    const px = centerX + radius * Math.cos(angleRad);
    const py = centerY - radius * Math.sin(angleRad);

    ctx.clearRect(0, 0, w, h);

    // Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axes
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Incident ray
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(px, py);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reflected ray
    const reflectedAngle = 2 * angleRad;
    let dirX = Math.cos(reflectedAngle);
    let dirY = -Math.sin(reflectedAngle);

    const toCenterX = centerX - px;
    const toCenterY = centerY - py;
    if (dirX * toCenterX + dirY * toCenterY < 0) {
        dirX = -dirX;
        dirY = -dirY;
    }

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + w * dirX, py + h * dirY);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Point P
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    if (value) value.textContent = `${angleDeg.toFixed(0)}°`;
}

// ============ Epicycloid Canvas ============
function drawEpicycloid() {
    const canvas = document.getElementById('epicycloidCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const kSlider = document.getElementById('k-slider');
    const sizeSlider = document.getElementById('size-slider');
    const epicycloidSlider = document.getElementById('epicycloid-slider');
    const kValue = document.getElementById('k-value');
    const sizeValue = document.getElementById('size-value');
    const epicycloidValue = document.getElementById('epicycloid-value');

    const k = parseInt(kSlider?.value || 2);
    const r = parseInt(sizeSlider?.value || 30);
    const animationAngleDeg = parseFloat(epicycloidSlider?.value || 0);
    const animationAngleRad = animationAngleDeg * Math.PI / 180;

    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const R = k * r;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fixed circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, R, 0, 2 * Math.PI);
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Moving circle
    const t_anim = animationAngleRad;
    const movingX = centerX + (R + r) * Math.cos(t_anim);
    const movingY = centerY + (R + r) * Math.sin(t_anim);
    ctx.beginPath();
    ctx.arc(movingX, movingY, r, 0, 2 * Math.PI);
    ctx.strokeStyle = '#99f6e4';
    ctx.stroke();

    // Full epicycloid curve
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#a855f7';
    for (let t = 0; t <= 2 * Math.PI + 0.02; t += 0.01) {
        const x = centerX + r * (k + 1) * Math.cos(t) - r * Math.cos((k + 1) * t);
        const y = centerY + r * (k + 1) * Math.sin(t) - r * Math.sin((k + 1) * t);
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Animated portion
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ef4444';
    for (let t = 0; t <= t_anim; t += 0.01) {
        const x = centerX + r * (k + 1) * Math.cos(t) - r * Math.cos((k + 1) * t);
        const y = centerY + r * (k + 1) * Math.sin(t) - r * Math.sin((k + 1) * t);
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Trace point
    const traceX = centerX + r * (k + 1) * Math.cos(t_anim) - r * Math.cos((k + 1) * t_anim);
    const traceY = centerY + r * (k + 1) * Math.sin(t_anim) - r * Math.sin((k + 1) * t_anim);

    ctx.beginPath();
    ctx.moveTo(movingX, movingY);
    ctx.lineTo(traceX, traceY);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(traceX, traceY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    if (kValue) kValue.textContent = k;
    if (sizeValue) sizeValue.textContent = r;
    if (epicycloidValue) epicycloidValue.textContent = `${animationAngleDeg.toFixed(0)}°`;
}

// ============ Tab Switching ============
function setupTabs() {
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab)?.classList.add('active');
        });
    });
}

// ============ Mobile Menu ============
function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => menu.classList.toggle('hidden'));
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => menu.classList.add('hidden'));
        });
    }
}

// ============ Initialize ============
window.addEventListener('DOMContentLoaded', () => {
    storage = new StorageManager(CONFIG.storagePrefix);

    // Markdown & autosave
    MarkdownPreview.init();
    storage.loadFields(document.querySelectorAll('.editable-field'));
    AutosaveStatus.setup('.editable-field', storage);
    MarkdownPreview.setupAll();

    // Images
    ImageUpload.createGlobalHandler(storage);
    ImageUpload.loadAll(CONFIG.imageIds, storage);

    // PDF export with custom validation
    window.saveAsPdf = () => {
        // Validate all editable fields + first image
        const fields = document.querySelectorAll('.editable-field');
        let valid = true;
        fields.forEach(f => {
            f.classList.remove('is-invalid');
            if (!f.value.trim()) { f.classList.add('is-invalid'); valid = false; }
        });

        const img1 = document.getElementById('screenshot-preview-1');
        if (img1?.classList.contains('hidden')) {
            img1.parentElement.classList.add('is-invalid');
            valid = false;
        }

        const msg = document.getElementById(CONFIG.validationMessageId);
        if (msg) msg.textContent = valid ? '' : CONFIG.validationMessage;

        if (!valid) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

        PDFExport.save(CONFIG.pdfPrefix);
    };

    // Page-specific setup
    setupTabs();
    setupMobileMenu();

    // Canvas sliders
    document.getElementById('theta-slider')?.addEventListener('input', drawReflection);
    ['k-slider', 'size-slider', 'epicycloid-slider'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', drawEpicycloid);
    });

    // Initial draw
    drawReflection();
    drawEpicycloid();

    // Render math
    MathRenderer.onReady(() => {
        MathRenderer.renderPage();
        MarkdownPreview.updateAll();
    });
});
