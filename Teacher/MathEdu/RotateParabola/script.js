import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==== DOM Elements ====
const omegaSlider = document.getElementById('omegaSlider');
const omegaInput = document.getElementById('omegaInput');
const HSlider = document.getElementById('HSlider');
const HInput = document.getElementById('HInput');
const LSlider = document.getElementById('LSlider');
const LInput = document.getElementById('LInput');
const gInput = document.getElementById('gInput');
const calcInfo = document.getElementById('calcInfo');
const profileCanvas = document.getElementById('profileCanvas');
const ctx = profileCanvas.getContext('2d');

// ==== Globals ====
let scene, camera, renderer, controls, waterMesh, boxMesh, rotatingGroup;
let currentOmega = 0;
let currentH = 0.08, currentL = 0.25;

// Container dimensions (fixed)
const CONTAINER_HEIGHT = 0.25;
const CONTAINER_DEPTH = 0.08;

// ==== Sync Inputs ====
function syncPair(slider, input, formatter = v => v) {
    slider.addEventListener('input', () => {
        input.value = formatter(slider.value);
        updateAll();
    });
    input.addEventListener('change', () => {
        slider.value = formatter(input.value);
        updateAll();
    });
}

if (omegaSlider) {
    syncPair(omegaSlider, omegaInput, v => Number(v));
    syncPair(HSlider, HInput, v => Number(v));
    syncPair(LSlider, LInput, v => Number(v));
    gInput.addEventListener('change', updateAll);
}

// ==== 2D Profile Drawing ====
function drawProfile(omega, H, L, g) {
    if (!profileCanvas) return;
    const w = profileCanvas.width;
    const h = profileCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const margin = 40;
    const rMin = -L / 2;
    const rMax = L / 2;

    // View range: show container height
    const zMin = -0.05;
    const zMax = CONTAINER_HEIGHT + 0.05;

    function xPix(r) {
        return margin + (r - rMin) * (w - 2 * margin) / (rMax - rMin);
    }
    function yPix(z) {
        return h - margin - (z - zMin) * (h - 2 * margin) / (zMax - zMin);
    }

    // Ground (z=0)
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xPix(rMin), yPix(0));
    ctx.lineTo(xPix(rMax), yPix(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Container Walls (fixed height)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xPix(rMin), yPix(CONTAINER_HEIGHT));
    ctx.lineTo(xPix(rMin), yPix(0));
    ctx.moveTo(xPix(rMax), yPix(CONTAINER_HEIGHT));
    ctx.lineTo(xPix(rMax), yPix(0));
    ctx.stroke();

    // Water Surface (parabola)
    ctx.strokeStyle = '#3b82f6'; // vivid blue
    ctx.lineWidth = 3;
    ctx.beginPath();
    const N = 200;
    for (let i = 0; i <= N; i++) {
        const r = rMin + (rMax - rMin) * i / N;
        const z = H - (omega * omega / (2 * g)) * (L * L / 12 - r * r);
        const x = xPix(r);
        const y = yPix(z);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill Water area
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.lineTo(xPix(rMax), yPix(0));
    ctx.lineTo(xPix(rMin), yPix(0));
    ctx.closePath();
    ctx.fill();

    // Axis Labels
    ctx.fillStyle = '#475569';
    ctx.font = '12px Inter';
    ctx.fillText('r (m)', w - margin + 5, yPix(0) + 4);
    ctx.fillText('z (m)', xPix(0) - 10, margin - 10);

    // Legend
    ctx.font = '11px Inter';
    ctx.fillStyle = '#64748b';
    ctx.fillText('회색: 물통', margin, 20);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('파란색: 물 표면', margin, 35);
}

// ==== Three.js Setup ====
function initThree() {
    const container = document.getElementById('threeContainer');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf9f6); // Warm White Background

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 50);
    camera.position.set(0.6, 0.5, 0.9);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(1, 2, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Rotating Group (contains box and water)
    rotatingGroup = new THREE.Group();
    scene.add(rotatingGroup);

    createContainer(currentL, currentH);
    createWaterSurface(currentL);

    window.addEventListener('resize', onWindowResize);
    animate();
}

function createContainer(L) {
    if (boxMesh) rotatingGroup.remove(boxMesh);

    // BoxGeometry(width_X, height_Y, depth_Z) - container height is FIXED
    const boxGeom = new THREE.BoxGeometry(L, CONTAINER_HEIGHT, CONTAINER_DEPTH);
    const edges = new THREE.EdgesGeometry(boxGeom);
    boxMesh = new THREE.LineSegments(
        edges,
        // Darker lines for visibility on white background
        new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 })
    );
    rotatingGroup.add(boxMesh);
}

function createWaterSurface(L) {
    if (waterMesh) rotatingGroup.remove(waterMesh);

    const resX = 60, resY = 8;
    // PlaneGeometry(width_X, depth_Z)
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
    // Rotate to make it horizontal (Y-up coordinate system)
    waterMesh.rotation.x = -Math.PI / 2;
    rotatingGroup.add(waterMesh);
}

function onWindowResize() {
    const container = document.getElementById('threeContainer');
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function updateWaterSurface(omega, H, L, g) {
    if (!waterMesh) return;
    const geom = waterMesh.geometry;
    geom.computeBoundingBox();
    const pos = geom.attributes.position;
    const bbox = geom.boundingBox;

    // Calculate parabolic shape
    for (let i = 0; i < pos.count; i++) {
        const xLocal = pos.getX(i); // X position on the plane

        // Map to physical coordinates
        const r = ((xLocal - bbox.min.x) / (bbox.max.x - bbox.min.x) - 0.5) * L;

        // Calculate height at this radial position
        const height = H - (omega * omega / (2 * g)) * (L * L / 12 - r * r);

        // Set Z position (which becomes Y after rotation)
        pos.setZ(i, height - H);
    }

    pos.needsUpdate = true;
    geom.computeVertexNormals();
}

// ==== Calculation Info Display ====
function updateCalcInfo(omega, H, L, g) {
    const omega_c = Math.sqrt(24 * g * H / (L * L));
    const zv = H - (omega * omega * L * L) / (24 * g);
    const ratio = omega_c > 0 ? (omega / omega_c) : 0;

    let statusHtml = '';
    // Use new hex colors
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

    if (window.MathJax) {
        MathJax.typesetPromise([calcInfo]);
    }
}

function updateAll() {
    const omega = Number(omegaInput.value);
    const H = Number(HInput.value);
    const L = Number(LInput.value);
    const g = Number(gInput.value);

    currentOmega = omega;

    // Check if L changed (container width)
    if (currentL !== L) {
        currentL = L;
        createContainer(L);
        createWaterSurface(L);
    }

    // Check if H changed (water height)
    if (currentH !== H) {
        currentH = H;
    }

    drawProfile(omega, H, L, g);
    updateWaterSurface(omega, H, L, g);
    updateCalcInfo(omega, H, L, g);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();

    // Rotate the container and water surface
    if (rotatingGroup && currentOmega > 0) {
        rotatingGroup.rotation.y += currentOmega * 0.016; // 60fps
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
}

// Start
initThree();
updateAll();
