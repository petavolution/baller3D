/**
 * Ballerburg 3D - Terrain
 * Extends BaseTerrain with dual-mountain generation for castle placement
 */

class BallerTerrain extends BaseTerrain {
    /**
     * Create Ballerburg terrain
     * @param {THREE.Scene} scene
     * @param {Object} config - Game configuration
     */
    constructor(scene, config) {
        super(scene, config);

        // Ballerburg-specific settings
        this.mountainRadius = 25;
        this.mountainHeight = 30;
        this.mountainSlope = 1.2;
        this.baseWaterLevel = -5;
    }

    /**
     * Generate Ballerburg-style terrain with two mountains
     * @param {Object} options - Generation options
     */
    generate(options = {}) {
        // Get mountain positions from options or use defaults
        this.leftMountainX = options.leftMountainX || -40;
        this.rightMountainX = options.rightMountainX || 40;

        // Call parent generate which uses _generateHeight
        super.generate({
            ...options,
            smooth: true,
            smoothPasses: 1
        });
    }

    /**
     * Generate height for dual-mountain terrain
     * @protected
     */
    _generateHeight(x, z, i, j, options) {
        let height = this.baseWaterLevel;

        // Left mountain (for left castle)
        const leftDist = Math.sqrt(
            Math.pow(x - this.leftMountainX, 2) + Math.pow(z, 2)
        );
        if (leftDist < this.mountainRadius) {
            height = Math.max(
                height,
                this.mountainHeight - leftDist * this.mountainSlope
            );
        }

        // Right mountain (for right castle)
        const rightDist = Math.sqrt(
            Math.pow(x - this.rightMountainX, 2) + Math.pow(z, 2)
        );
        if (rightDist < this.mountainRadius) {
            height = Math.max(
                height,
                this.mountainHeight - rightDist * this.mountainSlope
            );
        }

        // Random variation for natural look
        const noise = options.noise || 2;
        height += (Math.random() - 0.5) * noise;

        return height;
    }

    /**
     * Get optimal castle position on a mountain
     * @param {number} playerIndex - 0 for left, 1 for right
     * @returns {{x: number, y: number, z: number}}
     */
    getCastlePosition(playerIndex) {
        const x = playerIndex === 0 ? this.leftMountainX : this.rightMountainX;
        const z = 0;
        const y = this.getHeight(x, z);
        return { x, y, z };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BallerTerrain = BallerTerrain;
}
