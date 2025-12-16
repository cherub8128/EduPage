import * as THREE from 'three';

export class GearGenerator {
    constructor() {
        this.materialSun = new THREE.MeshPhongMaterial({ color: 0xffaa00, specular: 0x444444, shininess: 30 });
        this.materialPlanet = new THREE.MeshPhongMaterial({ color: 0x44ff44, specular: 0x444444, shininess: 30 });
        this.materialRing = new THREE.MeshPhongMaterial({ color: 0xff4444, specular: 0x444444, shininess: 30, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
        this.materialCarrier = new THREE.MeshPhongMaterial({ color: 0x00aaff, specular: 0x444444, shininess: 30 });

        // Harmonic materials - matching reference image colors
        this.materialWaveGen = new THREE.MeshPhongMaterial({ color: 0x2563eb, specular: 0x666666, shininess: 40 }); // Deep blue
        this.materialFlexspline = new THREE.MeshPhongMaterial({ color: 0x14b8a6, specular: 0x444444, shininess: 35, transparent: true, opacity: 0.85 }); // Cyan/teal
        this.materialCircularSpline = new THREE.MeshPhongMaterial({ color: 0xd946ef, specular: 0x444444, shininess: 30, transparent: true, opacity: 0.5, side: THREE.DoubleSide }); // Magenta
        this.materialBearing = new THREE.MeshPhongMaterial({ color: 0x60a5fa, specular: 0x888888, shininess: 60, metalness: 0.8 }); // Light blue metallic

        // Cycloidal materials
        this.materialCycloidDisc = new THREE.MeshPhongMaterial({ color: 0x00aaff, specular: 0x444444, shininess: 30 });
        this.materialPinWheel = new THREE.MeshPhongMaterial({ color: 0xff4444, specular: 0x444444, shininess: 30, transparent: true, opacity: 0.5 });
    }

    // ========== PLANETARY GEARS ==========

    createGearShape(teeth, radius, holeRadius) {
        const shape = new THREE.Shape();
        const toothDepth = 0.15 * radius;
        const steps = teeth * 4;
        const angleStep = (Math.PI * 2) / steps;

        for (let i = 0; i < steps; i++) {
            const angle = i * angleStep;
            const mod = i % 4;
            let r = radius;
            if (mod === 2 || mod === 3) r = radius - toothDepth;

            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();

        if (holeRadius > 0) {
            const hole = new THREE.Path();
            hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
            shape.holes.push(hole);
        }

        return shape;
    }

    createRingGearShape(teeth, innerRadius, outerRadius) {
        const shape = new THREE.Shape();
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

        const hole = new THREE.Path();
        const toothDepth = 0.15 * innerRadius;
        const steps = teeth * 4;
        const angleStep = (Math.PI * 2) / steps;

        for (let i = 0; i < steps; i++) {
            const angle = i * angleStep;
            const mod = i % 4;
            let r = innerRadius;
            if (mod === 2 || mod === 3) r = innerRadius + toothDepth;

            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);

            if (i === 0) hole.moveTo(x, y);
            else hole.lineTo(x, y);
        }
        hole.closePath();
        shape.holes.push(hole);

        return shape;
    }

    createSunGear(teeth, radius) {
        const shape = this.createGearShape(teeth, radius, radius * 0.3);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
        const mesh = new THREE.Mesh(geometry, this.materialSun);
        mesh.userData.name = '선 기어 (Sun Gear)';
        return mesh;
    }

    createPlanetGear(teeth, radius) {
        const shape = this.createGearShape(teeth, radius, radius * 0.3);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
        const mesh = new THREE.Mesh(geometry, this.materialPlanet);
        mesh.userData.name = '유성 기어 (Planet Gear)';
        return mesh;
    }

    createRingGear(teeth, innerRadius) {
        const outerRadius = innerRadius * 1.2;
        const shape = this.createRingGearShape(teeth, innerRadius, outerRadius);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
        const mesh = new THREE.Mesh(geometry, this.materialRing);
        mesh.userData.name = '링 기어 (Ring Gear) 🔒';
        return mesh;
    }

    createCarrier(radius) {
        const group = new THREE.Group();
        group.userData.name = '캐리어 (Carrier)';

        const hubGeo = new THREE.CylinderGeometry(radius * 0.15, radius * 0.15, 0.4, 32);
        hubGeo.rotateX(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, this.materialCarrier);
        hub.userData.name = '캐리어 (Carrier)';
        group.add(hub);

        const armLen = radius * 2.2;
        const armWidth = radius * 0.1;

        const armGeo = new THREE.BoxGeometry(armLen, armWidth, 0.2);
        const arm1 = new THREE.Mesh(armGeo, this.materialCarrier);
        arm1.userData.name = '캐리어 (Carrier)';
        arm1.position.z = -0.6;
        group.add(arm1);

        const arm2 = new THREE.Mesh(armGeo, this.materialCarrier);
        arm2.userData.name = '캐리어 (Carrier)';
        arm2.rotation.z = Math.PI / 2;
        arm2.position.z = -0.6;
        group.add(arm2);

        return group;
    }

    // ========== HARMONIC DRIVE (REDESIGNED) ==========

    createWaveGenerator(radiusMajor, radiusMinor) {
        // Elliptical rigid hub with more visible deformation
        const group = new THREE.Group();
        group.userData.name = '웨이브 제너레이터 (Wave Generator) 🔄';

        // Main elliptical body
        const geometry = new THREE.CylinderGeometry(radiusMajor, radiusMajor, 1.2, 32);
        geometry.scale(1, 1, radiusMinor / radiusMajor);
        geometry.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, this.materialWaveGen);
        mesh.userData.name = '웨이브 제너레이터 (Wave Generator) 🔄';
        group.add(mesh);

        // Center hub (connection point)
        const hubGeo = new THREE.CylinderGeometry(radiusMinor * 0.4, radiusMinor * 0.4, 1.5, 32);
        hubGeo.rotateX(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, this.materialWaveGen);
        hub.userData.name = '웨이브 제너레이터 (Wave Generator) 🔄';
        group.add(hub);

        return group;
    }

    createFlexspline(teeth, radius) {
        // Flexible spline with ball bearings pattern
        const group = new THREE.Group();
        group.userData.name = '플렉스스플라인 (Flexspline) ⚙️';

        // Main toothed ring (slightly larger to show flexibility)
        const shape = this.createGearShape(teeth, radius, radius * 0.75);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
        const mesh = new THREE.Mesh(geometry, this.materialFlexspline);
        mesh.userData.name = '플렉스스플라인 (Flexspline) ⚙️';
        group.add(mesh);

        // Ball bearings pattern (inner ring of spheres)
        const numBearings = 20;
        const bearingRadius = radius * 0.85;
        const ballSize = radius * 0.04;

        for (let i = 0; i < numBearings; i++) {
            const angle = (i / numBearings) * Math.PI * 2;
            const ballGeo = new THREE.SphereGeometry(ballSize, 16, 16);
            const ball = new THREE.Mesh(ballGeo, this.materialBearing);
            ball.userData.name = '플렉스스플라인 (Flexspline) ⚙️';
            ball.position.x = Math.cos(angle) * bearingRadius;
            ball.position.y = Math.sin(angle) * bearingRadius;
            ball.position.z = 0.5;
            group.add(ball);
        }

        return group;
    }

    createCircularSpline(teeth, innerRadius) {
        // Thicker outer rigid ring (magenta)
        const outerRadius = innerRadius * 1.2;
        const shape = this.createRingGearShape(teeth, innerRadius, outerRadius);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 2.0, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1 });
        const mesh = new THREE.Mesh(geometry, this.materialCircularSpline);
        mesh.userData.name = '서큘러 스플라인 (Circular Spline) 🔒';
        mesh.position.z = -0.1; // Slightly offset for better visibility
        return mesh;
    }

    // ========== CYCLOIDAL DRIVE ==========

    createCycloidDisc(numLobes, radius) {
        const shape = new THREE.Shape();
        const points = 200;
        const R = radius;
        const r = R / numLobes;
        const d = r * 0.7;

        for (let i = 0; i <= points; i++) {
            const t = (i / points) * Math.PI * 2;
            const x = (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
            const y = (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);

            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();

        const hole = new THREE.Path();
        hole.absarc(0, 0, R * 0.2, 0, Math.PI * 2, true);
        shape.holes.push(hole);

        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 });
        const mesh = new THREE.Mesh(geometry, this.materialCycloidDisc);
        mesh.userData.name = '사이클로이드 디스크 (Cycloidal Disc) ⚙️';
        return mesh;
    }

    createPinWheel(numPins, radius) {
        const group = new THREE.Group();
        group.userData.name = '핀 휠 (Pin Wheel) 🔒';

        // Torus ring
        const ringGeo = new THREE.TorusGeometry(radius, radius * 0.08, 16, 32);
        const ring = new THREE.Mesh(ringGeo, this.materialPinWheel);
        ring.userData.name = '핀 휠 (Pin Wheel) 🔒';
        group.add(ring);

        // Longer pins (increased from 1.2 to 2.5)
        const pinRadius = radius * 0.08;
        const pinGeo = new THREE.CylinderGeometry(pinRadius, pinRadius, 2.5, 16);
        pinGeo.rotateX(Math.PI / 2);

        for (let i = 0; i < numPins; i++) {
            const angle = (i / numPins) * Math.PI * 2;
            const pin = new THREE.Mesh(pinGeo, this.materialPinWheel);
            pin.userData.name = '핀 휠 (Pin Wheel) 🔒';
            pin.position.x = Math.cos(angle) * radius;
            pin.position.y = Math.sin(angle) * radius;
            group.add(pin);
        }

        return group;
    }

    createEccentricShaft(radius) {
        const group = new THREE.Group();
        group.userData.name = '입력축 (Eccentric Shaft) 🔄';

        const shaftGeo = new THREE.CylinderGeometry(radius * 0.15, radius * 0.15, 2, 32);
        shaftGeo.rotateX(Math.PI / 2);
        const shaft = new THREE.Mesh(shaftGeo, this.materialWaveGen);
        shaft.userData.name = '입력축 (Eccentric Shaft) 🔄';
        group.add(shaft);

        return group;
    }
}
