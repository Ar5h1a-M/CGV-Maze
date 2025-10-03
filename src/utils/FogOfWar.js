import * as THREE from 'three';


export class FogOfWar {
    constructor(scene, mazeData, gameManager = null) {
        this.scene = scene;
        this.mazeData = mazeData;
        this.gameManager = gameManager; // Store reference to gameManager
        this.discoveredAreas = new Set();
        this.fogMaterial = null;
        this.fogMeshes = [];
        this.baseDiscoveryRadius = 1;
        this.discoveryRadius = this.baseDiscoveryRadius;

        
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
        const mazeSize = this.mazeData.size;
        
        for (let z = 0; z < mazeSize; z++) {
            for (let x = 0; x < mazeSize; x++) {
                // Only add fog where there are paths (not walls)
                if (this.mazeData.grid[z][x] === 0) {
                    const fogMesh = new THREE.Mesh(fogGeometry, this.fogMaterial);
                    fogMesh.position.set(x - mazeSize/2, -1, z - mazeSize/2);
                    fogMesh.rotation.x = -Math.PI / 2; // Make it horizontal
                    fogMesh.userData = { x, z, discovered: false };
                    this.scene.add(fogMesh);
                    this.fogMeshes.push(fogMesh);
                }
            }
        }
        
        console.log(`Created ${this.fogMeshes.length} fog tiles`);
    }
    
    update(playerPosition) {
        const playerGridX = Math.round(playerPosition.x + this.mazeData.size/2);
        const playerGridZ = Math.round(playerPosition.z + this.mazeData.size/2);

        if (this.gameManager && this.gameManager.flashlightActive) {
            this.discoveryRadius = this.baseDiscoveryRadius + this.gameManager.visibilityBoost;
        } else {
            this.discoveryRadius = this.baseDiscoveryRadius;
        }
        
        this.fogMeshes.forEach(fogMesh => {
            const { x, z } = fogMesh.userData;
            const distance = Math.sqrt(
                Math.pow(x - playerGridX, 2) + 
                Math.pow(z - playerGridZ, 2)
            );
            
            if (distance <= this.discoveryRadius) {
                if (!fogMesh.userData.discovered) {
                    fogMesh.userData.discovered = true;
                    this.discoveredAreas.add(`${x},${z}`);
                }
                // Gradually reduce opacity based on distance
                const opacity = Math.max(0, (distance / this.discoveryRadius) * 0.6);
                fogMesh.material.opacity = opacity;
            }
        });

        // Debug flashlight state
        if (Math.random() < 0.05) { // 5% chance per frame
            console.log(`🔦 Flashlight: ${this.gameManager?.flashlightActive ? 'ON' : 'OFF'}, Radius: ${this.discoveryRadius.toFixed(1)}`);
        }
    
    }
    
    clear() {
        this.fogMeshes.forEach(fogMesh => {
            this.scene.remove(fogMesh);
        });
        this.fogMeshes = [];
    }
    
    isAreaDiscovered(x, z) {
        return this.discoveredAreas.has(`${x},${z}`);
    }
}