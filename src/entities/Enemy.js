// src/entities/Enemy.js

import * as THREE from 'three';
import RAPIER from "@dimforge/rapier3d-compat";

export class Enemy {
    constructor(scene, world, type, difficulty, position) {
        this.scene = scene;
        this.world = world;
        this.type = type;
        this.difficulty = difficulty;
        this.position = position;
        this.mesh = null;
        this.body = null;
        this.collider = null;
        this.isAlive = true;
        this.lastAttackTime = 0;
        this.attackCooldown = 2000; // 2 seconds

        this.agroRadius = 8.0;
        this.attackRadius = 1.5;
        this.wanderSpeed = 0.5;
        this.isAggressive = false;
        this.wanderDirection = new THREE.Vector3();
        this.wanderTimer = 0;
        this.wanderInterval = 2.0;
        this.lastWanderChange = 0;

        this.setupStats();
        this.spawn();

        this.updateWanderDirection();
    }

    setupStats() {
        const stats = {
            spider: {
                health: 10, damage: 5, speed: 0.7, color: 0x8b0000,
                scale: 0.5, isPoison: false, poisonDamage: 0, poisonDuration: 0
            },
            rat: {
                health: 8, damage: 3, speed: 0.7, color: 0x666666,
                scale: 0.4, isPoison: false, poisonDamage: 0, poisonDuration: 0
            },
            zombie: {
                health: 30, damage: 20, speed: 0.6, color: 0x2d5a27,
                scale: 0.8, isPoison: false, poisonDamage: 0, poisonDuration: 0
            },
            glowing_spider: {
                health: 5, damage: 0, speed: 1, color: 0x00ff00,
                scale: 0.5, isPoison: true, poisonDamage: 1, poisonDuration: 15
            },
            glowing_rat: {
                health: 4, damage: 0, speed: 1, color: 0x00ff00,
                scale: 0.4, isPoison: true, poisonDamage: 2, poisonDuration: 15
            },
            glowing_human: {
                health: 15, damage: 0, speed: 0.8, color: 0x00ff00,
                scale: 0.8, isPoison: true, poisonDamage: 5, poisonDuration: 10
            }
        };

        const difficultyMultipliers = { easy: 0.7, medium: 1.0, hard: 1.5 };
        const baseStats = stats[this.type];
        const multiplier = difficultyMultipliers[this.difficulty];

        this.health = Math.floor(baseStats.health * multiplier);
        this.maxHealth = this.health;
        this.damage = Math.floor(baseStats.damage * multiplier);
        this.speed = baseStats.speed;
        this.color = baseStats.color;
        this.scale = baseStats.scale;
        this.isPoison = baseStats.isPoison;
        this.poisonDamage = baseStats.poisonDamage * multiplier;
        this.poisonDuration = baseStats.poisonDuration;

        if (this.type.includes('spider')) this.agroRadius = 6.0;
        else if (this.type.includes('rat')) this.agroRadius = 7.0;
        else this.agroRadius = 5.0;

        this.glowIntensity = this.type.includes('glowing') ? 2 : 0;
    }

    spawn() {
        const group = new THREE.Group();

        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.8,
            metalness: 0.2,
            emissive: this.type.includes('glowing') ? this.color : 0x000000,
            emissiveIntensity: this.type.includes('glowing') ? 0.8 : 0
        });

        switch (this.type) {
            case 'spider':
            case 'glowing_spider': {
                // Body
                const bodyGeom = new THREE.SphereGeometry(0.25 * this.scale, 16, 16);
                const bodyMesh = new THREE.Mesh(bodyGeom, material);
                bodyMesh.position.set(0, 0.25 * this.scale, 0);
                group.add(bodyMesh);

                // Legs
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const legGeom = new THREE.CylinderGeometry(0.02 * this.scale, 0.02 * this.scale, 0.5 * this.scale, 6);
                    const legMesh = new THREE.Mesh(legGeom, material);
                    legMesh.position.set(Math.cos(angle) * 0.25, 0.1 * this.scale, Math.sin(angle) * 0.25);
                    legMesh.rotation.z = Math.PI / 2;
                    legMesh.rotation.y = angle;
                    group.add(legMesh);
                }
                break;
            }

            case 'rat':
            case 'glowing_rat': {
                // Body
                const bodyGeom = new THREE.CapsuleGeometry(0.15 * this.scale, 0.4 * this.scale, 4, 8);
                const bodyMesh = new THREE.Mesh(bodyGeom, material);
                bodyMesh.position.set(0, 0.2 * this.scale, 0);
                group.add(bodyMesh);

                // Head
                const headGeom = new THREE.SphereGeometry(0.12 * this.scale, 12, 12);
                const headMesh = new THREE.Mesh(headGeom, material);
                headMesh.position.set(0, 0.25 * this.scale, 0.25 * this.scale);
                group.add(headMesh);

                // Tail
                const tailGeom = new THREE.CylinderGeometry(0.03 * this.scale, 0.02 * this.scale, 0.4 * this.scale, 6);
                const tailMesh = new THREE.Mesh(tailGeom, material);
                tailMesh.position.set(0, 0.1 * this.scale, -0.3 * this.scale);
                tailMesh.rotation.x = Math.PI / 2;
                group.add(tailMesh);
                break;
            }

            case 'zombie':
            case 'glowing_human': {
                // Body
                const bodyGeom = new THREE.CapsuleGeometry(0.25 * this.scale, 0.6 * this.scale, 8, 16);
                const bodyMesh = new THREE.Mesh(bodyGeom, material);
                bodyMesh.position.set(0, 0.3 * this.scale, 0);
                group.add(bodyMesh);

                // Head
                const headGeom = new THREE.SphereGeometry(0.15 * this.scale, 16, 16);
                const headMesh = new THREE.Mesh(headGeom, material);
                headMesh.position.set(0, 0.75 * this.scale, 0);
                group.add(headMesh);

                // Arms
                ['x', '-x'].forEach(sign => {
                    const armGeom = new THREE.CylinderGeometry(0.05 * this.scale, 0.05 * this.scale, 0.4 * this.scale, 8);
                    const armMesh = new THREE.Mesh(armGeom, material);
                    armMesh.position.set(sign === 'x' ? 0.25 * this.scale : -0.25 * this.scale, 0.55 * this.scale, 0);
                    armMesh.rotation.z = Math.PI / 8;
                    group.add(armMesh);
                });
                break;
            }

            default: {
                const defaultGeom = new THREE.SphereGeometry(0.3 * this.scale, 8, 8);
                const defaultMesh = new THREE.Mesh(defaultGeom, material);
                group.add(defaultMesh);
                break;
            }
        }

        group.position.copy(this.position);
        group.castShadow = true;
        group.receiveShadow = true;
        this.scene.add(group);
        this.mesh = group;

        // Physics
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(this.position.x, this.position.y, this.position.z)
            .lockRotations();
        this.body = this.world.createRigidBody(bodyDesc);

        let colliderDesc;
        if (this.type.includes('spider') || this.type.includes('rat')) {
            colliderDesc = RAPIER.ColliderDesc.ball(0.3 * this.scale);
        } else {
            colliderDesc = RAPIER.ColliderDesc.capsule(0.3 * this.scale, 0.15 * this.scale);
        }

        this.collider = this.world.createCollider(colliderDesc, this.body);

        console.log(`Spawned ${this.type} at`, this.position);
    }

    update(deltaTime, playerPosition) {
        if (!this.isAlive || !this.mesh) return;

        if (this.body) {
            const position = this.body.translation();
            this.mesh.position.set(position.x, position.y, position.z);
        }

        this.moveTowardPlayer(playerPosition, deltaTime);
        this.facePlayer(playerPosition);
    }

    moveTowardPlayer(playerPosition, deltaTime) {
        if (!playerPosition || !this.mesh) return;

        const enemyPos = this.mesh.position;
        const direction = new THREE.Vector3(
            playerPosition.x - enemyPos.x,
            0,
            playerPosition.z - enemyPos.z
        );

        const distance = direction.length();
        direction.normalize();

        if (distance > 1.0) {
            const moveDistance = this.speed * deltaTime;
            this.mesh.position.x += direction.x * moveDistance;
            this.mesh.position.z += direction.z * moveDistance;

            this.wanderDirection.copy(direction);

            if (this.body) {
                this.body.setTranslation(this.mesh.position, true);
                this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
        }

        if (Math.random() < 0.01) {
            console.log(`🕷️ ${this.type} moving toward player, distance: ${distance.toFixed(2)}`);
        }
    }

    wander(deltaTime) {
        if (!this.mesh) return;

        this.lastWanderChange += deltaTime;

        if (this.lastWanderChange >= this.wanderInterval) {
            this.updateWanderDirection();
            this.lastWanderChange = 0;
        }

        const moveDistance = this.wanderSpeed * deltaTime;
        this.mesh.position.x += this.wanderDirection.x * moveDistance;
        this.mesh.position.z += this.wanderDirection.z * moveDistance;

        if (this.body) {
            this.body.setTranslation(this.mesh.position, true);
            this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
    }

    updateWanderDirection() {
        const angle = Math.random() * Math.PI * 2;
        this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle)).normalize();
    }

    facePlayer(playerPosition) {
        if (!playerPosition || !this.mesh) return;

        const enemyPos = this.mesh.position;
        const direction = new THREE.Vector3(
            playerPosition.x - enemyPos.x,
            0,
            playerPosition.z - enemyPos.z
        ).normalize();

        this.mesh.lookAt(
            enemyPos.x + direction.x,
            enemyPos.y,
            enemyPos.z + direction.z
        );
    }

    getDistanceToPlayer(playerPosition) {
        if (!playerPosition || !this.mesh) return Infinity;

        const enemyPos = this.mesh.position;
        return Math.sqrt(
            Math.pow(playerPosition.x - enemyPos.x, 2) +
            Math.pow(playerPosition.z - enemyPos.z, 2)
        );
    }

    attack(player) {
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime < this.attackCooldown) return false;

        this.lastAttackTime = currentTime;

        if (player) {
            const isBlocking = player.isBlocking;
            let finalDamage = this.damage;
            let poisonApplied = this.isPoison;

            if (isBlocking && !this.isPoison) {
                finalDamage = this.damage * 0.5;
                poisonApplied = false;
                console.log(`🛡️ Player blocked! Damage reduced to ${finalDamage}`);
            } else if (isBlocking && this.isPoison) {
                poisonApplied = false;
                console.log(`🛡️ Player blocked poison attack!`);
            }

            player.takeDamage(finalDamage, poisonApplied);

            if (this.isPoison && poisonApplied) {
                console.log(`💀 ${this.type} poisoned player! ${this.poisonDamage} dmg/sec for ${this.poisonDuration}s`);
            } else if (!isBlocking) {
                console.log(`⚔️ ${this.type} attacked player for ${finalDamage} damage`);
            }
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;

        if (this.mesh.material) {
            this.mesh.traverse(obj => {
                if (obj.material) obj.material.color.set(0xffffff);
            });
            setTimeout(() => {
                this.mesh.traverse(obj => {
                    if (obj.material) obj.material.color.set(this.color);
                });
            }, 100);
        }

        if (this.health <= 0) {
            this.die();
        }

        return this.health <= 0;
    }

    die() {
        this.isAlive = false;
        console.log(`💀 ${this.type} died`);

        if (this.mesh) this.scene.remove(this.mesh);
    }

    isInAttackRange(playerPosition, range = 1.5) {
        return this.getDistanceToPlayer(playerPosition) <= this.attackRadius;
    }
}



// //src\entities\Enemy.js

// import * as THREE from 'three';
// import RAPIER from "@dimforge/rapier3d-compat";

// export class Enemy {
//     constructor(scene, world, type, difficulty, position) {
//         this.scene = scene;
//         this.world = world;
//         this.type = type;
//         this.difficulty = difficulty;
//         this.position = position;
//         this.mesh = null;
//         this.body = null;
//         this.collider = null;
//         this.isAlive = true;
//         this.lastAttackTime = 0;
//         this.attackCooldown = 2000; // 2 seconds

//         this.agroRadius = 8.0; // Distance at which enemy starts following player
//         this.attackRadius = 1.5; // Distance at which enemy can attack
//         this.wanderSpeed = 0.5; // Speed when wandering (slower than chasing)
//         this.isAggressive = false; // Whether enemy is actively chasing player
//         this.wanderDirection = new THREE.Vector3();
//         this.wanderTimer = 0;
//         this.wanderInterval = 2.0; // Change direction every 2 seconds
//         this.lastWanderChange = 0;
        
//         this.setupStats();
//         this.spawn();

//         // Initialize wander direction
//         this.updateWanderDirection();
//     }
    
//     setupStats() {
//         const stats = {
//             spider: { 
//                 health: 10, damage: 5, speed: 0.7, color: 0x8b0000, 
//                 scale: 0.5, isPoison: false, poisonDamage: 0, poisonDuration: 0 
//             },
//             rat: { 
//                 health: 8, damage: 3, speed: 0.7, color: 0x666666, 
//                 scale: 0.4, isPoison: false, poisonDamage: 0, poisonDuration: 0 
//             },
//             zombie: { 
//                 health: 30, damage: 20, speed: 0.6, color: 0x2d5a27, 
//                 scale: 0.8, isPoison: false, poisonDamage: 0, poisonDuration: 0 
//             },
//             glowing_spider: {
//                 health: 5, damage: 0, speed: 1, color: 0x00ff00,
//                 scale: 0.5, isPoison: true, poisonDamage: 1, poisonDuration: 15
//             },
//             glowing_rat: {
//                 health: 4, damage: 0, speed: 1, color: 0x00ff00, 
//                 scale: 0.4, isPoison: true, poisonDamage: 2, poisonDuration: 15
//             },
//             glowing_human: {
//                 health: 15, damage: 0, speed: 0.8, color: 0x00ff00,
//                 scale: 0.8, isPoison: true, poisonDamage: 5, poisonDuration: 10
//             }
//         };
        
//         const difficultyMultipliers = {
//             easy: 0.7,
//             medium: 1.0,
//             hard: 1.5
//         };
        
//         const baseStats = stats[this.type];
//         const multiplier = difficultyMultipliers[this.difficulty];
        
//         this.health = Math.floor(baseStats.health * multiplier);
//         this.maxHealth = this.health;
//         this.damage = Math.floor(baseStats.damage * multiplier);
//         this.speed = baseStats.speed;
//         this.color = baseStats.color;
//         this.scale = baseStats.scale;
//         this.isPoison = baseStats.isPoison;
//         this.poisonDamage = baseStats.poisonDamage * multiplier;
//         this.poisonDuration = baseStats.poisonDuration;

//         // Adjust agro radius based on enemy type
//         if (this.type.includes('spider')) {
//             this.agroRadius = 6.0;
//         } else if (this.type.includes('rat')) {
//             this.agroRadius = 7.0;
//         } else {
//             this.agroRadius = 5.0; // Zombies/humans have shorter agro
//         }
        
//         // Add glowing effect for poison enemies
//         if (this.type.includes('glowing')) {
//             this.glowIntensity = 2;
//         } else {
//             this.glowIntensity = 0;
//         }
//     }
    
//     spawn() {
//         let geometry;
//         switch(this.type) {
//             case 'spider':
//             case 'glowing_spider':
//                 geometry = new THREE.SphereGeometry(0.3 * this.scale, 8, 8);
//                 break;
//             case 'rat':
//             case 'glowing_rat':
//                 geometry = new THREE.CapsuleGeometry(0.2 * this.scale, 0.4 * this.scale, 4, 8);
//                 break;
//             case 'zombie':
//             case 'glowing_human':
//                 geometry = new THREE.CapsuleGeometry(0.3 * this.scale, 0.6 * this.scale, 4, 8);
//                 break;
//             default:
//                 geometry = new THREE.SphereGeometry(0.3 * this.scale, 8, 8);
//         }
        
//         const material = new THREE.MeshStandardMaterial({ 
//             color: this.color,
//             roughness: 0.8,
//             metalness: 0.2,
//             emissive: this.type.includes('glowing') ? this.color : 0x000000,
//             emissiveIntensity: this.type.includes('glowing') ? 0.5 : 0
//         });
        
//         this.mesh = new THREE.Mesh(geometry, material);
//         this.mesh.position.copy(this.position);
//         this.mesh.castShadow = true;
//         this.mesh.receiveShadow = true;
//         this.scene.add(this.mesh);
        
//         // Physics body
//         const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
//             .setTranslation(this.position.x, this.position.y, this.position.z)
//             .lockRotations();
//         this.body = this.world.createRigidBody(bodyDesc);
        
//         let colliderDesc;
//         if (this.type.includes('spider') || this.type.includes('rat')) {
//             colliderDesc = RAPIER.ColliderDesc.ball(0.3 * this.scale);
//         } else {
//             colliderDesc = RAPIER.ColliderDesc.capsule(0.3 * this.scale, 0.15 * this.scale);
//         }
        
//         this.collider = this.world.createCollider(colliderDesc, this.body);
        
//         console.log(`Spawned ${this.type} at`, this.position);
//     }
    
// update(deltaTime, playerPosition) {
//     if (!this.isAlive || !this.mesh) return;
    
//     // Sync visual with physics (but don't use physics for movement)
//     if (this.body) {
//         const position = this.body.translation();
//         this.mesh.position.set(position.x, position.y, position.z);
//     }
    
//     // SIMPLE MOVEMENT WITHOUT PHYSICS - use direct position updates
//     this.moveTowardPlayer(playerPosition, deltaTime);
    
//     // Rotate to face player
//     this.facePlayer(playerPosition);
// }

// moveTowardPlayer(playerPosition, deltaTime) {
//     if (!playerPosition || !this.mesh) return;
    
//     const enemyPos = this.mesh.position;
//     const direction = new THREE.Vector3(
//         playerPosition.x - enemyPos.x,
//         0,
//         playerPosition.z - enemyPos.z
//     );
    
//     // Normalize direction and calculate distance
//     const distance = direction.length();
//     direction.normalize();
    
//     // Only move if not too close (to avoid pushing)
//     if (distance > 1.0) {
//         // Move toward player using direct position update
//         const moveDistance = this.speed * deltaTime;
//         this.mesh.position.x += direction.x * moveDistance;
//         this.mesh.position.z += direction.z * moveDistance;

//         // Store movement direction for facing
//             this.wanderDirection.copy(direction);
        
//         // Update physics body to match visual position
//         if (this.body) {
//             this.body.setTranslation(this.mesh.position, true);
//             // Stop any residual physics movement
//             this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
//         }
//     }
    
//     // Debug enemy movement
//     if (Math.random() < 0.01) {
//         console.log(`🕷️ ${this.type} moving toward player, distance: ${distance.toFixed(2)}`);
//     }
// }

//  wander(deltaTime) {
//         if (!this.mesh) return;
        
//         this.lastWanderChange += deltaTime;
        
//         // Change wander direction periodically
//         if (this.lastWanderChange >= this.wanderInterval) {
//             this.updateWanderDirection();
//             this.lastWanderChange = 0;
//         }
        
//         // Move in wander direction
//         const moveDistance = this.wanderSpeed * deltaTime;
//         this.mesh.position.x += this.wanderDirection.x * moveDistance;
//         this.mesh.position.z += this.wanderDirection.z * moveDistance;
        
//         // Update physics body to match visual position
//         if (this.body) {
//             this.body.setTranslation(this.mesh.position, true);
//             this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
//         }
//     }

//     updateWanderDirection() {
//         // Random direction for wandering
//         const angle = Math.random() * Math.PI * 2;
//         this.wanderDirection.set(
//             Math.cos(angle),
//             0,
//             Math.sin(angle)
//         ).normalize();
//     }

// facePlayer(playerPosition) {
//     if (!playerPosition || !this.mesh) return;
    
//     const enemyPos = this.mesh.position;
//     const direction = new THREE.Vector3(
//         playerPosition.x - enemyPos.x,
//         0,
//         playerPosition.z - enemyPos.z
//     ).normalize();
    
//     this.mesh.lookAt(
//         enemyPos.x + direction.x,
//         enemyPos.y,
//         enemyPos.z + direction.z
//     );
// }
//     getDistanceToPlayer(playerPosition) {
//         if (!playerPosition || !this.mesh) return Infinity;
        
//         const enemyPos = this.mesh.position;
//         return Math.sqrt(
//             Math.pow(playerPosition.x - enemyPos.x, 2) +
//             Math.pow(playerPosition.z - enemyPos.z, 2)
//         );
//     }
    
//     attack(player) {
//         const currentTime = Date.now();
//         if (currentTime - this.lastAttackTime < this.attackCooldown) return false;
        
//         this.lastAttackTime = currentTime;
        
//         if (player) {
//             // CHECK IF PLAYER IS BLOCKING
//             const isBlocking = player.isBlocking;
//             let finalDamage = this.damage;
//             let poisonApplied = this.isPoison;
            
//             if (isBlocking && !this.isPoison) {
//                 // Block reduces damage by 50% and prevents poison
//                 finalDamage = this.damage * 0.5;
//                 poisonApplied = false;
//                 console.log(`🛡️ Player blocked! Damage reduced to ${finalDamage}`);
//             } else if (isBlocking && this.isPoison) {
//                 // Blocking prevents poison entirely
//                 poisonApplied = false;
//                 console.log(`🛡️ Player blocked poison attack!`);
//             }
            
//             player.takeDamage(finalDamage, poisonApplied);
            
//             if (this.isPoison && poisonApplied) {
//                 console.log(`💀 ${this.type} poisoned player! ${this.poisonDamage} damage/sec for ${this.poisonDuration}s`);
//             } else if (!isBlocking) {
//                 console.log(`⚔️ ${this.type} attacked player for ${finalDamage} damage`);
//             }
//             return true;
//         }
//         return false;
//     }
    
//     takeDamage(amount) {
//         this.health -= amount;
        
//         // Visual feedback
//         if (this.mesh.material) {
//             this.mesh.material.color.set(0xffffff);
//             setTimeout(() => {
//                 if (this.mesh.material) {
//                     this.mesh.material.color.set(this.color);
//                 }
//             }, 100);
//         }
        
//         if (this.health <= 0) {
//             this.die();
//         }
        
//         return this.health <= 0;
//     }
    
//     die() {
//         this.isAlive = false;
//         console.log(`💀 ${this.type} died`);
        
//         // Remove from scene
//         if (this.mesh) {
//             this.scene.remove(this.mesh);
//         }
        
//         // Remove physics (Rapier will handle this in next step)
//     }
    
//     isInAttackRange(playerPosition, range = 1.5) {
//         return this.getDistanceToPlayer(playerPosition) <= this.attackRadius;
    
//     }
// }