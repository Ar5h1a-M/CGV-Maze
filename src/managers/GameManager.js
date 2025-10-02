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
    }
    
    setSceneManager(sceneManager) {
        this.sceneManager = sceneManager;
    }
    
    startGame(difficulty) {
        this.currentDifficulty = difficulty;
        this.resetPlayerData();
        this.gameState = 'playing';
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
            time: 0
        };
    }
    
    updatePlayerHealth(change) {
        this.playerData.health = Math.max(0, Math.min(this.playerData.maxHealth, this.playerData.health + change));
        if (this.playerData.health <= 0) {
            this.gameOver();
        }
    }
    
    updatePlayerStamina(change) {
        this.playerData.stamina = Math.max(0, Math.min(this.playerData.maxStamina, this.playerData.stamina + change));
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
        if (this.playerData.inventory[slot]) {
            const item = this.playerData.inventory[slot];
            this.playerData.inventory[slot] = null;
            return item;
        }
        return null;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        // Show game over screen
    }
    
    winGame() {
        this.gameState = 'win';
        // Show win screen and return to menu
        setTimeout(() => {
            this.sceneManager.switchToScene('menu');
        }, 3000);
    }
    
    update(deltaTime) {
        if (this.gameState === 'playing') {
            this.playerData.time += deltaTime;
            
            // Ambient health reduction
            this.updatePlayerHealth(-0.1 * deltaTime);
        }
    }

    // Add to GameManager class
addItemToInventory(itemType) {
    const item = { type: itemType };
    return this.addToInventory(item);
}

useInventoryItem(slot) {
    const item = this.playerData.inventory[slot];
    if (item) {
        switch(item.type) {
            case 'flashlight':
                // Increase visibility radius
                console.log('Used flashlight - visibility increased');
                break;
            case 'trenchcoat':
                // Reduce ambient damage
                console.log('Used trenchcoat - ambient damage reduced');
                break;
            case 'carrot':
                this.updatePlayerHealth(15);
                console.log('Used carrot - healed 15 HP');
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
}