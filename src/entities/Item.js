import * as THREE from 'three';

export class Item {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.position = position;
        this.mesh = null;
        this.isCollected = false;
        
        this.setupItem();
        this.spawn();
    }
    
    setupItem() {
        this.stats = {
            flashlight: { 
                color: 0xffff00, 
                geometry: new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8),
                rotation: new THREE.Euler(Math.PI / 2, 0, 0)
            },
            trenchcoat: { 
                color: 0x8b4513, 
                geometry: new THREE.BoxGeometry(0.4, 0.01, 0.6),
                rotation: new THREE.Euler(0, 0, 0)
            },
            carrot: { 
                color: 0xff6600, 
                geometry: new THREE.ConeGeometry(0.1, 0.3, 8),
                rotation: new THREE.Euler(0, 0, 0)
            },
            note: { 
                color: 0xffffff, 
                geometry: new THREE.PlaneGeometry(0.3, 0.4),
                rotation: new THREE.Euler(-Math.PI / 2, 0, 0)
            }
        };
    }
    
    spawn() {
        const itemStats = this.stats[this.type];
        if (!itemStats) return;
        
        const material = new THREE.MeshStandardMaterial({ 
            color: itemStats.color,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.mesh = new THREE.Mesh(itemStats.geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y += 0.2; // Float slightly above ground
        this.mesh.rotation.copy(itemStats.rotation);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add floating animation
        this.startY = this.mesh.position.y;
        this.floatOffset = 0;
        
        // Add point light for visibility
        if (this.type === 'flashlight') {
            this.light = new THREE.PointLight(itemStats.color, 1, 3);
            this.light.position.copy(this.mesh.position);
            this.scene.add(this.light);
        }
        
        this.scene.add(this.mesh);
        console.log(`Spawned ${this.type} at`, this.position);
    }
    
    update(deltaTime) {
        if (this.isCollected || !this.mesh) return;
        
        // Floating animation
        this.floatOffset += deltaTime * 2;
        this.mesh.position.y = this.startY + Math.sin(this.floatOffset) * 0.1;
        
        // Rotate slowly
        this.mesh.rotation.y += deltaTime;
        
        // Update light position if exists
        if (this.light) {
            this.light.position.copy(this.mesh.position);
        }
    }
    
    collect() {
        if (this.isCollected) return null;
        
        this.isCollected = true;
        console.log(`📦 Collected ${this.type}`);
        
        // Remove from scene
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.light) {
            this.scene.remove(this.light);
        }
        
        return {
            type: this.type,
            description: this.getItemDescription()
        };
    }
    
    getItemDescription() {
        const descriptions = {
            flashlight: "Increases visibility radius",
            trenchcoat: "Reduces ambient maze damage", 
            carrot: "Heals 15 HP and clears fog temporarily",
            note: "A mysterious note with maze lore"
        };
        return descriptions[this.type] || "Unknown item";
    }
    
    isNearPlayer(playerPosition, pickupRange = 1.0) {
        if (!playerPosition || !this.mesh || this.isCollected) return false;
        
        const distance = this.mesh.position.distanceTo(playerPosition);
        return distance <= pickupRange;
    }
}