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
        
        // Don't create a camera here - let each scene manage its own
        this.camera = null;
        
        // Initialize scenes
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
        if (this.currentScene) {
            this.currentScene.cleanup();
        }
        
        // Dynamically import GameScene if needed
        if (sceneName === 'game' && !this.scenes.game) {
            const { GameScene } = await import('../scenes/GameScene.js');
            this.scenes.game = new GameScene();
        }
        
        this.currentScene = this.scenes[sceneName];
        
        if (this.currentScene) {
            // Pass the renderer to GameScene for mouse control
            if (sceneName === 'game') {
                this.currentScene.init(this.gameManager, this.uiManager, this.renderer);
            } else {
                this.currentScene.init(this.gameManager, this.uiManager);
            }
            
            // Get the camera from the current scene
            this.camera = this.currentScene.getCamera ? this.currentScene.getCamera() : null;
            
            this.animate();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update();
        }
        
        // Use the current scene's camera if available, otherwise use the scene manager's camera
        const cameraToUse = this.currentScene?.getCamera ? this.currentScene.getCamera() : this.camera;
        
        if (this.currentScene && this.currentScene.scene && cameraToUse) {
            this.renderer.render(this.currentScene.scene, cameraToUse);
        }
    }
    
    onWindowResize() {
        // Update the current scene's camera if it exists
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