import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";
import { SceneManager } from './managers/SceneManager.js';
import { GameManager } from './managers/GameManager.js';
import { UIManager } from './managers/UIManager.js';

async function init() {
    console.log('Initializing game...');
    
    // Initialize Rapier physics
    await RAPIER.init();
    console.log('Rapier physics initialized');
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Better color handling
    document.body.appendChild(renderer.domElement);
    
    console.log('Renderer created and added to DOM');
    
    // Initialize managers
    const gameManager = new GameManager();
    const sceneManager = new SceneManager(renderer);
    const uiManager = new UIManager();
    
    // Set up managers
    sceneManager.setGameManager(gameManager);
    sceneManager.setUIManager(uiManager);
    gameManager.setSceneManager(sceneManager);
    
    // Start with menu scene
    sceneManager.switchToScene('menu');
    
    // Handle window resize
    window.addEventListener('resize', () => {
        sceneManager.onWindowResize();
    });
    
    console.log('Game initialization complete');
}

// Start the application
init().catch(console.error);