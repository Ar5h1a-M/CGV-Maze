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
    
    // Initialize new scene
    if (sceneName === 'game' && !this.scenes.game) {
        const { GameScene } = await import('../scenes/GameScene.js');
        this.scenes.game = new GameScene();
    }
    
    this.currentScene = this.scenes[sceneName];
    
    if (this.currentScene) {
        console.log(`🎬 Initializing scene: ${sceneName}`);
        if (sceneName === 'game') {
            await this.currentScene.init(this.gameManager, this.uiManager, this.renderer);
        } else {
            this.currentScene.init(this.gameManager, this.uiManager);
        }
        
        this.camera = this.currentScene.getCamera ? this.currentScene.getCamera() : null;
        this.animate();
    }
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
