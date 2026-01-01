/**
 * Conchoid Simulation Script based on Nicomedes' definition
 * r = d * sec(theta) +/- k
 */

class ConchoidSim {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Simulation State
        this.params = {
            d: 4.0,     // Distance from pole to line x=d
            k: 5.0,     // Interval length
            theta: 45   // Current angle in degrees
        };

        // View State
        this.scale = 40; // Pixels per unit
        this.offsetX = this.canvas.width / 2 - 100;
        this.offsetY = this.canvas.height / 2;
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.isAnimating = false;
        this.animFrame = null;

        this.initListeners();
        this.draw();
    }

    initListeners() {
        // Inputs
        const bindInput = (id, key) => {
            const el = document.getElementById(id);
            const disp = document.getElementById(id.replace('input', 'val'));
            el?.addEventListener('input', (e) => {
                this.params[key] = parseFloat(e.target.value);
                if (disp) disp.innerText = this.params[key].toFixed(el.step.includes('.') ? 1 : 0);
                if (key === 'theta') this.draw();
                else this.draw(); // Redraw curve if parameters change
            });
        };

        bindInput('input-d', 'd');
        bindInput('input-k', 'k');
        bindInput('input-theta', 'theta');

        // Animation
        document.getElementById('btn-animate')?.addEventListener('click', () => this.toggleAnimation());
        document.getElementById('btn-reset')?.addEventListener('click', () => {
            this.stopAnimation();
            this.params.theta = 45;
            document.getElementById('input-theta').value = 45;
            document.getElementById('val-theta').innerText = '45';
            this.draw();
        });

        // Mouse Controls (Pan/Zoom)
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.draw();
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= zoomAmount;
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

        // Swing theta back and forth or loop
        // Simple loop for now: -85 to 85
        let nextTheta = this.params.theta + 0.5;
        if (nextTheta > 85) nextTheta = -85;

        this.params.theta = nextTheta;

        // Update UI
        const thetaInput = document.getElementById('input-theta');
        const thetaVal = document.getElementById('val-theta');
        if (thetaInput) thetaInput.value = nextTheta;
        if (thetaVal) thetaVal.innerText = nextTheta.toFixed(0);

        this.draw();
        this.animFrame = requestAnimationFrame(() => this.animateLoop());
    }

    // Coordinate Transforms
    toScreen(x, y) {
        return {
            x: this.offsetX + x * this.scale,
            y: this.offsetY - y * this.scale // standard cartesian
        };
    }

    // Drawing Helpers
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
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // --- 1. Grid & Axes ---
        this.drawLine(-100, 0, 100, 0, '#ddd', 1); // X-axis
        this.drawLine(0, -100, 0, 100, '#ddd', 1); // Y-axis

        // --- 2. Fixed Elements ---
        // Pole O at (0,0)
        this.drawPoint(0, 0, '#000', 4);
        this.drawText('O (Pole)', 0, 0, '#000');

        // Line L at x = d
        const d = this.params.d;
        this.drawLine(d, -100, d, 100, '#666', 2);
        this.drawText('L (x=d)', d, 5, '#666');

        // --- 3. The Conchoid Curve (Locus) ---
        // Equation: r = d/cos(t) +/- k
        // x = d + k*cos(t), y = d*tan(t) + k*sin(t)
        const k = this.params.k;
        this.ctx.lineWidth = 2;

        // Draw + branch (Red)
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ef4444'; // Red-500
        for (let tDeg = -85; tDeg <= 85; tDeg += 1) {
            const t = tDeg * Math.PI / 180;
            const r = d / Math.cos(t) + k;
            const x = r * Math.cos(t);
            const y = r * Math.sin(t);
            const p = this.toScreen(x, y);
            if (tDeg === -85) this.ctx.moveTo(p.x, p.y);
            else this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();

        // Draw - branch (Blue)
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#3b82f6'; // Blue-500
        for (let tDeg = -85; tDeg <= 85; tDeg += 1) {
            const t = tDeg * Math.PI / 180;
            const r = d / Math.cos(t) - k; // Note the minus k
            const x = r * Math.cos(t);
            const y = r * Math.sin(t);
            const p = this.toScreen(x, y);
            if (tDeg === -85) this.ctx.moveTo(p.x, p.y);
            else this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();

        // Loop check: if k > d, there is a loop in the negative branch
        if (k > d) {
            // Highlight the loop area? Optional.
        }

        // --- 4. Current State (Ray & Points) ---
        const thetaRad = this.params.theta * Math.PI / 180;

        // Calculate Points
        // Q is intersection of Ray and Line L
        // Q = (d, d * tan(theta))
        const Qx = d;
        const Qy = d * Math.tan(thetaRad);

        // P+ = Q + k * unit_vector
        const distOQ = Math.sqrt(Qx * Qx + Qy * Qy); // d * sec(theta)
        const P_plus_r = distOQ + k;
        const P_plus_x = P_plus_r * Math.cos(thetaRad);
        const P_plus_y = P_plus_r * Math.sin(thetaRad);

        // P- = Q - k * unit_vector
        const P_minus_r = distOQ - k;
        const P_minus_x = P_minus_r * Math.cos(thetaRad);
        const P_minus_y = P_minus_r * Math.sin(thetaRad);

        // Draw Ray from O through Q extended
        // Extend visually a bit past max(P+, P-)
        const maxR = Math.max(Math.abs(P_plus_r), Math.abs(P_minus_r)) + 2;
        const RayEndx = maxR * Math.cos(thetaRad);
        const RayEndy = maxR * Math.sin(thetaRad);

        this.drawLine(0, 0, RayEndx, RayEndy, '#9ca3af', 1, [5, 5]); // Dashed ray

        // Draw Points
        this.drawPoint(Qx, Qy, '#4b5563', 4); // Q (Gray)
        this.drawText('Q', Qx, Qy, '#4b5563', { x: 10, y: 0 });

        this.drawPoint(P_plus_x, P_plus_y, '#ef4444', 5); // P+ (Red)
        this.drawText('P+', P_plus_x, P_plus_y, '#ef4444');

        this.drawPoint(P_minus_x, P_minus_y, '#3b82f6', 5); // P- (Blue)
        this.drawText('P-', P_minus_x, P_minus_y, '#3b82f6');

        // Draw Interval Stick (Visual guide for k)
        // Draw line segment P- to P+ (This length is 2k, Q is midpoint)
        // Actually Nicomedes ruler is Q to P (length k). So draw thick line Q to P+ and Q to P-
        this.drawLine(Qx, Qy, P_plus_x, P_plus_y, 'rgba(239, 68, 68, 0.5)', 4); // Red transparent
        this.drawLine(Qx, Qy, P_minus_x, P_minus_y, 'rgba(59, 130, 246, 0.5)', 4); // Blue transparent

        // Add dimension label "k" near the segment if needed
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.sim = new ConchoidSim('simCanvas');
});
