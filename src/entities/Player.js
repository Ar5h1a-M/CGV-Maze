//src\entities\Player.js

import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";
import { InputHandler } from '../utils/InputHandler.js';
import { CameraController } from '../utils/CameraController.js';

export class Player {
    constructor(scene, world, gameManager, renderer) {
        this.scene = scene;
        this.world = world;
        this.gameManager = gameManager;
        this.renderer = renderer;
        this.mesh = null;
        this.body = null;
        this.collider = null;
        this.camera = null;
        this.cameraController = null;
        
        this.inputHandler = new InputHandler();
        this.velocity = new THREE.Vector3();
        
        // Player stats
        this.moveSpeed = 1;
        this.sprintSpeed = 5;
        this.jumpForce = 0.5;
        this.isGrounded = false;
        
        // Player state
        this.isBlocking = false;
        this.currentItem = null;

        // For third-person rotation
        this.targetRotation = 0;
        this.rotationSpeed = 0.15;
        this.rotationDamping = 0.1;

        // Player visual components
        this.bodyMesh = null;
        this.headMesh = null;

        // Movement direction
        this.moveDirection = new THREE.Vector3();
    }
    
    spawn() {
        console.log('Spawning player...');
        
        // Create player container
        this.mesh = new THREE.Group();
        this.mesh.name = 'player';

        // Create player visuals
        this.createPlayerVisuals();
        
        // Position player at maze start
        this.mesh.position.set(0, 0.3, 0);
        this.scene.add(this.mesh);
        
        // Create physics body
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(0, 0.3, 0)
            .lockRotations();
        this.body = this.world.createRigidBody(bodyDesc);
        
        // Smaller capsule collider
        const colliderDesc = RAPIER.ColliderDesc.capsule(0.15, 0.2);
        this.collider = this.world.createCollider(colliderDesc, this.body);
        
        // Camera - FIX: Pass the scene parameter
        this.camera = this.scene.camera;
        if (this.camera && this.renderer) {
            this.cameraController = new CameraController(this.camera, this.renderer.domElement, this.scene);
            
            // Set up camera mode change callback
            this.cameraController.setCameraSwitchCallback(this.onCameraModeChanged.bind(this));
            
            console.log('Camera controller created with camera:', this.camera.position);
        } else {
            console.error('Camera or renderer not available for player!');
        }
        
        console.log('Player spawned at proper height');
    }
     createPlayerVisuals() {
        // Body (torso)
        const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.5, 8, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4444ff,
            roughness: 0.3,
            metalness: 0.7
        });
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.position.y = 0.35;
        this.bodyMesh.castShadow = true;
        this.mesh.add(this.bodyMesh);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffaa44,
            roughness: 0.4,
            metalness: 0.3
        });
        this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
        this.headMesh.position.y = 0.85;
        this.headMesh.castShadow = true;
        this.mesh.add(this.headMesh);

        // Add a forward indicator (small arrow) for debugging
        const arrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 4);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(0, 0.8, 0.2);
        arrow.rotation.x = Math.PI / 2;
        this.mesh.add(arrow);
    }

    onCameraModeChanged(mode) {
        console.log('Camera mode changed to:', mode);

        if (mode === 'thirdPerson') {
            // Show player in third-person
            this.mesh.visible = true;
            // Reset camera to behind player
            this.cameraController.resetThirdPersonCamera();
        } else {
            // In first-person, you can choose to hide player or keep visible
            this.mesh.visible = false; // Hide player model in first-person
        }
    }
    
    update(deltaTime) {
        if (!this.body || !this.mesh) return;
        
        // Sync visual with physics
        const position = this.body.translation();
        this.mesh.position.set(position.x, position.y, position.z);

        // Update player rotation based on movement
        this.updatePlayerRotation(deltaTime);
        
        // Camera controller update
        if (this.cameraController) {
            this.cameraController.update(deltaTime, this.mesh.position);
        }
        
        // Update blocking
        this.isBlocking = this.inputHandler.isBlocking();

         // Sync blocking state with GameManager
        if (this.gameManager) {
            this.gameManager.playerData.isBlocking = this.isBlocking;
        }

        // Visual feedback for blocking
        if (this.mesh.material) {
            if (this.isBlocking) {
                this.mesh.material.emissive.set(0x0000ff); // Blue glow when blocking
                this.mesh.material.emissiveIntensity = 0.3;
            } else {
                this.mesh.material.emissive.set(0x000000); // No glow when not blocking
                this.mesh.material.emissiveIntensity = 0;
            }
        }
        
        // Movement & stamina
        this.handleMovement(deltaTime);
        this.handleStamina(deltaTime);
        
        // Item usage
        this.handleItems();
        
        // Update gameManager with player state (for HUD + minimap)
        this.gameManager.playerData.position = {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            z: this.mesh.position.z
        };
        this.gameManager.playerData.rotation = {
            y: this.camera ? this.camera.rotation.y : 0
        };
    }

    updatePlayerRotation(deltaTime) {
        if (this.cameraController.getCurrentMode() === 'thirdPerson') {
            // In third-person, rotate player to face movement direction
            const movement = this.inputHandler.getMovementVector(this.cameraController);

            if (movement.x !== 0 || movement.z !== 0) {
                // Calculate target rotation from movement input
                this.targetRotation = Math.atan2(movement.x, movement.z);

                // Smooth rotation with damping
                const angleDiff = this.targetRotation - this.mesh.rotation.y;

                // Normalize angle difference to shortest path
                const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

                this.mesh.rotation.y += normalizedDiff * this.rotationSpeed;
            }
            // If not moving, maintain current rotation
        } else {
            // In first-person, player always faces camera direction
            if (this.cameraController) {
                this.mesh.rotation.y = this.cameraController.yaw;
            }
        }
    }
    
    handleMovement(deltaTime) {
    const movement = this.inputHandler.getMovementVector(this.cameraController);
    const isSprinting = this.inputHandler.isSprinting();
    const isJumping = this.inputHandler.isJumping();
    
    const currentSpeed = isSprinting ? this.sprintSpeed : this.moveSpeed;
    
    // Only apply horizontal movement, let physics handle Y
    this.velocity.x = movement.x * currentSpeed;
    this.velocity.z = movement.z * currentSpeed;
    // Don't set velocity.y here - let gravity handle it
    
    // Handle jumping
    if (isJumping && this.isGrounded) {
        // Apply impulse instead of setting velocity
        this.body.applyImpulse({ x: 0, y: this.jumpForce, z: 0 }, true);
        this.isGrounded = false;
        // Update stamina for jumping
        this.gameManager.updatePlayerStamina(-10);
        console.log('Jump!');
    }
    
    // Update physics body with only horizontal velocity
    this.body.setLinvel({ x: this.velocity.x, y: this.body.linvel().y, z: this.velocity.z }, true);
    
    // GROUND DETECTION (not collision handling)
    const pos = this.body.translation();
    const isOnGround = pos.y <= 1.1 && Math.abs(this.body.linvel().y) < 0.1;
    
    if (isOnGround && !this.isGrounded) {
        this.isGrounded = true;
        console.log('Landed on ground at y=', pos.y.toFixed(3));
    } else if (!isOnGround && this.isGrounded) {
        this.isGrounded = false;
    }
    
    // Debug
    if (movement.x !== 0 || movement.z !== 0) {
        console.log('Moving - Pos:', {x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2)}, 
                    'Grounded:', this.isGrounded);
    }

     if (isJumping) {
        console.log('Jump state:', { 
            grounded: this.isGrounded, 
            posY: pos.y.toFixed(2), 
            velY: this.body.linvel().y.toFixed(2) 
        });
    }
}
    
    handleStamina(deltaTime) {
        const isSprinting = this.inputHandler.isSprinting();
        const movement = this.inputHandler.getMovementVector(this.cameraController);
        const isMoving = movement.x !== 0 || movement.z !== 0;
        
        if (isSprinting && isMoving) {
            this.gameManager.updatePlayerStamina(-30 * deltaTime);
        } else if (this.isBlocking) {
            this.gameManager.updatePlayerStamina(-15 * deltaTime);
        } else {
            this.gameManager.updatePlayerStamina(20 * deltaTime);
        }

        // Auto-stop blocking if no stamina
        if (this.isBlocking && this.gameManager.playerData.stamina <= 0) {
            this.isBlocking = false;
            this.gameManager.playerData.isBlocking = false;
            console.log('💨 Out of stamina - blocking disabled');
        }
    }
    
    handleItems() {
        // Number keys for selection
        for (let i = 0; i < 5; i++) {
            if (this.inputHandler.isKeyPressed(`Digit${i + 1}`)) {
                this.selectItem(i);
            }
        }
        
        // Use item
        if (this.inputHandler.isKeyPressed('KeyE') && this.currentItem) {
            this.useCurrentItem();
        }
    }
    
    selectItem(slot) {
        if (slot >= 0 && slot < 5) {
            this.currentItem = this.gameManager.playerData.inventory[slot];
            console.log(`Selected item in slot ${slot + 1}:`, this.currentItem);
        }
    }
    
    useCurrentItem() {
        if (this.currentItem) {
            this.gameManager.useInventoryItem(
                this.gameManager.playerData.inventory.indexOf(this.currentItem)
            );
            this.currentItem = null;
        }
    }
    
    takeDamage(amount, isPoison = false) {
        const finalAmount = this.isBlocking && !isPoison ? amount * 0.5 : amount;
        this.gameManager.updatePlayerHealth(-finalAmount);
        
        // Visual feedback
        if (this.mesh.material) {
            this.mesh.material.color.set(0xff0000);
            setTimeout(() => {
                if (this.mesh.material) {
                    this.mesh.material.color.set(0x4444ff);
                }
            }, 200);
        }
    }
}
