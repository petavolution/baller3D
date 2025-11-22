/**
 * Game Engine - Base Entity Class
 * All game entities (castles, worms, projectiles, etc.) inherit from this
 */

class Entity {
    /**
     * Create a new entity
     * @param {THREE.Scene} scene - The Three.js scene
     */
    constructor(scene) {
        if (!scene) {
            throw new Error('Entity requires a scene');
        }

        this.scene = scene;
        this.group = new THREE.Group();
        this.position = new THREE.Vector3();
        this.alive = true;
        this.disposed = false;

        // Add to scene by default (can be overridden)
        this.scene.add(this.group);
    }

    /**
     * Update entity state (override in subclass)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Override in subclass
    }

    /**
     * Sync group position with entity position
     */
    syncPosition() {
        this.group.position.copy(this.position);
    }

    /**
     * Set entity position
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.syncPosition();
    }

    /**
     * Get world position of entity
     * @returns {THREE.Vector3}
     */
    getWorldPosition() {
        const pos = new THREE.Vector3();
        this.group.getWorldPosition(pos);
        return pos;
    }

    /**
     * Check if entity is still active
     * @returns {boolean}
     */
    isActive() {
        return this.alive && !this.disposed;
    }

    /**
     * Mark entity as dead (will be cleaned up)
     */
    kill() {
        this.alive = false;
    }

    /**
     * Clean up all resources (safe to call multiple times)
     */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        Utils.removeAndDispose(this.scene, this.group);
        this.group = null;
    }
}

/**
 * Base class for entities with health
 */
class DamageableEntity extends Entity {
    /**
     * Create a damageable entity
     * @param {THREE.Scene} scene
     * @param {number} maxHealth
     */
    constructor(scene, maxHealth = 100) {
        super(scene);
        this.health = maxHealth;
        this.maxHealth = maxHealth;
    }

    /**
     * Apply damage to entity
     * @param {number} amount - Damage amount
     * @returns {boolean} - True if entity died from this damage
     */
    takeDamage(amount) {
        if (!this.alive) return false;

        this.health = Math.max(0, this.health - amount);

        if (this.health <= 0) {
            this.kill();
            this.onDeath();
            return true;
        }

        this.onDamage(amount);
        return false;
    }

    /**
     * Heal entity
     * @param {number} amount
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Get health as percentage (0-1)
     * @returns {number}
     */
    getHealthPercent() {
        return this.health / this.maxHealth;
    }

    /**
     * Called when entity takes damage (override for effects)
     * @param {number} amount
     */
    onDamage(amount) {
        // Override in subclass
    }

    /**
     * Called when entity dies (override for effects)
     */
    onDeath() {
        // Override in subclass
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Entity = Entity;
    window.DamageableEntity = DamageableEntity;
}
