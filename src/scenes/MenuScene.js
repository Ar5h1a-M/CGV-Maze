import * as THREE from 'three';

export class MenuScene {
    constructor() {
        this.scene = null;
        this.gameManager = null;
        this.uiManager = null;
    }
    
    init(gameManager, uiManager) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        // Add ominous ambient lighting
        const ambientLight = new THREE.AmbientLight(0x222222);
        this.scene.add(ambientLight);
        
        // Add some creepy fog
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
        // Create menu UI
        this.createMenuUI();
    }
    
    createMenuUI() {
    // Remove any existing UI first
    this.cleanup();
    
    // Create menu container with data attribute for identification
    this.menuContainer = document.createElement('div');
    this.menuContainer.setAttribute('data-menu-element', 'main-menu');
    this.menuContainer.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #8b0000;
        font-family: 'Courier New', monospace;
    `;
    
    // Title
    const title = document.createElement('h1');
    title.setAttribute('data-menu-element', 'title');
    title.textContent = 'THE MAZE';
    title.style.cssText = `
        font-size: 3em;
        margin-bottom: 2em;
        text-shadow: 0 0 10px #ff0000;
        animation: pulse 2s infinite;
    `;
    
    // Start Game Button
    const startBtn = document.createElement('button');
    startBtn.setAttribute('data-menu-element', 'start-button');
    startBtn.textContent = 'START GAME';
    startBtn.onclick = () => this.showDifficultySelection();
    
    // Options Button
    const optionsBtn = document.createElement('button');
    optionsBtn.setAttribute('data-menu-element', 'options-button');
    optionsBtn.textContent = 'OPTIONS';
    optionsBtn.onclick = () => this.gameManager.sceneManager.switchToScene('options');
    
    // Login Button
    const loginBtn = document.createElement('button');
    loginBtn.setAttribute('data-menu-element', 'login-button');
    loginBtn.textContent = 'LOGIN';
    loginBtn.onclick = () => this.showLogin();
    
    // Style buttons
    [startBtn, optionsBtn, loginBtn].forEach(btn => {
        btn.style.cssText = `
            display: block;
            width: 200px;
            padding: 15px;
            margin: 10px auto;
            background: #2a0a0a;
            color: #8b0000;
            border: 2px solid #8b0000;
            font-size: 1.2em;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            transition: all 0.3s;
        `;
        btn.onmouseover = () => btn.style.background = '#3a1a1a';
        btn.onmouseout = () => btn.style.background = '#2a0a0a';
    });
    
    this.menuContainer.appendChild(title);
    this.menuContainer.appendChild(startBtn);
    this.menuContainer.appendChild(optionsBtn);
    this.menuContainer.appendChild(loginBtn);
    
    document.body.appendChild(this.menuContainer);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.setAttribute('data-menu-element', 'style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);
}
    
    showDifficultySelection() {
    // Clear existing content completely
    if (this.menuContainer) {
        this.menuContainer.innerHTML = '';
    } else {
        this.menuContainer = document.createElement('div');
        this.menuContainer.setAttribute('data-menu-element', 'difficulty-menu');
        this.menuContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #8b0000;
            font-family: 'Courier New', monospace;
        `;
        document.body.appendChild(this.menuContainer);
    }
    
    const title = document.createElement('h1');
    title.setAttribute('data-menu-element', 'difficulty-title');
    title.textContent = 'SELECT DIFFICULTY';
    title.style.cssText = `
        font-size: 2.5em;
        margin-bottom: 2em;
        text-shadow: 0 0 10px #ff0000;
    `;
    
    const difficulties = [
        { name: 'EASY', color: '#00ff00' },
        { name: 'MEDIUM', color: '#ffff00' },
        { name: 'HARD', color: '#ff0000' }
    ];
    
    difficulties.forEach(diff => {
        const btn = document.createElement('button');
        btn.setAttribute('data-menu-element', 'difficulty-button');
        btn.textContent = diff.name;
        btn.style.cssText = `
            display: block;
            width: 200px;
            padding: 15px;
            margin: 20px auto;
            background: #2a0a0a;
            color: ${diff.color};
            border: 2px solid ${diff.color};
            font-size: 1.5em;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            transition: all 0.3s;
        `;
        btn.onmouseover = () => btn.style.background = '#3a1a1a';
        btn.onmouseout = () => btn.style.background = '#2a0a0a';
        btn.onclick = () => {
            console.log(`Starting game with difficulty: ${diff.name.toLowerCase()}`);
            this.gameManager.startGame(diff.name.toLowerCase());
        };
        
        this.menuContainer.appendChild(btn);
    });
    
    const backBtn = document.createElement('button');
    backBtn.setAttribute('data-menu-element', 'back-button');
    backBtn.textContent = 'BACK';
    backBtn.onclick = () => {
        console.log('Returning to main menu from difficulty selection');
        this.createMenuUI(); // Recreate the main menu
    };
    backBtn.style.cssText = `
        display: block;
        width: 150px;
        padding: 10px;
        margin: 30px auto;
        background: #2a0a0a;
        color: #8b0000;
        border: 1px solid #8b0000;
        cursor: pointer;
        font-family: 'Courier New', monospace;
    `;
    
    this.menuContainer.appendChild(title);
    this.menuContainer.appendChild(backBtn);
}
    
    showLogin() {
        // Simple login form - will integrate with Supabase later
        this.menuContainer.innerHTML = '';
        
        const loginForm = document.createElement('div');
        loginForm.innerHTML = `
            <h2>LOGIN</h2>
            <input type="text" placeholder="Username" id="username" style="margin: 10px; padding: 5px;">
            <input type="password" placeholder="Password" id="password" style="margin: 10px; padding: 5px;">
            <br>
            <button id="loginBtn" style="margin: 10px; padding: 10px 20px;">LOGIN</button>
            <button id="backBtn" style="margin: 10px; padding: 10px 20px;">BACK</button>
        `;
        
        loginForm.querySelector('#loginBtn').onclick = () => this.handleLogin();
        loginForm.querySelector('#backBtn').onclick = () => this.createMenuUI();
        
        this.menuContainer.appendChild(loginForm);
    }
    
    handleLogin() {
        // Placeholder for Supabase integration
        console.log('Login functionality to be implemented with Supabase');
    }
    
    update() {
        // Menu animation updates can go here
    }
    
cleanup() {
    // Remove ALL menu UI elements, not just the main container
    const menuElements = document.querySelectorAll('[data-menu-element]');
    menuElements.forEach(element => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    // Also remove the main container if it exists
    if (this.menuContainer && this.menuContainer.parentNode) {
        document.body.removeChild(this.menuContainer);
    }
    
    this.menuContainer = null;
    
    console.log('MenuScene cleanup complete');
}
}