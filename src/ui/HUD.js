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

        // NEW: Track fog opacity for each cell
        this.fogOpacity = new Map(); // Stores opacity values for each "x,y" cell
        this.fogFadeSpeed = 0.05; // How fast fog fades (higher = faster)

        // Help system
        this.helpContainer = null;
        this.helpContentArea = null;
        this.isHelpOpen = false;
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
        this.createBlockingIndicator();
        this.createFlashlightIndicator();
        this.createHelpButton();
        this.createHelpSystem();
        this.createMenuButton();

        document.body.appendChild(this.container);
    }

    createHelpButton() {
        const helpBtn = document.createElement('button');
        helpBtn.textContent = '?';
        helpBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 180px;
            width: 40px;
            height: 40px;
            background: rgba(139, 0, 0, 0.8);
            color: white;
            border: 2px solid #8b0000;
            border-radius: 50%;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            pointer-events: auto;
            z-index: 100;
            transition: all 0.3s;
        `;
        helpBtn.onmouseover = () => helpBtn.style.background = 'rgba(169, 0, 0, 0.9)';
        helpBtn.onmouseout = () => helpBtn.style.background = 'rgba(139, 0, 0, 0.8)';
        helpBtn.onclick = () => this.toggleHelp();
        
        this.container.appendChild(helpBtn);
    }

    createHelpSystem() {
        this.helpContainer = document.createElement('div');
        this.helpContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 400px;
            background: rgba(10, 10, 10, 0.95);
            border: 3px solid #8b0000;
            border-radius: 10px;
            color: white;
            font-family: 'Courier New', monospace;
            display: none;
            z-index: 1000;
            pointer-events: auto;
            overflow: hidden;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            background: #8b0000;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            z-index: 1001;
        `;
        closeBtn.onclick = () => this.toggleHelp();
        this.helpContainer.appendChild(closeBtn);

        // Tab buttons
        const tabContainer = document.createElement('div');
        tabContainer.style.cssText = `
            display: flex;
            background: #2a0a0a;
            border-bottom: 2px solid #8b0000;
        `;

        const tabs = ['Objective', 'Items & Enemies', 'Controls'];
        this.tabButtons = [];
        
        tabs.forEach((tabName, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.textContent = tabName;
            tabBtn.style.cssText = `
                flex: 1;
                padding: 15px;
                background: #2a0a0a;
                color: #8b0000;
                border: none;
                border-right: 1px solid #8b0000;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;
            `;
            tabBtn.onmouseover = () => {
                if (!tabBtn.classList.contains('active')) {
                    tabBtn.style.background = '#3a1a1a';
                }
            };
            tabBtn.onmouseout = () => {
                if (!tabBtn.classList.contains('active')) {
                    tabBtn.style.background = '#2a0a0a';
                }
            };
            tabBtn.onclick = () => this.switchTab(index);
            
            this.tabButtons.push(tabBtn);
            tabContainer.appendChild(tabBtn);
        });

        // Content area
        this.helpContentArea = document.createElement('div');
        this.helpContentArea.style.cssText = `
            padding: 20px;
            height: calc(100% - 50px);
            overflow-y: auto;
        `;

        this.helpContainer.appendChild(tabContainer);
        this.helpContainer.appendChild(this.helpContentArea);
        this.container.appendChild(this.helpContainer);

        // Load initial tab content
        this.switchTab(0);
    }

    switchTab(tabIndex) {
        if (!this.helpContentArea) return;
        
        // Update tab buttons
        this.tabButtons.forEach((btn, index) => {
            if (index === tabIndex) {
                btn.classList.add('active');
                btn.style.background = '#8b0000';
                btn.style.color = 'white';
            } else {
                btn.classList.remove('active');
                btn.style.background = '#2a0a0a';
                btn.style.color = '#8b0000';
            }
        });

        // Update content based on tab
        switch(tabIndex) {
            case 0: // Objective
                this.helpContentArea.innerHTML = this.getObjectiveContent();
                break;
            case 1: // Items & Enemies
                this.helpContentArea.innerHTML = this.getItemsEnemiesContent();
                break;
            case 2: // Controls
                this.helpContentArea.innerHTML = this.getControlsContent();
                break;
        }
    }

    getObjectiveContent() {
        return `
            <h2 style="color: #8b0000; text-align: center; margin-bottom: 20px;">OBJECTIVE</h2>
            <div style="line-height: 1.6;">
                <p><strong>Survive the fog and enemies to reach the exit portal!</strong></p>
                <br>
                <p>🏃 Navigate through the dark maze while avoiding:</p>
                <ul style="margin-left: 20px;">
                    <li>Deadly traps hidden throughout</li>
                    <li>Hostile creatures lurking in the shadows</li>
                    <li>The ever-present fog that limits your vision</li>
                    <li>Ambient maze damage that slowly drains your health</li>
                </ul>
                <br>
                <p>🎯 Your goal is to find and reach the glowing red exit portal.</p>
                <p>Use items wisely and manage your stamina to survive!</p>
            </div>
        `;
    }

    getItemsEnemiesContent() {
        return `
            <h2 style="color: #8b0000; text-align: center; margin-bottom: 20px;">ITEMS & ENEMIES</h2>
            <div style="line-height: 1.6;">
                
                <h3 style="color: #ff6600; margin-top: 15px;">📦 ITEMS</h3>
                <ul style="margin-left: 20px;">
                    <li><strong>Flashlight</strong> – Moderately increases visibility radius</li>
                    <li><strong>Trench Coat</strong> – Slightly decreases ambient health reduction (does not reduce enemy damage)</li>
                    <li><strong>Carrots</strong> – Removes fog for 5 seconds and heals 15 HP</li>
                    <li><strong>Blank Notes</strong> – Lore notes with maze backstory</li>
                </ul>

                <h3 style="color: #ff0000; margin-top: 20px;">👹 ENEMIES & TRAPS</h3>
                
                <h4 style="color: #00ff00;">Easy Difficulty</h4>
                <ul style="margin-left: 20px;">
                    <li>Traps: -3 HP, avoidable by jumping</li>
                    <li>No enemies</li>
                </ul>

                <h4 style="color: #ffff00;">Medium Difficulty</h4>
                <ul style="margin-left: 20px;">
                    <li>Traps: -3 HP, avoidable by jumping</li>
                    <li>Spiders/Rats: -5 HP damage</li>
                    <li>Glowing Spider/Rat: Poison (-1 HP/sec for 15s)</li>
                </ul>

                <h4 style="color: #ff0000;">Hard Difficulty</h4>
                <ul style="margin-left: 20px;">
                    <li>Traps: -7 HP, avoidable by jumping</li>
                    <li>Spiders/Rats: -7 HP damage</li>
                    <li>Glowing Spider/Rat: Poison (-2 HP/sec for 15s)</li>
                    <li>Zombies: -20 HP damage</li>
                    <li>Glowing Human: Poison (-5 HP/sec for 10s)</li>
                </ul>
            </div>
        `;
    }

    getControlsContent() {
        return `
            <h2 style="color: #8b0000; text-align: center; margin-bottom: 20px;">CONTROLS</h2>
            <div style="line-height: 1.6;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <h4 style="color: #ff6600;">MOVEMENT</h4>
                        <ul style="list-style: none; padding: 0;">
                            <li>🠕 W / Arrow Up → Move Forward</li>
                            <li>🠗 S / Arrow Down → Move Backward</li>
                            <li>🠔 A / Arrow Left → Move Left</li>
                            <li>🠖 D / Arrow Right → Move Right</li>
                            <li>Spacebar → Jump</li>
                            <li>Shift → Sprint</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: #ff6600;">ACTIONS</h4>
                        <ul style="list-style: none; padding: 0;">
                            <li>B → Block</li>
                            <li>E → Pick Up / Use Item</li>
                            <li>V → Change Perspective</li>
                            <li>1-5 → Select Inventory Slot</li>
                            <li>F → Toggle Flashlight</li>
                        </ul>
                    </div>
                </div>
                <br>
                <p style="text-align: center; color: #888;">
                    <em>Click anywhere in the game to lock mouse pointer for camera control</em>
                </p>
            </div>
        `;
    }

    toggleHelp() {
        this.isHelpOpen = !this.isHelpOpen;
        this.helpContainer.style.display = this.isHelpOpen ? 'block' : 'none';
        
        // Update pointer events on main container
        this.container.style.pointerEvents = this.isHelpOpen ? 'auto' : 'none';
        
        // Re-enable pointer events for interactive elements
        const interactiveElements = this.container.querySelectorAll('button, canvas');
        interactiveElements.forEach(el => {
            if (el !== this.helpContainer && !this.helpContainer.contains(el)) {
                el.style.pointerEvents = this.isHelpOpen ? 'none' : 'auto';
            }
        });
    }

    createMenuButton() {
        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'MENU';
        menuBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 230px;
            width: 80px;
            height: 40px;
            background: rgba(139, 0, 0, 0.8);
            color: white;
            border: 2px solid #8b0000;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            cursor: pointer;
            pointer-events: auto;
            z-index: 100;
            transition: all 0.3s;
        `;
        menuBtn.onmouseover = () => menuBtn.style.background = 'rgba(169, 0, 0, 0.9)';
        menuBtn.onmouseout = () => menuBtn.style.background = 'rgba(139, 0, 0, 0.8)';
        menuBtn.onclick = () => this.returnToMenu();
        
        this.container.appendChild(menuBtn);
    }

    returnToMenu() {
        if (this.gameManager && this.gameManager.sceneManager) {
            // Reset game state before returning to menu
            this.gameManager.resetPlayerData();
            this.gameManager.gameState = 'menu';
            this.gameManager.isPlayerDead = false;
            this.gameManager.flashlightActive = false;
            this.gameManager.hasFlashlight = false;
            
            this.gameManager.sceneManager.switchToScene('menu');
        }
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
        indicator.style.display = 'none';
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
        
        if (this.staminaBar) {
            const percent = (this.gameManager.playerData.stamina / this.gameManager.playerData.maxStamina) * 100;
            this.staminaBar.style.width = `${percent}%`;
        }
        
        const timer = document.getElementById('game-timer');
        if (timer) {
            const time = this.gameManager.playerData.time;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            timer.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        }
        
        if (this.gameManager.playerData && this.mazeData) {
            const playerPosition = this.gameManager.playerData.position || { x: 0, y: 0, z: 0 };
            const playerRotation = this.gameManager.playerData.rotation || { y: 0 };
            this.updateMinimap(playerPosition, playerRotation);
        }
        
        this.updateInventory();

        const blockingIndicator = document.getElementById('blocking-indicator');
        if (blockingIndicator) {
            const isBlocking = this.gameManager.playerData.isBlocking || false;
            blockingIndicator.style.display = isBlocking ? 'block' : 'none';
        }
        
        const flashlightIndicator = document.getElementById('flashlight-indicator');
        if (flashlightIndicator) {
            if (!this.gameManager.hasFlashlight) {
                flashlightIndicator.style.display = 'none';
                return;
            }

            flashlightIndicator.style.display = 'block';
            flashlightIndicator.textContent = this.gameManager.flashlightActive ? '🔦 ON' : '🔦 OFF';
            flashlightIndicator.style.opacity = this.gameManager.flashlightActive ? '1' : '0.4';
        }
    }

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

    // UPDATED: Track fog opacity for gradual fade
    updateDiscoveredAreas(areas) {
        if (!areas) return;
        
        // Convert areas to Set
        const newDiscoveredAreas = new Set(areas.map(area => `${area.x},${area.y}`));
        
        // For newly discovered areas, start fading the fog
        newDiscoveredAreas.forEach(key => {
            if (!this.discoveredAreas.has(key)) {
                // Newly discovered - set initial opacity to 1 (fully fogged)
                this.fogOpacity.set(key, 1.0);
            } else {
                // Already discovered - gradually fade the fog
                const currentOpacity = this.fogOpacity.get(key) || 0;
                this.fogOpacity.set(key, Math.max(0, currentOpacity - this.fogFadeSpeed));
            }
        });
        
        this.discoveredAreas = newDiscoveredAreas;
    }

    // UPDATED: Render fog overlay on minimap
    updateMinimap(playerPosition, playerRotation) {
        if (!this.mazeData || !this.minimapCtx) return;

        const ctx = this.minimapCtx;
        const centerX = 75;
        const centerY = 75;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 150, 150);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 73, 0, Math.PI * 2);
        ctx.clip();
        
        const playerGridX = Math.floor(playerPosition.x + this.mazeData.width / 2);
        const playerGridY = Math.floor(playerPosition.z + this.mazeData.height / 2);
        
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
                    // Draw base terrain
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
                    
                    // NEW: Draw fog overlay with fade effect
                    const fogKey = `${x},${y}`;
                    const fogOpacity = this.fogOpacity.get(fogKey) || 0;
                    
                    if (fogOpacity > 0) {
                        ctx.fillStyle = `rgba(0, 0, 0, ${fogOpacity * 0.8})`;
                        ctx.fillRect(drawX - this.cellSize/2, drawY - this.cellSize/2, this.cellSize, this.cellSize);
                    }
                }
            }
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
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
        if (this.discoveredAreas.size === 0) return true;
        return this.discoveredAreas.has(`${x},${y}`);
    }

    isInMinimapBounds(x, y) {
        const centerX = 75;
        const centerY = 75;
        const radius = 73;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius;
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