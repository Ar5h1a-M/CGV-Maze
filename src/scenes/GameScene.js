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
        this.mazeData = null; // Add this line
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
        this.mazeData = mazeData; // Store maze data
        
        // Render maze
        this.mazeRenderer = new MazeRenderer(this.scene, this.world);
        this.mazeRenderer.render(mazeData);
        
        // Create fog of war
        this.fogOfWar = new FogOfWar(this.scene, mazeData);
        
        // Create player
        this.player = new Player(this.scene, this.world, this.gameManager, this.renderer);
        this.player.spawn();
        
        // Setup HUD
        this.hud = new HUD(this.gameManager);
        this.hud.create();
        
        // PASS MAZE DATA TO HUD - Add this line
        this.hud.setMazeData(this.mazeData);
        
        // Start game loop
        this.clock.start();
        
        console.log('GameScene initialized with fog of war');
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
    
    update() {
        const deltaTime = this.clock.getDelta();
        
        // Update physics
        if (this.world) {
            this.world.step();
        }
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime);
            
            // Update fog of war based on player position
            if (this.fogOfWar && this.player.mesh) {
                const discoveredAreas = this.fogOfWar.update(this.player.mesh.position);
                
                // PASS DISCOVERED AREAS TO HUD - Add this line
                if (this.hud) {
                    this.hud.updateDiscoveredAreas(discoveredAreas);
                }
            }
        }
        
        // Update game manager
        this.gameManager.update(deltaTime);
        
        // Update HUD
        if (this.hud) {
            this.hud.update();
        }
    }
    
    getCamera() {
        return this.camera;
    }
    
    cleanup() {
        if (this.hud) {
            this.hud.cleanup();
        }
        if (this.fogOfWar) {
            this.fogOfWar.clear();
        }
    }
}