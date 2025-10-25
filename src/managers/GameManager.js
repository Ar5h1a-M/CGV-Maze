// GameManager.js
import { LoreManager } from '../utils/LoreManager.js';
import { AudioManager } from '../utils/AudioManager.js';

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

        // --- NEW: Lore + Audio integration ---
        this.lore = new LoreManager();      // overlay UI (intro + notes)
        this.audio = null;                  // created once we have a camera
        this._camera = null;                // set via attachCamera()
        this._pendingStartAmbience = false; // start ambience once audio is ready

        // default audio file paths in /public/audio/
        this.audioPaths = {
            ambience: '/audio/spooky_ambience.mp3',
            noteBlip: '/audio/note_pickup.mp3'
        };

        // lightweight <audio> element for note pickup
        this._noteBlipEl = null;
        this._armedUserGestureAudioStart = false; // ensure audio starts after user gesture (browser policy)
    }

    /* ---------------- Core wiring ---------------- */

    setSceneManager(sceneManager) {
        this.sceneManager = sceneManager;
    }

    // Call this from your GameScene after creating the THREE.PerspectiveCamera
    attachCamera(camera) {
        this._camera = camera;
        if (!this.audio) {
            this.audio = new AudioManager(camera);
            // prepare the note pickup blip if the file exists
            this._setupNoteBlip();
        }
        if (this._pendingStartAmbience) {
            this._startAmbience();
            this._pendingStartAmbience = false;
        }
    }

    // Optional: override audio filenames before starting a game
    setAudioPaths({ ambience, noteBlip } = {}) {
        if (ambience) this.audioPaths.ambience = ambience;
        if (noteBlip) this.audioPaths.noteBlip = noteBlip;
        if (this._noteBlipEl && noteBlip) this._noteBlipEl.src = noteBlip;
    }

startGame(difficulty) {
    this.currentDifficulty = difficulty;
    this.resetPlayerData();
    this.gameState = 'playing';
    this.isPlayerDead = false;
    this.flashlightActive = false; // Reset flashlight state
    this.hasFlashlight = false; // Reset flashlight ownership

    // Show intro overlay immediately
    this._showIntroOverlay();

    // Arm audio start so it begins right after the first user gesture (click/key)
    this._armUserGestureForAudioStart();

    // Switch to the actual game scene
    this.sceneManager.switchToScene('game');
}

// ✅ Enhanced reset method
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
    this.flashlightActive = false;
    this.hasFlashlight = false;
}

resetGame() {
    this.gameState = 'menu';
    this.currentDifficulty = null;
    this.resetPlayerData();
    this.flashlightActive = false;
    this.visibilityBoost = 0;
    this.isPlayerDead = false;
    
    // Stop any ongoing audio
    if (this.audio) {
        this.audio.stopAmbience();
    }
}

// ✅ Unified game end handler (death or win) - FIXED
endGame(result) {
    this.gameState = result === 'win' ? 'win' : 'gameOver';
    this.isPlayerDead = result === 'lose';

    const message = result === 'win' ? '🏆 YOU ESCAPED!' : '💀 YOU DIED';
    console.log(message);
    
    // ✅ Reset game state immediately
    
    
    this.showGameOverScreen(message, result);
}

// Add a proper game over screen method
showGameOverScreen(message, result) {
    // Remove any existing game over screen
    const existingScreen = document.getElementById('game-over-screen');
    if (existingScreen) {
        existingScreen.remove();
    }

    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        color: ${result === 'win' ? '#00ff00' : '#ff0000'};
        font-family: 'Courier New', monospace;
        text-align: center;
    `;

    gameOverScreen.innerHTML = `
        <h1 style="font-size: 3em; margin-bottom: 20px; text-shadow: 0 0 10px currentColor;">${message}</h1>
        <p style="font-size: 1.5em; margin-bottom: 30px;">Time: ${Math.floor(this.playerData.time)} seconds</p>
        <button id="return-to-menu" style="
            padding: 15px 30px;
            font-size: 1.2em;
            background: #2a0a0a;
            color: #8b0000;
            border: 2px solid #8b0000;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            transition: all 0.3s;
        ">RETURN TO MENU</button>
    `;

    this.resetPlayerData();

    document.body.appendChild(gameOverScreen);

    // Add event listener for the return button
    document.getElementById('return-to-menu').onclick = () => {
        this.returnToMenu();
    };

    // Auto-return after 5 seconds if no interaction
    setTimeout(() => {
        if (document.getElementById('game-over-screen')) {
            this.returnToMenu();
        }
    }, 10000);
}

// Add returnToMenu method
returnToMenu() {
    this.resetGame();
    
    // Remove game over screen if it exists
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
        gameOverScreen.remove();
    }

    // Switch to menu scene
    if (window.SceneManagerRef) {
        window.SceneManagerRef.switchToScene('menu');
    } else if (this.sceneManager) {
        this.sceneManager.switchToScene('menu');
    }
}

    playerDied() {
        if (this.isPlayerDead) return;
        this.endGame('lose');
    }

    winGame() {
        this.endGame('win');
    }

    /* ---------------- Health / Stamina / State ---------------- */

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

    disableSprinting() {
        // Hooked by Player.js
    }

    // ✅ Unified game end handler (death or win)
    // endGame(result) {
    //     this.gameState = result === 'win' ? 'win' : 'gameOver';
    //     this.isPlayerDead = result === 'lose';

    //     const message = result === 'win' ? '🏆 YOU ESCAPED!' : '💀 YOU DIED';
    //     console.log(message);
    //     alert(message);

    //     // ✅ Small delay before returning to menu
    //     setTimeout(() => {
    //         if (window.SceneManagerRef) {
    //             window.SceneManagerRef.switchToScene('menu');
    //         } else if (this.sceneManager) {
    //             this.sceneManager.switchToScene('menu');
    //         } else {
    //             console.warn('⚠️ SceneManager not found for reset!');
    //         }
    //     }, 1500);
    // }





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
                    console.log('Read note - lore revealed');
                    // If your note item carries text, show it:
                    if (item.text) this.readNote(item.text);
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


    

    update(deltaTime) {
        // Only process ambient damage if we're actually playing and player is alive
        if (this.gameState === 'playing' && !this.isPlayerDead && this.playerData.health > 0) {
            this.playerData.time += deltaTime;

            // Ambient health reduction (only if player is alive and has health)
            if (this.currentDifficulty === 'easy') {
                this.updatePlayerHealth(-0.1 * deltaTime); // -1 every 10 seconds
            } else if (this.currentDifficulty === 'medium') {
                this.updatePlayerHealth(-0.12 * deltaTime); // -1 every ~8.3 seconds
            } else if (this.currentDifficulty === 'hard') {
                this.updatePlayerHealth(-2.0 * deltaTime); // -1 every ~6.7 seconds
            }
            
            // Debug logging to track ambient damage
            if (Math.random() < 0.01) {
                console.log(`🌫️ Ambient damage applied - HP: ${Math.round(this.playerData.health)}`);
            }
        }
    }

    /* ---------------- NEW: Lore + Audio helpers ---------------- */

    // Show the short intro text overlay
    _showIntroOverlay() {
        // Uses LoreManager's built-in intro text
        this.lore.showIntro();
    }

    // Public helper you can call from your GameScene when a note is detected/picked
    readNote(text) {
        // Show overlay with the note text
        this.lore.showNote(text);

        // Play optional short blip
        if (this.audio) this.audio.playNoteBlip();
    }

    // When MazeRenderer detects proximity, call this from your scene:
    // gameManager.onNotePicked(text);
    onNotePicked(text) {
        this.readNote(text);
    }

    _setupNoteBlip() {
        if (this._noteBlipEl) return;
        this._noteBlipEl = document.createElement('audio');
        this._noteBlipEl.src = this.audioPaths.noteBlip; // ensure file exists in /public/audio/
        this._noteBlipEl.preload = 'auto';
        document.body.appendChild(this._noteBlipEl);

        // Wire up note blip for both LoreManager and AudioManager
        if (this.audio) this.audio.attachNoteBlip(this._noteBlipEl);
        this.lore.attachNoteSound(this._noteBlipEl);
    }

    // Prepare to start ambience only after a user gesture (required by browsers)
    _armUserGestureForAudioStart() {
        if (this._armedUserGestureAudioStart) return;
        this._armedUserGestureAudioStart = true;

        const start = () => {
            // Start ambience now (or mark pending if camera/audio not ready yet)
            if (this.audio) {
                this._startAmbience();
            } else {
                this._pendingStartAmbience = true;
            }

            // remove one-time listeners
            window.removeEventListener('pointerdown', start);
            window.removeEventListener('keydown', start);
        };

        window.addEventListener('pointerdown', start, { once: true });
        window.addEventListener('keydown', start, { once: true });
    }

    _startAmbience() {
        // Start looping ambience at modest volume
        try {
            this.audio.loadAndPlayAmbience(this.audioPaths.ambience, 0.35);
        } catch (e) {
            console.warn('Could not start ambience:', e);
        }
    }

    // Debug method to check game state
debugGameState() {
    console.log('🎮 Game State Debug:');
    console.log(`- Game State: ${this.gameState}`);
    console.log(`- Player Dead: ${this.isPlayerDead}`);
    console.log(`- Player Health: ${this.playerData.health}`);
    console.log(`- Flashlight Active: ${this.flashlightActive}`);
    console.log(`- Current Difficulty: ${this.currentDifficulty}`);
}
}


