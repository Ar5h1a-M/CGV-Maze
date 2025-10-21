export class GameManager {
    constructor() {
        this.sceneManager = null;
        this.currentDifficulty = null;
        this.playerData = {
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            inventory: new Array(5).fill(null),
            score: 0,
            time: 0
        };
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.flashlightActive = false;
        this.visibilityBoost = 3;
        this.playerData.isBlocking = false;
        this.isPlayerDead = false; // Add this flag
    }
    
    setSceneManager(sceneManager) {
        this.sceneManager = sceneManager;
    }
    
    startGame(difficulty) {
        this.currentDifficulty = difficulty;
        this.resetPlayerData();
        this.gameState = 'playing';
        this.isPlayerDead = false; // Reset death flag
        this.sceneManager.switchToScene('game');
    }
    
    resetPlayerData() {
        this.playerData = {
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            inventory: new Array(5).fill(null),
            score: 0,
            time: 0,
            isBlocking: false
        };
        this.isPlayerDead = false;
    }
    
    updatePlayerHealth(change) {
        if (this.isPlayerDead) return; // Don't process health changes if already dead
        
        this.playerData.health = Math.max(0, Math.min(this.playerData.maxHealth, this.playerData.health + change));
        
        // Check for death
        if (this.playerData.health <= 0 && !this.isPlayerDead) {
            this.playerDied();
        }
    }
    
    updatePlayerStamina(change) {
        this.playerData.stamina = Math.max(0, Math.min(this.playerData.maxStamina, this.playerData.stamina + change));
        
        // Auto-disable sprint if stamina runs out
        if (this.playerData.stamina <= 0) {
            this.disableSprinting();
        }
    }

    playerDied() {
        if (this.isPlayerDead) return; // Prevent multiple death triggers
        
        this.isPlayerDead = true;
        this.gameState = 'gameOver';
        
        console.log('💀 Player died!');
        
        // Show death message and return to menu
        setTimeout(() => {
            alert('YOU DIED');
            this.sceneManager.switchToScene('menu');
        }, 500);
    }

    disableSprinting() {
        // This will be used by the Player class to disable sprinting
        // We'll handle the actual sprint disabling in the Player.js update
    }

    // ... rest of your existing methods remain the same ...
    activateFlashlight() {
        this.flashlightActive = true;
        this.visibilityBoost = 3.0;
        console.log('🔦 Flashlight activated! Increased visibility');
    }

    deactivateFlashlight() {
        this.flashlightActive = false;
        this.visibilityBoost = 0;
        console.log('🔦 Flashlight deactivated');
    }
    
    addToInventory(item) {
        const emptySlot = this.playerData.inventory.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            this.playerData.inventory[emptySlot] = item;
            return true;
        }
        return false;
    }

    useInventoryItem(slot) {
        const item = this.playerData.inventory[slot];
        if (item) {
            switch(item.type) {
                case 'flashlight':
                    if (!this.flashlightActive) {
                    this.activateFlashlight();
                    } else {
                        this.deactivateFlashlight();
                    }
                    console.log('Used flashlight - visibility increased');
                    return item;
                case 'trenchcoat':
                    console.log('Used trenchcoat - ambient damage reduced');
                    break;
                case 'carrot':
                    this.updatePlayerHealth(25);
                    console.log('Used carrot - healed 25 HP');
                    break;
                case 'note':
                    console.log('Read note - lore revealed');
                    break;
            }
            this.playerData.inventory[slot] = null;
            return item;
        }
        return null;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
    }
    
    winGame() {
        this.gameState = 'win';
        setTimeout(() => {
            this.sceneManager.switchToScene('menu');
        }, 3000);
    }
    
    update(deltaTime) {
        if (this.gameState === 'playing' && !this.isPlayerDead) {
            this.playerData.time += deltaTime;
            
            // Ambient health reduction (only if player is alive)
            if (this.currentDifficulty === 'easy') {
                this.updatePlayerHealth(-0.1 * deltaTime); //-1 every 10 seconds
            } else if (this.currentDifficulty === 'medium') {
                this.updatePlayerHealth(-0.12 * deltaTime);//-1 every ~8.3 seconds
            } else if (this.currentDifficulty === 'hard') {
                this.updatePlayerHealth(-0.15 * deltaTime);//-1 every ~6.7 seconds
            }    
        }
    }
}