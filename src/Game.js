import * as THREE from 'three';
import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';

const HIGH_SCORE_KEY = 'cyberRunnerHighScore';
const BASE_SPEED = 12;
const MAX_SPEED = 60;
const BOOST_MULTIPLIER = 1.45;
const BOOST_DURATION = 1.25;
const BOOST_COOLDOWN = 2.1;

const SPAWN_INTERVALS = { 1: 1.2, 2: 1.0, 3: 0.75, 4: 0.55 };

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x02030a);
        this.scene.fog = new THREE.Fog(0x062832, 10, 68);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.elapsedTime = 0;
        this.floatingCubes = [];
        this.neonPanels = [];
        this.animationId = null;

        const storedHighScore = Number(localStorage.getItem(HIGH_SCORE_KEY));

        this.speed = BASE_SPEED;
        this.score = 0;
        this.highScore = Number.isFinite(storedHighScore) ? storedHighScore : 0;
        this.fragments = 0;
        this.maxFragments = 60;
        this.phase = 1;
        this.isStarted = false;
        this.isGameOver = false;
        this.boostTimeRemaining = 0;
        this.boostCooldownRemaining = 0;

        this.player = new Player(this.scene);
        this.obstacleManager = new ObstacleManager(this.scene);

        this.startScreenElement = document.getElementById('startScreen');
        this.gameOverPanelElement = document.getElementById('gameOverPanel');
        this.bottomControlsElement = document.getElementById('bottomControls');
        this.virtualControlsElement = document.getElementById('virtualControls');
        this.startButtonElement = document.getElementById('startButton');
        this.restartButtonElement = document.getElementById('restartButton');
        this.boostButtonElement = document.getElementById('boostButton');
        this.moveLeftButtonElement = document.getElementById('moveLeftButton');
        this.moveRightButtonElement = document.getElementById('moveRightButton');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.fragmentsElement = document.getElementById('fragments');
        this.phaseElement = document.getElementById('phase');
        this.speedFillElement = document.getElementById('speedFill');
        this.velocityElement = document.getElementById('velocity');
        this.finalScoreElement = document.getElementById('finalScore');
        this.gameOverHighScoreElement = document.getElementById('gameOverHighScore');

        this.updateHud();

        this.createLights();
        this.createRoad();
        this.createCyberEnvironment();
        this.setupInput();
        this.setupResize();
        this.updateControlState();
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x1b2548, 1.4);
        this.scene.add(ambientLight);

        const cyanLight = new THREE.PointLight(0x00f5ff, 4.2, 70);
        cyanLight.position.set(-4, 8, 4);
        this.scene.add(cyanLight);

        const magentaLight = new THREE.PointLight(0xff2bd6, 3.7, 62);
        magentaLight.position.set(5, 6, -12);
        this.scene.add(magentaLight);

        const horizonLight = new THREE.DirectionalLight(0x5eeeff, 1.2);
        horizonLight.position.set(0, 8, -20);
        this.scene.add(horizonLight);
    }

    createRoad() {
        const roadGeometry = new THREE.BoxGeometry(7, 0.2, 110);
        const roadMaterial = new THREE.MeshStandardMaterial({
            color: 0x080a16,
            metalness: 0.4,
            roughness: 0.45,
            emissive: 0x050522,
            emissiveIntensity: 0.9
        });

        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.position.set(0, -0.1, -22);
        this.scene.add(road);

        const cyanLineMaterial = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const magentaLineMaterial = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });

        for (const x of [-3, -1, 1, 3]) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 110), cyanLineMaterial);
            line.position.set(x, 0.05, -22);
            this.scene.add(line);
        }

        for (const x of [-3.55, 3.55]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 110), magentaLineMaterial);
            rail.position.set(x, 0.18, -22);
            this.scene.add(rail);
        }

        for (let z = -72; z <= 24; z += 4) {
            const scanLine = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.035, 0.045), cyanLineMaterial);
            scanLine.position.set(0, 0.07, z);
            this.scene.add(scanLine);
        }
    }

    createCyberEnvironment() {
        this.createBuildings();
        this.createFloatingDataCubes();
        this.createNeonPanels();
    }

    createBuildings() {
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x0b0d18,
            metalness: 0.32,
            roughness: 0.5,
            emissive: 0x060819,
            emissiveIntensity: 0.9
        });

        const cyanWindowMaterial = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const magentaWindowMaterial = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });

        let index = 0;
        for (let z = -62; z <= 18; z += 8) {
            for (const side of [-1, 1]) {
                const width = 1.9 + (index % 4) * 0.38;
                const height = 4.2 + (index % 7) * 0.9;
                const depth = 3.4 + (index % 5) * 0.5;
                const x = side * (7.2 + (index % 3) * 1.35);

                const building = new THREE.Group();
                building.position.set(x, 0, z + (index % 2) * 2);

                const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterial);
                tower.position.y = height / 2 - 0.1;
                building.add(tower);

                const faceX = -side * (width / 2 + 0.035);
                for (let strip = 0; strip < 3; strip++) {
                    const material = (index + strip) % 2 === 0 ? cyanWindowMaterial : magentaWindowMaterial;
                    const windowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, height * 0.58, 0.08), material);
                    windowStrip.position.set(faceX, height * 0.5, -depth * 0.28 + strip * depth * 0.28);
                    building.add(windowStrip);
                }

                const billboard = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.28, width * 0.72),
                    index % 2 === 0 ? magentaWindowMaterial : cyanWindowMaterial
                );
                billboard.position.set(faceX, height + 0.12, 0);
                billboard.rotation.y = Math.PI / 2;
                building.add(billboard);

                this.scene.add(building);
                index++;
            }
        }
    }

    createFloatingDataCubes() {
        const cyanMaterial = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.8,
            transparent: true,
            opacity: 0.72
        });

        const magentaMaterial = new THREE.MeshStandardMaterial({
            color: 0xff2bd6,
            emissive: 0xff0088,
            emissiveIntensity: 1.7,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < 28; i++) {
            const size = 0.22 + (i % 5) * 0.07;
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                i % 2 === 0 ? cyanMaterial : magentaMaterial
            );

            const x = Math.sin(i * 2.17) * 5.4;
            const z = -62 + i * 3.05;
            const y = 2.2 + (i % 8) * 0.48;
            cube.position.set(x, y, z);
            cube.rotation.set(i * 0.21, i * 0.37, i * 0.13);

            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(cube.geometry),
                new THREE.LineBasicMaterial({ color: i % 2 === 0 ? 0xffffff : 0x00f5ff })
            );
            cube.add(edges);

            this.scene.add(cube);
            this.floatingCubes.push({
                mesh: cube,
                baseY: y,
                phase: i * 0.55
            });
        }
    }

    createNeonPanels() {
        const cyanMaterial = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            transparent: true,
            opacity: 0.86
        });

        const magentaMaterial = new THREE.MeshBasicMaterial({
            color: 0xff2bd6,
            transparent: true,
            opacity: 0.82
        });

        const darkPostMaterial = new THREE.MeshStandardMaterial({
            color: 0x111422,
            metalness: 0.45,
            roughness: 0.4,
            emissive: 0x080612,
            emissiveIntensity: 0.8
        });

        for (let z = -56; z <= 14; z += 7) {
            for (const side of [-1, 1]) {
                const panel = new THREE.Group();
                panel.position.set(side * 4.2, 0.1, z);
                panel.rotation.y = side * -0.12;

                const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), darkPostMaterial);
                post.position.y = 0.45;
                panel.add(post);

                const sign = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.74, 1.35),
                    (z / 7 + side) % 2 === 0 ? cyanMaterial : magentaMaterial
                );
                sign.position.y = 0.88;
                sign.userData.baseOpacity = sign.material.opacity;
                panel.add(sign);

                this.scene.add(panel);
                this.neonPanels.push(panel);
            }
        }
    }

    updateEnvironment(deltaTime) {
        this.elapsedTime += deltaTime;

        for (const item of this.floatingCubes) {
            item.mesh.rotation.x += deltaTime * 0.55;
            item.mesh.rotation.y += deltaTime * 0.75;
            item.mesh.position.y = item.baseY + Math.sin(this.elapsedTime * 1.7 + item.phase) * 0.24;
        }

        for (let i = 0; i < this.neonPanels.length; i++) {
            const sign = this.neonPanels[i].children[1];
            sign.material.opacity = sign.userData.baseOpacity + Math.sin(this.elapsedTime * 5 + i) * 0.1;
        }
    }

    setupInput() {
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                this.handleActionInput();
                return;
            }

            if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
                event.preventDefault();
                this.handleBoost();
                return;
            }

            if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
                this.handleMoveInput('left');
            }

            if (event.code === 'ArrowRight' || event.code === 'KeyD') {
                this.handleMoveInput('right');
            }
        });

        this.bindControlButton(this.startButtonElement, () => this.handleActionInput());
        this.bindControlButton(this.restartButtonElement, () => this.handleActionInput());
        this.bindControlButton(this.boostButtonElement, () => this.handleBoost());
        this.bindControlButton(this.moveLeftButtonElement, () => this.handleMoveInput('left'));
        this.bindControlButton(this.moveRightButtonElement, () => this.handleMoveInput('right'));
    }

    bindControlButton(button, handler) {
        if (!button) {
            return;
        }

        let lastPointerActivation = 0;

        const activateButton = (event) => {
            if ('button' in event && event.button !== 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            lastPointerActivation = performance.now();
            button.classList.add('is-pressing');
            handler();
        };

        const releaseButton = () => {
            button.classList.remove('is-pressing');
        };

        button.addEventListener('pointerdown', activateButton);
        button.addEventListener('pointerup', releaseButton);
        button.addEventListener('pointercancel', releaseButton);
        button.addEventListener('pointerleave', releaseButton);

        button.addEventListener('click', (event) => {
            if (performance.now() - lastPointerActivation < 350) {
                return;
            }

            activateButton(event);
            releaseButton();
        });

        button.addEventListener(
            'touchstart',
            (event) => {
                if (window.PointerEvent) {
                    return;
                }

                activateButton(event);
            },
            { passive: false }
        );

        button.addEventListener('touchend', releaseButton);
        button.addEventListener('touchcancel', releaseButton);

        button.addEventListener('keydown', (event) => {
            if (event.code !== 'Enter' && event.code !== 'Space') {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            handler();
        });
    }

    handleActionInput() {
        if (!this.isStarted) {
            this.beginGame();
            return;
        }

        if (this.isGameOver) {
            this.restart();
        }
    }

    handleMoveInput(direction) {
        if (!this.isStarted || this.isGameOver) {
            return;
        }

        if (direction === 'left') {
            this.player.moveLeft();
            return;
        }

        if (direction === 'right') {
            this.player.moveRight();
        }
    }

    handleBoost() {
        if (!this.isStarted || this.isGameOver) {
            return;
        }

        if (this.isBoostActive() || this.boostCooldownRemaining > 0) {
            return;
        }

        this.boostTimeRemaining = BOOST_DURATION;
        this.boostCooldownRemaining = BOOST_DURATION + BOOST_COOLDOWN;
        this.updateControlState();
    }

    isBoostActive() {
        return this.boostTimeRemaining > 0;
    }

    getRunSpeed() {
        if (!this.isBoostActive()) {
            return this.speed;
        }

        return Math.min(this.speed * BOOST_MULTIPLIER, MAX_SPEED * BOOST_MULTIPLIER);
    }

    updateBoost(deltaTime) {
        this.boostTimeRemaining = Math.max(0, this.boostTimeRemaining - deltaTime);
        this.boostCooldownRemaining = Math.max(0, this.boostCooldownRemaining - deltaTime);
    }

    updateControlState() {
        const isRunning = this.isStarted && !this.isGameOver;
        const isBoosting = this.isBoostActive();
        const isBoostCooling = isRunning && !isBoosting && this.boostCooldownRemaining > 0;

        if (this.virtualControlsElement) {
            this.virtualControlsElement.classList.toggle('is-running', isRunning);
            this.virtualControlsElement.classList.toggle('is-ended', this.isGameOver);
            this.virtualControlsElement.classList.toggle('is-boosting', isBoosting);
        }

        if (this.bottomControlsElement) {
            let statusText = 'TAP START';

            if (this.isGameOver) {
                statusText = 'TAP RESTART';
            } else if (isBoosting) {
                statusText = 'BOOST ENGAGED';
            } else if (isBoostCooling) {
                statusText = 'BOOST CHARGING';
            } else if (isRunning) {
                statusText = 'BOOST READY';
            }

            this.bottomControlsElement.textContent = statusText;
        }

        if (this.boostButtonElement) {
            this.boostButtonElement.disabled = !isRunning || isBoostCooling;
            this.boostButtonElement.classList.toggle('is-active', isBoosting);
            this.boostButtonElement.classList.toggle('is-cooling', isBoostCooling);
        }

        if (this.moveLeftButtonElement) {
            this.moveLeftButtonElement.disabled = !isRunning;
        }

        if (this.moveRightButtonElement) {
            this.moveRightButtonElement.disabled = !isRunning;
        }
    }

    setupResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    beginGame() {
        this.isStarted = true;
        this.isGameOver = false;
        this.startScreenElement.classList.add('hidden');
        this.gameOverPanelElement.classList.add('hidden');
        this.updateControlState();
        this.clock.getDelta();
    }

    getPhase() {
        if (this.score >= 250) {
            return 4;
        }

        if (this.score >= 120) {
            return 3;
        }

        if (this.score >= 50) {
            return 2;
        }

        return 1;
    }

    updateHud() {
        this.phase = this.getPhase();

        this.scoreElement.textContent = Math.floor(this.score).toString();
        this.highScoreElement.textContent = this.highScore.toString();
        this.fragmentsElement.textContent = Math.floor(this.fragments).toString();
        this.phaseElement.textContent = this.phase.toString();

        const displayedSpeed = this.getRunSpeed();
        const speedPercent = THREE.MathUtils.clamp((displayedSpeed / MAX_SPEED) * 100, 0, 100);
        this.speedFillElement.style.width = `${speedPercent}%`;
        this.velocityElement.textContent = `${Math.floor(displayedSpeed * 20)} KPH`;
    }

    checkCollision() {
        for (const obstacle of this.obstacleManager.obstacles) {
            const dx = Math.abs(this.player.mesh.position.x - obstacle.position.x);
            const dz = Math.abs(this.player.mesh.position.z - obstacle.position.z);

            if (dx < 0.9 && dz < 0.9) {
                this.gameOver();
                break;
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.boostTimeRemaining = 0;
        this.boostCooldownRemaining = 0;

        const currentScore = Math.floor(this.score);

        if (currentScore > this.highScore) {
            this.highScore = currentScore;
            localStorage.setItem(HIGH_SCORE_KEY, this.highScore.toString());
        }

        this.updateHud();
        this.finalScoreElement.textContent = currentScore.toString();
        this.gameOverHighScoreElement.textContent = this.highScore.toString();
        this.gameOverPanelElement.classList.remove('hidden');
        this.updateControlState();
    }

    restart() {
        this.isStarted = true;
        this.isGameOver = false;
        this.speed = BASE_SPEED;
        this.score = 0;
        this.fragments = 0;
        this.phase = 1;
        this.boostTimeRemaining = 0;
        this.boostCooldownRemaining = 0;

        this.player.reset();
        this.obstacleManager.reset();
        this.startScreenElement.classList.add('hidden');
        this.gameOverPanelElement.classList.add('hidden');
        this.updateHud();
        this.updateControlState();
        this.clock.getDelta();
    }

    start() {
        this.animate();
    }

    stop() {
        cancelAnimationFrame(this.animationId);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Cap deltaTime so tab-switch spikes don't explode physics
        const deltaTime = Math.min(this.clock.getDelta(), 0.05);
        this.updateEnvironment(deltaTime);

        if (this.isStarted && !this.isGameOver) {
            this.updateBoost(deltaTime);

            const runSpeed = this.getRunSpeed();
            const scoreMultiplier = this.isBoostActive() ? BOOST_MULTIPLIER : 1;

            this.score += deltaTime * 10 * scoreMultiplier;
            this.speed = Math.min(this.speed + deltaTime * 0.2, MAX_SPEED);
            this.fragments = THREE.MathUtils.clamp(
                this.fragments + deltaTime * 2,
                0,
                this.maxFragments
            );

            this.player.update(deltaTime);
            this.obstacleManager.update(deltaTime, runSpeed);
            this.checkCollision();
            this.updateHud();
            this.updateControlState();

            // Scale spawn rate with phase for smoother difficulty curve
            this.obstacleManager.spawnInterval = SPAWN_INTERVALS[this.phase];

            // Exponential-decay camera follow — framerate-independent
            const targetCamX = this.player.mesh.position.x * 0.25;
            this.camera.position.x += (targetCamX - this.camera.position.x) * (1 - Math.exp(-3 * deltaTime));

            this.camera.lookAt(this.player.mesh.position.x, 0, 0);
        }

        this.renderer.render(this.scene, this.camera);
    }
}
