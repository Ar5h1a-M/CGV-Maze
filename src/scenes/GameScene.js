import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";
import { Player } from '../entities/Player.js';
import { MazeGenerator } from '../maze/MazeGenerator.js';
import { MazeRenderer } from '../maze/MazeRenderer.js';
import { HUD } from '../ui/HUD.js';
import { FogOfWar } from '../utils/FogOfWar.js';

// 🔊 Add your ambience file here (e.g. src/audio/ambience_spooky.mp3)
import AMBIENCE_URL from '../audio/ambience_spooky.mp3';

export class GameScene {
    constructor() {
        this.scene = null;
        this.gameManager = null;
        this.uiManager = null;
        this.player = null;
        this.mazeGenerator = null;
        this.mazeRenderer = null;
        this.hud = null;
        this.world = null;
        this.clock = new THREE.Clock();
        this.camera = null;
        this.renderer = null;
        this.fogOfWar = null;
        this.mazeData = null; 
        this.enemies = [];
        this.items = [];
        this.traps = [];
        this.portal = null;
        this.hasWon = false;
        this.skybox = null;

        // --- remember baseline fog so we can expand it with flashlight ---
        this._baseFog = { near: 1, far: 5 };
        // holders for flashlight lights
        this.flashlight = null;
        this.flashFill = null;

        // 🔊 audio internals
        this._audioListener = null;
        this._audioLoader = null;
        this._ambience = null;
        this._ambienceArmed = false;

        // 📝 note-reading UI state
        this.currentNoteTarget = null;
        this.noteUI = { overlay: null, text: null, prompt: null, isOpen: false };
    }
    
    async init(gameManager, uiManager, renderer = null) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        this.renderer = renderer;

        // --- initialize flashlight flags ---
        this.gameManager.flashlightActive = false;
        this.gameManager.hasFlashlight = false;

        // (Optional but helps light feel brighter with PBR materials)
        if (this.renderer) {
            this.renderer.physicallyCorrectLights = true;
            // a tiny boost makes standard materials read better in dark scenes
            this.renderer.toneMappingExposure = 1.2;
        }
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, this._baseFog.near, this._baseFog.far);
        await this.setupSkybox();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.2, 0);
        this.scene.camera = this.camera;

        // 🔊 start ambience after first user gesture
        this._setupAmbienceAudio();
        
        // Setup physics world
        this.setupPhysics();
        
        // Setup lighting
        this.setupLighting();
        
        // Generate maze
        this.mazeGenerator = new MazeGenerator(this.gameManager.currentDifficulty);
        const mazeData = this.mazeGenerator.generate();
        this.mazeData = mazeData;
        
        // Render maze
        this.mazeRenderer = new MazeRenderer(this.scene, this.world);
        this.mazeRenderer.render(mazeData, this.gameManager.currentDifficulty);
        
        // Fog of war
        this.fogOfWar = new FogOfWar(this.scene, mazeData, this.gameManager);
        
        // Populate enemies/items
        this.populateGameWorld(mazeData);

        // Flashlight effect
        this.setupFlashlightEffect();
        
        // Create player
        this.player = new Player(this.scene, this.world, this.gameManager, this.renderer);
        this.player.spawn();
        
        // Setup HUD
        this.hud = new HUD(this.gameManager);
        this.hud.create();
        this.hud.setMazeData(this.mazeData);
        
        // Start clock
        this.clock.start();
        console.log('GameScene initialized with enemies and items');

        // 📝 Build note overlay UI + bind inputs
        this._buildNoteUI();
        this._bindNoteInput();
    }

    // 🔊 minimal audio helper
    _setupAmbienceAudio() {
        try {
            this._audioListener = new THREE.AudioListener();
            this.camera.add(this._audioListener);

            this._audioLoader = new THREE.AudioLoader();
            this._ambience = new THREE.Audio(this._audioListener);

            const start = () => {
                if (this._ambienceArmed) return;
                this._ambienceArmed = true;

                this._audioLoader.load(
                    AMBIENCE_URL,
                    (buffer) => {
                        this._ambience.setBuffer(buffer);
                        this._ambience.setLoop(true);
                        this._ambience.setVolume(0.35); // adjust if needed
                        this._ambience.play();
                        console.log('🔊 Ambience playing');
                    },
                    undefined,
                    (err) => console.warn('Ambience load error:', err)
                );

                window.removeEventListener('pointerdown', start);
                window.removeEventListener('keydown', start);
            };

            // required by browser autoplay policy
            window.addEventListener('pointerdown', start, { once: true });
            window.addEventListener('keydown', start, { once: true });
        } catch (e) {
            console.warn('Audio setup failed:', e);
        }
    }

    async setupSkybox() {
        // Remove existing skybox if any
        if (this.skybox) {
            this.scene.remove(this.skybox);
        }

        // Remove any existing celestial bodies
        this.scene.children = this.scene.children.filter(child => 
            !child.isPoints && // Remove stars
            !(child.isMesh && (child.material?.emissive || child.material?.emissiveIntensity > 0)) // Remove sun/moon
        );

        const difficulty = this.gameManager.currentDifficulty;
        
        switch(difficulty) {
            case 'easy':
                await this.createEveningSkybox();
                break;
            case 'medium':
                await this.createNightSkybox();
                break;
            case 'hard':
                await this.createDarkSkybox();
                break;
            default:
                await this.createEveningSkybox();
        }

        // Debug: Log camera position to help with positioning
        if (this.camera) {
            console.log('📷 Camera position:', this.camera.position);
            console.log('📷 Camera rotation:', this.camera.rotation);
        }
    }

    // Add a debug method to help visualize positions (optional)
    addDebugMarkers() {
        // Add a marker at world center
        const centerGeometry = new THREE.SphereGeometry(5, 16, 16);
        const centerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const centerMarker = new THREE.Mesh(centerGeometry, centerMaterial);
        this.scene.add(centerMarker);

        // Add marker at camera start position
        const cameraStartGeometry = new THREE.SphereGeometry(3, 16, 16);
        const cameraStartMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cameraStartMarker = new THREE.Mesh(cameraStartGeometry, cameraStartMaterial);
        cameraStartMarker.position.set(0, 1.2, 0); // Camera start position
        this.scene.add(cameraStartMarker);
    }

    async createEveningSkybox() {
        // Evening skybox - semi-dark with visible sun
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        
        // Create evening colors (deep orange/purple gradient)
        const eveningColors = [
            new THREE.Color(0x4a235a), // Top - deep purple
            new THREE.Color(0x4a235a), // Bottom - deep purple  
            new THREE.Color(0xe67e22), // Front - orange
            new THREE.Color(0xe67e22), // Back - orange
            new THREE.Color(0x8e44ad), // Right - purple
            new THREE.Color(0x8e44ad)  // Left - purple
        ];

        const materials = eveningColors.map(color => 
            new THREE.MeshBasicMaterial({ 
                color: color,
                side: THREE.BackSide
            })
        );

        this.skybox = new THREE.Mesh(skyboxGeometry, materials);
        this.scene.add(this.skybox);

        // Add visible sun
        this.createSun();

        // Add directional light for sun effect
        const sunLight = new THREE.DirectionalLight(0xffa500, 0.8);
        sunLight.position.set(50, 50, -50);
        this.scene.add(sunLight);

        // Add ambient light for evening
        const eveningAmbient = new THREE.AmbientLight(0x333366, 0.4);
        this.scene.add(eveningAmbient);

        console.log('🌅 Evening skybox with visible sun loaded for Easy difficulty');
    }

    async createNightSkybox() {
        // Night skybox with visible moon and stars
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        
        // Create night colors (deep blue/black)
        const nightColors = [
            new THREE.Color(0x0a0a2a), // Top - very dark blue
            new THREE.Color(0x1a1a3a), // Bottom - slightly lighter
            new THREE.Color(0x1a1a3a), // Front
            new THREE.Color(0x1a1a3a), // Back
            new THREE.Color(0x1a1a3a), // Right
            new THREE.Color(0x1a1a3a)  // Left
        ];

        const materials = nightColors.map(color => 
            new THREE.MeshBasicMaterial({ 
                color: color,
                side: THREE.BackSide
            })
        );

        this.skybox = new THREE.Mesh(skyboxGeometry, materials);
        this.scene.add(this.skybox);

        // Add visible moon
        this.createMoon();
        
        // Add stars
        this.createStars(500); // More stars for medium difficulty

        // Add directional light for moon effect
        const moonLight = new THREE.DirectionalLight(0xaaaaff, 0.5);
        moonLight.position.set(-30, 40, 30);
        this.scene.add(moonLight);

        // Add ambient light for night
        const nightAmbient = new THREE.AmbientLight(0x222244, 0.3);
        this.scene.add(nightAmbient);

        console.log('🌙 Night skybox with moon and stars loaded for Medium difficulty');
    }

    async createDarkSkybox() {
        // Very dark skybox - minimal light with lots of stars
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        
        // Create very dark colors (almost black)
        const darkColors = [
            new THREE.Color(0x050510), // Top - near black
            new THREE.Color(0x080818), // Bottom
            new THREE.Color(0x080818), // Front
            new THREE.Color(0x080818), // Back
            new THREE.Color(0x080818), // Right
            new THREE.Color(0x080818)  // Left
        ];

        const materials = darkColors.map(color => 
            new THREE.MeshBasicMaterial({ 
                color: color,
                side: THREE.BackSide
            })
        );

        this.skybox = new THREE.Mesh(skyboxGeometry, materials);
        this.scene.add(this.skybox);

        // Add lots of stars for hard difficulty
        this.createStars(1500); // Many more stars for hard mode

        // Very minimal directional light (barely any)
        const starLight = new THREE.DirectionalLight(0x444466, 0.15);
        starLight.position.set(0, 50, 0);
        this.scene.add(starLight);

        // Very low ambient light
        const darkAmbient = new THREE.AmbientLight(0x111122, 0.08);
        this.scene.add(darkAmbient);

        console.log('🌌 Dark skybox with abundant stars loaded for Hard difficulty');
    }

    createSun() {
        // Create a visible sun in the sky - position it within view
        const sunGeometry = new THREE.SphereGeometry(25, 32, 32); // Larger size
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4500,
            emissive: 0xff4500,
            emissiveIntensity: 1.0, // Increased intensity
            fog: false // Important: disable fog for celestial bodies
        });
        
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        // Position in the upper part of the sky, visible from spawn
        sun.position.set(150, 100, 150); 
        this.scene.add(sun);
        
        // Add sun glow effect
        const sunGlowGeometry = new THREE.SphereGeometry(35, 32, 32);
        const sunGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffa500,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide,
            fog: false
        });
        
        const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        sun.add(sunGlow);
        
        console.log('☀️ Sun created at position:', sun.position);
    }

    createMoon() {
        // Create a visible moon in the sky
        const moonGeometry = new THREE.SphereGeometry(20, 32, 32); // Larger size
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0x888888,
            emissiveIntensity: 0.6, // Increased intensity
            fog: false // Important: disable fog
        });
        
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        // Position in the upper part of the sky, opposite to sun
        moon.position.set(-150, 100, 150);
        this.scene.add(moon);
        
        // Add moon glow effect
        const moonGlowGeometry = new THREE.SphereGeometry(28, 32, 32);
        const moonGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaaaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
            fog: false
        });
        
        const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
        moon.add(moonGlow);
        
        console.log('🌙 Moon created at position:', moon.position);
    }

    createStars(starCount) {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2.0, // Larger size
            sizeAttenuation: false, // Stars don't get smaller with distance
            transparent: true,
            fog: false, // Important: disable fog for stars
            blending: THREE.AdditiveBlending // Makes stars brighter against dark backgrounds
        });

        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            // Position stars on the inner surface of the skybox
            const radius = 480; // Just inside the skybox
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Random sizes - make some stars brighter/larger
            sizes[i] = 1.0 + Math.random() * 3.0;

            // Random colors with more variation
            const starColor = new THREE.Color();
            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                starColor.set(0xffffff); // White stars
            } else if (colorChoice < 0.8) {
                starColor.set(0xaaaaff); // Blue stars
            } else if (colorChoice < 0.9) {
                starColor.set(0xffffaa); // Yellow stars
            } else {
                starColor.set(0xffaaaa); // Red stars
            }

            // Add some brightness variation
            const brightness = 0.7 + Math.random() * 0.3;
            starColor.multiplyScalar(brightness);

            colors[i * 3] = starColor.r;
            colors[i * 3 + 1] = starColor.g;
            colors[i * 3 + 2] = starColor.b;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        starsMaterial.vertexColors = true;

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);

        console.log(`✨ Created ${starCount} stars with enhanced visibility`);
    }

    populateGameWorld(mazeData) {
        this.spawnEnemies(mazeData);
        this.spawnItems(mazeData);
        this.setupPortal(mazeData);
    }

    async spawnEnemies(mazeData) {
        const { Enemy } = await import('../entities/Enemy.js');
        const enemyTypes = this.getEnemyTypesForDifficulty();
        const availableSpots = this.findAvailableSpots(mazeData);
        this.shuffleArray(availableSpots);
        
        let spotIndex = 0;
        Object.entries(enemyTypes).forEach(([enemyType, count]) => {
            for (let i = 0; i < count && spotIndex < availableSpots.length; i++) {
                const spot = availableSpots[spotIndex++];
                const position = new THREE.Vector3(
                    spot.x - mazeData.size/2,
                    0.5,
                    spot.z - mazeData.size/2
                );
                const enemy = new Enemy(this.scene, this.world, enemyType, this.gameManager.currentDifficulty, position);
                this.enemies.push(enemy);
            }
        });
        console.log(`Spawned ${this.enemies.length} enemies`);
    }

    async spawnItems(mazeData) {
        const { Item } = await import('../entities/Item.js');
        const itemTypes = ['flashlight', 'trenchcoat', 'carrot', 'note'];
        const availableSpots = this.findAvailableSpots(mazeData);
        this.shuffleArray(availableSpots);
        
        itemTypes.forEach((itemType, index) => {
            if (index < availableSpots.length) {
                const spot = availableSpots[index];
                const position = new THREE.Vector3(
                    spot.x - mazeData.size/2,
                    0.2,
                    spot.z - mazeData.size/2
                );
                const item = new Item(this.scene, itemType, position);
                this.items.push(item);
            }
        });
        console.log(`Spawned ${this.items.length} items`);
    }

    setupPortal(mazeData) {
        const portalGeometry = new THREE.CylinderGeometry(1, 1, 3, 16);
        const portalMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.7 });
        
        this.portal = new THREE.Mesh(portalGeometry, portalMaterial);
        this.portal.position.set(mazeData.end.x - mazeData.size/2, 1.5, mazeData.end.z - mazeData.size/2);
        this.portal.userData = { isPortal: true };
        this.scene.add(this.portal);
        
        const portalLight = new THREE.PointLight(0x888888, 2, 10);
        portalLight.position.copy(this.portal.position);
        this.scene.add(portalLight);
        
        const portalBodyDesc = RAPIER.RigidBodyDesc.fixed();
        const portalBody = this.world.createRigidBody(portalBodyDesc);
        portalBody.setTranslation(this.portal.position);
        const portalCollider = RAPIER.ColliderDesc.cylinder(1.5, 1);
        portalCollider.setSensor(true);
        this.world.createCollider(portalCollider, portalBody);
    }

    // 📝 Interact-to-read notes; other items keep original behavior
    checkItemCollection() {
        if (!this.player || !this.player.mesh) return;

        // Reset prompt each frame; it will re-appear when near a note
        this.currentNoteTarget = null;
        if (this.noteUI.prompt) this.noteUI.prompt.style.display = 'none';

        this.items = this.items.filter(item => {
            if (!item || item.isCollected) return false;

            const near = item.isNearPlayer(this.player.mesh.position);

            // Handle notes interactively
            if (item.type === 'note') {
                if (near) {
                    this.currentNoteTarget = item;
                    if (this.noteUI.prompt) this.noteUI.prompt.style.display = 'block';
                }
                return true; // keep note in world until read
            }

            // Original behavior for everything else
            if (near) {
                const collectedItem = item.collect();
                if (collectedItem && this.gameManager.addToInventory(collectedItem)) {
                    // mark flashlight ownership so Player can toggle with F
                    if (collectedItem.type === 'flashlight') {
                        this.player.hasFlashlight = true;
                        this.gameManager.hasFlashlight = true;
                    }
                    return false; // remove from world
                }
            }
            return true;
        });
    }

    checkEnemyAttacks() {
        if (!this.player || !this.player.mesh) return;
        this.enemies.forEach(enemy => {
            if (enemy.isAlive && enemy.isInAttackRange(this.player.mesh.position)) {
                enemy.attack(this.player);
            }
        });
    }

    checkTrapCollisions() {
        if (!this.player || !this.player.mesh) return;
        const playerPos = this.player.mesh.position;
        this.mazeRenderer.walls.forEach(wall => {
            if (wall.userData && wall.userData.isTrap && !wall.userData.triggered) {
                const distance = playerPos.distanceTo(wall.position);
                if (distance < 0.8) {
                    this.triggerTrap(wall);
                    if (this.player.body) {
                        const currentVel = this.player.body.linvel();
                        this.player.body.setLinvel({ x: currentVel.x, y: 2, z: currentVel.z }, true);
                    }
                }
            }
        });
    }

    triggerTrap(trap) {
        if (trap.userData.triggered) return;
        trap.userData.triggered = true;
        const damage = trap.userData.damage;
        console.log(`💥 Trap triggered! Damage: ${damage}`);
        if (this.player) this.player.takeDamage(damage);
        trap.material.color.set(0xffff00);
        setTimeout(() => {
            trap.material.color.set(0xff0000);
            trap.userData.triggered = false;
        }, 2000);
    }

    checkPortalWin() {
        if (this.hasWon || !this.player || !this.player.mesh || !this.portal) return;
        const distance = this.player.mesh.position.distanceTo(this.portal.position);
        if (distance < 2.0) {
            this.winGame();
        }
    }

    winGame() {
        if (this.hasWon) return;
        this.hasWon = true;

        console.log('🎉 Player reached the portal! Level completed!');
        this.gameManager.winGame();
        
        setTimeout(() => {
            alert('Congratulations! You escaped the maze!');
            this.gameManager.sceneManager.switchToScene('menu');
        }, 1000);
    }

    getEnemyTypesForDifficulty() {
        const difficulty = this.gameManager.currentDifficulty;
        const enemyPools = {
            easy: { 'spider': 2, 'rat': 1 },
            medium: { 'spider': 3, 'rat': 2, 'glowing_spider': 1 },
            hard: { 'spider': 4, 'rat': 3, 'zombie': 2, 'glowing_rat': 1, 'glowing_human': 1 }
        };
        return enemyPools[difficulty] || enemyPools.easy;
    }

    findAvailableSpots(mazeData) {
        const spots = [];
        for (let z = 0; z < mazeData.grid.length; z++) {
            for (let x = 0; x < mazeData.grid[z].length; x++) {
                if (mazeData.grid[z][x] === 0 &&
                    !(x === mazeData.start.x && z === mazeData.start.z) &&
                    !(x === mazeData.end.x && z === mazeData.end.z)) {
                    spots.push({ x, z });
                }
            }
        }
        return spots;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    setupPhysics() {
        const gravity = { x: 0.0, y: -9.81, z: 0.0 };
        this.world = new RAPIER.World(gravity);
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0x444444, 0.4);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        const creepyLight = new THREE.PointLight(0x8b0000, 0.5, 20);
        creepyLight.position.set(10, 5, 10);
        this.scene.add(creepyLight);
    }

    setupFlashlightEffect() {
        // --- UPDATED: stronger, wider, shadow-casting spotlight attached to camera ---
        this.flashlight = new THREE.SpotLight(0xffffee, /*intensity*/ 8, /*distance*/ 40, /*angle*/ Math.PI / 3, /*penumbra*/ 0.25, /*decay*/ 1);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.set(1024, 1024);
        this.flashlight.shadow.bias = -0.0001;

        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.flashlight.visible = false;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);

        // --- ADD: gentle fill so the floor/walls right by you brighten up ---
        this.flashFill = new THREE.PointLight(0xffffcc, 0.6, 6, 1); // small radius, subtle
        this.flashFill.visible = false;
        this.camera.add(this.flashFill);
    }

    update() {
        const deltaTime = this.clock.getDelta();
        // Don't update game logic if player is dead
        if (this.gameManager?.isPlayerDead) {
            return;
        }
        if (this.world) this.world.step();
        if (this.player) {
            this.player.update(deltaTime);
            if (this.fogOfWar && this.player.mesh) {
                const discoveredAreas = this.fogOfWar.update(this.player.mesh.position);
                if (this.hud) this.hud.updateDiscoveredAreas(discoveredAreas);
            }
            this.checkItemCollection();
            this.checkEnemyAttacks();
            this.checkTrapCollisions();
            this.checkPortalWin();
        }

        // --- sync light visibility + relax fog while flashlight is ON ---
        const lit = !!(this.gameManager && this.gameManager.flashlightActive);
        if (this.flashlight) this.flashlight.visible = lit;
        if (this.flashFill) this.flashFill.visible = lit;

        if (this.scene && this.scene.fog) {
            if (lit) {
                this.scene.fog.near = 0.5;
                this.scene.fog.far  = 25;  // farther so the light actually reveals distance
            } else {
                this.scene.fog.near = this._baseFog.near;
                this.scene.fog.far  = this._baseFog.far;
            }
        }

        this.enemies.forEach(enemy => { if (enemy.isAlive && this.player) enemy.update(deltaTime, this.player.mesh.position); });
        this.items.forEach(item => item.update(deltaTime));
        this.gameManager.update(deltaTime);
        if (this.hud) this.hud.update();
    }

    getCamera() {
        return this.camera;
    }

    cleanup() {
    // Reset game state
    if (this.gameManager) {
        this.gameManager.resetPlayerData();
        this.gameManager.gameState = 'menu';
        this.gameManager.isPlayerDead = false;
        this.gameManager.flashlightActive = false;
        this.gameManager.hasFlashlight = false;
    }
    
    // Clean up HUD
    if (this.hud) this.hud.cleanup();
    
    // Clean up fog of war
    if (this.fogOfWar) this.fogOfWar.clear();
    
    // Clean up note UI
    if (this.noteUI.overlay) {
        this.noteUI.overlay.style.display = 'none';
    }
    if (this.noteUI.prompt) {
        this.noteUI.prompt.style.display = 'none';
    }
    
    // Clear arrays
    this.enemies = [];
    this.items = [];
    this.traps = [];
    
    console.log('GameScene cleanup complete - ready for fresh start');
}

    // =========================
    // 📝 Note UI helpers
    // =========================
    _buildNoteUI() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.9)';
        overlay.style.color = '#e5e5e5';
        overlay.style.display = 'none';
        overlay.style.zIndex = '9999';
        overlay.style.padding = '4rem 2rem';
        overlay.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        overlay.style.lineHeight = '1.6';
        overlay.style.backdropFilter = 'blur(2px)';
        overlay.style.overflow = 'auto';

        // Content container
        const panel = document.createElement('div');
        panel.style.maxWidth = '800px';
        panel.style.margin = '0 auto';
        panel.style.border = '1px solid #333';
        panel.style.borderRadius = '12px';
        panel.style.padding = '2rem';
        panel.style.background = 'rgba(20,20,20,0.85)';
        panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';

        // Title
        const h = document.createElement('h2');
        h.textContent = 'Found Note';
        h.style.margin = '0 0 1rem 0';
        h.style.fontWeight = '700';

        // Text
        const text = document.createElement('div');
        text.style.whiteSpace = 'pre-wrap';
        text.style.fontSize = '1.05rem';

        // Close
        const close = document.createElement('button');
        close.textContent = 'Close (Esc)';
        close.style.marginTop = '1.5rem';
        close.style.padding = '0.6rem 1rem';
        close.style.borderRadius = '8px';
        close.style.border = '1px solid #444';
        close.style.background = '#1e1e1e';
        close.style.color = '#ddd';
        close.style.cursor = 'pointer';
        close.addEventListener('click', () => this._closeNote());

        panel.appendChild(h);
        panel.appendChild(text);
        panel.appendChild(close);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // Prompt (bottom-center)
        const prompt = document.createElement('div');
        prompt.textContent = 'Press E to read';
        prompt.style.position = 'fixed';
        prompt.style.left = '50%';
        prompt.style.transform = 'translateX(-50%)';
        prompt.style.bottom = '48px';
        prompt.style.padding = '8px 12px';
        prompt.style.background = 'rgba(0,0,0,0.6)';
        prompt.style.color = '#ddd';
        prompt.style.border = '1px solid #444';
        prompt.style.borderRadius = '8px';
        prompt.style.fontSize = '14px';
        prompt.style.zIndex = '9998';
        prompt.style.display = 'none';
        document.body.appendChild(prompt);

        this.noteUI.overlay = overlay;
        this.noteUI.text = text;
        this.noteUI.prompt = prompt;
        this.noteUI.isOpen = false;
    }

    _bindNoteInput() {
        // Interact (E)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'e' || e.key === 'E') {
                if (this.currentNoteTarget && !this.noteUI.isOpen) {
                    // Try to grab text from the note item if it has one
                    const t =
                        this.currentNoteTarget.text ||
                        (this.currentNoteTarget.userData && this.currentNoteTarget.userData.text) ||
                        (this.currentNoteTarget.noteText) ||
                        'The ink is smeared, but one line remains: "The maze was never underground at all."';

                    // Collect it (so your inventory still gets the note)
                    const collected = this.currentNoteTarget.collect
                        ? this.currentNoteTarget.collect()
                        : { type: 'note', text: t };

                    if (collected && this.gameManager.addToInventory(collected)) {
                        this.currentNoteTarget.isCollected = true; // remove next tick
                    }

                    this._openNote(t);
                }
            }
            // Close (Esc)
            if (e.key === 'Escape') {
                if (this.noteUI.isOpen) this._closeNote();
            }
        });
    }

    _openNote(text) {
        if (!this.noteUI.overlay) return;
        this.noteUI.text.textContent = text || '';
        this.noteUI.overlay.style.display = 'block';
        this.noteUI.isOpen = true;

        // Hide prompt while open
        if (this.noteUI.prompt) this.noteUI.prompt.style.display = 'none';
    }

    _closeNote() {
        if (!this.noteUI.overlay) return;
        this.noteUI.overlay.style.display = 'none';
        this.noteUI.isOpen = false;
    }
}


// import * as THREE from 'three';
// import RAPIER from "@dimforge/rapier3d-compat";
// import { Player } from '../entities/Player.js';
// import { MazeGenerator } from '../maze/MazeGenerator.js';
// import { MazeRenderer } from '../maze/MazeRenderer.js';
// import { HUD } from '../ui/HUD.js';
// import { FogOfWar } from '../utils/FogOfWar.js';

// export class GameScene {
//     constructor() {
//         this.scene = null;
//         this.gameManager = null;
//         this.uiManager = null;
//         this.player = null;
//         this.mazeGenerator = null;
//         this.mazeRenderer = null;
//         this.hud = null;
//         this.world = null;
//         this.clock = new THREE.Clock();
//         this.camera = null;
//         this.renderer = null;
//         this.fogOfWar = null;
//         this.mazeData = null; // Add this line
//         this.fogOfWar = null; //add fog
//         //enemies +items
//         this.enemies = [];
//         this.items = [];
//         this.traps = [];
//         this.portal = null;
//     }
    
//     // In GameScene.init method
//     async init(gameManager, uiManager, renderer = null) {
//         this.gameManager = gameManager;
//         this.uiManager = uiManager;
//         this.renderer = renderer;
        
//         // Create scene
//         this.scene = new THREE.Scene();
//         this.scene.background = new THREE.Color(0x0a0a0a);
//         this.scene.fog = new THREE.Fog(0x0a0a0a, 1, 5);
        
//         // Create camera
//         this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//         this.camera.position.set(0, 1.2, 0);
//         this.scene.camera = this.camera;
        
//         // Setup physics world
//         this.setupPhysics();
        
//         // Setup lighting
//         this.setupLighting();
        
//         // Generate maze
//         this.mazeGenerator = new MazeGenerator(this.gameManager.currentDifficulty);
//         const mazeData = this.mazeGenerator.generate();
//         this.mazeData = mazeData; // Store maze data
        
//         // Render maze - PASS DIFFICULTY
//         this.mazeRenderer = new MazeRenderer(this.scene, this.world);
//         this.mazeRenderer.render(mazeData, this.gameManager.currentDifficulty); // Add difficulty here
        
//         // Create fog of war - PASS GAMEMANAGER
//         this.fogOfWar = new FogOfWar(this.scene, mazeData, this.gameManager);
        
//         // POPULATE WITH ENEMIES AND ITEMS
//         this.populateGameWorld(mazeData);

//         // Setup flashlight effect
//         this.setupFlashlightEffect();
        
//         // Create player
//         this.player = new Player(this.scene, this.world, this.gameManager, this.renderer);
//         this.player.spawn();
        
//         // Setup HUD
//         this.hud = new HUD(this.gameManager);
//         this.hud.create();
        
//         // PASS MAZE DATA TO HUD - Add this line
//         this.hud.setMazeData(this.mazeData);
        
//         // Start game loop
//         this.clock.start();
        
//         console.log('GameScene initialized with enemies and items');
//     }

//     // pop enimeies+items
//     populateGameWorld(mazeData) {
//         this.spawnEnemies(mazeData);
//         this.spawnItems(mazeData);
//         this.setupPortal(mazeData);
//     }

//     //////////eniemie+item methods/////

//     async spawnEnemies(mazeData) {
//         const { Enemy } = await import('../entities/Enemy.js');
//         const enemyTypes = this.getEnemyTypesForDifficulty();
//         const availableSpots = this.findAvailableSpots(mazeData);
        
//         this.shuffleArray(availableSpots);
        
//         let spotIndex = 0;
//         Object.entries(enemyTypes).forEach(([enemyType, count]) => {
//             for (let i = 0; i < count && spotIndex < availableSpots.length; i++) {
//                 const spot = availableSpots[spotIndex++];
//                 const position = new THREE.Vector3(
//                     spot.x - mazeData.size/2,
//                     0.5,
//                     spot.z - mazeData.size/2
//                 );
                
//                 const enemy = new Enemy(
//                     this.scene, 
//                     this.world, 
//                     enemyType, 
//                     this.gameManager.currentDifficulty,
//                     position
//                 );
//                 this.enemies.push(enemy);
//             }
//         });
        
//         console.log(`Spawned ${this.enemies.length} enemies`);
//     }

//     async spawnItems(mazeData) {
//         const { Item } = await import('../entities/Item.js');
//         const itemTypes = ['flashlight', 'trenchcoat', 'carrot', 'note'];
//         const availableSpots = this.findAvailableSpots(mazeData);
        
//         this.shuffleArray(availableSpots);
        
//         itemTypes.forEach((itemType, index) => {
//             if (index < availableSpots.length) {
//                 const spot = availableSpots[index];
//                 const position = new THREE.Vector3(
//                     spot.x - mazeData.size/2,
//                     0.2,
//                     spot.z - mazeData.size/2
//                 );
                
//                 const item = new Item(this.scene, itemType, position);
//                 this.items.push(item);
//             }
//         });
        
//         console.log(`Spawned ${this.items.length} items`);
//     }

//     setupPortal(mazeData) {
//         // Win condition portal
//         const portalGeometry = new THREE.CylinderGeometry(1, 1, 3, 16);
//         const portalMaterial = new THREE.MeshBasicMaterial({ 
//             color: 0x888888,
//             transparent: true,
//             opacity: 0.7
//         });
        
//         this.portal = new THREE.Mesh(portalGeometry, portalMaterial);
//         this.portal.position.set(
//             mazeData.end.x - mazeData.size/2,
//             1.5,
//             mazeData.end.z - mazeData.size/2
//         );
//         this.portal.userData = { isPortal: true };
//         this.scene.add(this.portal);
        
//         // Portal light
//         const portalLight = new THREE.PointLight(0x888888, 2, 10);
//         portalLight.position.copy(this.portal.position);
//         this.scene.add(portalLight);
        
//         // Portal physics (sensor)
//         const portalBodyDesc = RAPIER.RigidBodyDesc.fixed();
//         const portalBody = this.world.createRigidBody(portalBodyDesc);
//         portalBody.setTranslation(this.portal.position);
//         const portalCollider = RAPIER.ColliderDesc.cylinder(1.5, 1);
//         portalCollider.setSensor(true);
//         this.world.createCollider(portalCollider, portalBody);
//     }



//     // Add helper methods for GameScene
//     checkItemCollection() {
//         if (!this.player || !this.player.mesh) return;
        
//         this.items = this.items.filter(item => {
//             if (item.isNearPlayer(this.player.mesh.position) && !item.isCollected) {
//                 const collectedItem = item.collect();
//                 if (collectedItem && this.gameManager.addToInventory(collectedItem)) {
//                     console.log(`🎒 Added ${collectedItem.type} to inventory`);
//                     return false; // Remove from array
//                 }
//             }
//             return true; // Keep in array
//         });
//     }

//     checkEnemyAttacks() {
//         if (!this.player || !this.player.mesh) return;
        
//         this.enemies.forEach(enemy => {
//             if (enemy.isAlive && enemy.isInAttackRange(this.player.mesh.position)) {
//                 enemy.attack(this.player);
//             }
//         });
//     }

// checkTrapCollisions() {
//     if (!this.player || !this.player.mesh) return;
    
//     const playerPos = this.player.mesh.position;
//     let trapTriggered = false;
    
//     // Check all walls for traps
//     this.mazeRenderer.walls.forEach(wall => {
//         if (wall.userData && wall.userData.isTrap && !wall.userData.triggered) {
//             const distance = playerPos.distanceTo(wall.position);
            
//             if (distance < 0.8) { // Trap trigger distance
//                 this.triggerTrap(wall);
//                 trapTriggered = true;
                
//                 // ADD: Small knockback effect but DON'T interfere with movement
//                 if (this.player.body) {
//                     const currentVel = this.player.body.linvel();
//                     // Only apply slight vertical knockback, preserve horizontal movement
//                     this.player.body.setLinvel({
//                         x: currentVel.x,  // Keep current horizontal velocity
//                         y: 2,             // Small upward knockback
//                         z: currentVel.z   // Keep current horizontal velocity
//                     }, true);
//                 }
//             }
//         }
//     });
// }

// triggerTrap(trap) {
//     if (trap.userData.triggered) return;
    
//     trap.userData.triggered = true;
//     const damage = trap.userData.damage;
    
//     console.log(`💥 Trap triggered! Damage: ${damage}`);
    
//     // Apply damage to player WITHOUT affecting movement
//     if (this.player) {
//         this.player.takeDamage(damage);
//     }
    
//     // Visual feedback
//     trap.material.color.set(0xffff00);
    
//     // Reset after cooldown
//     setTimeout(() => {
//         trap.material.color.set(0xff0000);
//         trap.userData.triggered = false;
//     }, 2000);
// }

//     checkPortalWin() {
//         if (!this.player || !this.player.mesh || !this.portal) return;
        
//         const distance = this.player.mesh.position.distanceTo(this.portal.position);
//         if (distance < 2.0) {
//             this.winGame();
//         }
//     }

//     winGame() {
//         console.log('🎉 Player reached the portal! Level completed!');
//         this.gameManager.winGame();
        
//         // Show win message
//         setTimeout(() => {
//             alert('Congratulations! You escaped the maze!');
//             this.gameManager.sceneManager.switchToScene('menu');
//         }, 1000);
//     }

//     // Helper methods
//     getEnemyTypesForDifficulty() {
//         const difficulty = this.gameManager.currentDifficulty;
//         const enemyPools = {
//             easy: { 'spider': 2, 'rat': 1 },
//             medium: { 'spider': 3, 'rat': 2, 'glowing_spider': 1 },
//             hard: { 'spider': 4, 'rat': 3, 'zombie': 2, 'glowing_rat': 1, 'glowing_human': 1 }
//         };
//         return enemyPools[difficulty] || enemyPools.easy;
//     }

//     findAvailableSpots(mazeData) {
//         const spots = [];
//         for (let z = 0; z < mazeData.grid.length; z++) {
//             for (let x = 0; x < mazeData.grid[z].length; x++) {
//                 if (mazeData.grid[z][x] === 0 && 
//                     !(x === mazeData.start.x && z === mazeData.start.z) &&
//                     !(x === mazeData.end.x && z === mazeData.end.z)) {
//                     spots.push({ x, z });
//                 }
//             }
//         }
//         return spots;
//     }

//     shuffleArray(array) {
//         for (let i = array.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             [array[i], array[j]] = [array[j], array[i]];
//         }
//     }

//     //////////eniemie+item methods/////


//     setupPhysics() {
//         const gravity = { x: 0.0, y: -9.81, z: 0.0 };
//         this.world = new RAPIER.World(gravity);
//     }
    
//     setupLighting() {
//         const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
//         this.scene.add(ambientLight);
        
//         const directionalLight = new THREE.DirectionalLight(0x444444, 0.4);
//         directionalLight.position.set(50, 50, 25);
//         directionalLight.castShadow = true;
//         this.scene.add(directionalLight);
        
//         const creepyLight = new THREE.PointLight(0x8b0000, 0.5, 20);
//         creepyLight.position.set(10, 5, 10);
//         this.scene.add(creepyLight);
//     }

//     setupFlashlightEffect() {
//         // Create a spotlight that follows the camera when flashlight is on
//         this.flashlight = new THREE.SpotLight(0xffffcc, 1, 15, Math.PI / 4, 0.5, 1);
//         this.flashlight.position.set(0, 0, 0);
//         this.flashlight.target.position.set(0, 0, -1);
//         this.flashlight.visible = false;
//         this.camera.add(this.flashlight);
//         this.camera.add(this.flashlight.target);
//     }

//      // Update method to handle enemies and items
//     update() {
//         const deltaTime = this.clock.getDelta();
        
//         // Update physics
//         if (this.world) {
//             this.world.step();
//         }
        
//         // Update player
//         if (this.player) {
//             this.player.update(deltaTime);
            
//             // Update fog of war
//             if (this.fogOfWar && this.player.mesh) {
//                 const discoveredAreas = this.fogOfWar.update(this.player.mesh.position);
                
//                 // PASS DISCOVERED AREAS TO HUD - Add this line
//                 if (this.hud) {
//                     this.hud.updateDiscoveredAreas(discoveredAreas);
//                 }
//             }
            
//             // Check for item collection
//             this.checkItemCollection();
            
//             // Check for enemy attacks
//             this.checkEnemyAttacks();
            
//             // Check for trap collisions
//             this.checkTrapCollisions();
            
//             // Check for portal win condition
//             this.checkPortalWin();
//         }
//          // Update flashlight visual
//         if (this.flashlight && this.gameManager) {
//             this.flashlight.visible = this.gameManager.flashlightActive;
//         }
        
//         // Update enemies
//         this.enemies.forEach(enemy => {
//             if (enemy.isAlive && this.player && this.player.mesh) {
//                 enemy.update(deltaTime, this.player.mesh.position);
//             }
//         });
        
//         // Update items
//         this.items.forEach(item => {
//             item.update(deltaTime);
//         });
        
//         // Update game manager
//         this.gameManager.update(deltaTime);
        
//         // Update HUD
//         if (this.hud) {
//             this.hud.update();
//         }
//     }
    
 
    
//     getCamera() {
//         return this.camera;
//     }
    
//     cleanup() {
//         if (this.hud) {
//             this.hud.cleanup();
//         }
//         if (this.fogOfWar) {
//             this.fogOfWar.clear();
//         }
//     }
// }