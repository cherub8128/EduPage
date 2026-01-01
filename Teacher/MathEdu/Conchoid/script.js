/**
 * Conchoid Simulation Script
 * Nicomedes' definition: r = d * sec(theta) +/- k
 */
import { ReportManager } from "../js/report-core.js";

const report = new ReportManager("Conchoid-Report-v1");

class ConchoidSim {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.params = { d: 4.0, k: 5.0, theta: 45 };
        this.scale = 40;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.isAnimating = false;
        this.animFrame = null;

        this.setupCanvas();
        this.initListeners();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const dpr = window.devicePixelRatio || 1;
                const rect = entry.contentRect;
                this.canvas.width = rect.width * dpr;
                this.canvas.height = rect.height * dpr;
                this.canvas.style.width = rect.width + 'px';
                this.canvas.style.height = rect.height + 'px';
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.ctx.scale(dpr, dpr);

                // Center offset
                this.offsetX = rect.width / 2 - 100;
                this.offsetY = rect.height / 2;
                this.draw();
            }
        });
        resizeObserver.observe(container);
    }

    initListeners() {
        const bindInput = (id, key) => {
            const el = document.getElementById(id);
            const disp = document.getElementById(id.replace('input', 'val'));
            el?.addEventListener('input', (e) => {
                this.params[key] = parseFloat(e.target.value);
                if (disp) disp.innerText = this.params[key].toFixed(el.step.includes('.') ? 1 : 0);
                this.draw();
            });
        };

        bindInput('input-d', 'd');
        bindInput('input-k', 'k');
        bindInput('input-theta', 'theta');

        document.getElementById('btn-animate')?.addEventListener('click', () => this.toggleAnimation());
        document.getElementById('btn-reset')?.addEventListener('click', () => {
            this.stopAnimation();
            this.params.theta = 45;
            document.getElementById('input-theta').value = 45;
            document.getElementById('val-theta').innerText = '45';
            this.draw();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.offsetX += e.clientX - this.lastMouse.x;
            this.offsetY += e.clientY - this.lastMouse.y;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.draw();
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.scale *= e.deltaY > 0 ? 0.9 : 1.1;
            this.draw();
        });
    }

    toggleAnimation() {
        if (this.isAnimating) {
            this.stopAnimation();
        } else {
            this.isAnimating = true;
            document.getElementById('btn-animate').innerText = '⏸ Pause';
            this.animateLoop();
        }
    }

    stopAnimation() {
        this.isAnimating = false;
        document.getElementById('btn-animate').innerText = '▶ Animation';
        cancelAnimationFrame(this.animFrame);
    }

    animateLoop() {
        if (!this.isAnimating) return;
        let nextTheta = this.params.theta + 0.5;
        if (nextTheta > 85) nextTheta = -85;
        this.params.theta = nextTheta;

        const thetaInput = document.getElementById('input-theta');
        const thetaVal = document.getElementById('val-theta');
        if (thetaInput) thetaInput.value = nextTheta;
        if (thetaVal) thetaVal.innerText = nextTheta.toFixed(0);

        this.draw();
        this.animFrame = requestAnimationFrame(() => this.animateLoop());
    }

    toScreen(x, y) {
        return {
            x: this.offsetX + x * this.scale,
            y: this.offsetY - y * this.scale
        };
    }

    drawLine(x1, y1, x2, y2, color = '#000', width = 1, dashed = []) {
        const p1 = this.toScreen(x1, y1);
        const p2 = this.toScreen(x2, y2);
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.setLineDash(dashed);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawPoint(x, y, color = '#000', radius = 3) {
        const p = this.toScreen(x, y);
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    drawText(text, x, y, color = '#666', offset = { x: 5, y: -5 }) {
        const p = this.toScreen(x, y);
        this.ctx.fillStyle = color;
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.fillText(text, p.x + offset.x, p.y + offset.y);
    }

    draw() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        this.ctx.clearRect(0, 0, width, height);

        // Axes
        this.drawLine(-100, 0, 100, 0, '#ddd', 1);
        this.drawLine(0, -100, 0, 100, '#ddd', 1);

        // Pole
        this.drawPoint(0, 0, '#000', 4);
        this.drawText('O (Pole)', 0, 0, '#000');

        // Line L
        const d = this.params.d;
        this.drawLine(d, -100, d, 100, '#666', 2);
        this.drawText('L (x=d)', d, 5, '#666');

        // Conchoid curves
        const k = this.params.k;
        this.ctx.lineWidth = 2;

        // + branch (Red)
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ef4444';
        for (let tDeg = -85; tDeg <= 85; tDeg++) {
            const t = tDeg * Math.PI / 180;
            const r = d / Math.cos(t) + k;
            const x = r * Math.cos(t);
            const y = r * Math.sin(t);
            const p = this.toScreen(x, y);
            if (tDeg === -85) this.ctx.moveTo(p.x, p.y);
            else this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();

        // - branch (Blue)
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#3b82f6';
        for (let tDeg = -85; tDeg <= 85; tDeg++) {
            const t = tDeg * Math.PI / 180;
            const r = d / Math.cos(t) - k;
            const x = r * Math.cos(t);
            const y = r * Math.sin(t);
            const p = this.toScreen(x, y);
            if (tDeg === -85) this.ctx.moveTo(p.x, p.y);
            else this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();

        // Current state
        const thetaRad = this.params.theta * Math.PI / 180;
        const Qx = d;
        const Qy = d * Math.tan(thetaRad);
        const distOQ = Math.sqrt(Qx * Qx + Qy * Qy);
        const P_plus_r = distOQ + k;
        const P_plus_x = P_plus_r * Math.cos(thetaRad);
        const P_plus_y = P_plus_r * Math.sin(thetaRad);
        const P_minus_r = distOQ - k;
        const P_minus_x = P_minus_r * Math.cos(thetaRad);
        const P_minus_y = P_minus_r * Math.sin(thetaRad);

        const maxR = Math.max(Math.abs(P_plus_r), Math.abs(P_minus_r)) + 2;
        this.drawLine(0, 0, maxR * Math.cos(thetaRad), maxR * Math.sin(thetaRad), '#9ca3af', 1, [5, 5]);

        this.drawPoint(Qx, Qy, '#4b5563', 4);
        this.drawText('Q', Qx, Qy, '#4b5563', { x: 10, y: 0 });
        this.drawPoint(P_plus_x, P_plus_y, '#ef4444', 5);
        this.drawText('P+', P_plus_x, P_plus_y, '#ef4444');
        this.drawPoint(P_minus_x, P_minus_y, '#3b82f6', 5);
        this.drawText('P-', P_minus_x, P_minus_y, '#3b82f6');

        this.drawLine(Qx, Qy, P_plus_x, P_plus_y, 'rgba(239, 68, 68, 0.5)', 4);
        this.drawLine(Qx, Qy, P_minus_x, P_minus_y, 'rgba(59, 130, 246, 0.5)', 4);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    report.init();
    window.sim = new ConchoidSim('simCanvas');
});
