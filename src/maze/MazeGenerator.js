import * as THREE from 'three';

export class MazeGenerator {
    constructor(difficulty) {
        this.difficulty = difficulty;
        this.size = this.getMazeSize();
    }
    
    getMazeSize() {
        switch(this.difficulty) {
            case 'easy': return 15;
            case 'medium': return 25;
            case 'hard': return 35;
            default: return 15;
        }
    }
    
    generate() {
        // Initialize maze grid (1 = wall, 0 = path)
        const grid = Array(this.size).fill().map(() => Array(this.size).fill(1));
        
        // Use recursive backtracking algorithm
        this.carvePaths(grid, 1, 1);
        
        // Add entrance and exit
        grid[1][0] = 0; // Entrance
        grid[this.size - 2][this.size - 1] = 0; // Exit
        
        return {
            grid: grid,
            start: { x: 1, y: 0, z: 0 },
            end: { x: this.size - 2, y: 0, z: this.size - 1 },
            size: this.size
        };
    }
    
    carvePaths(grid, x, z) {
        const directions = [
            [0, 2], [2, 0], [0, -2], [-2, 0]
        ];
        
        // Shuffle directions
        directions.sort(() => Math.random() - 0.5);
        
        for (const [dx, dz] of directions) {
            const nx = x + dx;
            const nz = z + dz;
            
            if (nx > 0 && nx < this.size - 1 && nz > 0 && nz < this.size - 1 && grid[nz][nx] === 1) {
                grid[nz][nx] = 0;
                grid[z + dz/2][x + dx/2] = 0;
                this.carvePaths(grid, nx, nz);
            }
        }
    }
}