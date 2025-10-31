// src/entities/Player.js
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
        this.moveSpeed = 0.8;
        this.sprintSpeed = 1.3;
        this.jumpForce = 0.2;
        this.isGrounded = false;
        console.log('Player initialized with moveSpeed:', this.moveSpeed, 'sprintSpeed:', this.sprintSpeed);

        // Player state
        this.isBlocking = false;
        this.currentItem = null;

        // Rotation helpers
        this.targetRotation = 0;
        this.rotationSpeed = 0.15;
        this.rotationDamping = 0.1;

        // Visual parts
        this.bodyMesh = null;
        this.headMesh = null;

        // Arms/hand grips (set in createPlayerVisuals)
        this.leftShoulder = null;
        this.rightShoulder = null;
        this.rightHandGrip = null;

        // Movement direction
        this.moveDirection = new THREE.Vector3();

        // Flashlight/torch
        this.hasFlashlight = false;  // becomes true when flashlight item exists in inventory
        this._prevF = false;
        this.torch = null;           // torch mesh (held in hand)
        this.torchLight = null;      // spotlight that beams from torch
        this._torchTarget = null;    // separate target so light keeps working even if player mesh is hidden

        // temp vectors
        this._tmpPos = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
    }

    spawn() {
        // Container
        this.mesh = new THREE.Group();
        this.mesh.name = 'player';

        // Visuals
        this.createPlayerVisuals();

        // Start position
        this.mesh.position.set(0, 0.3, 0);
        this.scene.add(this.mesh);

        // Physics
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(0, 0.3, 0)
            .lockRotations();
        this.body = this.world.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.capsule(0.15, 0.2);
        this.collider = this.world.createCollider(colliderDesc, this.body);

        // Camera/controller
        this.camera = this.scene.camera;
        if (this.camera && this.renderer) {
            this.cameraController = new CameraController(this.camera, this.renderer.domElement, this.scene);
            this.cameraController.setCameraSwitchCallback(this.onCameraModeChanged.bind(this));
            this._applyVisibilityForCameraMode();
        } else {
            console.error('Camera or renderer not available for player!');
        }
    }

    createPlayerVisuals() {
        const deg = (d) => d * (Math.PI / 180);

        // Keep your existing look/colors
        const skin   = new THREE.MeshLambertMaterial({ color: 0xffd3b5 });
        const jacket = new THREE.MeshLambertMaterial({ color: 0x2b6cb0 });
        const pants  = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

        // Torso
        const torsoGroup = new THREE.Group();
        const torsoGeo = new THREE.BoxGeometry(0.34, 0.36, 0.22);
        const torso = new THREE.Mesh(torsoGeo, jacket);
        torso.castShadow = torso.receiveShadow = true;
        torsoGroup.add(torso);
        torsoGroup.position.y = 0.44;
        this.mesh.add(torsoGroup);
        this.bodyMesh = torso;

        // Head + eyes
        const headGroup = new THREE.Group();
        const neckGeo  = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8);
        const neck     = new THREE.Mesh(neckGeo, skin);
        neck.position.y = -0.17;
        headGroup.add(neck);

        const headGeo = new THREE.BoxGeometry(0.28, 0.26, 0.26);
        const head = new THREE.Mesh(headGeo, skin);
        head.castShadow = head.receiveShadow = true;
        headGroup.add(head);

        const eyes = new THREE.Group();
        const eyeGeo = new THREE.SphereGeometry(0.02, 12, 8);
        const leftEye  = new THREE.Mesh(eyeGeo, eyeMat);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.085, 0.03, 0.13);
        rightEye.position.set( 0.085, 0.03, 0.13);
        eyes.add(leftEye, rightEye);
        headGroup.add(eyes);

        headGroup.position.y = torsoGroup.position.y + 0.33;
        this.mesh.add(headGroup);
        this.headMesh = head;

        // Arms (with shoulder groups so we can mount a hand "grip" to hold the torch)
        const armLen = 0.26;

        // LEFT
        {
            const shoulder = new THREE.Group();
            const upperGeo = new THREE.BoxGeometry(0.06, armLen, 0.06);
            const upper = new THREE.Mesh(upperGeo, skin);
            upper.castShadow = true;
            upper.position.y = -armLen * 0.5;
            shoulder.add(upper);
            shoulder.position.set( 0.22, torsoGroup.position.y + 0.07, 0.01);
            shoulder.rotation.z = deg(6 * -1);
            this.mesh.add(shoulder);
            this.leftShoulder = shoulder;
        }

        // RIGHT
        {
            const shoulder = new THREE.Group();
            const upperGeo = new THREE.BoxGeometry(0.06, armLen, 0.06);
            const upper = new THREE.Mesh(upperGeo, skin);
            upper.castShadow = true;
            upper.position.y = -armLen * 0.5;
            shoulder.add(upper);
            shoulder.position.set(-0.22, torsoGroup.position.y + 0.07, 0.01);
            shoulder.rotation.z = deg(6 * 1);

            // A small "grip" transform where we will attach the torch
            const grip = new THREE.Object3D();
            // Move grip to end of the arm and slightly forward/out
            grip.position.set(0, -armLen, 0.06);
            grip.rotation.set(0, 0, 0);
            shoulder.add(grip);

            this.mesh.add(shoulder);
            this.rightShoulder = shoulder;
            this.rightHandGrip = grip;
        }

        // Legs / feet
        const hipGroup = new THREE.Group();
        hipGroup.position.y = torsoGroup.position.y - 0.24;
        this.mesh.add(hipGroup);

        const upperLegGeo = new THREE.BoxGeometry(0.07, 0.18, 0.07);
        const legL = new THREE.Mesh(upperLegGeo, pants);
        const legR = new THREE.Mesh(upperLegGeo, pants);
        legL.castShadow = legR.castShadow = true;
        legL.position.set(-0.07, -0.09, 0);
        legR.position.set( 0.07, -0.09, 0);
        hipGroup.add(legL, legR);

        const footGeo = new THREE.BoxGeometry(0.09, 0.03, 0.14);
        const footL = new THREE.Mesh(footGeo, pants);
        const footR = new THREE.Mesh(footGeo, pants);
        footL.position.set(-0.07, -0.19, 0.05);
        footR.position.set( 0.07, -0.19, 0.05);
        hipGroup.add(footL, footR);
    }

_createTorchIfNeeded() {
    if (this.torch || !this.rightHandGrip) return;

    // === Flashlight model (metal handle + lens) ===
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1.0, roughness: 0.3 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 1.8 });

    const torch = new THREE.Group();

    // Handle (main body)
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 16), metalMat);
    handle.position.y = -0.12;
    torch.add(handle);

    // Head (flashlight front)
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.08, 16), lensMat);
    head.position.y = 0.05;
    torch.add(head);

    // Visual cone (beam appearance)
    const coneGeo = new THREE.ConeGeometry(0.4, 1.5, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffffcc,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.1;
    cone.rotation.x = -Math.PI / 2;
    torch.add(cone);
    this._torchCone = cone;

    // Make flashlight point forward in player's local space
    torch.rotation.set(THREE.MathUtils.degToRad(-10), 0, THREE.MathUtils.degToRad(10));

    // Attach torch to right hand grip
    this.rightHandGrip.add(torch);
    this.torch = torch;

    // === Spotlight (actual illumination) ===
    const spot = new THREE.SpotLight(0xfff8cc, 2.8, 12, Math.PI / 12, 0.15, 2.0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.visible = false;

    const target = new THREE.Object3D();
    this.scene.add(target);
    this.scene.add(spot);
    spot.target = target;

    this.torchLight = spot;
    this._torchTarget = target;
}


    _updateTorch() {
        if (!this.torchLight || !this._torchTarget || !this.camera) return;

        // Step 1: Get true player body position (right-hand offset)
        const bodyPos = this.body.translation();
        const playerPos = new THREE.Vector3(bodyPos.x - 0.1, bodyPos.y + 0.8, bodyPos.z + 0.05);

        // Step 2: Get facing direction from camera
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

        // Step 3: Move spotlight & its target
        const targetPos = playerPos.clone().add(forward.clone().multiplyScalar(8));
        this.torchLight.position.copy(playerPos);
        this._torchTarget.position.copy(targetPos);
        this.torchLight.target = this._torchTarget;

        // Step 4: Flashlight visibility (no change)
        const isOn = !!this.gameManager?.flashlightActive;
        this.torchLight.visible = isOn;

        // Step 5: Gentle flicker for realism
        if (isOn) {
            const t = performance.now() * 0.003;
            this.torchLight.intensity = 2.4 + Math.sin(t * 1.3) * 0.1 + Math.random() * 0.03;
        }

        // Step 6: Make flashlight mesh follow the camera’s direction
        if (this.torch && this.rightHandGrip) {
            const cameraQuat = new THREE.Quaternion();
            this.camera.getWorldQuaternion(cameraQuat);
            this.torch.quaternion.slerp(cameraQuat, 0.25); // smoother motion follow
            this.torch.rotateX(-Math.PI / 2.3); // tilt slightly downward
            this.torch.rotateY(Math.PI); // flip orientation so lens faces forward
        }

        // Step 7: Hide the debug cone completely
        if (this._torchCone) {
            this._torchCone.visible = false; // 🔥 hides the translucent cone
        }
    }




// _updateTorch() {
//     if (!this.torchLight || !this._torchTarget || !this.camera) return;

//     // Step 1: Get true player body position
//     const bodyPos = this.body.translation();
//     const playerPos = new THREE.Vector3(bodyPos.x, bodyPos.y + 0.85, bodyPos.z);

//     // Step 2: Get the player/camera facing direction
//     const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

//     // Step 3: Compute target position ahead
//     const targetPos = playerPos.clone().add(forward.clone().multiplyScalar(8));

//     // Step 4: Set spotlight position and direction
//     this.torchLight.position.copy(playerPos);
//     this._torchTarget.position.copy(targetPos);
//     this.torchLight.target = this._torchTarget;

//     // Step 5: Make beam visible when flashlight is active
//     const isOn = !!this.gameManager?.flashlightActive;
//     this.torchLight.visible = isOn;

//     // Step 6: Apply mild flicker for realism
//     if (isOn) {
//         const t = performance.now() * 0.003;
//         this.torchLight.intensity = 2.5 + Math.sin(t * 1.3) * 0.1 + Math.random() * 0.05;
//     }

//     // Step 7: Visually rotate flashlight to match player direction
//     if (this.torch && this.rightHandGrip) {
//         this.rightHandGrip.updateWorldMatrix(true, false);
//         const handQuat = new THREE.Quaternion();
//         this.rightHandGrip.getWorldQuaternion(handQuat);
//         this.torch.setRotationFromQuaternion(handQuat);
//         this.torch.rotateX(-Math.PI / 2.2); // tilt slightly forward
//     }

//     // Step 8: Align the visible beam cone
//     if (this._torchCone) {
//         this._torchCone.visible = isOn;
//         this._torchCone.position.set(0, 0.05, 0.08);
//         this._torchCone.scale.set(1, 1, 1);
//     }
// }

    _getCameraForward(out) {
        out.set(0, 0, -1);
        out.applyQuaternion(this.camera.quaternion).normalize();
        return out;
    }

    // Visibility for 1st/3rd person
    _applyVisibilityForCameraMode() {
        const mode = this.cameraController?.getCurrentMode?.() || 'firstPerson';
        // Hide whole body in first person for a clean view
        this.mesh.visible = (mode !== 'firstPerson');
        // Torch prop follows body visibility (it’s attached to the hand).
        if (this.torch) this.torch.visible = this.mesh.visible;
    }

    onCameraModeChanged() {
        this._applyVisibilityForCameraMode();
        if (this.cameraController?.getCurrentMode?.() === 'thirdPerson') {
            this.cameraController.resetThirdPersonCamera();
        }
    }

    update(deltaTime) {
        if (!this.body || !this.mesh) return;

        // Don't update player if dead
        if (this.gameManager?.isPlayerDead) {
            // You could add death animations here if needed
            return;
        }

        // Sync transform from physics
        const position = this.body.translation();
        this.mesh.position.set(position.x, position.y, position.z);

        // Rotation + camera
        this.updatePlayerRotation(deltaTime);
        if (this.cameraController) {
            this.cameraController.update(deltaTime, this.mesh.position);
            this._applyVisibilityForCameraMode();
        }

        // Acquire flashlight item automatically if it’s in inventory (so you can hold the torch)
        if (!this.hasFlashlight && this.gameManager?.playerData?.inventory) {
            const has = this.gameManager.playerData.inventory.some(i => i && i.type === 'flashlight');
            if (has) {
                this.hasFlashlight = true;
                this._createTorchIfNeeded();
            }
        }
        // Keep torch updated (beam follows hand)
        if (this.hasFlashlight) this._updateTorch();

        // Blocking state
        this.isBlocking = this.inputHandler.isBlocking();
        if (this.gameManager) this.gameManager.playerData.isBlocking = this.isBlocking;

        // Core gameplay
        this.handleMovement(deltaTime);
        this.handleStamina(deltaTime);
        this.handleItems();
        this._handleFlashlightToggle();

        // HUD/minimap state
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
            const movement = this.inputHandler.getMovementVector(this.cameraController);
            if (movement.x !== 0 || movement.z !== 0) {
                this.targetRotation = Math.atan2(movement.x, movement.z);
                const angleDiff = this.targetRotation - this.mesh.rotation.y;
                const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                this.mesh.rotation.y += normalizedDiff * this.rotationSpeed;
            }
        } else {
            if (this.cameraController) this.mesh.rotation.y = this.cameraController.yaw;
        }
    }

    handleMovement(deltaTime) {
    // Don't process movement if player is dead
    if (this.gameManager?.isPlayerDead) {
        // Stop all movement
        this.velocity.x = 0;
        this.velocity.z = 0;
        if (this.body) {
            this.body.setLinvel({ x: 0, y: this.body.linvel().y, z: 0 }, true);
        }
        return;
    }

    const movement = this.inputHandler.getMovementVector(this.cameraController);
    const isSprinting = this.inputHandler.isSprinting();
    const isJumping = this.inputHandler.isJumping();

    // Check if player has enough stamina to sprint
    const canSprint = this.gameManager.playerData.stamina > 1;
    const currentSpeed = (isSprinting && canSprint) ? this.sprintSpeed : this.moveSpeed;
    
    this.velocity.x = movement.x * currentSpeed;
    this.velocity.z = movement.z * currentSpeed;

    if (isJumping && this.isGrounded) {
        this.body.applyImpulse({ x: 0, y: this.jumpForce, z: 0 }, true);
        this.isGrounded = false;
        this.gameManager.updatePlayerStamina(-10);
    }

    this.body.setLinvel({ x: this.velocity.x, y: this.body.linvel().y, z: this.velocity.z }, true);

    const pos = this.body.translation();
    console.log(`📍 Player position: X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`);
    const isOnGround = pos.y <= 1.1 && Math.abs(this.body.linvel().y) < 0.1;
    if (isOnGround && !this.isGrounded) this.isGrounded = true;
    else if (!isOnGround && this.isGrounded) this.isGrounded = false;
}

handleStamina(deltaTime) {
    // Don't process stamina if player is dead
    if (this.gameManager?.isPlayerDead) return;

    const isSprinting = this.inputHandler.isSprinting();
    const movement = this.inputHandler.getMovementVector(this.cameraController);
    const isMoving = movement.x !== 0 || movement.z !== 0;

    // Only allow sprinting if stamina is available
    const canSprint = this.gameManager.playerData.stamina > 0;

    if (isSprinting && isMoving && canSprint) {
        this.gameManager.updatePlayerStamina(-30 * deltaTime);
    } else if (this.isBlocking) {
        this.gameManager.updatePlayerStamina(-15 * deltaTime);
    } else {
        this.gameManager.updatePlayerStamina(20 * deltaTime);
    }

    if (this.isBlocking && this.gameManager.playerData.stamina <= 0) {
        this.isBlocking = false;
        this.gameManager.playerData.isBlocking = false;
    }
}

    handleItems() {
        for (let i = 0; i < 5; i++) {
            if (this.inputHandler.isKeyPressed(`Digit${i + 1}`)) {
                this.selectItem(i);
            }
        }
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
    }

    // Toggle via F (requires flashlight in inventory)
    _handleFlashlightToggle() {
        if (!this.gameManager) return;
        if (!this.hasFlashlight) return;
        const isF = this.inputHandler.isKeyPressed('KeyF');
        if (isF && !this._prevF) {
            this.gameManager.flashlightActive = !this.gameManager.flashlightActive;
            console.log(`🔦 Flashlight ${this.gameManager.flashlightActive ? 'ON' : 'OFF'}`);
        }
        this._prevF = isF;
    }
}
