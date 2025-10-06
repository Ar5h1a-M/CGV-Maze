import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";
import { Player } from '../entities/Player.js';
import { MazeGenerator } from '../maze/MazeGenerator.js';
import { MazeRenderer } from '../maze/MazeRenderer.js';
import { HUD } from '../ui/HUD.js';
import { FogOfWar } from '../utils/FogOfWar.js';

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
        this.hasWon = false; // <-- ADD: Win flag
    }
    
    async init(gameManager, uiManager, renderer = null) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        this.renderer = renderer;
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 1, 5);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.2, 0);
        this.scene.camera = this.camera;
        
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
        
        // Player
        this.player = new Player(this.scene, this.world, this.gameManager, this.renderer);
        this.player.spawn();
        
        // HUD
        this.hud = new HUD(this.gameManager);
        this.hud.create();
        this.hud.setMazeData(this.mazeData);
        
        // Start clock
        this.clock.start();
        console.log('GameScene initialized with enemies and items');
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

    checkItemCollection() {
        if (!this.player || !this.player.mesh) return;
        this.items = this.items.filter(item => {
            if (item.isNearPlayer(this.player.mesh.position) && !item.isCollected) {
                const collectedItem = item.collect();
                if (collectedItem && this.gameManager.addToInventory(collectedItem)) {
                    console.log(`🎒 Added ${collectedItem.type} to inventory`);
                    return false;
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
        if (this.hasWon) return; // <-- PREVENT multiple calls
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
        this.flashlight = new THREE.SpotLight(0xffffcc, 1, 15, Math.PI / 4, 0.5, 1);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.flashlight.visible = false;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
    }

    update() {
        const deltaTime = this.clock.getDelta();
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
            this.checkPortalWin(); // <-- Only triggers once now
        }
        if (this.flashlight && this.gameManager) this.flashlight.visible = this.gameManager.flashlightActive;
        this.enemies.forEach(enemy => { if (enemy.isAlive && this.player) enemy.update(deltaTime, this.player.mesh.position); });
        this.items.forEach(item => item.update(deltaTime));
        this.gameManager.update(deltaTime);
        if (this.hud) this.hud.update();
    }

    getCamera() {
        return this.camera;
    }

    cleanup() {
        if (this.hud) this.hud.cleanup();
        if (this.fogOfWar) this.fogOfWar.clear();
    }
}
