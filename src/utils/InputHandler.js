//src\utils\InputHandler.js

export class InputHandler {
        constructor() {
            this.keys = new Set();
            this.mouse = {
                x: 0,
                y: 0,
                left: false,
                right: false,
                movementX: 0,
                movementY: 0
            };
            
            this.setupEventListeners();
        }
        
        setupEventListeners() {
            // Keyboard events
            document.addEventListener('keydown', (event) => {
                this.keys.add(event.code);
                event.preventDefault(); // Prevent browser shortcuts
            });
            
            document.addEventListener('keyup', (event) => {
                this.keys.delete(event.code);
            });
            
            // Mouse events
            document.addEventListener('mousemove', (event) => {
                this.mouse.x = event.clientX;
                this.mouse.y = event.clientY;
                this.mouse.movementX = event.movementX || 0;
                this.mouse.movementY = event.movementY || 0;
            });
            
            document.addEventListener('mousedown', (event) => {
                if (event.button === 0) this.mouse.left = true;
                if (event.button === 2) this.mouse.right = true;
            });
            
            document.addEventListener('mouseup', (event) => {
                if (event.button === 0) this.mouse.left = false;
                if (event.button === 2) this.mouse.right = false;
        _    });
            
            // Prevent context menu
            document.addEventListener('contextmenu', (event) => {
                event.preventDefault();
            });
            
            // Prevent arrow key scrolling
            window.addEventListener('keydown', (e) => {
                if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) > -1) {
                    e.preventDefault();
                }
            }, false);
        }
        
        isKeyPressed(keyCode) {
            return this.keys.has(keyCode);
        }
        
        getMovementVector(cameraController = null) {
            const vector = { x: 0, z: 0 };
            
            if (cameraController) {
                // Camera-relative movement
                const forward = cameraController.getForwardVector();
                const right = cameraController.getRightVector();
                
                if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
                     vector.x += forward.x;
                    vector.z += forward.z;
                }
                if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
                    vector.x -= forward.x;
                    vector.z -= forward.z;
                }
                // --- FIX IS HERE ---
                if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
                    vector.x -= right.x;  // 'A' (Left) SUBTRACTS the right vector
                    vector.z -= right.z;
                }
                if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
                     vector.x += right.x;  // 'D' (Right) ADDS the right vector
                    vector.z += right.z;
                }
                // --- END OF FIX ---
          } else {
                // Simple movement (fallback)
                if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) vector.z -= 1;
                if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) vector.z += 1;
                 if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) vector.x -= 1;
                if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) vector.x += 1;
            }
            
            // Normalize diagonal movement
            if (vector.x !== 0 || vector.z !== 0) {
                const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
               vector.x /= length;
                vector.z /= length;
            }
            
            return vector;
        }
        
        isSprinting() {
            return this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight');
        }
        
        isJumping() {
            return this.isKeyPressed('Space');
        }
        
        isBlocking() {
            return this.isKeyPressed('KeyB');
    Services   }
    
        isCameraSwitchPressed() {
            return this.isKeyPressed('KeyV');
        }
        
        getMouseMovement() {
            return {
                x: this.mouse.movementX,
               y: this.mouse.movementY
            };
        }
        
        clear() {
            this.keys.clear();
            this.mouse.left = false;
            this.mouse.right = false;
            this.mouse.movementX = 0;
            this.mouse.movementY = 0;
        }
    }