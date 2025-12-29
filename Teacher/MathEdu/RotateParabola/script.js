import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ReportManager } from '../js/report-core.js';

const report = new ReportManager('RotateParabola-report-v1');

document.addEventListener('DOMContentLoaded', () => {
    report.init();
    report.initGallery('results-gallery', 'results-gallery-input', 'results-gallery-drop', 'results-gallery-clear', 'results-gallery-add');

    initSimulation(report);
});

function initSimulation(reportManager) {
    // ==== DOM Elements ====
    const omegaSlider = document.getElementById('omegaSlider');
    const omegaInput = document.getElementById('omegaInput');
    const HSlider = document.getElementById('HSlider');
    const HInput = document.getElementById('HInput');
    const LSlider = document.getElementById('LSlider');
    const LInput = document.getElementById('LInput');
    const gInput = document.getElementById('gInput'); // Hidden input
    const calcInfo = document.getElementById('calcInfo');
    const profileCanvas = document.getElementById('profileCanvas');

    // Check if critical elements exist
    if (!omegaSlider || !profileCanvas) return;

    const ctx = profileCanvas.getContext('2d');

    // ==== Globals ====
    let scene, camera, renderer, controls, waterMesh, boxMesh, rotatingGroup;
    let currentOmega = 3;
    let currentH = 0.08, currentL = 0.25;

    // Container dimensions (fixed relative height/depth for visual)
    const CONTAINER_HEIGHT = 0.5;
    const CONTAINER_DEPTH = 0.08;

    // ==== Initialization ====
    initThree();

    // Event Listeners (Sync Sliders <-> Inputs)
    // We update 'current' vars immediately and save.

    const sync = (slider, input) => {
        slider.addEventListener('input', () => {
            input.value = slider.value;
            updateAll();
            reportManager.saveContent();
        });
        input.addEventListener('change', () => {
            slider.value = input.value;
            updateAll();
            reportManager.saveContent();
        });
    };

    if (omegaSlider && omegaInput) sync(omegaSlider, omegaInput);
    if (HSlider && HInput) sync(HSlider, HInput);
    if (LSlider && LInput) sync(LSlider, LInput);
    if (gInput) gInput.addEventListener('change', updateAll);

    // Initial Trigger
    updateAll();

    // ==== Resize Observer for 2D Canvas ====
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const dpr = window.devicePixelRatio || 1;
            profileCanvas.width = entry.contentRect.width * dpr;
            profileCanvas.height = entry.contentRect.height * dpr;
            // Redraw 2D profile
            const g = parseFloat(gInput ? gInput.value : 9.8);
            drawProfile(currentOmega, currentH, currentL, g);
        }
    });
    resizeObserver.observe(profileCanvas);


    // ==== Three.js Setup ====
    function initThree() {
        const container = document.getElementById('threeContainer');
        if (!container) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfaf9f6); // Warm White

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 50);
        camera.position.set(0.8, 0.8, 1.2);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);

        // Clear previous canvas if any
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(1, 2, 2);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        rotatingGroup = new THREE.Group();
        scene.add(rotatingGroup);

        createContainer(currentL);
        createWaterSurface(currentL);

        // Three.js Resizing
        const threeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                const h = entry.contentRect.height;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        });
        threeObserver.observe(container);

        animate();
    }

    function createContainer(L) {
        if (!rotatingGroup) return;
        if (boxMesh) rotatingGroup.remove(boxMesh);

        const boxGeom = new THREE.BoxGeometry(L, CONTAINER_HEIGHT, CONTAINER_DEPTH);
        const edges = new THREE.EdgesGeometry(boxGeom);
        boxMesh = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 })
        );
        rotatingGroup.add(boxMesh);
    }

    function createWaterSurface(L) {
        if (!rotatingGroup) return;
        if (waterMesh) rotatingGroup.remove(waterMesh);

        const resX = 60, resY = 8;
        const planeGeom = new THREE.PlaneGeometry(L, CONTAINER_DEPTH, resX, resY);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            shininess: 90,
            specular: 0x111111
        });
        waterMesh = new THREE.Mesh(planeGeom, waterMat);
        waterMesh.rotation.x = -Math.PI / 2;
        rotatingGroup.add(waterMesh);
    }

    // ==== Sync Logic ====
    function updateAll() {
        if (omegaSlider) currentOmega = parseFloat(omegaSlider.value);
        if (HSlider) currentH = parseFloat(HSlider.value);
        if (LSlider) {
            const newL = parseFloat(LSlider.value);
            if (currentL !== newL) {
                currentL = newL;
                createContainer(currentL);
                createWaterSurface(currentL);
            }
        }
        const g = parseFloat(gInput ? gInput.value : 9.8);

        drawProfile(currentOmega, currentH, currentL, g);
        updateWaterShapes(currentOmega, currentH, currentL, g);
        updateCalcInfo(currentOmega, currentH, currentL, g);
    }

    function updateWaterShapes(omega, H, L, g) {
        if (!waterMesh) return;
        const geom = waterMesh.geometry;
        geom.computeBoundingBox();
        const pos = geom.attributes.position;
        const bbox = geom.boundingBox;

        // Parabola Z = H - (w^2/2g)(L^2/12 - r^2)
        // In Three.js, Y is Up. The plane is rotated X=-90.
        // So plane Z -> World Y.
        // plane X -> World X.
        // plane Y -> World Z (Depth).

        for (let i = 0; i < pos.count; i++) {
            const xLocal = pos.getX(i);
            // Map xLocal to physical r
            // Plane width is L. xLocal goes from -L/2 to L/2.
            // r = xLocal (since we center the plane).
            const r = xLocal;

            let height = H - (omega * omega / (2 * g)) * (L * L / 12 - r * r);
            if (height < 0) height = 0;

            // Set Z (which is vertical displacement relative to plane)
            // But we want the water surface at absolute Y = height - ContainerBottomOffset?
            // Container is centered at Y=0. Height H is from bottom.
            // Box height is CONTAINER_HEIGHT. Bottom is -CONTAINER_HEIGHT/2.
            // So Y_world = -CONTAINER_HEIGHT/2 + height.
            // Plane is at Y=0 initially. So displacement is (-Ch/2 + height).

            const worldY = -CONTAINER_HEIGHT / 2 + height;
            pos.setZ(i, worldY);
        }

        pos.needsUpdate = true;
        geom.computeVertexNormals();
    }

    function updateCalcInfo(omega, H, L, g) {
        if (!calcInfo) return;
        const omega_c = Math.sqrt(24 * g * H / (L * L));
        const zv = H - (omega * omega * L * L) / (24 * g);
        const ratio = omega_c > 0 ? (omega / omega_c) : 0;

        let statusHtml = '';
        if (ratio < 0.95) statusHtml = '<span style="color:#10b981; font-weight:600;">안정 상태 (Stable)</span>';
        else if (ratio < 1.05) statusHtml = '<span style="color:#f59e0b; font-weight:600;">임계 근접 (Critical)</span>';
        else statusHtml = '<span style="color:#ef4444; font-weight:600;">마른 영역 발생 (Dry Patch)</span>';

        calcInfo.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
          <span>임계 각속도 \\(\\omega_c\\)</span>
          <strong>${omega_c.toFixed(2)} rad/s</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
          <span>꼭짓점 높이 \\(z_v\\)</span>
          <strong>${zv.toFixed(3)} m</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:0.5rem; border-top:1px dashed #cbd5e1; padding-top:0.5rem;">
          <span>상태</span>
          ${statusHtml}
        </div>
      `;

        // Re-render math if available
        if (window.renderMathInElement) {
            window.renderMathInElement(calcInfo, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "\\(", right: "\\)", display: false }
                ]
            });
        } else if (window.MathJax) {
            MathJax.typesetPromise([calcInfo]);
        }
    }

    // ==== 2D Profile ====
    function drawProfile(omega, H, L, g) {
        if (!profileCanvas) return;

        const w = profileCanvas.width;
        const h = profileCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const margin = 40;

        // Fix scaling based on max possible L (0.5 from slider)
        // so that the visual width actually shrinks/grows
        const MAX_L = 0.5;
        const rViewMin = -MAX_L / 2;
        const rViewMax = MAX_L / 2;

        // Container actual bounds
        const rMin = -L / 2;
        const rMax = L / 2;

        const zMin = -0.02;
        const zMax = CONTAINER_HEIGHT + 0.02;

        function xPix(r) { return margin + (r - rViewMin) * (w - 2 * margin) / (rViewMax - rViewMin); }
        function yPix(z) { return h - margin - (z - zMin) * (h - 2 * margin) / (zMax - zMin); }

        // Axes (View Range)
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // X-axis (z=0)
        ctx.moveTo(xPix(rViewMin), yPix(0)); ctx.lineTo(xPix(rViewMax), yPix(0));
        ctx.stroke();

        // Water level H (dashed)
        ctx.strokeStyle = '#93c5fd';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(xPix(rMin), yPix(H)); ctx.lineTo(xPix(rMax), yPix(H));
        ctx.stroke();
        ctx.setLineDash([]);

        // Container Walls
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xPix(rMin), yPix(CONTAINER_HEIGHT)); ctx.lineTo(xPix(rMin), yPix(0));
        ctx.moveTo(xPix(rMax), yPix(CONTAINER_HEIGHT)); ctx.lineTo(xPix(rMax), yPix(0));
        ctx.lineTo(xPix(rMin), yPix(0)); // Bottom
        ctx.stroke();

        // Parabola Surface
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const N = 100;
        for (let i = 0; i <= N; i++) {
            const r = rMin + (rMax - rMin) * i / N;
            const calcZ = H - (omega * omega / (2 * g)) * (L * L / 12 - r * r);
            const z = Math.max(0, calcZ);
            const x = xPix(r);
            const y = yPix(z);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Fill Water
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.lineTo(xPix(rMax), yPix(0));
        ctx.lineTo(xPix(rMin), yPix(0));
        ctx.closePath();
        ctx.fill();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        // Label x-axis
        ctx.fillText('Position (m)', w / 2, h - 10);
        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('z (m)', 0, 0);
        ctx.restore();
    }

    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        if (rotatingGroup && currentOmega > 0) {
            rotatingGroup.rotation.y += currentOmega * 0.016;
        }
        if (renderer && scene && camera) renderer.render(scene, camera);
    }
}
