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
        const wallTexture = this.textureLoader.load('./textures/wall_horror.jpg');
        const groundTexture = this.textureLoader.load('./textures/ground_horror.jpg');
        
        // Load bump/normal maps with error handling
        const wallBump = this.textureLoader.load(
            './textures/wall_bump2.jpg',
            (texture) => console.log('✅ Wall bump map loaded'),
            undefined,
            (err) => console.warn('⚠️ Wall bump map failed to load:', err)
        );
        
        const groundBump = this.textureLoader.load(
            './textures/ground_bump2.jpg',
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

        wallTexture.colorSpace = THREE.SRGBColorSpace;
        groundTexture.colorSpace = THREE.SRGBColorSpace;
        wallBump.colorSpace = THREE.SRGBColorSpace;
        groundBump.colorSpace = THREE.SRGBColorSpace;

        // Shared materials with enhanced bump settings
        this.materials = {
            wall: new THREE.MeshStandardMaterial({
                map: wallTexture,
                bumpMap: wallBump,
                bumpScale: 4.0,          // Increased for more visible effect
                displacementMap: null,    // Ensure no displacement conflict
                roughness: 0.95,
                metalness: 0.05
           }),
            ground: new THREE.MeshStandardMaterial({
                map: groundTexture,
                bumpMap: groundBump,
                bumpScale: 3.0,          // Increased for more visible effect
               displacementMap: null,
                roughness: 1.0,
                metalness: 0.0
            })
        };

        console.log('🎨 Materials created with bump maps (scale: wall=1.5, ground=1.0)');
    }

    // loadTextures() {
    //     // 👇 EDIT THESE FILENAMES ONLY to swap textures
    //     const wallTexture = this.textureLoader.load('/textures/wall_horror.jpg');
    //     const groundTexture = this.textureLoader.load('/textures/ground_horror.jpg');
    //     const wallNormal = this.textureLoader.load('/textures/wall_normal.png'); // optional

    //     wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    //     wallTexture.repeat.set(1, 2);

    //     groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    //     groundTexture.repeat.set(8, 8);

    //     // Shared materials (efficient!)
    //     this.materials = {
    //         wall: new THREE.MeshStandardMaterial({
    //             map: wallTexture,
    //             normalMap: wallNormal,   // adds bumps if you provide a normal map
   //             roughness: 0.95,
    //             metalness: 0.05
    //         }),
    //         ground: new THREE.MeshStandardMaterial({
    //             map: groundTexture,
   //             roughness: 1.0,
   //             metalness: 0.0
    //         })
    //     };

    //     console.log('Horror textures loaded ✅');
    // }

    render(mazeData, difficulty = 'medium') {  // Add difficulty parameter with default
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

// // In MazeRenderer.js - add to the render method
// createMazeBoundaries(mazeData) {
//     const boundarySize = mazeData.size + 2; // Slightly larger than maze
//     const boundaryHeight = 10;
    
//     // Create warning signs around the perimeter
//     this.createWarningSigns(mazeData);
    
//     // Create invisible kill boundaries
//     this.createKillBoundaries(mazeData, boundarySize, boundaryHeight);
// }

createMazeBoundaries(mazeData) {
    const boundarySize = mazeData.size+3;
    
    // Create warning zone (visible to player)
    this.createWarningZone(mazeData);
    
    // Create death zone (further out, invisible)
    this.createDeathZone(mazeData);
}

createWarningZone(mazeData) {
    const warningDistance = 1; // 2 units beyond maze edge
    const zoneSize = mazeData.size + warningDistance * 2;
    
    // Create subtle ground texture change for warning zone
    const zoneGeometry = new THREE.PlaneGeometry(zoneSize, zoneSize);
    const zoneMaterial = new THREE.MeshBasicMaterial({
        color: 0x330000,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    
    const warningZone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    warningZone.rotation.x = -Math.PI / 2;
    warningZone.position.y = -0.05;
    this.scene.add(warningZone);
    
    // Add warning signs at the actual maze boundary
    this.createWarningSigns(mazeData);
}


createDeathZone(mazeData) {
    const deathDistance = 8; // 5 units beyond maze edge = instant death
    const zoneSize = mazeData.size+10 + deathDistance * 2;
    const boundaryHeight = 10;
    
    const boundaryGeometry = new THREE.BoxGeometry(zoneSize, boundaryHeight, 1);
    const boundaryMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.0, // Completely invisible
        visible: false
    });
    
    // Create boundaries on all four sides
    const boundaries = [
        { position: [0, boundaryHeight/2, -zoneSize/2], size: [zoneSize, boundaryHeight, 1] },
        { position: [0, boundaryHeight/2, zoneSize/2], size: [zoneSize, boundaryHeight, 1] },
        { position: [-zoneSize/2, boundaryHeight/2, 0], size: [1, boundaryHeight, zoneSize] },
        { position: [zoneSize/2, boundaryHeight/2, 0], size: [1, boundaryHeight, zoneSize] }
    ];
    
    boundaries.forEach((boundary, index) => {
        const boundaryMesh = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        boundaryMesh.position.set(...boundary.position);
        boundaryMesh.userData = {
            isDeathBoundary: true,
            boundaryIndex: index
        };
        this.scene.add(boundaryMesh);
        
        // Physics boundary - SENSOR ONLY
        const bodyDesc = RAPIER.RigidBodyDesc.fixed();
        const body = this.world.createRigidBody(bodyDesc);
        body.setTranslation(boundaryMesh.position);
        const collider = RAPIER.ColliderDesc.cuboid(...boundary.size.map(s => s/2));
        collider.setSensor(true); // Detect but don't physically block
        this.world.createCollider(collider, body);
    });
}

createWarningSigns(mazeData) {
    const perimeterPositions = [
        { x: -mazeData.size/2 - 1, z: 0, rotation: 0 }, // Left
        { x: mazeData.size/2 + 1, z: 0, rotation: Math.PI }, // Right
        { x: 0, z: -mazeData.size/2 - 1, rotation: Math.PI/2 }, // Top
        { x: 0, z: mazeData.size/2 + 1, rotation: -Math.PI/2 } // Bottom
    ];
    
    // Different creepy sign types for variety
    const signTypes = [
        this.createBloodySign(),
        this.createScratchedSign(), 
        this.createCultSign(),
        this.createWeepingSign()
    ];
    
    perimeterPositions.forEach((pos, index) => {
        const signType = signTypes[index % signTypes.length];
        const sign = new THREE.Mesh(signType.geometry, signType.material);
        sign.position.set(pos.x, 1.5, pos.z);
        sign.rotation.y = pos.rotation;
        sign.userData = { 
            isWarningSign: true,
            signType: index % signTypes.length
        };
        this.scene.add(sign);
        this.walls.push(sign);
        
        // Add creepy flickering light
        this.createCreepyLight(sign.position, index);
        

    });
}

createBloodySign() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Blood-stained background
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(0, 0, 256, 128);
    
    // Blood drips
    ctx.fillStyle = '#8b0000';
    for (let i = 0; i < 15; i++) {
        const x = 20 + Math.random() * 216;
        const width = 2 + Math.random() * 3;
        const height = 20 + Math.random() * 40;
        ctx.fillRect(x, 10, width, height);
    }
    
    // Scratched text
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TURN BACK', 128, 40);
    
    ctx.font = 'italic 18px "Courier New", monospace';
    ctx.fillStyle = '#cc3333';
    ctx.fillText('THEY HUNGER FOR FLESH', 128, 70);
    ctx.fillText('YOUR SCREAMS FEED THEM', 128, 95);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    return { geometry: new THREE.PlaneGeometry(1.8, 0.9), material };
}

createScratchedSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Weathered wood background
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, 256, 128);
    
    // Wood grain
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 6);
        ctx.lineTo(256, i * 6 + Math.random() * 10 - 5);
        ctx.stroke();
    }
    
    // Deep scratches
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const startX = Math.random() * 256;
        const startY = Math.random() * 128;
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 30 + Math.random() * 50, startY + Math.random() * 20 - 10);
        ctx.stroke();
    }
    
    // Carved text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO ESCAPE', 128, 35);
    
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('The walls have ears', 128, 60);
    ctx.fillText('The shadows have teeth', 128, 80);
    ctx.fillText('You are already dead', 128, 100);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    return { geometry: new THREE.PlaneGeometry(1.8, 0.9), material };
}

createCultSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Dark ritual background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, 256, 128);
    
    // Occult symbols
    ctx.strokeStyle = '#8a2be2';
    ctx.lineWidth = 2;
    
    // Pentagram
    ctx.beginPath();
    ctx.arc(128, 64, 25, 0, Math.PI * 2);
    ctx.stroke();
    
    // Strange symbols around
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = 128 + Math.cos(angle) * 40;
        const y = 64 + Math.sin(angle) * 40;
        this.drawOccultSymbol(ctx, x, y);
    }
    
    // Glowing text
    ctx.fillStyle = '#9370db';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SACRIFICE ZONE', 128, 40);
    
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#ba55d3';
    ctx.fillText('Your soul nourishes the ancient ones', 128, 65);
    ctx.fillText('Step further and become eternal', 128, 85);
    ctx.fillText('Join the chorus of the damned', 128, 105);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: 0x2a0a4a,
        emissiveIntensity: 0.3
    });
    
    return { geometry: new THREE.PlaneGeometry(1.8, 0.9), material };
}

createWeepingSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Tear-stained background
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, 0, 256, 128);
    
    // Tear streaks
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const x = 50 + i * 30;
        ctx.moveTo(x, 10);
        ctx.lineTo(x + 10, 120);
        ctx.stroke();
    }
    
    // Desperate text
    ctx.fillStyle = '#87ceeb';
    ctx.font = 'italic 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('I TRIED TO LEAVE', 128, 40);
    
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('Now my voice joins the whispers', 128, 65);
    ctx.fillText('My body feeds the soil', 128, 85);
    ctx.fillText('Save yourself while you can', 128, 105);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    return { geometry: new THREE.PlaneGeometry(1.8, 0.9), material };
}

drawOccultSymbol(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 6, y + 8);
    ctx.lineTo(x - 6, y + 3);
    ctx.lineTo(x + 6, y - 3);
    ctx.lineTo(x - 6, y + 8);
    ctx.closePath();
    ctx.stroke();
}

createCreepyLight(position, index) {
    // Flickering red light
    const light = new THREE.PointLight(0xff3300, 0.8, 8);
    light.position.copy(position);
    light.position.y = 3;
    this.scene.add(light);
    
    // Animate flickering
    const flicker = () => {
        const intensity = 0.5 + Math.random() * 0.5;
        const distance = 6 + Math.random() * 4;
        light.intensity = intensity;
        light.distance = distance;
        
        setTimeout(flicker, 100 + Math.random() * 200);
    };
    flicker();
    
    // Add light glow effect
    const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(light.position);
    this.scene.add(glow);
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
            spot.z - mazeData.size/2       );
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