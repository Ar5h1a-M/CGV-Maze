export class HUD {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.container = null;
        this.healthBar = null;
        this.staminaBar = null;
        this.minimap = null;
    }

    create() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            font-family: 'Courier New', monospace;
            color: white;
        `;

        this.createHealthBar();
        this.createStaminaBar();
        this.createTimer();
        this.createMinimap();
        this.createInventory();

        document.body.appendChild(this.container);
    }
    
    createHealthBar() {
        const healthContainer = document.createElement('div');
        healthContainer.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            width: 200px;
            height: 30px;
            background: #333;
            border: 2px solid #8b0000;
            border-radius: 5px;
            overflow: hidden;
        `;
        
        this.healthBar = document.createElement('div');
        this.healthBar.style.cssText = `
            height: 100%;
            background: linear-gradient(to right, #ff0000, #ff4444);
            width: 100%;
            transition: width 0.3s;
        `;
        
        const healthText = document.createElement('div');
        healthText.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            text-align: center;
            line-height: 30px;
            color: white;
            font-weight: bold;
            text-shadow: 1px 1px 2px black;
        `;
        healthText.textContent = 'HP';
        
        healthContainer.appendChild(this.healthBar);
        healthContainer.appendChild(healthText);
        this.container.appendChild(healthContainer);
    }
    
    createStaminaBar() {
        const staminaContainer = document.createElement('div');
        staminaContainer.style.cssText = `
            position: absolute;
            top: 60px;
            left: 20px;
            width: 200px;
            height: 30px;
            background: #333;
            border: 2px solid #00008b;
            border-radius: 5px;
            overflow: hidden;
        `;
        
        this.staminaBar = document.createElement('div');
        this.staminaBar.style.cssText = `
            height: 100%;
            background: linear-gradient(to right, #0000ff, #4444ff);
            width: 100%;
            transition: width 0.3s;
        `;
        
        const staminaText = document.createElement('div');
        staminaText.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            text-align: center;
            line-height: 30px;
            color: white;
            font-weight: bold;
            text-shadow: 1px 1px 2px black;
        `;
        staminaText.textContent = 'STAMINA';
        
        staminaContainer.appendChild(this.staminaBar);
        staminaContainer.appendChild(staminaText);
        this.container.appendChild(staminaContainer);
    }
    
    createTimer() {
        const timer = document.createElement('div');
        timer.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 24px;
            color: #8b0000;
            text-shadow: 1px 1px 2px black;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px 20px;
            border-radius: 5px;
        `;
        timer.id = 'game-timer';
        timer.textContent = '00:00';
        
        this.container.appendChild(timer);
    }
    
    createMinimap() {
        this.minimap = document.createElement('div');
        this.minimap.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: 150px;
            height: 150px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #8b0000;
            border-radius: 50%;
            overflow: hidden;
        `;
        
        const minimapLabel = document.createElement('div');
        minimapLabel.style.cssText = `
            position: absolute;
            top: 5px;
            left: 0;
            width: 100%;
            text-align: center;
            color: #8b0000;
            font-size: 12px;
            font-weight: bold;
        `;
        minimapLabel.textContent = 'MINIMAP';
        
        this.minimap.appendChild(minimapLabel);
        this.container.appendChild(this.minimap);
    }
    
    createInventory() {
        const inventory = document.createElement('div');
        inventory.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px;
            border-radius: 10px;
            border: 2px solid #8b0000;
        `;
        
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid #8b0000;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #8b0000;
                font-weight: bold;
            `;
            slot.textContent = i + 1;
            slot.id = `inventory-slot-${i}`;
            inventory.appendChild(slot);
        }
        
        this.container.appendChild(inventory);
    }

    update() {
        // Update health bar
        if (this.healthBar) {
            const healthPercent = (this.gameManager.playerData.health / this.gameManager.playerData.maxHealth) * 100;
            this.healthBar.style.width = `${healthPercent}%`;
        }
        
        // Update stamina bar
        if (this.staminaBar) {
            const staminaPercent = (this.gameManager.playerData.stamina / this.gameManager.playerData.maxStamina) * 100;
            this.staminaBar.style.width = `${staminaPercent}%`;
        }
        
        // Update timer
        const timer = document.getElementById('game-timer');
        if (timer) {
            const time = this.gameManager.playerData.time;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Update inventory display
        this.updateInventory();
    }
    
    updateInventory() {
        for (let i = 0; i < 5; i++) {
            const slot = document.getElementById(`inventory-slot-${i}`);
            if (slot) {
                const item = this.gameManager.playerData.inventory[i];
                if (item) {
                    slot.style.background = this.getItemColor(item.type);
                    slot.textContent = this.getItemSymbol(item.type);
                } else {
                    slot.style.background = 'rgba(255, 255, 255, 0.1)';
                    slot.textContent = i + 1;
                }
            }
        }
    }
    
    getItemColor(type) {
        switch(type) {
            case 'flashlight': return 'rgba(255, 255, 0, 0.3)';
            case 'trenchcoat': return 'rgba(139, 69, 19, 0.3)';
            case 'carrot': return 'rgba(255, 102, 0, 0.3)';
            case 'note': return 'rgba(255, 255, 255, 0.3)';
            default: return 'rgba(255, 255, 255, 0.1)';
        }
    }
    
    getItemSymbol(type) {
        switch(type) {
            case 'flashlight': return '🔦';
            case 'trenchcoat': return '🧥';
            case 'carrot': return '🥕';
            case 'note': return '📝';
            default: return '?';
        }
    }

    cleanup() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}