import * as THREE from 'three';
import { MenuScene } from '../scenes/MenuScene.js';
import { OptionsScene } from '../scenes/OptionsScene.js';

export class SceneManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.currentScene = null;
        this.scenes = {};
        this.gameManager = null;
        this.uiManager = null;

        // ✅ NEW: Allow GameManager to call back to this SceneManager
        if (window) window.SceneManagerRef = this;

        this.camera = null;
        this.initScenes();
    }
    
    initScenes() {
        this.scenes.menu = new MenuScene();
        this.scenes.options = new OptionsScene();
        this.scenes.game = null;
    }
    
    setGameManager(gameManager) {
        this.gameManager = gameManager;
    }
    
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }
    
async switchToScene(sceneName) {
    console.log(`🔄 Switching to scene: ${sceneName}`);
    
    // Clean up current scene
    if (this.currentScene) {
        console.log(`🧹 Cleaning up current scene: ${this.currentScene.constructor.name}`);
        this.currentScene.cleanup?.();
    }
    
    // Initialize new scene with error handling
    if (sceneName === 'game' && !this.scenes.game) {
        try {
            // Add cache-busting parameter to force correct MIME type
            const timestamp = Date.now();
            const { GameScene } = await import(`../scenes/GameScene.js?t=${timestamp}`);
            this.scenes.game = new GameScene();
            console.log('✅ GameScene loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load GameScene (if you are on mobile, please witch to pc/laptop):', error);
            
            // Try alternative method with full URL
            try {
                console.log('🔄 Trying alternative import method...');
                const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
                const { GameScene } = await import(`${baseUrl}/src/scenes/GameScene.js`);
                this.scenes.game = new GameScene();
                console.log('✅ GameScene loaded successfully with absolute path');
            } catch (fallbackError) {
                console.error('❌ Fallback import also failed:', fallbackError);
                this.showLoadError();
                return;
            }
        }
    }
    
    this.currentScene = this.scenes[sceneName];
    
    if (this.currentScene) {
        console.log(`🎬 Initializing scene: ${sceneName}`);
        try {
            if (sceneName === 'game') {
                await this.currentScene.init(this.gameManager, this.uiManager, this.renderer);
            } else {
                this.currentScene.init(this.gameManager, this.uiManager);
            }
            
            this.camera = this.currentScene.getCamera ? this.currentScene.getCamera() : null;
            this.animate();
        } catch (error) {
            console.error(`❌ Failed to initialize scene ${sceneName}:`, error);
            this.showLoadError();
        }
    }
}
    
    showLoadError() {
        // Create a simple error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 20px;
            border: 2px solid red;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h2>Load Error</h2>
            <p>Failed to load game scene. Please refresh the page.</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">Refresh</button>
        `;
        document.body.appendChild(errorDiv);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.currentScene?.update) {
            this.currentScene.update();
        }
        
        const cameraToUse = this.currentScene?.getCamera ? this.currentScene.getCamera() : this.camera;
        
        if (this.currentScene?.scene && cameraToUse) {
            this.renderer.render(this.currentScene.scene, cameraToUse);
        }
    }
    
    onWindowResize() {
        const currentCamera = this.currentScene?.getCamera ? this.currentScene.getCamera() : this.camera;
        if (currentCamera) {
            currentCamera.aspect = window.innerWidth / window.innerHeight;
            currentCamera.updateProjectionMatrix();
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    getCurrentScene() {
        return this.currentScene;
    }
}
