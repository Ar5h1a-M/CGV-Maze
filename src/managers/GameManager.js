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
        this.isPlayerDead = false;
    }

    setSceneManager(sceneManager) {
        this.sceneManager = sceneManager;
    }

    startGame(difficulty) {
        this.currentDifficulty = difficulty;
        this.resetPlayerData();
        this.gameState = 'playing';
        this.isPlayerDead = false;
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
        if (this.isPlayerDead) return;

        this.playerData.health = Math.max(
            0,
            Math.min(this.playerData.maxHealth, this.playerData.health + change)
        );

        if (this.playerData.health <= 0 && !this.isPlayerDead) {
            this.playerDied();
        }
    }

    updatePlayerStamina(change) {
        this.playerData.stamina = Math.max(
            0,
            Math.min(this.playerData.maxStamina, this.playerData.stamina + change)
        );

        if (this.playerData.stamina <= 0) {
            this.disableSprinting();
        }
    }

    disableSprinting() {
        // Hooked by Player.js
    }

    // ✅ Unified game end handler (death or win)
    endGame(result) {
        this.gameState = result === 'win' ? 'win' : 'gameOver';
        this.isPlayerDead = result === 'lose';

        const message = result === 'win' ? '🏆 YOU ESCAPED!' : '💀 YOU DIED';
        console.log(message);
        alert(message);

        // ✅ Small delay before returning to menu
        setTimeout(() => {
            if (window.SceneManagerRef) {
                window.SceneManagerRef.switchToScene('menu');
            } else if (this.sceneManager) {
                this.sceneManager.switchToScene('menu');
            } else {
                console.warn('⚠️ SceneManager not found for reset!');
            }
        }, 1500);
    }

    playerDied() {
        if (this.isPlayerDead) return;
        this.endGame('lose');
    }

    winGame() {
        this.endGame('win');
    }

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
        const emptySlot = this.playerData.inventory.findIndex((slot) => slot === null);
        if (emptySlot !== -1) {
            this.playerData.inventory[emptySlot] = item;
            return true;
        }
        return false;
    }

    useInventoryItem(slot) {
        const item = this.playerData.inventory[slot];
        if (item) {
            switch (item.type) {
                case 'flashlight':
                    if (!this.flashlightActive) this.activateFlashlight();
                    else this.deactivateFlashlight();
                    break;
                case 'trenchcoat':
                    console.log('🧥 Used trenchcoat - ambient damage reduced');
                    break;
                case 'carrot':
                    this.updatePlayerHealth(25);
                    console.log('🥕 Used carrot - healed 25 HP');
                    break;
                case 'note':
                    console.log('📜 Read note - lore revealed');
                    break;
            }
            this.playerData.inventory[slot] = null;
            return item;
        }
        return null;
    }

    update(deltaTime) {
        if (this.gameState === 'playing' && !this.isPlayerDead) {
            this.playerData.time += deltaTime;

            if (this.currentDifficulty === 'easy') {
                this.updatePlayerHealth(-0.1 * deltaTime);
            } else if (this.currentDifficulty === 'medium') {
                this.updatePlayerHealth(-0.12 * deltaTime);
            } else if (this.currentDifficulty === 'hard') {
                this.updatePlayerHealth(-0.15 * deltaTime);
            }
        }
    }
}
