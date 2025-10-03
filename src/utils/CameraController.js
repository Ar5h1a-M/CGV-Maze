import * as THREE from 'three';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Camera settings
        this.isFirstPerson = true;
        this.sensitivity = 0.002;
        this.pitch = 0;
        this.yaw = 0;
        
        // Mouse state
        this.isMouseLocked = false;
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.setupEventListeners();
        this.lockPointer();
    }
    
    setupEventListeners() {
        // Mouse move event
        this.domElement.addEventListener('mousemove', (event) => {
            if (this.isMouseLocked) {
                this.mouseX += event.movementX;
                this.mouseY += event.movementY;
            }
        });
        
        // Click to lock pointer
        this.domElement.addEventListener('click', () => {
            this.lockPointer();
        });
        
        // Escape to unlock pointer
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') {
                this.unlockPointer();
            }
        });
        
        // Pointer lock change events
        document.addEventListener('pointerlockchange', () => {
            this.isMouseLocked = document.pointerLockElement === this.domElement;
            if (this.isMouseLocked) {
                console.log('Mouse locked - controls active');
            } else {
                console.log('Mouse unlocked - click to regain control');
            }
        });
    }
    
    lockPointer() {
        this.domElement.requestPointerLock();
    }
    
    unlockPointer() {
        document.exitPointerLock();
    }
    
    update(deltaTime, playerPosition) {
        if (!this.isMouseLocked) return;
        
        // Update rotation based on mouse movement
        this.yaw -= this.mouseX * this.sensitivity;
        this.pitch -= this.mouseY * this.sensitivity;
        
        // Clamp pitch to avoid flipping
        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch));
        
        // Reset mouse movement
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Update camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
        
        // Update camera position to follow player - FIXED HEIGHT OFFSET
        if (playerPosition) {
            this.camera.position.set(
                playerPosition.x,
                playerPosition.y + 1.0, // Reduced from 1.2 to 1.0 for shorter player
                playerPosition.z
            );
        }
    }
    
    getForwardVector() {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        return forward;
    }
    
    getRightVector() {
        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, this.getForwardVector());
        right.normalize();
        return right;
    }
}