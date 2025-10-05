export class MiniMap {
    constructor(mazeData, container) {
        this.mazeData = mazeData;
        this.container = container;
        this.size = 150;
        this.cellSize = 0;
        this.discoveredAreas = new Set();
        
        this.createMinimap();
        this.calculateCellSize();
    }

    createMinimap() {
        this.minimap = document.createElement('div');
        this.minimap.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: ${this.size}px;
            height: ${this.size}px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #8b0000;
            border-radius: 50%;
            overflow: hidden;
        `;
        
        const minimapLabel = document.createElement('div');
        minimapLabel.style.cssText = `
            position: absolute;
            top: 5px;
            left: 0;
            width: 100%;
            text-align: center;
            color: #8b0000;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
        `;
        minimapLabel.textContent = 'MINIMAP';
        
        // Create canvas for drawing the map
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        
        this.ctx = this.canvas.getContext('2d');
        
        this.minimap.appendChild(minimapLabel);
        this.minimap.appendChild(this.canvas);
        this.container.appendChild(this.minimap);
    }

    calculateCellSize() {
        const maxDimension = Math.max(this.mazeData.width, this.mazeData.height);
        this.cellSize = (this.size * 0.8) / maxDimension; // 80% of minimap size for content
    }

    update(playerPosition, playerRotation, discoveredAreas = []) {
        this.discoveredAreas = new Set(discoveredAreas.map(area => `${area.x},${area.y}`));
        this.draw(playerPosition, playerRotation);
    }

    draw(playerPosition, playerRotation) {
        const ctx = this.ctx;
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        
        // Clear canvas with dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.size, this.size);
        
        // Save context for clipping to circular shape
        ctx.save();
        
        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.size / 2 - 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw discovered areas and walls
        this.drawMaze(playerPosition, playerRotation);
        
        // Draw player indicator
        this.drawPlayer(centerX, centerY, playerRotation);
        
        ctx.restore();
        
        // Draw compass indicator
        this.drawCompass(playerRotation);
    }

    drawMaze(playerPosition, playerRotation) {
        const ctx = this.ctx;
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        
        // Convert player world position to grid coordinates
        const playerGridX = Math.floor(playerPosition.x + this.mazeData.width / 2);
        const playerGridY = Math.floor(playerPosition.z + this.mazeData.height / 2);
        
        // Draw maze elements relative to player position
        for (let y = 0; y < this.mazeData.height; y++) {
            for (let x = 0; x < this.mazeData.width; x++) {
                if (!this.isDiscovered(x, y)) continue;
                
                // Calculate position relative to player
                const relX = x - playerGridX;
                const relY = y - playerGridY;
                
                // Apply player rotation
                const cos = Math.cos(-playerRotation.y);
                const sin = Math.sin(-playerRotation.y);
                const rotatedX = relX * cos - relY * sin;
                const rotatedY = relX * sin + relY * cos;
                
                // Convert to minimap coordinates
                const drawX = centerX + rotatedX * this.cellSize;
                const drawY = centerY + rotatedY * this.cellSize;
                
                // Only draw if within minimap bounds
                if (this.isInMinimapBounds(drawX, drawY)) {
                    if (this.mazeData.grid[y][x] === 1) { // Wall
                        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)'; // Dark red
                        ctx.fillRect(
                            drawX - this.cellSize/2, 
                            drawY - this.cellSize/2, 
                            this.cellSize, 
                            this.cellSize
                        );
                    } else if (this.mazeData.grid[y][x] === 2) { // Exit
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'; // Green
                        ctx.fillRect(
                            drawX - this.cellSize/2, 
                            drawY - this.cellSize/2, 
                            this.cellSize, 
                            this.cellSize
                        );
                    } else { // Path
                        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'; // Gray
                        ctx.fillRect(
                            drawX - this.cellSize/2, 
                            drawY - this.cellSize/2, 
                            this.cellSize, 
                            this.cellSize
                        );
                    }
                }
            }
        }
    }

    drawPlayer(centerX, centerY, playerRotation) {
        const ctx = this.ctx;
        
        // Player position is always at center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator
        const directionLength = 8;
        const endX = centerX + Math.sin(playerRotation.y) * directionLength;
        const endY = centerY - Math.cos(playerRotation.y) * directionLength;
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    drawCompass(playerRotation) {
        const ctx = this.ctx;
        const centerX = this.size / 2;
        const topY = 25;
        
        ctx.save();
        ctx.translate(centerX, topY);
        ctx.rotate(playerRotation.y);
        
        ctx.fillStyle = '#8b0000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', 0, 0);
        
        ctx.restore();
    }

    isDiscovered(x, y) {
        return this.discoveredAreas.has(`${x},${y}`);
    }

    isInMinimapBounds(x, y) {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const radius = this.size / 2 - 5;
        
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius;
    }
}