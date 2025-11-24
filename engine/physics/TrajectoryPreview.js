/**
 * Game Engine - Trajectory Preview
 * Visualizes projectile path before firing
 * Useful for artillery and turn-based games
 */

class TrajectoryPreview {
    /**
     * Create trajectory preview
     * @param {THREE.Scene} scene - The scene
     * @param {Object} config - Engine configuration
     * @param {Object} options - Preview options
     */
    constructor(scene, config, options = {}) {
        this.scene = scene;
        this.config = config;
        this.points = [];

        // Options
        this.pointCount = options.pointCount || 25;
        this.pointRadius = options.pointRadius || 0.15;
        this.color = options.color || 0xffff00;
        this.timeStep = options.timeStep || 0.1;
    }

    /**
     * Update trajectory preview
     * @param {THREE.Vector3} startPos - Fire position
     * @param {THREE.Vector3} velocity - Initial velocity
     * @param {Object} wind - Wind {strength, direction}
     * @param {BaseTerrain} terrain - Optional terrain for ground check
     */
    update(startPos, velocity, wind = null, terrain = null) {
        // Clear existing points
        this.clear();

        const gravity = this.config.PHYSICS ? this.config.PHYSICS.GRAVITY : -9.8;
        const pos = startPos.clone();
        const vel = velocity.clone();

        for (let i = 0; i < this.pointCount; i++) {
            // Apply physics
            vel.y += gravity * this.timeStep;
            if (wind) {
                vel.x += wind.strength * wind.direction * this.timeStep * 0.3;
            }
            pos.add(vel.clone().multiplyScalar(this.timeStep));

            // Check terrain collision
            if (terrain) {
                const terrainY = terrain.getHeight(pos.x, pos.z);
                if (pos.y <= terrainY) break;
            }

            // Create point visualization
            const geometry = new THREE.SphereGeometry(this.pointRadius, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: this.color,
                transparent: true,
                opacity: 1 - (i / this.pointCount)
            });
            const point = new THREE.Mesh(geometry, material);
            point.position.copy(pos);
            this.scene.add(point);
            this.points.push(point);
        }
    }

    /**
     * Clear all preview points
     */
    clear() {
        this.points.forEach(point => {
            this.scene.remove(point);
            if (point.geometry) point.geometry.dispose();
            if (point.material) point.material.dispose();
        });
        this.points = [];
    }

    /**
     * Show/hide preview
     */
    setVisible(visible) {
        this.points.forEach(point => {
            point.visible = visible;
        });
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.clear();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.TrajectoryPreview = TrajectoryPreview;
}
