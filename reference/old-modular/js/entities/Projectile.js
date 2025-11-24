/**
 * Ballerburg 3D - Projectile
 * Physics-based projectile with collision detection
 */

class Projectile {
    constructor(scene, position, velocity, weapon) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.weapon = weapon;
        this.exploded = false;
        this.disposed = false;
        this.outOfBounds = false;
        this.trail = [];

        // Create mesh
        const geometry = new THREE.SphereGeometry(0.4, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x222222,
            emissive: 0x440000,
            emissiveIntensity: 0.3
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);

        scene.add(this.mesh);
    }

    /**
     * Update projectile physics
     * @returns {boolean} true if still active
     */
    update(deltaTime, terrain, wind) {
        if (this.exploded || this.disposed) return false;

        // Apply physics
        this.velocity.y += Config.GRAVITY * deltaTime;
        this.velocity.x += wind.strength * wind.direction * deltaTime * 0.3;

        // Store old position for collision interpolation
        const oldPos = this.position.clone();
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Trail
        this.trail.push(this.position.clone());
        if (this.trail.length > 15) this.trail.shift();

        // Collision detection (interpolated)
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const checkX = oldPos.x + (this.position.x - oldPos.x) * t;
            const checkY = oldPos.y + (this.position.y - oldPos.y) * t;
            const checkZ = oldPos.z + (this.position.z - oldPos.z) * t;

            const terrainY = terrain.getHeight(checkX, checkZ);
            if (checkY <= terrainY) {
                this.position.set(checkX, terrainY, checkZ);
                return false; // Hit terrain
            }
        }

        // Out of bounds check - mark flag instead of disposing
        if (Math.abs(this.position.x) > Config.TERRAIN_WIDTH / 2 + 20 ||
            Math.abs(this.position.z) > Config.TERRAIN_DEPTH / 2 + 20 ||
            this.position.y < -15) {
            this.outOfBounds = true;
            return false;
        }

        this.mesh.position.copy(this.position);
        return true;
    }

    /**
     * Mark as exploded
     */
    explode() {
        this.exploded = true;
    }

    /**
     * Clean up resources (safe to call multiple times)
     */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}
