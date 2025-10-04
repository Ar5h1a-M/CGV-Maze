import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";

export class MazeRenderer {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.walls = [];
    }

    render(mazeData) {
        this.clearMaze();
        
        console.log('Rendering maze with size:', mazeData.size);
        console.log('Maze grid sample:', mazeData.grid.slice(0, 3).map(row => row.slice(0, 3)));
        
        // Create ground
        this.createGround(mazeData.size);
        
        // Create walls from grid
        this.createWalls(mazeData.grid, mazeData.size);
        
        // Create exit portal
        this.createExitPortal(mazeData.end, mazeData.size);
        
        // Add some random items
        this.populateMaze(mazeData);
        
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
            color: 0x4a7c59,
            roughness: 0.7,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.1;
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
            color: 0x3a6b47,
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
            color: 0x8888ff,
            transparent: true,
            opacity: 0.8
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        const posX = position.x - mazeSize/2;
        const posZ = position.z - mazeSize/2;
        portal.position.set(posX, 1.5, posZ);
        portal.name = 'exit:portal'; // <<< tag exit (optional)
        this.scene.add(portal);
        this.walls.push(portal);
        
        // Glow
        const portalLight = new THREE.PointLight(0x8888ff, 2, 15);
        portalLight.position.copy(portal.position);
        this.scene.add(portalLight);
        
        console.log('Exit portal created at:', { x: posX, z: posZ });
    }
    
    populateMaze(mazeData) {
        // Place items (flashlight + carrot)
        this.placeItem(mazeData, { type: 'flashlight', color: 0xffff00 });
        this.placeItem(mazeData, { type: 'carrot',     color: 0xff6600 });
        
        console.log('Maze populated with items');
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

            // <<< tag so Player can detect & pick up by type
            itemMesh.name = `item:${item.type}`;
            itemMesh.userData.type = item.type;

            this.scene.add(itemMesh);
            this.walls.push(itemMesh);
            
            // Glow
            const itemLight = new THREE.PointLight(item.color, 1, 5);
            itemLight.position.copy(itemMesh.position);
            this.scene.add(itemLight);
            
            console.log(`Placed ${item.type} at:`, { x: posX, z: posZ });
        }
    }
}
