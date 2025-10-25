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
        this.thirdPersonDistance = 1; // This is the *ideal* max distance
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
        this.pitch = 0.3; // Start with a slight downward angle

        console.log('Third-person camera setup complete');
    }

    // This function now correctly calculates a 3D spherical offset
    // based on both YAW (horizontal) and PITCH (vertical) mouse movement.
    calculateIdealOffset() {
        // Calculate spherical coordinates for the offset
        const horizontalDistance = this.thirdPersonDistance * Math.cos(this.pitch);
        const verticalDistance = this.thirdPersonDistance * Math.sin(this.pitch);

        this.idealOffset.set(
            -Math.sin(this.yaw) * horizontalDistance,
            verticalDistance,
            -Math.cos(this.yaw) * horizontalDistance
        );
        return this.idealOffset;
    }

    // Changed parameter to 'pivotPosition' for clarity.
    // This is the point we orbit around (e.g., the player's head).
    checkCameraCollision(pivotPosition) {
        const idealOffset = this.calculateIdealOffset();
        
        // Ray from pivot to ideal camera position
        const direction = idealOffset.clone().normalize();
        // Raycast from the pivot, not the player's feet
        this.raycaster.set(pivotPosition, direction);

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
            // Check if the collision is closer than our ideal distance
            if (firstIntersect.distance < this.thirdPersonDistance - this.collisionBuffer) {
                // Camera would hit a wall, adjust distance
                const adjustedDistance = Math.max(0.5, firstIntersect.distance - this.collisionBuffer);

                // We just scale the ideal offset vector down to the collision distance.
                return idealOffset.clone().setLength(adjustedDistance);
            }
        }

        // No collision, use ideal offset
        return idealOffset.clone();
    }

    // This function is updated to use a 'pivot' point (lookAtTarget)
    // for all calculations, making the orbit and collision work correctly.
    updateThirdPersonPosition(playerPosition) {
        if (!playerPosition) return;

        // Define the PIVOT point (where the camera orbits around)
        // This is the same point we will also LookAt.
        const lookAtTarget = new THREE.Vector3(
            playerPosition.x,
            playerPosition.y + 1.2, // Player's chest/head level
            playerPosition.z
        );

        // Get adjusted camera position, checking for collisions from the PIVOT
        const adjustedOffset = this.checkCameraCollision(lookAtTarget);
        
        // The target position is the PIVOT + the (collision-adjusted) offset
        const targetCameraPos = new THREE.Vector3().copy(lookAtTarget).add(adjustedOffset);

        // Smooth camera movement
        this.smoothedPosition.lerp(targetCameraPos, this.cameraSmoothing);
        this.camera.position.copy(this.smoothedPosition);

        // Look at the pivot point
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
        }
        return forward;
    }
    
    getRightVector() {
        const right = new THREE.Vector3();
        if (this.currentMode === this.modes.FIRST_PERSON) {
            // First-person: normal right vector
            const forward = this.getForwardVector();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0)); // Corrected order
            right.normalize();
        } else {
            // Third-person: calculate right from forward vector
            const forward = this.getForwardVector();
            // This is the corrected line for A/D controls
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
            right.normalize();
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