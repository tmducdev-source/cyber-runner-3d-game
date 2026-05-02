import * as THREE from 'three';

const PLAYER_START_Y = 0.65;

export class Player {
    constructor(scene) {
        this.lanes = [-2, 0, 2];
        this.currentLane = 1;
        this.targetX = 0;
        this.hoverTime = 0;

        this.mesh = new THREE.Group();
        this.mesh.position.set(0, PLAYER_START_Y, 4);

        this.engineGlowMeshes = [];
        this.createHoverVehicle();

        scene.add(this.mesh);
    }

    createHoverVehicle() {
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x151820,
            metalness: 0.7,
            roughness: 0.28,
            emissive: 0x030711,
            emissiveIntensity: 0.9
        });

        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2f38,
            metalness: 0.55,
            roughness: 0.32,
            emissive: 0x050912,
            emissiveIntensity: 0.7
        });

        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x071c24,
            metalness: 0.15,
            roughness: 0.18,
            emissive: 0x005f78,
            emissiveIntensity: 1.6,
            transparent: true,
            opacity: 0.86
        });

        const cyanMaterial = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 2.7
        });

        const magentaMaterial = new THREE.MeshStandardMaterial({
            color: 0xff2bd6,
            emissive: 0xff0077,
            emissiveIntensity: 2.2
        });

        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.34, 1.8), bodyMaterial);
        mainBody.position.set(0, 0.08, 0);
        this.mesh.add(mainBody);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.58), panelMaterial);
        nose.position.set(0, 0.08, -0.78);
        nose.scale.set(1, 0.9, 1);
        this.mesh.add(nose);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.62), glassMaterial);
        cabin.position.set(0, 0.42, -0.08);
        this.mesh.add(cabin);

        const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.48), panelMaterial);
        rearDeck.position.set(0, 0.28, 0.62);
        this.mesh.add(rearDeck);

        const frontLight = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.055, 0.055), cyanMaterial);
        frontLight.position.set(0, 0.16, -1.09);
        this.mesh.add(frontLight);

        const topLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 1.36), cyanMaterial);
        topLine.position.set(0, 0.31, -0.05);
        this.mesh.add(topLine);

        for (const side of [-1, 1]) {
            const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 1.46), cyanMaterial);
            sideRail.position.set(side * 0.72, 0.17, -0.03);
            this.mesh.add(sideRail);

            const engine = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 1.18), panelMaterial);
            engine.position.set(side * 0.92, -0.02, 0.12);
            this.mesh.add(engine);

            const engineCore = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.38, 18), cyanMaterial);
            engineCore.rotation.x = Math.PI / 2;
            engineCore.position.set(side * 0.92, -0.03, 0.82);
            this.mesh.add(engineCore);
            this.engineGlowMeshes.push(engineCore);

            const wingLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.58), magentaMaterial);
            wingLight.position.set(side * 0.92, 0.16, -0.38);
            this.mesh.add(wingLight);
        }

        const underGlow = new THREE.Mesh(
            new THREE.BoxGeometry(1.08, 0.035, 1.2),
            new THREE.MeshBasicMaterial({
                color: 0x00f5ff,
                transparent: true,
                opacity: 0.42
            })
        );
        underGlow.position.set(0, -0.18, 0.05);
        this.mesh.add(underGlow);

        const cyanLight = new THREE.PointLight(0x00f5ff, 1.25, 5);
        cyanLight.position.set(0, 0.18, -0.6);
        this.mesh.add(cyanLight);
    }

    moveLeft() {
        if (this.currentLane > 0) {
            this.currentLane--;
            this.targetX = this.lanes[this.currentLane];
        }
    }

    moveRight() {
        if (this.currentLane < this.lanes.length - 1) {
            this.currentLane++;
            this.targetX = this.lanes[this.currentLane];
        }
    }

    update(deltaTime) {
        this.hoverTime += deltaTime;

        const previousX = this.mesh.position.x;
        this.mesh.position.x += (this.targetX - this.mesh.position.x) * 10 * deltaTime;
        this.mesh.position.y = PLAYER_START_Y + Math.sin(this.hoverTime * 5) * 0.045;

        const laneVelocity = this.mesh.position.x - previousX;
        this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, -laneVelocity * 1.8, 8 * deltaTime);
        this.mesh.rotation.x = Math.sin(this.hoverTime * 3) * 0.025;

        for (const engineGlow of this.engineGlowMeshes) {
            engineGlow.scale.setScalar(1 + Math.sin(this.hoverTime * 18) * 0.08);
        }
    }
}
