import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";

export class MazeRenderer {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.walls = [];
    }

    render(mazeData, difficulty = 'medium') {  // Add difficulty parameter with default
        this.clearMaze();
        
        console.log('Rendering maze with size:', mazeData.size);
        
        // Create ground
        this.createGround(mazeData.size);
        
        // Create walls from grid
        this.createWalls(mazeData.grid, mazeData.size);
        
        // Create exit portal
        this.createExitPortal(mazeData.end, mazeData.size);
        
        // Add enemies, items, and traps - PASS DIFFICULTY
        this.populateMaze(mazeData, difficulty);
        
        console.log('Maze rendering complete. Total walls:', this.walls.length);
    }
    
    clearMaze() {
        this.walls.forEach(wall => {
            this.scene.remove(wall);
        });
        this.walls = [];
    }
    
    createGround(size) {
        const groundGeometry = new THREE.PlaneGeometry(size * 3, size * 3);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a7c59, // Brighter green
            roughness: 0.7,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.1; // Slightly below walls
        this.scene.add(ground);
        this.walls.push(ground);
        
        console.log('Ground created at size:', size * 3);
        
        // Physics ground
        const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
        const groundBody = this.world.createRigidBody(groundBodyDesc);
        const groundCollider = RAPIER.ColliderDesc.cuboid(size * 1.5, 0.1, size * 1.5);
        this.world.createCollider(groundCollider, groundBody);
    }
    
    createWalls(grid, size) {
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a6b47, // Brighter green for walls
            roughness: 0.8,
            metalness: 0.2
        });
        
        const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
        
        let wallCount = 0;
        
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[z].length; x++) {
                if (grid[z][x] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    const posX = x - size/2;
                    const posZ = z - size/2;
                    wall.position.set(posX, 1, posZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.walls.push(wall);
                    wallCount++;
                    
                    // Physics wall
                    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed();
                    const wallBody = this.world.createRigidBody(wallBodyDesc);
                    wallBody.setTranslation({ x: posX, y: 1, z: posZ });
                    const wallCollider = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
                    this.world.createCollider(wallCollider, wallBody);
                }
            }
        }
        
        console.log(`Created ${wallCount} walls`);
    }
    
    createExitPortal(position, mazeSize) {
        const portalGeometry = new THREE.CylinderGeometry(1, 1, 3, 16);
        const portalMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8888ff, // Brighter blue
            transparent: true,
            opacity: 0.8
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        const posX = position.x - mazeSize/2;
        const posZ = position.z - mazeSize/2;
        portal.position.set(posX, 1.5, posZ);
        this.scene.add(portal);
        this.walls.push(portal);
        
        // Add glowing effect
        const portalLight = new THREE.PointLight(0x8888ff, 2, 15);
        portalLight.position.copy(portal.position);
        this.scene.add(portalLight);
        
        console.log('Exit portal created at:', { x: posX, z: posZ });
    }
    
    populateMaze(mazeData) {
        // Place some test items
        this.placeItem(mazeData, { type: 'flashlight', color: 0xffff00 });
        this.placeItem(mazeData, { type: 'carrot', color: 0xff6600 });
        
        console.log('Maze populated with items');
    }
    
    placeItem(mazeData, item) {
        const availableSpots = [];
        
        // Find available spots (paths in the maze)
        for (let z = 0; z < mazeData.grid.length; z++) {
            for (let x = 0; x < mazeData.grid[z].length; x++) {
                if (mazeData.grid[z][x] === 0 && 
                    !(x === mazeData.start.x && z === mazeData.start.z) &&
                    !(x === mazeData.end.x && z === mazeData.end.z)) {
                    availableSpots.push({ x, z });
                }
            }
        }
        
        if (availableSpots.length > 0) {
            const spot = availableSpots[Math.floor(Math.random() * availableSpots.length)];
            const itemGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const itemMaterial = new THREE.MeshBasicMaterial({ color: item.color });
            const itemMesh = new THREE.Mesh(itemGeometry, itemMaterial);
            const posX = spot.x - mazeData.size/2;
            const posZ = spot.z - mazeData.size/2;
            itemMesh.position.set(posX, 0.5, posZ);
            this.scene.add(itemMesh);
            this.walls.push(itemMesh);
            
            // Add glowing effect
            const itemLight = new THREE.PointLight(item.color, 1, 5);
            itemLight.position.copy(itemMesh.position);
            this.scene.add(itemLight);
            
            console.log(`Placed ${item.type} at:`, { x: posX, z: posZ });
        }
    }

    // pop enimies
   // In MazeRenderer.js - fix the placeEnemies method
    placeEnemies(mazeData, difficulty) {
        const enemyTypes = this.getEnemyTypesForDifficulty(difficulty);
        const availableSpots = this.findAvailableSpots(mazeData);
        
        // Shuffle spots for random placement
        this.shuffleArray(availableSpots);
        
        let spotIndex = 0;
        
        // Use Object.entries to iterate over the enemyTypes object
        Object.entries(enemyTypes).forEach(([enemyType, count]) => {
            for (let i = 0; i < count && spotIndex < availableSpots.length; i++) {
                const spot = availableSpots[spotIndex++];
                const position = new THREE.Vector3(
                    spot.x - mazeData.size/2,
                    0.5,
                    spot.z - mazeData.size/2
                );
                
                // Just log for now - GameScene will handle actual enemy creation
                console.log(` Placing ${enemyType} at grid (${spot.x}, ${spot.z})`);
                // Enemy creation will be handled by GameScene
            }
        });
        
        console.log(`Placed enemies: ${JSON.stringify(enemyTypes)}`);
    }

// Also update the populateMaze method to accept difficulty
populateMaze(mazeData, difficulty) {
    this.placeEnemies(mazeData, difficulty);
    this.placeItems(mazeData);
    this.placeTraps(mazeData, difficulty);
}

    placeItems(mazeData) {
        const itemTypes = ['flashlight', 'trenchcoat', 'carrot', 'note'];
        const availableSpots = this.findAvailableSpots(mazeData);
        
        this.shuffleArray(availableSpots);
        
        // Place one of each item type
        itemTypes.forEach((itemType, index) => {
            if (index < availableSpots.length) {
                const spot = availableSpots[index];
                const position = new THREE.Vector3(
                    spot.x - mazeData.size/2,
                    0.2,
                    spot.z - mazeData.size/2
                );
                
                console.log(`Placing ${itemType} at grid (${spot.x}, ${spot.z})`);
                // Item creation will be handled by GameScene
            }
        });
    }

    placeTraps(mazeData, difficulty) {
    const trapCount = this.getTrapCount(difficulty);
    const availableSpots = this.findAvailableSpots(mazeData);
    
    this.shuffleArray(availableSpots);
    
    for (let i = 0; i < trapCount && i < availableSpots.length; i++) {
        const spot = availableSpots[i];
        
        // Trap visualization
        const trapGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8);
        const trapMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.7,
            visible: true
        });
        
        const trap = new THREE.Mesh(trapGeometry, trapMaterial);
        trap.position.set(
            spot.x - mazeData.size/2,
            0.05,
            spot.z - mazeData.size/2
        );
        trap.userData = { 
            isTrap: true, 
            damage: this.getTrapDamage(difficulty),
            type: 'trap',
            triggered: false
        };
        this.scene.add(trap);
        this.walls.push(trap);
        
        // FIXED: Better physics trap setup
        const trapBodyDesc = RAPIER.RigidBodyDesc.fixed();
        const trapBody = this.world.createRigidBody(trapBodyDesc);
        trapBody.setTranslation({
            x: trap.position.x,
            y: 0.05,
            z: trap.position.z
        });
        
        // Use a thinner collider that's definitely a sensor
        const trapCollider = RAPIER.ColliderDesc.cuboid(0.3, 0.02, 0.3); // Thinner
        trapCollider.setSensor(true); // Important: sensor doesn't generate contact forces
        trapCollider.setRestitution(0.0); // No bounce
        trapCollider.setFriction(0.0); // No friction
        
        const trapPhysicsCollider = this.world.createCollider(trapCollider, trapBody);
        trap.userData.physicsCollider = trapPhysicsCollider;
        
        console.log(`⚠️ Placed trap at (${spot.x}, ${spot.z})`);
    }
}
    // Helper methods
    findAvailableSpots(mazeData) {
        const spots = [];
        for (let z = 0; z < mazeData.grid.length; z++) {
            for (let x = 0; x < mazeData.grid[z].length; x++) {
                if (mazeData.grid[z][x] === 0 && 
                    !(x === mazeData.start.x && z === mazeData.start.z) &&
                    !(x === mazeData.end.x && z === mazeData.end.z)) {
                    spots.push({ x, z });
                }
            }
        }
        return spots;
    }

    getEnemyTypesForDifficulty(difficulty) {
        const enemyPools = {
            easy: { 'spider': 2, 'rat': 1 },
            medium: { 'spider': 3, 'rat': 2, 'glowing_spider': 1 },
            hard: { 'spider': 4, 'rat': 3, 'zombie': 2, 'glowing_rat': 1, 'glowing_human': 1 }
        };
        return enemyPools[difficulty] || enemyPools.easy;
    }

    getEnemyCounts(difficulty, maxSpots) {
        const counts = {
            easy: Math.min(3, Math.floor(maxSpots * 0.1)),
            medium: Math.min(6, Math.floor(maxSpots * 0.15)),
            hard: Math.min(10, Math.floor(maxSpots * 0.2))
        };
        return counts[difficulty] || counts.easy;
    }

    getTrapCount(difficulty) {
        const counts = { easy: 2, medium: 4, hard: 6 };
        return counts[difficulty] || counts.easy;
    }

    getTrapDamage(difficulty) {
        const damages = { easy: 3, medium: 3, hard: 7 };
        return damages[difficulty] || damages.easy;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}