import * as THREE from 'three';

export class OptionsScene {
    constructor() {
        this.scene = null;
        this.gameManager = null;
        this.uiManager = null;
    }

    init(gameManager, uiManager) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        this.createOptionsUI();
    }

    createOptionsUI() {
        // Remove any existing UI
        this.uiManager.clearUI();

        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #8b0000;
            font-family: 'Courier New', monospace;
        `;

        const title = document.createElement('h1');
        title.textContent = 'OPTIONS';
        title.style.cssText = `
            font-size: 3em;
            margin-bottom: 2em;
            text-shadow: 0 0 10px #ff0000;
        `;

        const backBtn = document.createElement('button');
        backBtn.textContent = 'BACK TO MENU';
        backBtn.style.cssText = `
            display: block;
            width: 200px;
            padding: 15px;
            margin: 20px auto;
            background: #2a0a0a;
            color: #8b0000;
            border: 2px solid #8b0000;
            font-size: 1.2em;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            transition: all 0.3s;
        `;
        backBtn.onmouseover = () => backBtn.style.background = '#3a1a1a';
        backBtn.onmouseout = () => backBtn.style.background = '#2a0a0a';
        backBtn.onclick = () => this.gameManager.sceneManager.switchToScene('menu');

        optionsContainer.appendChild(title);
        optionsContainer.appendChild(backBtn);
        document.body.appendChild(optionsContainer);
        this.optionsContainer = optionsContainer;
    }

    update() {
        // Options scene doesn't need animation
    }

    cleanup() {
        if (this.optionsContainer) {
            document.body.removeChild(this.optionsContainer);
        }
    }
}