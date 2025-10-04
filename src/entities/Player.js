import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";
import { InputHandler } from '../utils/InputHandler.js';
import { CameraController } from '../utils/CameraController.js';
import Flashlight from './Flashlight.js'; // <<< NEW

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
        this.jumpForce = 10;
        this.isGrounded = false;
        
        // Player state
        this.isBlocking = false;
        this.currentItem = null;

        // Flashlight
        this.flashlight = null;   // SpotLight helper
        this.hasFlashlight = false;
        this._prevE = false;      // edge detection
        this._prevF = false;
    }
    
    spawn() {
        console.log('Spawning player...');
        
        // Create player visual
        const geometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8); // Smaller capsule
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x4444ff,
            roughness: 0.3,
            metalness: 0.7
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Position player at maze start - LOWER HEIGHT
        this.mesh.position.set(0, 0.8, 0); // Lower starting position
        this.scene.add(this.mesh);
        
        // Create physics body - LOWER HEIGHT
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(0, 0.8, 0) // Lower starting position
            .lockRotations();
        this.body = this.world.createRigidBody(bodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.capsule(0.2, 0.15); // Smaller collider
        this.collider = this.world.createCollider(colliderDesc, this.body);
        
        // Setup camera - use the scene's camera
        this.camera = this.scene.camera;
        if (this.camera && this.renderer) {
            this.cameraController = new CameraController(this.camera, this.renderer.domElement);
            console.log('Camera controller created with camera:', this.camera.position);
        } else {
            console.error('Camera or renderer not available for player!');
        }
        
        // Flashlight (mounted to camera, OFF until picked up)
        this.flashlight = new Flashlight(this.camera);
        
        console.log('Player spawned');
    }
    
    update(deltaTime) {
        if (!this.body || !this.mesh) return;
        
        // Sync visual with physics
        const position = this.body.translation();
        this.mesh.position.set(position.x, position.y, position.z);
        
        // Update camera controller - mouse look & camera position
        if (this.cameraController) {
            this.cameraController.update(deltaTime, this.mesh.position);
        }
        
        // Update blocking state
        this.isBlocking = this.inputHandler.isBlocking();
        
        // Handle movement (keeps your fixed jump/grounding style)
        this.handleMovement(deltaTime);
        
        // Handle stamina
        this.handleStamina(deltaTime);
        
        // Handle item usage (numbers / generic E use)
        this.handleItems();

        // Flashlight pickup/toggle/battery HUD
        this._flashlightControls(deltaTime);
        
        // Debug: log camera position occasionally
        if (Math.random() < 0.02 && this.camera) { // 2% chance per frame
            console.log('Player pos:', this.mesh.position, 'Camera pos:', this.camera.position);
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
        
        // Jump (unchanged)
        if (isJumping && this.isGrounded) {
            this.body.applyImpulse({ x: 0, y: this.jumpForce, z: 0 }, true);
            this.isGrounded = false;
            console.log('Jump!');
        }
        
        // Apply horizontal velocity, preserve Y from physics
        this.body.setLinvel({ x: this.velocity.x, y: this.body.linvel().y, z: this.velocity.z }, true);
        
        // Ground check (unchanged style)
        const pos = this.body.translation();
        const isOnGround = pos.y <= 1.1 && Math.abs(this.body.linvel().y) < 0.1;
        
        if (isOnGround && !this.isGrounded) {
            this.isGrounded = true;
            console.log('Landed on ground at y=', pos.y.toFixed(3));
        } else if (!isOnGround && this.isGrounded) {
            this.isGrounded = false;
        }
        
        if (movement.x !== 0 || movement.z !== 0) {
            console.log('Moving - Pos:', {x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2)}, 
                        'Grounded:', this.isGrounded);
        }
    }
    
    handleStamina(deltaTime) {
        const isSprinting = this.inputHandler.isSprinting();
        const movement = this.inputHandler.getMovementVector(this.cameraController);
        const isMoving = movement.x !== 0 || movement.z !== 0;
        
        if (isSprinting && isMoving) {
            this.gameManager.updatePlayerStamina(-30 * deltaTime);
        } else {
            this.gameManager.updatePlayerStamina(20 * deltaTime);
        }
    }
    
    handleItems() {
        // Number keys 1-5 for item selection
        for (let i = 0; i < 5; i++) {
            if (this.inputHandler.isKeyPressed(`Digit${i + 1}`)) {
                this.selectItem(i);
            }
        }
        
        // E to use currently selected inventory item (kept)
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
            this.gameManager.useInventoryItem(this.gameManager.playerData.inventory.indexOf(this.currentItem));
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

    // ===== FLASHLIGHT =====
    _flashlightControls(dt) {
        if (!this.flashlight) return;

        // Edge-detect E to PICK UP nearby flashlight item
        const eNow = this.inputHandler.isKeyPressed('KeyE');
        if (eNow && !this._prevE && !this.hasFlashlight) {
            const found = this._findNearby('item:flashlight', 1.2);
            if (found) {
                found.parent?.remove(found);
                this.hasFlashlight = true;
                this.flashlight.enabled = true;

                // add to inventory so HUD can show it
                if (this.gameManager?.playerData?.inventory) {
                    this.gameManager.playerData.inventory.push({ type: 'flashlight' });
                }
            }
        }
        this._prevE = eNow;

        // Edge-detect F to TOGGLE beam
        const fNow = this.inputHandler.isKeyPressed('KeyF');
        if (fNow && !this._prevF && this.hasFlashlight) {
            const on = this.flashlight.toggle();
            this.gameManager?.hud?.setBattery?.(this.flashlight.percent, on);
        }
        this._prevF = fNow;

        // Battery tick + HUD update
        this.flashlight.update(dt);
        this.gameManager?.hud?.setBattery?.(this.flashlight.percent, this.flashlight.on);
    }

    _findNearby(name, radius = 1.2) {
        const me = this.mesh.position;
        let hit = null;
        this.scene.traverse(o => {
            if (!hit && o.isMesh && o.name === name && o.position.distanceTo(me) <= radius) hit = o;
        });
        return hit;
    }
}
