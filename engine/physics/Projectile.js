/**
 * Game Engine - Base Projectile Class
 * Physics-based projectile with collision detection
 * Games can extend for specific behaviors (bouncing, timed, etc.)
 *
 * Physics model inspired by original Ballerburg (1987) by Eckhard Kruse:
 * - Authentic wind drag: vx += (wind/2 - vx) / dragFactor
 * - Air resistance applied to all velocities
 */

class BaseProjectile {
    /**
     * Create projectile
     * @param {THREE.Scene} scene - The scene
     * @param {THREE.Vector3} position - Starting position
     * @param {THREE.Vector3} velocity - Initial velocity
     * @param {Object} config - Engine configuration
     * @param {Object} options - Projectile options
     */
    constructor(scene, position, velocity, config, options = {}) {
        this.scene = scene;
        this.config = config;
        this.position = position.clone();
        this.velocity = velocity.clone();

        // State
        this.exploded = false;
        this.disposed = false;
        this.outOfBounds = false;
        this.hasImpacted = false;

        // Options
        this.radius = options.radius || 0.4;
        this.color = options.color || 0x222222;
        this.emissive = options.emissive || 0x440000;
        this.trailLength = options.trailLength || 15;
        this.collisionSteps = options.collisionSteps || 5;

        // Physics options (inspired by BALLER2.C original physics)
        // Original used: vx += (wind/2 - vx) / 5000 for drag
        this.useAuthenticDrag = options.useAuthenticDrag !== false;
        this.dragFactor = options.dragFactor || 150; // Lower = more drag (original was 5000 at 50fps)
        this.airResistance = options.airResistance || 0.998; // Velocity decay per frame

        // Trail storage
        this.trail = [];

        // Create mesh
        this._createMesh();
    }

    /**
     * Create projectile mesh - override for custom appearance
     * @protected
     */
    _createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            emissive: this.emissive,
            emissiveIntensity: 0.3
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    /**
     * Update projectile physics
     * @param {number} deltaTime - Time since last frame
     * @param {BaseTerrain} terrain - Terrain for collision
     * @param {Object} wind - Wind object {strength, direction}
     * @returns {boolean} true if still active, false if hit something
     */
    update(deltaTime, terrain, wind = null) {
        if (this.exploded || this.disposed) return false;

        // Apply gravity
        const gravity = this.config.PHYSICS ? this.config.PHYSICS.GRAVITY : -9.8;
        this.velocity.y += gravity * deltaTime;

        // Apply wind with authentic drag model from original Ballerburg (1987)
        // Original formula: vx += (wind/2 - vx) / 5000
        // This creates realistic wind drag where velocity approaches wind speed
        if (wind && this.useAuthenticDrag) {
            const windTarget = wind.strength * wind.direction * 0.5;
            // Drag pulls velocity toward wind target
            this.velocity.x += (windTarget - this.velocity.x) / this.dragFactor;
        } else if (wind) {
            // Simple additive wind (fallback)
            const windEffect = wind.strength * wind.direction * deltaTime * 0.3;
            this.velocity.x += windEffect;
        }

        // Apply air resistance (slight velocity decay)
        this.velocity.x *= this.airResistance;
        this.velocity.z *= this.airResistance;

        // Store old position for interpolated collision
        const oldPos = this.position.clone();

        // Move
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Update trail
        this._updateTrail();

        // Check terrain collision with interpolation
        if (terrain && this._checkTerrainCollision(oldPos, terrain)) {
            this.hasImpacted = true;
            return false;
        }

        // Check bounds
        if (this._checkOutOfBounds()) {
            this.outOfBounds = true;
            return false;
        }

        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }

        return true;
    }

    /**
     * Update trail points
     * @protected
     */
    _updateTrail() {
        this.trail.push(this.position.clone());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
    }

    /**
     * Check terrain collision with interpolation
     * @protected
     */
    _checkTerrainCollision(oldPos, terrain) {
        for (let i = 0; i <= this.collisionSteps; i++) {
            const t = i / this.collisionSteps;
            const checkX = oldPos.x + (this.position.x - oldPos.x) * t;
            const checkY = oldPos.y + (this.position.y - oldPos.y) * t;
            const checkZ = oldPos.z + (this.position.z - oldPos.z) * t;

            const terrainY = terrain.getHeight(checkX, checkZ);
            if (checkY <= terrainY) {
                // Set position to impact point
                this.position.set(checkX, terrainY, checkZ);
                return true;
            }
        }
        return false;
    }

    /**
     * Check if projectile is out of bounds
     * @protected
     */
    _checkOutOfBounds() {
        const terrainConfig = this.config.TERRAIN || {};
        const width = terrainConfig.WIDTH || 120;
        const depth = terrainConfig.DEPTH || 20;
        const margin = 20;

        return (
            Math.abs(this.position.x) > width / 2 + margin ||
            Math.abs(this.position.z) > depth / 2 + margin ||
            this.position.y < -15
        );
    }

    /**
     * Called when projectile impacts - override for custom behavior
     */
    onImpact() {
        // Override in subclass
    }

    /**
     * Mark as exploded
     */
    explode() {
        this.exploded = true;
    }

    /**
     * Check if projectile is still active
     */
    isActive() {
        return !this.exploded && !this.disposed && !this.outOfBounds;
    }

    /**
     * Get impact position (same as current position after collision)
     */
    getImpactPosition() {
        return this.position.clone();
    }

    /**
     * Clean up resources (safe to call multiple times)
     */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        if (this.mesh) {
            Utils.removeAndDispose(this.scene, this.mesh);
            this.mesh = null;
        }

        this.trail = [];
    }
}

/**
 * Bouncing projectile (for grenades, etc.)
 */
class BouncingProjectile extends BaseProjectile {
    constructor(scene, position, velocity, config, options = {}) {
        super(scene, position, velocity, config, options);
        this.bounceCount = 0;
        this.maxBounces = options.maxBounces || 3;
        this.bounceFactor = options.bounceFactor || 0.6;
        this.timer = options.timer || null; // Time until auto-explode
        this.elapsed = 0;
    }

    update(deltaTime, terrain, wind = null) {
        if (this.exploded || this.disposed) return false;

        // Timer countdown
        if (this.timer !== null) {
            this.elapsed += deltaTime;
            if (this.elapsed >= this.timer) {
                this.explode();
                return false;
            }
        }

        // Apply gravity
        const gravity = this.config.PHYSICS ? this.config.PHYSICS.GRAVITY : -9.8;
        this.velocity.y += gravity * deltaTime;

        // Apply wind with authentic drag (reduced effect for bouncing projectiles)
        if (wind && this.useAuthenticDrag) {
            const windTarget = wind.strength * wind.direction * 0.3;
            this.velocity.x += (windTarget - this.velocity.x) / (this.dragFactor * 2);
        } else if (wind) {
            this.velocity.x += wind.strength * wind.direction * deltaTime * 0.1;
        }

        // Apply air resistance
        this.velocity.x *= this.airResistance;
        this.velocity.z *= this.airResistance;

        const oldPos = this.position.clone();
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        this._updateTrail();

        // Check terrain collision - bounce instead of stop
        if (terrain) {
            const terrainY = terrain.getHeight(this.position.x, this.position.z);
            if (this.position.y <= terrainY) {
                this.position.y = terrainY;
                this.bounceCount++;

                if (this.bounceCount >= this.maxBounces) {
                    this.hasImpacted = true;
                    return false;
                }

                // Bounce
                this.velocity.y = -this.velocity.y * this.bounceFactor;
                this.velocity.x *= this.bounceFactor;
                this.velocity.z *= this.bounceFactor;
            }
        }

        if (this._checkOutOfBounds()) {
            this.outOfBounds = true;
            return false;
        }

        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }

        return true;
    }
}

/**
 * AI Trajectory Calculator
 * Based on original Ballerburg (1987) comp() function by Eckhard Kruse
 * Calculates required velocity to hit a target position
 */
class TrajectoryCalculator {
    /**
     * Calculate velocity needed to hit target from source position
     * Uses iterative simulation matching original algorithm
     *
     * @param {Object} source - Source position {x, y}
     * @param {Object} target - Target position {x, y}
     * @param {number} gravity - Gravity constant (negative value)
     * @param {number} wind - Wind value (positive = right, negative = left)
     * @param {Object} options - Additional options
     * @returns {Object|null} - {vx, vy, angle, power} or null if impossible
     */
    static calculateTrajectory(source, target, gravity, wind = 0, options = {}) {
        const dragFactor = options.dragFactor || 150;
        const maxVelocity = options.maxVelocity || 50;
        const accuracy = options.accuracy || 0.1;

        // Height and distance to target
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.abs(dx);
        const direction = dx > 0 ? 1 : -1;

        // Gravity per frame (original used G=0.02 at ~50fps)
        const g = Math.abs(gravity) * 0.02;
        const windTarget = wind * 0.5;

        let bestVx = null;
        let bestVy = null;
        let x2 = -1;

        // Iterate through velocities to find one that reaches target
        // Original: for( vx=.5; vx<7 && ( x2<x || vy/3.5>vx ); vx+=.4 )
        for (let vx = 0.5; vx < maxVelocity && (x2 < distance || Math.abs(bestVy) / 3.5 > vx); vx += 0.4) {
            let t = 0;
            x2 = 0;
            let vx2 = vx;

            // Simulate horizontal travel with wind drag
            // Original: while( vx2>0 && x2<x ) { x2+=vx2; vx2+=(wd/2-vx2)/5000; t++; }
            while (vx2 > 0 && x2 < distance) {
                x2 += vx2;
                vx2 += (windTarget - vx2) / dragFactor;
                t++;
            }

            // Calculate required vertical velocity
            // Original: vy = y/t + .5*G*t
            if (t > 0) {
                bestVy = dy / t + 0.5 * g * t;
                bestVx = vx;
            }
        }

        if (bestVx === null) {
            return null; // No valid trajectory found
        }

        // Apply direction
        const finalVx = bestVx * direction;
        const finalVy = bestVy;

        // Calculate angle and power
        const angle = Math.atan2(finalVy, Math.abs(finalVx)) * (180 / Math.PI);
        const power = Math.sqrt(finalVx * finalVx + finalVy * finalVy);

        return {
            vx: finalVx,
            vy: finalVy,
            angle: angle,
            power: power,
            direction: direction
        };
    }

    /**
     * Add random inaccuracy to a calculated trajectory (for AI difficulty)
     * @param {Object} trajectory - Result from calculateTrajectory
     * @param {number} inaccuracy - Max deviation (0-1, where 0.1 = 10%)
     * @returns {Object} - Modified trajectory
     */
    static addInaccuracy(trajectory, inaccuracy = 0.1) {
        if (!trajectory) return null;

        const factor = 1 + (Math.random() * 2 - 1) * inaccuracy;
        return {
            vx: trajectory.vx * factor,
            vy: trajectory.vy * (1 + (Math.random() * 2 - 1) * inaccuracy),
            angle: trajectory.angle,
            power: trajectory.power * factor,
            direction: trajectory.direction
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BaseProjectile = BaseProjectile;
    window.BouncingProjectile = BouncingProjectile;
    window.TrajectoryCalculator = TrajectoryCalculator;
}
