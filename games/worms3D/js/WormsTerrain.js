/**
 * Worms 3D - Terrain
 * Extends BaseTerrain with varied procedural hills and valleys
 */

class WormsTerrain extends BaseTerrain {
    constructor(scene, config) {
        super(scene, config);
        this.seed = Math.random() * 1000;
    }

    /**
     * Simple noise function for terrain generation
     */
    _noise(x, z) {
        // Simple pseudo-random based on position
        const n = Math.sin(x * 0.1 + this.seed) * Math.cos(z * 0.15 + this.seed * 0.7);
        return n;
    }

    /**
     * Generate varied procedural terrain
     */
    generate(options = {}) {
        this.seed = options.seed || Math.random() * 1000;
        super.generate({
            ...options,
            smooth: true,
            smoothPasses: 2
        });
    }

    /**
     * Generate height for varied terrain
     * @protected
     */
    _generateHeight(x, z, i, j, options) {
        let height = 0;

        // Large rolling hills
        height += Math.sin(x * 0.08 + this.seed) * 8;
        height += Math.cos(z * 0.12 + this.seed * 0.5) * 5;

        // Medium bumps
        height += Math.sin(x * 0.2 + z * 0.15) * 3;

        // Small noise for texture
        height += this._noise(x * 2, z * 2) * 2;

        // Create some flat areas for worms to stand
        const flatness = Math.sin(x * 0.05) * Math.cos(z * 0.05);
        if (flatness > 0.7) {
            height = height * 0.3 + 5; // Flatten peaks
        }

        // Valley in the middle (optional strategic element)
        const centerDist = Math.abs(x) / (this.width / 2);
        if (centerDist < 0.3) {
            height -= (0.3 - centerDist) * 10;
        }

        // Ensure minimum height above water
        height = Math.max(height, -3);

        return height;
    }

    /**
     * Get spawn positions for worms (flat areas)
     * @param {number} count - Number of positions needed
     * @returns {Array} Array of {x, y, z} positions
     */
    getSpawnPositions(count) {
        const positions = [];
        const margin = this.width * 0.1;
        const spacing = (this.width - margin * 2) / (count + 1);

        for (let i = 0; i < count; i++) {
            const x = -this.width / 2 + margin + spacing * (i + 1);
            const z = (Math.random() - 0.5) * this.depth * 0.5;
            const y = this.getHeight(x, z);

            // Find a relatively flat spot nearby
            let bestX = x;
            let bestY = y;
            let bestSlope = Infinity;

            for (let dx = -5; dx <= 5; dx += 2) {
                const testX = x + dx;
                const testY = this.getHeight(testX, z);
                const nextY = this.getHeight(testX + 1, z);
                const slope = Math.abs(testY - nextY);

                if (slope < bestSlope && testY > 0) {
                    bestSlope = slope;
                    bestX = testX;
                    bestY = testY;
                }
            }

            positions.push({ x: bestX, y: bestY, z });
        }

        return positions;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.WormsTerrain = WormsTerrain;
}
