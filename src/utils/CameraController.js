import * as THREE from 'three';

export class CameraController {
    constructor(camera, domElement, scene) {
        this.camera = camera;
        this.domElement = domElement;
         this.scene = scene;

        // Camera modes
        this.modes = {
            FIRST_PERSON: 'firstPerson',
            THIRD_PERSON: 'thirdPerson'
        };
        this.currentMode = this.modes.FIRST_PERSON;
        
        // Camera settings
        this.sensitivity = 0.002;
        this.pitch = 0;
        this.yaw = 0;

        // Third-person settings
        this.thirdPersonDistance = 4;
        this.thirdPersonHeight = 1.8;
        this.cameraSmoothing = 0.1;
        this.rotationSmoothing = 0.1;

        // Camera follow system
        this.idealOffset = new THREE.Vector3();
        this.currentOffset = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.smoothedPosition = new THREE.Vector3();

        // Initialize smoothed position
        this.smoothedPosition.copy(this.camera.position);

        // Collision detection
        this.raycaster = new THREE.Raycaster();
        this.collisionLayers = new Set();
        this.collisionBuffer = 0.3;
        
        // Mouse state
        this.isMouseLocked = false;
        this.mouseX = 0;
        this.mouseY = 0;

        // Third-person orbit limits
        this.minPitch = -0.8;
        this.maxPitch = 0.8;
        
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
            // Camera switch on 'V' key
            if (event.code === 'KeyV' && this.isMouseLocked) {
                this.switchCameraMode();
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

    switchCameraMode() {
        console.log('Switching camera mode from', this.currentMode);

        if (this.currentMode === this.modes.FIRST_PERSON) {
            this.currentMode = this.modes.THIRD_PERSON;
            this.setupThirdPerson();
        } else {
            this.currentMode = this.modes.FIRST_PERSON;
            this.setupFirstPerson();
        }

        // Trigger callback if set
        if (this.onCameraSwitch) {
            this.onCameraSwitch(this.currentMode);
        }
    }

    setupFirstPerson() {
        // Reset for first-person
        this.camera.rotation.set(0, 0, 0);
        this.pitch = 0;
        this.yaw = 0;

        console.log('First-person camera setup complete');
    }

    setupThirdPerson() {
        // Initialize third-person with camera behind player
        this.yaw = 0;
        this.pitch = 0.3;

        console.log('Third-person camera setup complete');
    }

    calculateIdealOffset() {
        // Calculate where the camera should be ideally (behind and above player)
        this.idealOffset.set(
            -Math.sin(this.yaw) * this.thirdPersonDistance,
            this.thirdPersonHeight,
            -Math.cos(this.yaw) * this.thirdPersonDistance
        );
        return this.idealOffset;
    }

    checkCameraCollision(playerPosition) {
        const idealOffset = this.calculateIdealOffset();
        const idealCameraPos = new THREE.Vector3().copy(playerPosition).add(idealOffset);

        // Ray from player to ideal camera position
        const direction = idealOffset.clone().normalize();
        this.raycaster.set(playerPosition, direction);

        // Get all collidable objects (walls, obstacles)
        const collidableObjects = [];
        this.scene.traverse((object) => {
            if (object.userData.isCollidable || object.name.includes('wall') || object.name.includes('maze')) {
                collidableObjects.push(object);
            }
        });

        if (collidableObjects.length === 0) {
            // If no specific collidable objects, check all meshes
            this.scene.traverse((object) => {
                if (object.isMesh && object.visible && object.name !== 'player') {
                    collidableObjects.push(object);
                }
            });
        }

        const intersects = this.raycaster.intersectObjects(collidableObjects, true);

        if (intersects.length > 0) {
            const firstIntersect = intersects[0];
            if (firstIntersect.distance < this.thirdPersonDistance - this.collisionBuffer) {
                // Camera would hit a wall, adjust distance
                const adjustedDistance = Math.max(0.5, firstIntersect.distance - this.collisionBuffer);

                // Calculate new offset with adjusted distance
                return new THREE.Vector3(
                    -Math.sin(this.yaw) * adjustedDistance,
                    this.thirdPersonHeight * (adjustedDistance / this.thirdPersonDistance),
                    -Math.cos(this.yaw) * adjustedDistance
                );
            }
        }

        // No collision, use ideal offset
        return idealOffset.clone();
    }

    updateThirdPersonPosition(playerPosition) {
        if (!playerPosition) return;

        // Get adjusted camera position with collision
        const adjustedOffset = this.checkCameraCollision(playerPosition);
        const targetCameraPos = new THREE.Vector3().copy(playerPosition).add(adjustedOffset);

        // Smooth camera movement
        this.smoothedPosition.lerp(targetCameraPos, this.cameraSmoothing);
        this.camera.position.copy(this.smoothedPosition);

        // Look at player chest level
        const lookAtTarget = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.2,
            playerPosition.z
        );
        this.camera.lookAt(lookAtTarget);
    }
    
    lockPointer() {
        this.domElement.requestPointerLock();
    }
    
    unlockPointer() {
        document.exitPointerLock();
    }
    
    update(deltaTime, playerPosition) {
        if (!this.isMouseLocked) return;
        
         if (this.mouseX !== 0 || this.mouseY !== 0) {
            if (this.currentMode === this.modes.FIRST_PERSON) {
                // First-person: direct camera control
                this.yaw -= this.mouseX * this.sensitivity;
                this.pitch -= this.mouseY * this.sensitivity;
                this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch));
            } else {
                // Third-person: orbit around player with limits
                this.yaw -= this.mouseX * this.sensitivity;
                this.pitch -= this.mouseY * this.sensitivity;

                // Apply pitch limits to prevent awkward angles
                this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
            }

            this.mouseX = 0;
            this.mouseY = 0;
        }

        if (this.currentMode === this.modes.FIRST_PERSON) {
            this.updateFirstPerson(playerPosition);
        } else {
            this.updateThirdPersonPosition(playerPosition);
        }
    }

    updateFirstPerson(playerPosition) {
        // Update camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

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
        if (this.currentMode === this.modes.FIRST_PERSON) {
            // First-person: use camera direction (normal behavior)
            this.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();
        } else {
            // Third-person: camera is behind player, so forward is TOWARD camera view
            // This fixes the inverted controls
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);

            // In third-person, forward should be the direction the camera is looking
            // but projected onto the horizontal plane
            forward.set(cameraDirection.x, 0, cameraDirection.z);
            forward.normalize();

            // Debug: log directions to verify
            if (Math.random() < 0.01) {
                console.log('Third-person forward:', forward);
            }
        }
        return forward;
    }
    
    getRightVector() {
        const right = new THREE.Vector3();
        if (this.currentMode === this.modes.FIRST_PERSON) {
            // First-person: normal right vector
            const forward = this.getForwardVector();
            right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
            right.normalize();
        } else {
            // Third-person: calculate right from forward vector
            const forward = this.getForwardVector();
            right.crossVectors(new THREE.Vector3(0, 1, 0), forward);
            right.normalize();

            // Debug: log directions to verify
            if (Math.random() < 0.01) {
                console.log('Third-person right:', right);
            }
        }
        return right;
    }

    getCurrentMode() {
        return this.currentMode;
    }

    setCameraSwitchCallback(callback) {
        this.onCameraSwitch = callback;
    }

    // Method to add collidable objects (call this from your maze renderer)
    addCollidableObject(object) {
        object.userData.isCollidable = true;
    }

    // Reset camera behind player (useful when switching to third-person)
    resetThirdPersonCamera() {
        this.yaw = 0;
        this.pitch = 0.3;
    }

}