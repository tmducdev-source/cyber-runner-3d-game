import * as THREE from 'three';

export class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.2;
        this.lanes = [-2, 0, 2];

        this.darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x180814,
            metalness: 0.35,
            roughness: 0.34,
            emissive: 0x220012,
            emissiveIntensity: 1.1
        });

        this.firewallMaterial = new THREE.MeshStandardMaterial({
            color: 0xff2048,
            emissive: 0xff003c,
            emissiveIntensity: 2.3
        });

        this.magentaMaterial = new THREE.MeshStandardMaterial({
            color: 0xff2bd6,
            emissive: 0xff0088,
            emissiveIntensity: 2.5
        });

        this.laserMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2bd6,
            transparent: true,
            opacity: 0.78
        });
    }

    createFirewallBlock() {
        const obstacle = new THREE.Group();
        obstacle.userData.kind = 'FirewallBlock';

        const core = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 0.52), this.darkMaterial);
        core.position.y = 0.72;
        obstacle.add(core);

        for (let i = 0; i < 4; i++) {
            const row = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.58), this.firewallMaterial);
            row.position.set(0, 0.22 + i * 0.32, 0);
            obstacle.add(row);
        }

        for (const x of [-0.48, 0, 0.48]) {
            const column = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.6), this.firewallMaterial);
            column.position.set(x, 0.72, 0);
            obstacle.add(column);
        }

        const topWarning = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.66), this.magentaMaterial);
        topWarning.position.set(0, 1.44, 0);
        obstacle.add(topWarning);

        return obstacle;
    }

    createLaserGate() {
        const obstacle = new THREE.Group();
        obstacle.userData.kind = 'LaserGate';

        for (const x of [-0.62, 0.62]) {
            const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.55, 0.34), this.darkMaterial);
            pylon.position.set(x, 0.78, 0);
            obstacle.add(pylon);

            const pylonCore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.22, 0.38), this.magentaMaterial);
            pylonCore.position.set(x, 0.78, 0);
            obstacle.add(pylonCore);
        }

        for (let i = 0; i < 3; i++) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 0.12), this.laserMaterial);
            beam.position.set(0, 0.38 + i * 0.38, 0);
            beam.userData.isBeam = true;
            obstacle.add(beam);
        }

        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.28), this.firewallMaterial);
        cap.position.set(0, 1.55, 0);
        obstacle.add(cap);

        return obstacle;
    }

    createCorruptedCube() {
        const obstacle = new THREE.Group();
        obstacle.userData.kind = 'CorruptedCube';

        const cube = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.08, 1.08), this.magentaMaterial);
        cube.position.y = 0.72;
        cube.rotation.set(0.4, 0.2, 0.15);
        obstacle.add(cube);

        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(cube.geometry),
            new THREE.LineBasicMaterial({ color: 0x00f5ff })
        );
        edges.position.copy(cube.position);
        edges.rotation.copy(cube.rotation);
        obstacle.add(edges);

        for (let i = 0; i < 6; i++) {
            const shard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), this.firewallMaterial);
            const angle = i * (Math.PI / 3);
            shard.position.set(Math.cos(angle) * 0.72, 0.72 + Math.sin(i * 1.7) * 0.38, Math.sin(angle) * 0.38);
            shard.rotation.set(i * 0.45, i * 0.31, i * 0.22);
            obstacle.add(shard);
        }

        return obstacle;
    }

    // Frees GPU memory for every mesh inside an obstacle group
    disposeObstacle(obstacle) {
        obstacle.traverse((child) => {
            if (child.isMesh || child.isLineSegments) {
                child.geometry.dispose();
            }
        });
    }

    spawn() {
        const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        const obstacleFactories = [
            () => this.createFirewallBlock(),
            () => this.createLaserGate(),
            () => this.createCorruptedCube()
        ];
        const obstacle = obstacleFactories[Math.floor(Math.random() * obstacleFactories.length)]();

        obstacle.position.set(lane, 0, -35);
        obstacle.userData.age = 0;

        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }

    update(deltaTime, speed) {
        this.spawnTimer += deltaTime;

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawn();
            this.spawnTimer = 0;
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.userData.age += deltaTime;

            obstacle.position.z += speed * deltaTime;

            if (obstacle.userData.kind === 'FirewallBlock') {
                obstacle.rotation.y = Math.sin(obstacle.userData.age * 4) * 0.08;
            }

            if (obstacle.userData.kind === 'LaserGate') {
                for (const child of obstacle.children) {
                    if (child.userData.isBeam) {
                        child.scale.x = 1 + Math.sin(obstacle.userData.age * 14) * 0.08;
                    }
                }
            }

            if (obstacle.userData.kind === 'CorruptedCube') {
                obstacle.rotation.x += deltaTime * 1.8;
                obstacle.rotation.y += deltaTime * 2.4;
            }

            if (obstacle.position.z > 10) {
                this.disposeObstacle(obstacle);
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
            }
        }
    }

    reset() {
        for (const obstacle of this.obstacles) {
            this.disposeObstacle(obstacle);
            this.scene.remove(obstacle);
        }

        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.2;
    }
}
