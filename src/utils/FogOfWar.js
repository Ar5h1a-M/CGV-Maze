//src\utils\FogOfWar.js

import * as THREE from 'three';

export class FogOfWar {
    constructor(scene, mazeData, gameManager = null) {
        this.scene = scene;
        this.mazeData = mazeData;
        this.gameManager = gameManager;
        this.discoveredAreas = new Set();
        this.fogMaterial = null;
        this.fogMeshes = [];
        this.baseDiscoveryRadius = 1.5; // Base visibility around player
        
        // Cone settings for flashlight
        this.coneAngle = Math.PI / 6; // 30 degrees
        this.coneDistance = 4.0; // How far the flashlight reaches
        
        this.init();
    }
    
    init() {
        // Create fog material
        this.fogMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        this.createFog();
    }
    
    createFog() {
        // Create fog planes covering the entire maze
        const fogGeometry = new THREE.PlaneGeometry(1, 1);
        const mazeSize = this.mazeData.size; // FIXED: Use this.mazeData
        
        for (let z = 0; z < mazeSize; z++) {
            for (let x = 0; x < mazeSize; x++) {
                // Only add fog where there are paths (not walls)
                if (this.mazeData.grid[z][x] === 0) {
                    const fogMesh = new THREE.Mesh(fogGeometry, this.fogMaterial);
                    fogMesh.position.set(x - this.mazeData.size/2, -1, z - this.mazeData.size/2); // FIXED: Use this.mazeData
                    fogMesh.rotation.x = -Math.PI / 2; // Make it horizontal
                    fogMesh.userData = { 
                        x, 
                        z, 
                        discovered: false,
                        worldX: x - mazeSize/2,
                        worldZ: z - mazeSize/2
                    };
                    this.scene.add(fogMesh);
                    this.fogMeshes.push(fogMesh);
                }
            }
        }
        
        console.log(`Created ${this.fogMeshes.length} fog tiles`);
    }
    
    update(playerPosition, playerDirection = null) {
        const playerGridX = Math.round(playerPosition.x + this.mazeData.size/2);
        const playerGridZ = Math.round(playerPosition.z + this.mazeData.size/2);

        this._debugFlashlightInfo(playerPosition, playerDirection);
        
        // Reset all fog to full opacity first
        this.fogMeshes.forEach(fogMesh => {
            fogMesh.material.opacity = 0.8;
        });
        
        // Process base radius clearance
        this.fogMeshes.forEach(fogMesh => {
            const { x, z, worldX, worldZ } = fogMesh.userData;
            
            const distance = Math.sqrt(
                Math.pow(worldX - playerPosition.x, 2) + 
                Math.pow(worldZ - playerPosition.z, 2)
            );
            
            // BASE RADIUS CLEARANCE (always active)
            if (distance <= this.baseDiscoveryRadius) {
                if (!fogMesh.userData.discovered) {
                    fogMesh.userData.discovered = true;
                    this.discoveredAreas.add(`${x},${z}`);
                }
                const opacity = Math.max(0.1, (distance / this.baseDiscoveryRadius) * 0.8);
                fogMesh.material.opacity = opacity;
            }
        });
        
        // FLASHLIGHT CONE CLEARANCE (only when flashlight is active)
        if (this.gameManager && this.gameManager.flashlightActive && playerDirection) {
            this._applyFlashlightCone(playerPosition, playerDirection);
        }
    }
    
    _applyFlashlightCone(playerPosition, playerDirection) {
        // Create a cone-shaped clearance area
        const coneDirection = playerDirection.clone().normalize();
        
        this.fogMeshes.forEach(fogMesh => {
            const { worldX, worldZ, x, z } = fogMesh.userData;
            
            // Vector from player to fog cell
            const toFog = new THREE.Vector3(
                worldX - playerPosition.x,
                0,
                worldZ - playerPosition.z
            );
            
            const distance = toFog.length();
            
            // Only process fog cells within possible cone range
            if (distance > this.coneDistance || distance < 0.1) {
                return;
            }
            
            toFog.normalize();
            
            // Calculate angle between flashlight direction and fog cell direction
            const dotProduct = coneDirection.dot(toFog);
            const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
            
            // Check if fog cell is within cone angle
            if (angle <= this.coneAngle) {
                if (!fogMesh.userData.discovered) {
                    fogMesh.userData.discovered = true;
                    this.discoveredAreas.add(`${x},${z}`);
                }
                
                // Calculate reveal strength based on distance and angle from cone center
                const distanceFactor = 1.0 - (distance / this.coneDistance);
                const angleFactor = 1.0 - (angle / this.coneAngle);
                const revealStrength = distanceFactor * angleFactor;
                
                // Make cone areas much clearer than base radius
                const coneOpacity = Math.max(0.05, 0.8 * (1.0 - revealStrength));
                
                // If this fog cell is also in base radius, use the lower opacity (more clear)
                fogMesh.material.opacity = Math.min(fogMesh.material.opacity, coneOpacity);
                
                // Debug: Show cone edges
                if (Math.random() < 0.001 && angle > this.coneAngle * 0.9) {
                    console.log(`🔦 Cone edge - Distance: ${distance.toFixed(2)}, Angle: ${(angle * 180/Math.PI).toFixed(1)}°`);
                }
            }
        });
        
        // Debug visualization (optional)
        //this._debugConeVisualization(playerPosition, coneDirection);
    }
    
    _debugConeVisualization(playerPosition, coneDirection) {
        // Remove previous debug visuals
        if (this.coneDebug) {
            this.scene.remove(this.coneDebug);
        }
        
        // Create cone visualization
        const coneLength = this.coneDistance;
        const coneWidth = Math.tan(this.coneAngle) * coneLength * 2;
        
        const coneGeometry = new THREE.ConeGeometry(coneWidth/2, coneLength, 8);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        
        this.coneDebug = new THREE.Mesh(coneGeometry, coneMaterial);
        
        // Position and orient the cone
        this.coneDebug.position.copy(playerPosition);
        this.coneDebug.position.y += 0.5; // Raise it slightly
        
        // Rotate cone to match player direction
        const coneRotation = new THREE.Quaternion();
        coneRotation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coneDirection);
        this.coneDebug.quaternion.copy(coneRotation);
        
        this.scene.add(this.coneDebug);
    }

    _debugFlashlightInfo(playerPosition, playerDirection) {
    if (Math.random() < 0.02) { // 2% chance per frame to avoid spam
        const flashlightActive = this.gameManager?.flashlightActive;
        console.log(`🔦 FogOfWar - Flashlight: ${flashlightActive ? 'ON' : 'OFF'}`);
        
        if (flashlightActive && playerDirection) {
            console.log(`   Player Position: (${playerPosition.x.toFixed(2)}, ${playerPosition.z.toFixed(2)})`);
            console.log(`   Player Direction: (${playerDirection.x.toFixed(2)}, ${playerDirection.z.toFixed(2)})`);
            console.log(`   Cone Angle: ${(this.coneAngle * 180/Math.PI).toFixed(1)}°`);
            console.log(`   Cone Distance: ${this.coneDistance} units`);
            
            // Count how many fog cells are in the cone
            let coneCells = 0;
            let totalCells = 0;
            
            this.fogMeshes.forEach(fogMesh => {
                totalCells++;
                const { worldX, worldZ } = fogMesh.userData;
                const toFog = new THREE.Vector3(worldX - playerPosition.x, 0, worldZ - playerPosition.z);
                const distance = toFog.length();
                
                if (distance <= this.coneDistance && distance > 0.1) {
                    toFog.normalize();
                    const dotProduct = playerDirection.dot(toFog);
                    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
                    
                    if (angle <= this.coneAngle) {
                        coneCells++;
                    }
                }
            });
            
            console.log(`   Fog cells in cone: ${coneCells}/${totalCells}`);
        }
    }
}

    
    clear() {
        this.fogMeshes.forEach(fogMesh => {
            this.scene.remove(fogMesh);
        });
        this.fogMeshes = [];
        
        if (this.coneDebug) {
            this.scene.remove(this.coneDebug);
        }
    }
    
    isAreaDiscovered(x, z) {
        return this.discoveredAreas.has(`${x},${z}`);
    }
}