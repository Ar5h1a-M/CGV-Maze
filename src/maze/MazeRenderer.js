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
        const wallNormal = this.textureLoader.load('/textures/wall_normal.png'); // optional

        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(1, 2);

        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(8, 8);

        // Shared materials (efficient!)
        this.materials = {
            wall: new THREE.MeshStandardMaterial({
                map: wallTexture,
                normalMap: wallNormal,   // adds bumps if you provide a normal map
                roughness: 0.95,
                metalness: 0.05
            }),
            ground: new THREE.MeshStandardMaterial({
                map: groundTexture,
                roughness: 1.0,
                metalness: 0.0
            })
        };

        console.log('Horror textures loaded ✅');
    }

    render(mazeData) {
        this.clearMaze();

        // Ground + walls with textures
        this.createGround(mazeData.size);
        this.createWalls(mazeData.grid, mazeData.size);

        this.createExitPortal(mazeData.end, mazeData.size);
        this.populateMaze(mazeData);

        console.log('Maze rendered with horror textures');
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
}
