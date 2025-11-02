import * as THREE from 'three';
import { SceneManager } from './managers/SceneManager.js';
import { GameManager } from './managers/GameManager.js';
import { UIManager } from './managers/UIManager.js';

async function init() {
    console.log('Initializing game...');
    
    // Dynamically import RAPIER with proper initialization
    const RAPIER = await import('@dimforge/rapier3d-compat');
    
    // Try different initialization methods based on version
    if (typeof RAPIER.init === 'function') {
        await RAPIER.init();
        console.log('Rapier initialized with RAPIER.init()');
    } else if (typeof RAPIER.default === 'function') {
        await RAPIER.default();
        console.log('Rapier initialized with RAPIER.default()');
    } else {
        console.log('Rapier loaded, no initialization needed');
    }
    
    // Make RAPIER globally available so other files can use it
    window.RAPIER = RAPIER;
    
    console.log('Rapier physics initialized');
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);
    
    console.log('Renderer created and added to DOM');
    
    // Pass RAPIER to your managers if they need it
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