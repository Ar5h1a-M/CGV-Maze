export class HUD {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.container = null;
        this.healthBar = null;
        this.staminaBar = null;
        this.minimap = null;

        // Minimap (canvas-based inside your circular frame)
        this._mmCanvas = null;
        this._mmCtx = null;
        this._mmSizePx = 150;
        this._mmPadding = 6;
        this._grid = null; this._size = 0; this._start = null; this._end = null;
        this._visited = new Set();

        // Battery HUD
        this._batteryEl = null;
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
        this._createBattery();

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
            width: ${this._mmSizePx}px;
            height: ${this._mmSizePx}px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #8b0000;
            border-radius: 50%;
            overflow: hidden;
        `;
        
        // Canvas inside the circle
        this._mmCanvas = document.createElement('canvas');
        this._mmCanvas.width = this._mmSizePx;
        this._mmCanvas.height = this._mmSizePx;
        Object.assign(this._mmCanvas.style, {
            width: `${this._mmSizePx}px`,
            height: `${this._mmSizePx}px`,
            imageRendering: 'pixelated'
        });
        this._mmCtx = this._mmCanvas.getContext('2d');

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
            pointer-events: none;
        `;
        minimapLabel.textContent = 'MINIMAP';
        
        this.minimap.appendChild(this._mmCanvas);
        this.minimap.appendChild(minimapLabel);
        this.container.appendChild(this.minimap);
    }

    _createBattery() {
        this._batteryEl = document.createElement('div');
        this._batteryEl.style.cssText = `
            position: absolute;
            top: 100px;
            left: 20px;
            color: #ffeb99;
            text-shadow: 1px 1px 2px black;
            background: rgba(0,0,0,.4);
            padding: 4px 8px;
            border-radius: 4px;
        `;
        this._batteryEl.textContent = 'Flash: 100% OFF';
        this.container.appendChild(this._batteryEl);
    }
    setBattery(percent, on) {
        if (this._batteryEl) this._batteryEl.textContent = `Flash: ${percent}% ${on ? 'ON' : 'OFF'}`;
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

    // ==== MINIMAP API (called by GameScene) ====
    buildMinimap(mazeData) {
        this._grid = mazeData.grid;
        this._size = mazeData.size;
        this._start = mazeData.start;
        this._end = mazeData.end;
        this._visited.clear();
        this._drawMinimapBase();
    }

    _drawMinimapBase() {
        const c = this._mmCtx;
        if (!c || !this._grid) return;

        const inner = this._mmSizePx - this._mmPadding*2;
        const cs = Math.max(3, Math.floor(inner / this._size));

        c.clearRect(0,0,this._mmCanvas.width,this._mmCanvas.height);
        c.fillStyle = 'rgba(12,12,18,0.6)';
        c.fillRect(0,0,this._mmCanvas.width,this._mmCanvas.height);

        const drawCell = (gx,gz,fn) => {
            const x = this._mmPadding + gx*cs;
            const y = this._mmPadding + gz*cs;
            c.save(); c.translate(x,y); fn(c,cs); c.restore();
        };

        // Walls
        for (let z=0; z<this._size; z++){
            for (let x=0; x<this._size; x++){
                if (this._grid[z][x] === 1) {
                    drawCell(x,z,(ctx,cs2)=>{
                        ctx.fillStyle = 'rgba(180,200,200,0.35)';
                        ctx.fillRect(0,0,cs2,cs2);
                    });
                }
            }
        }

        // Exit
        drawCell(this._end.x,this._end.z,(ctx,cs2)=>{
            ctx.fillStyle = 'rgba(0,255,180,0.9)';
            ctx.fillRect(2,2,cs2-4,cs2-4);
        });

        // Start
        drawCell(this._start.x,this._start.z,(ctx,cs2)=>{
            ctx.strokeStyle='rgba(255,255,255,0.7)';
            ctx.lineWidth=1; ctx.strokeRect(2,2,cs2-4,cs2-4);
        });

        // Breadcrumbs already visited
        this._visited.forEach(k=>{
            const [gx,gz]=k.split(',').map(n=>+n);
            drawCell(gx,gz,(ctx,cs2)=>{
                ctx.fillStyle='rgba(255,238,150,0.7)';
                ctx.fillRect(1,1,cs2-2,cs2-2);
            });
        });
    }

    updateMinimap(mazeData, playerPos) {
        if (!this._grid || !playerPos) return;

        const gx = Math.round(playerPos.x + this._size/2);
        const gz = Math.round(playerPos.z + this._size/2);
        const inside = (gx>=0 && gx<this._size && gz>=0 && gz<this._size);

        if (inside && this._grid[gz][gx]===0) {
            const k = `${gx},${gz}`;
            if (!this._visited.has(k)) {
                this._visited.add(k);
            }
        }

        // Redraw base then player dot on top (small canvas, cheap)
        this._drawMinimapBase();

        const c = this._mmCtx;
        const inner = this._mmSizePx - this._mmPadding*2;
        const cs = Math.max(3, Math.floor(inner / this._size));
        const x = this._mmPadding + gx*cs + cs/2;
        const y = this._mmPadding + gz*cs + cs/2;
        c.fillStyle='rgba(255,90,90,0.95)';
        const r=Math.max(2,Math.floor(cs*0.3));
        c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
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
            case 'carrot':     return 'rgba(255, 102, 0, 0.3)';
            case 'note':       return 'rgba(255, 255, 255, 0.3)';
            default:           return 'rgba(255, 255, 255, 0.1)';
        }
    }
    
    getItemSymbol(type) {
        switch(type) {
            case 'flashlight': return '🔦';
            case 'trenchcoat': return '🧥';
            case 'carrot':     return '🥕';
            case 'note':       return '📝';
            default:           return '?';
        }
    }

    cleanup() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
