import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GearGenerator } from './gears.js?v=3';
import { t, setLanguage, getLanguage } from './translations.js';

// Global State
let currentMode = 'planetary';
let scene, camera, renderer, controls, gearGroup;
let generator;
let currentUnit = 'Nm';

// Scene Setup
function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 40);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2;

    // Raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '0.9rem';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.style.fontFamily = 'Inter, sans-serif';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
    document.body.appendChild(tooltip);

    // Mouse move handler
    function onMouseMove(event) {
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(gearGroup.children, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            const name = obj.userData.name || obj.parent?.userData.name;
            if (name) {
                tooltip.textContent = name;
                tooltip.style.display = 'block';
                tooltip.style.left = event.clientX + 15 + 'px';
                tooltip.style.top = event.clientY + 15 + 'px';
                canvas.style.cursor = 'pointer';
                return;
            }
        }

        tooltip.style.display = 'none';
        canvas.style.cursor = 'default';
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(20, 50, 20);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
    backLight.position.set(-20, 10, -20);
    scene.add(backLight);

    gearGroup = new THREE.Group();
    gearGroup.rotation.x = -Math.PI / 2;
    scene.add(gearGroup);

    generator = new GearGenerator();

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Mode-specific configurations
const modes = {
    planetary: {
        config: { sunTeeth: 20, planetTeeth: 20, ringTeeth: 60, module: 0.5 },
        state: { sunAngle: 0, carrierAngle: 0, speed: 60 },
        meshes: {},

        setupUI() {
            document.getElementById('description-text').innerHTML = t('descPlanetary');
            document.getElementById('title').textContent = t('titlePlanetary');

            const configHTML = `
                <div class="config-section" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #aaa;">${t('config')}</h3>
                    <div class="input-row" style="margin-bottom: 8px;">
                        <label style="width: 80px;">${t('sunTeeth')}</label>
                        <input type="number" id="sun-teeth" value="20" min="10" step="1">
                    </div>
                    <div class="input-row" style="margin-bottom: 8px;">
                        <label style="width: 80px;">${t('ringTeeth')}</label>
                        <input type="number" id="ring-teeth" value="60" min="30" step="1">
                    </div>
                    <div class="input-row">
                        <label style="width: 80px;">${t('planetTeeth')}</label>
                        <input type="number" id="planet-teeth" value="20" readonly style="opacity: 0.5;">
                    </div>
                    <button id="update-btn" style="width: 100%; margin-top: 10px; padding: 8px; background: #4f8aff; border: none; border-radius: 6px; color: white; cursor: pointer;">${t('updateBtn')}</button>
                </div>`;

            const gearsHTML = `
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #ffaa00;"><h2>${t('sunGear')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-1" value="10" step="0.1"></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-1" value="60" step="1"><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #00aaff;"><h2>${t('carrier')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-2" readonly></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-2" readonly><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #ff4444;"><h2>${t('ringGear')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-3" readonly></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-3" value="0" readonly><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>`;

            document.getElementById('config-panel').innerHTML = configHTML;
            document.getElementById('gear-inputs').innerHTML = gearsHTML;
            document.getElementById('info-box').innerHTML = `<p><strong>${t('gearRatio')}</strong> <span id="ratio">1:3</span></p><p><strong>${t('reductionRatio')}</strong> <span id="reduction">1:4</span></p>`;

            document.getElementById('update-btn').addEventListener('click', () => this.updateConfig());
            document.getElementById('speed-1').addEventListener('input', () => this.updateValues());
        },

        createGears() {
            while (gearGroup.children.length > 0) gearGroup.remove(gearGroup.children[0]);

            const { sunTeeth, planetTeeth, ringTeeth, module } = this.config;
            const sunRadius = module * sunTeeth / 2;
            const planetRadius = module * planetTeeth / 2;
            const ringRadius = module * ringTeeth / 2;
            const carrierRadius = (sunRadius + ringRadius) / 2;

            this.meshes.sun = generator.createSunGear(sunTeeth, sunRadius);
            gearGroup.add(this.meshes.sun);

            this.meshes.ring = generator.createRingGear(ringTeeth, ringRadius);
            this.meshes.ring.material.opacity = 0.4;
            gearGroup.add(this.meshes.ring);

            this.meshes.carrier = generator.createCarrier(carrierRadius);
            gearGroup.add(this.meshes.carrier);

            this.meshes.planets = [];
            for (let i = 0; i < 3; i++) {
                const planet = generator.createPlanetGear(planetTeeth, planetRadius);
                const angle = (i / 3) * Math.PI * 2;
                const dist = sunRadius + planetRadius;
                planet.position.x = Math.cos(angle) * dist;
                planet.position.y = Math.sin(angle) * dist;
                this.meshes.planets.push(planet);
                this.meshes.carrier.add(planet);
            }
        },

        animate() {
            if (!this.meshes.sun || !this.meshes.carrier || !this.meshes.planets) return;

            const w_s = (this.state.speed * Math.PI / 180) / 60;
            const ratio = this.config.sunTeeth / (this.config.sunTeeth + this.config.ringTeeth);

            this.state.sunAngle += w_s;
            this.meshes.sun.rotation.z = this.state.sunAngle;

            this.state.carrierAngle = this.state.sunAngle * ratio;
            this.meshes.carrier.rotation.z = this.state.carrierAngle;

            const sunRelAngle = this.state.sunAngle - this.state.carrierAngle;
            const planetRelAngle = -sunRelAngle * (this.config.sunTeeth / this.config.planetTeeth);
            this.meshes.planets.forEach(p => p.rotation.z = planetRelAngle);
        },

        updateValues() {
            const speed = parseFloat(document.getElementById('speed-1').value) || 0;
            this.state.speed = speed;

            const ratio = this.config.sunTeeth / (this.config.sunTeeth + this.config.ringTeeth);
            document.getElementById('speed-2').value = (speed * ratio).toFixed(2);

            const torque = parseFloat(document.getElementById('torque-1').value) || 0;
            const ratioTorque = this.config.ringTeeth / this.config.sunTeeth;
            document.getElementById('torque-2').value = (torque * (1 + ratioTorque)).toFixed(2);
            document.getElementById('torque-3').value = (torque * ratioTorque).toFixed(2);
        },

        updateConfig() {
            const s = parseInt(document.getElementById('sun-teeth').value);
            const r = parseInt(document.getElementById('ring-teeth').value);

            if (isNaN(s) || isNaN(r) || s < 5 || r < s || (r - s) % 2 !== 0) {
                alert(t('alertInvalidTeeth'));
                return;
            }

            const p = (r - s) / 2;
            document.getElementById('planet-teeth').value = p;

            this.config.sunTeeth = s;
            this.config.ringTeeth = r;
            this.config.planetTeeth = p;

            document.getElementById('ratio').textContent = `1:${(r / s).toFixed(2)}`;
            document.getElementById('reduction').textContent = `1:${(1 + r / s).toFixed(2)}`;

            this.createGears();
            this.updateValues();
        }
    },

    harmonic: {
        config: { flexTeeth: 200, circTeeth: 202, module: 0.05 },
        state: { waveAngle: 0, speed: 60 },
        meshes: {},

        setupUI() {
            document.getElementById('description-text').innerHTML = t('descHarmonic');
            document.getElementById('title').textContent = t('titleHarmonic');

            const configHTML = `
                <div class="config-section" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #aaa;">${t('config')}</h3>
                    <div class="input-row" style="margin-bottom: 8px;">
                        <label style="width: 80px;">${t('flexTeeth')}</label>
                        <input type="number" id="flex-teeth" value="200" min="50" step="2">
                    </div>
                    <div class="input-row">
                        <label style="width: 80px;">${t('circTeeth')}</label>
                        <input type="number" id="circ-teeth" value="202" min="52" step="2">
                    </div>
                    <button id="update-btn" style="width: 100%; margin-top: 10px; padding: 8px; background: #4f8aff; border: none; border-radius: 6px; color: white; cursor: pointer;">${t('updateBtn')}</button>
                </div>`;

            const gearsHTML = `
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #ff6600;"><h2>${t('waveGen')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-1" value="10" step="0.1"></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-1" value="60" step="1"><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #00aaff;"><h2>${t('flexspline')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-2" readonly></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-2" readonly><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #ff4444;"><h2>${t('circularSpline')}</h2></div>
                    <div class="input-row"><label>${t('status')}</label><input type="text" value="${t('fixed')}" readonly style="opacity: 0.7;"></div>
                </div>`;

            document.getElementById('config-panel').innerHTML = configHTML;
            document.getElementById('gear-inputs').innerHTML = gearsHTML;
            document.getElementById('info-box').innerHTML = `<p><strong>${t('reductionRatio')}</strong> <span id="reduction">1:100</span></p>`;

            document.getElementById('update-btn').addEventListener('click', () => this.updateConfig());
            document.getElementById('speed-1').addEventListener('input', () => this.updateValues());
        },

        createGears() {
            while (gearGroup.children.length > 0) gearGroup.remove(gearGroup.children[0]);

            const { flexTeeth, circTeeth, module } = this.config;
            const radius = module * flexTeeth / 2;

            this.meshes.waveGen = generator.createWaveGenerator(radius * 0.95, radius * 0.85);
            gearGroup.add(this.meshes.waveGen);

            this.meshes.flexspline = generator.createFlexspline(flexTeeth, radius);
            gearGroup.add(this.meshes.flexspline);

            this.meshes.circSpline = generator.createCircularSpline(circTeeth, radius * 1.05);
            this.meshes.circSpline.material.opacity = 0.3;
            gearGroup.add(this.meshes.circSpline);
        },

        animate() {
            if (!this.meshes.waveGen || !this.meshes.flexspline) return;

            const w_input = (this.state.speed * Math.PI / 180) / 60;
            this.state.waveAngle += w_input;
            this.meshes.waveGen.rotation.z = this.state.waveAngle;

            const ratio = -this.config.flexTeeth / (this.config.circTeeth - this.config.flexTeeth);
            this.meshes.flexspline.rotation.z = this.state.waveAngle * ratio;
        },

        updateValues() {
            const speed = parseFloat(document.getElementById('speed-1').value) || 0;
            this.state.speed = speed;

            const ratio = -this.config.flexTeeth / (this.config.circTeeth - this.config.flexTeeth);
            document.getElementById('speed-2').value = (speed * ratio).toFixed(2);

            const torque = parseFloat(document.getElementById('torque-1').value) || 0;
            document.getElementById('torque-2').value = (torque / ratio).toFixed(2);
        },

        updateConfig() {
            const f = parseInt(document.getElementById('flex-teeth').value);
            const c = parseInt(document.getElementById('circ-teeth').value);

            if (isNaN(f) || isNaN(c) || f < 50 || c <= f) {
                alert(t('alertInvalidFlex'));
                return;
            }

            this.config.flexTeeth = f;
            this.config.circTeeth = c;

            const ratio = Math.abs(f / (c - f));
            document.getElementById('reduction').textContent = `1:${ratio.toFixed(1)}`;

            this.createGears();
            this.updateValues();
        }
    },

    cycloidal: {
        config: { discLobes: 10, numPins: 11, module: 1 },
        state: { eccAngle: 0, speed: 60 },
        meshes: {},

        setupUI() {
            document.getElementById('description-text').innerHTML = t('descCycloidal');
            document.getElementById('title').textContent = t('titleCycloidal');

            const configHTML = `
                <div class="config-section" style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #aaa;">${t('settings')}</h3>
                    <div class="input-row" style="margin-bottom: 8px;">
                        <label style="width: 80px;">${t('discLobes')}</label>
                        <input type="number" id="disc-lobes" value="10" min="5" step="1">
                    </div>
                    <div class="input-row">
                        <label style="width: 80px;">${t('numPins')}</label>
                        <input type="number" id="num-pins" value="11" min="6" step="1">
                    </div>
                    <button id="update-btn" style="width: 100%; margin-top: 10px; padding: 8px; background: #4f8aff; border: none; border-radius: 6px; color: white; cursor: pointer;">${t('updateBtn')}</button>
                </div>`;

            const gearsHTML = `
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #ff6600;"><h2>${t('eccentric')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-1" value="10" step="0.1"></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-1" value="60" step="1"><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #00aaff;"><h2>${t('cycloidDisc')}</h2></div>
                    <div class="input-row"><label>${t('torque')}</label><input type="number" id="torque-2" readonly></div>
                    <div class="input-row" style="margin-top: 5px;"><label>${t('speed')}</label><input type="number" id="speed-2" readonly><span style="font-size: 0.8rem; color: #888; margin-left: 5px;">deg/s</span></div>
                </div>
                <div class="gear-input">
                    <div class="gear-header" style="border-left: 4px solid #ff4444;"><h2>${t('pinWheel')}</h2></div>
                    <div class="input-row"><label>${t('status')}</label><input type="text" value="${t('fixed')}" readonly style="opacity: 0.7;"></div>
                </div>`;

            document.getElementById('config-panel').innerHTML = configHTML;
            document.getElementById('gear-inputs').innerHTML = gearsHTML;
            document.getElementById('info-box').innerHTML = `<p><strong>${t('reductionRatio')}</strong> <span id="reduction">1:10</span></p>`;

            document.getElementById('update-btn').addEventListener('click', () => this.updateConfig());
            document.getElementById('speed-1').addEventListener('input', () => this.updateValues());
        },

        createGears() {
            while (gearGroup.children.length > 0) gearGroup.remove(gearGroup.children[0]);

            const { discLobes, numPins, module } = this.config;
            const radius = module * discLobes;

            this.meshes.disc = generator.createCycloidDisc(discLobes, radius * 0.8);
            gearGroup.add(this.meshes.disc);

            this.meshes.pinWheel = generator.createPinWheel(numPins, radius);
            if (this.meshes.pinWheel.children) {
                this.meshes.pinWheel.children.forEach(child => {
                    if (child.material) child.material.opacity = 0.3;
                });
            }
            gearGroup.add(this.meshes.pinWheel);

            this.meshes.eccShaft = generator.createEccentricShaft(radius);
            gearGroup.add(this.meshes.eccShaft);
        },

        animate() {
            if (!this.meshes.eccShaft || !this.meshes.disc) return;

            const w_input = (this.state.speed * Math.PI / 180) / 60;
            this.state.eccAngle += w_input;
            this.meshes.eccShaft.rotation.z = this.state.eccAngle;

            const ratio = this.config.discLobes / (this.config.numPins - this.config.discLobes);
            this.meshes.disc.rotation.z = -this.state.eccAngle / (ratio + 1);

            const eccentricity = 0.5;
            this.meshes.disc.position.x = Math.cos(this.state.eccAngle) * eccentricity;
            this.meshes.disc.position.y = Math.sin(this.state.eccAngle) * eccentricity;
        },

        updateValues() {
            const speed = parseFloat(document.getElementById('speed-1').value) || 0;
            this.state.speed = speed;

            const ratio = this.config.discLobes / (this.config.numPins - this.config.discLobes);
            document.getElementById('speed-2').value = (speed / (ratio + 1)).toFixed(2);

            const torque = parseFloat(document.getElementById('torque-1').value) || 0;
            document.getElementById('torque-2').value = (torque * (ratio + 1)).toFixed(2);
        },

        updateConfig() {
            const d = parseInt(document.getElementById('disc-lobes').value);
            const p = parseInt(document.getElementById('num-pins').value);

            if (isNaN(d) || isNaN(p) || d < 5 || p <= d) {
                alert(t('alertInvalidCycloidal'));
                return;
            }

            this.config.discLobes = d;
            this.config.numPins = p;

            const ratio = d / (p - d);
            document.getElementById('reduction').textContent = `1:${(ratio + 1).toFixed(1)}`;

            this.createGears();
            this.updateValues();
        }
    }
};

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    modes[currentMode].animate();
    controls.update();
    renderer.render(scene, camera);
}

// Mode Switching
function switchMode(mode) {
    currentMode = mode;
    modes[mode].setupUI();
    modes[mode].createGears();
    modes[mode].updateValues();
}

// Init
initScene();
switchMode('planetary');
animate();

// Event Listeners
document.getElementById('mode-select').addEventListener('change', (e) => {
    switchMode(e.target.value);
});

// Unit conversion
const factors = { 'Nm': 1, 'kgcm': 10.197, 'lbft': 0.73756 };
document.getElementById('unit-select').addEventListener('change', (e) => {
    const newUnit = e.target.value;
    const factor = factors[newUnit] / factors[currentUnit];

    const torque1 = document.getElementById('torque-1');
    const torque2 = document.getElementById('torque-2');
    if (torque1 && torque2) {
        const v1 = parseFloat(torque1.value);
        const v2 = parseFloat(torque2.value);
        if (!isNaN(v1)) torque1.value = (v1 * factor).toFixed(2);
        if (!isNaN(v2)) torque2.value = (v2 * factor).toFixed(2);
    }

    currentUnit = newUnit;
    modes[currentMode].updateValues();
});

// Language Switcher
function updateLanguage() {
    const modeSelect = document.getElementById('mode-select');
    const modeLabel = document.getElementById('mode-label');
    const principleTitle = document.getElementById('principle-title');
    const unitLabel = document.getElementById('unit-label');

    // Update UI text
    modeLabel.textContent = t('simulationMode');
    modeSelect.options[0].text = t('modePlanetary');
    modeSelect.options[1].text = t('modeHarmonic');
    modeSelect.options[2].text = t('modeCycloidal');
    principleTitle.textContent = t('principleTitle');
    unitLabel.textContent = t('unit');

    // Update button styles
    const isKo = getLanguage() === 'ko';
    document.getElementById('lang-ko').style.background = isKo ? 'rgba(100,100,255,0.3)' : 'rgba(100,100,255,0.1)';
    document.getElementById('lang-ko').style.border = isKo ? '2px solid rgba(100,100,255,0.8)' : '1px solid rgba(100,100,255,0.3)';
    document.getElementById('lang-ko').style.color = isKo ? 'white' : '#aaf';
    document.getElementById('lang-ko').style.fontWeight = isKo ? '600' : 'normal';
    document.getElementById('lang-en').style.background = isKo ? 'rgba(100,100,255,0.1)' : 'rgba(100,100,255,0.3)';
    document.getElementById('lang-en').style.border = isKo ? '1px solid rgba(100,100,255,0.3)' : '2px solid rgba(100,100,255,0.8)';
    document.getElementById('lang-en').style.color = isKo ? '#aaf' : 'white';
    document.getElementById('lang-en').style.fontWeight = isKo ? 'normal' : '600';

    // Refresh current mode UI
    switchMode(currentMode);
}

document.getElementById('lang-ko').addEventListener('click', () => {
    setLanguage('ko');
    updateLanguage();
});

document.getElementById('lang-en').addEventListener('click', () => {
    setLanguage('en');
    updateLanguage();
});
