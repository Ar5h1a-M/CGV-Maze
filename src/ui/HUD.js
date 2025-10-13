export class HUD {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.container = null;
        this.healthBar = null;
        this.healthText = null; 
        this.staminaBar = null;
        this.minimap = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.mazeData = null;
        this.discoveredAreas = new Set();
        this.cellSize = 0;
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
        
        
        this.healthText = document.createElement('div');
        this.healthText.style.cssText = `
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
        this.healthText.textContent = 'HP: 100 / 100';

        healthContainer.appendChild(this.healthBar);
        healthContainer.appendChild(this.healthText);
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
            z-index: 10;
        `;
        minimapLabel.textContent = 'MINIMAP';
        
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = 150;
        this.minimapCanvas.height = 150;
        this.minimapCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.minimap.appendChild(minimapLabel);
        this.minimap.appendChild(this.minimapCanvas);
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

    // -------------------------
    // Mini-map methods
    // -------------------------
    setMazeData(mazeData) {
        this.mazeData = {
            grid: mazeData.grid,
            width: mazeData.size,
            height: mazeData.size,
            start: { x: mazeData.start.x, y: mazeData.start.z },
            end: { x: mazeData.end.x, y: mazeData.end.z }
        };
        this.calculateCellSize();
    }

    calculateCellSize() {
        if (!this.mazeData) return;
        const maxDimension = Math.max(this.mazeData.width, this.mazeData.height);
        this.cellSize = 130 / maxDimension;
    }

    updateDiscoveredAreas(areas) {
        if (!areas) return;
        this.discoveredAreas = new Set(areas.map(area => `${area.x},${area.y}`));
    }

    updateMinimap(playerPosition, playerRotation) {
        if (!this.mazeData || !this.minimapCtx) return;

        const ctx = this.minimapCtx;
        const centerX = 75;
        const centerY = 75;
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 150, 150);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 73, 0, Math.PI * 2);
        ctx.clip();
        
        // Convert world position to grid position
        const playerGridX = Math.floor(playerPosition.x + this.mazeData.width / 2);
        const playerGridY = Math.floor(playerPosition.z + this.mazeData.height / 2);
        
        // Draw maze
        for (let y = 0; y < this.mazeData.height; y++) {
            for (let x = 0; x < this.mazeData.width; x++) {
                if (!this.isDiscovered(x, y)) continue;
                
                const relX = x - playerGridX;
                const relY = y - playerGridY;
                
                const cos = Math.cos(-playerRotation.y);
                const sin = Math.sin(-playerRotation.y);
                const rotatedX = relX * cos - relY * sin;
                const rotatedY = relX * sin + relY * cos;
                
                const drawX = centerX + rotatedX * this.cellSize;
                const drawY = centerY + rotatedY * this.cellSize;
                
                if (this.isInMinimapBounds(drawX, drawY)) {
                    if (this.mazeData.grid[y][x] === 1) {
                        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)'; // Wall
                        ctx.fillRect(drawX - this.cellSize/2, drawY - this.cellSize/2, this.cellSize, this.cellSize);
                    } else if (x === this.mazeData.end.x && y === this.mazeData.end.y) {
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'; // Exit
                        ctx.fillRect(drawX - this.cellSize/2, drawY - this.cellSize/2, this.cellSize, this.cellSize);
                    } else {
                        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'; // Path
                        ctx.fillRect(drawX - this.cellSize/2, drawY - this.cellSize/2, this.cellSize, this.cellSize);
                    }
                }
            }
        }
        
        // Player dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Direction arrow
        const dirLen = 8;
        const endX = centerX + Math.sin(playerRotation.y) * dirLen;
        const endY = centerY - Math.cos(playerRotation.y) * dirLen;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.restore();
        this.drawCompass(playerRotation);
    }

    drawCompass(playerRotation) {
        const ctx = this.minimapCtx;
        const centerX = 75;
        const topY = 25;
        
        ctx.save();
        ctx.translate(centerX, topY);
        ctx.rotate(playerRotation.y);
        
        ctx.fillStyle = '#8b0000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', 0, 0);
        
        ctx.restore();
    }

    isDiscovered(x, y) {
        if (this.discoveredAreas.size === 0) return true; // Debug: show all
        return this.discoveredAreas.has(`${x},${y}`);
    }

    isInMinimapBounds(x, y) {
        const centerX = 75;
        const centerY = 75;
        const radius = 73;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius;
    }

    // -------------------------
    // HUD update loop
    // -------------------------
    createBlockingIndicator() {
        const blockingIndicator = document.createElement('div');
        blockingIndicator.style.cssText = `
            position: absolute;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 139, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            display: none;
        `;
        blockingIndicator.id = 'blocking-indicator';
        blockingIndicator.textContent = 'BLOCKING';
        this.container.appendChild(blockingIndicator);
    }

    createFlashlightIndicator() {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: absolute;
            top: 100px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffff00;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 16px;
        `;
        indicator.id = 'flashlight-indicator';
        indicator.textContent = '🔦 OFF';
        this.container.appendChild(indicator);
    }

    update() {
        
        if (this.healthBar) {
            const percent = (this.gameManager.playerData.health / this.gameManager.playerData.maxHealth) * 100;
            this.healthBar.style.width = `${percent}%`;

            
            if (this.healthText) {
                const hp = Math.max(0, Math.round(this.gameManager.playerData.health));
                const maxHp = Math.round(this.gameManager.playerData.maxHealth);
                this.healthText.textContent = `HP: ${hp} / ${maxHp}`;
            }
        }
        
        // Stamina
        if (this.staminaBar) {
            const percent = (this.gameManager.playerData.stamina / this.gameManager.playerData.maxStamina) * 100;
            this.staminaBar.style.width = `${percent}%`;
        }
        
        // Timer
        const timer = document.getElementById('game-timer');
        if (timer) {
            const time = this.gameManager.playerData.time;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            timer.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        }
        
        // Minimap
        if (this.gameManager.playerData && this.mazeData) {
            const playerPosition = this.gameManager.playerData.position || { x: 0, y: 0, z: 0 };
            const playerRotation = this.gameManager.playerData.rotation || { y: 0 };
            this.updateMinimap(playerPosition, playerRotation);
        }
        
        // Inventory
        this.updateInventory();

        // Update blocking indicator
        const blockingIndicator = document.getElementById('blocking-indicator');
        if (blockingIndicator) {
            const isBlocking = this.gameManager.playerData.isBlocking || false;
            blockingIndicator.style.display = isBlocking ? 'block' : 'none';
        }
        
        // Flashlight indicator
        const flashlightIndicator = document.getElementById('flashlight-indicator');
        if (!flashlightIndicator) {
            this.createFlashlightIndicator();
        } else {
            flashlightIndicator.textContent = this.gameManager.flashlightActive ? '🔦 ON' : '🔦 OFF';
        }
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
