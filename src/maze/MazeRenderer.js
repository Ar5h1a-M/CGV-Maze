import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";

export class MazeRenderer {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.walls = [];
        this.textureLoader = new THREE.TextureLoader();
        this.materials = {};
        this.loadTextures(); // Custom horror textures loaded here
    }

    
loadTextures() {
        // 👇 EDIT THESE FILENAMES ONLY to swap textures
        const wallTexture = this.textureLoader.load('/textures/wall_horror.jpg');
        const groundTexture = this.textureLoader.load('/textures/ground_horror.jpg');
        
        // Load bump/normal maps with error handling
        const wallBump = this.textureLoader.load(
            '/textures/wall_bump2.jpg',
            (texture) => console.log('✅ Wall bump map loaded'),
            undefined,
            (err) => console.warn('⚠️ Wall bump map failed to load:', err)
        );
        
        const groundBump = this.textureLoader.load(
            '/textures/ground_bump2.jpg',
            (texture) => console.log('✅ Ground bump map loaded'),
            undefined,
            (err) => console.warn('⚠️ Ground bump map failed to load:', err)
        );

        // Configure base textures
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(1, 2);

        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(8, 8);

        // Configure bump maps with same wrapping
        wallBump.wrapS = wallBump.wrapT = THREE.RepeatWrapping;
        wallBump.repeat.set(1, 2);

        groundBump.wrapS = groundBump.wrapT = THREE.RepeatWrapping;
        groundBump.repeat.set(8, 8);

        // Shared materials with enhanced bump settings
        this.materials = {
            wall: new THREE.MeshStandardMaterial({
                map: wallTexture,
                bumpMap: wallBump,
                bumpScale: 4.0,          // Increased for more visible effect
                displacementMap: null,    // Ensure no displacement conflict
                roughness: 0.95,
                metalness: 0.05
           }),
            ground: new THREE.MeshStandardMaterial({
                map: groundTexture,
                bumpMap: groundBump,
                bumpScale: 3.0,          // Increased for more visible effect
               displacementMap: null,
                roughness: 1.0,
                metalness: 0.0
            })
        };

        console.log('🎨 Materials created with bump maps (scale: wall=1.5, ground=1.0)');
    }

    // loadTextures() {
    //     // 👇 EDIT THESE FILENAMES ONLY to swap textures
    //     const wallTexture = this.textureLoader.load('/textures/wall_horror.jpg');
    //     const groundTexture = this.textureLoader.load('/textures/ground_horror.jpg');
    //     const wallNormal = this.textureLoader.load('/textures/wall_normal.png'); // optional

    //     wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    //     wallTexture.repeat.set(1, 2);

    //     groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    //     groundTexture.repeat.set(8, 8);

    //     // Shared materials (efficient!)
    //     this.materials = {
    //         wall: new THREE.MeshStandardMaterial({
    //             map: wallTexture,
    //             normalMap: wallNormal,   // adds bumps if you provide a normal map
   //             roughness: 0.95,
    //             metalness: 0.05
    //         }),
    //         ground: new THREE.MeshStandardMaterial({
    //             map: groundTexture,
   //             roughness: 1.0,
   //             metalness: 0.0
    //         })
    //     };

    //     console.log('Horror textures loaded ✅');
    // }

    render(mazeData, difficulty = 'medium') {  // Add difficulty parameter with default
        this.clearMaze();

        // Ground + walls with textures
        
        console.log('Rendering maze with size:', mazeData.size);
       
        // Create ground
        this.createGround(mazeData.size);
        this.createWalls(mazeData.grid, mazeData.size);

        this.createExitPortal(mazeData.end, mazeData.size);
        //this.populateMaze(mazeData);

        console.log('Maze rendered with horror textures');
        
        // Add enemies, items, and traps - PASS DIFFICULTY
        this.populateMaze(mazeData, difficulty);
        
        console.log('Maze rendering complete. Total walls:', this.walls.length);
    }

    clearMaze() {
        this.walls.forEach(wall => this.scene.remove(wall));
        this.walls = [];
    }

    createGround(size) {
        const groundGeometry = new THREE.PlaneGeometry(size * 3, size * 3);
       const ground = new THREE.Mesh(groundGeometry, this.materials.ground);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.1;
        this.scene.add(ground);
        this.walls.push(ground);

        // Physics (unchanged)
        const groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
       const groundBody = this.world.createRigidBody(groundBodyDesc);
        const groundCollider = RAPIER.ColliderDesc.cuboid(size * 1.5, 0.1, size * 1.5);
        this.world.createCollider(groundCollider, groundBody);
    }

    createWalls(grid, size) {
        const wallGeometry = new THREE.BoxGeometry(1, 2, 1);
        let wallCount = 0;

        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[z].length; x++) {
                if (grid[z][x] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, this.materials.wall);
                  const posX = x - size/2;
                    const posZ = z - size/2;
                    wall.position.set(posX, 1, posZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;

                    // --- THIS IS THE FIX ---
                    // Tag the wall mesh so the camera's raycaster can see it
                    wall.userData.isCollidable = true;
                    // -----------------------

                    this.scene.add(wall);
                    this.walls.push(wall);

                    // Physics
                    const wallBodyDesc = RAPIER.RigidBodyDesc.fixed();
                   const wallBody = this.world.createRigidBody(wallBodyDesc);
                    wallBody.setTranslation({ x: posX, y: 1, z: posZ });
                    const wallCollider = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5);
                   this.world.createCollider(wallCollider, wallBody);

                    wallCount++;
                }
            }
        }

        console.log(`Created ${wallCount} horror walls`);
   }

    // Exit portal + items remain unchanged
    createExitPortal(position, mazeSize) {
        const portalGeometry = new THREE.CylinderGeometry(1, 1, 3, 16);
        const portalMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.6
         });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        const posX = position.x - mazeSize/2;
        const posZ = position.z - mazeSize/2;
        portal.position.set(posX, 1.5, posZ);
        this.scene.add(portal);
        this.walls.push(portal);

        const portalLight = new THREE.PointLight(0xff0000, 2, 12);
        portalLight.position.copy(portal.position);
        this.scene.add(portalLight);

        console.log('Creepy exit portal created 👻');
    }

    populateMaze(mazeData) {
        this.placeItem(mazeData, { type: 'flashlight', color: 0xffff00 });
        this.placeItem(mazeData, { type: 'skull', color: 0xffffff });
        console.log('Items placed with horror theme');
    }

    placeItem(mazeData, item) {
        const availableSpots = [];
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
            spot.z - mazeData.size/2       );
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