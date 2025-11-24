/**
 * Ballerburg 3D - Castle Entity
 * Extends DamageableEntity with destructible parts
 */

class Castle extends DamageableEntity {
    /**
     * Create castle
     * @param {THREE.Scene} scene
     * @param {BaseTerrain} terrain
     * @param {number} playerIndex
     * @param {Object} config - Game configuration
     */
    constructor(scene, terrain, playerIndex, config) {
        // Get health from config or use default
        const maxHealth = (config && config.GAMEPLAY) ?
            config.GAMEPLAY.CASTLE_HEALTH : 100;

        super(scene, maxHealth);

        this.terrain = terrain;
        this.playerIndex = playerIndex;
        this.config = config || BallerConfig;

        // Get position and colors from config
        const positions = this.config.GAMEPLAY ?
            this.config.GAMEPLAY.MOUNTAIN_POSITIONS :
            [{ x: -40, z: 0 }, { x: 40, z: 0 }];
        const colors = this.config.PLAYERS ?
            this.config.PLAYERS[playerIndex] :
            { stone: 0x8B4513, roof: 0xCC0000 };

        const pos = positions[playerIndex];
        this.position.set(pos.x, 0, pos.z);
        this.colors = colors;

        // Castle-specific properties
        this.parts = [];
        this.healthBarGroup = null;
        this.healthBarFill = null;

        // Don't auto-add to scene (Entity constructor does this)
        // Build the castle
        this._build();
        this._createHealthBar();
        this.updatePosition();
    }

    /**
     * Build castle structure
     */
    _build() {
        const stone = new THREE.MeshPhongMaterial({ color: this.colors.stone, shininess: 10 });
        const roof = new THREE.MeshPhongMaterial({ color: this.colors.roof, shininess: 30 });

        // Base foundation
        this._addPart(new THREE.BoxGeometry(8, 3, 6), stone, { y: 1.5 }, 'base', 30);

        // Main tower
        this._addPart(new THREE.BoxGeometry(5, 8, 5), stone, { y: 7 }, 'tower', 40);

        // Main tower roof
        this._addPart(new THREE.ConeGeometry(3.5, 4, 8), roof, { y: 13 }, 'roof', 20);

        // Side towers
        [-4, 4].forEach(xOffset => {
            this._addPart(new THREE.BoxGeometry(3, 6, 3), stone, { x: xOffset, y: 6 }, 'side_tower', 25);
            this._addPart(new THREE.ConeGeometry(2.2, 3, 6), roof, { x: xOffset, y: 10.5 }, 'side_roof', 10);
        });

        // Walls
        this._addPart(new THREE.BoxGeometry(8, 5, 1), stone, { y: 2.5, z: -4 }, 'wall', 15);
        this._addPart(new THREE.BoxGeometry(1, 4, 4), stone, { x: -5, y: 2 }, 'wall', 15);
        this._addPart(new THREE.BoxGeometry(1, 4, 4), stone, { x: 5, y: 2 }, 'wall', 15);

        // Flag
        const poleMat = new THREE.MeshPhongMaterial({ color: 0x654321 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2), poleMat);
        pole.position.y = 16;
        this.group.add(pole);

        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), roof);
        flag.position.set(0.75, 16.5, 0);
        this.group.add(flag);
    }

    /**
     * Add a castle part
     */
    _addPart(geometry, material, pos, type, health) {
        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        this.parts.push({ mesh, type, health, maxHealth: health, destroyed: false });
    }

    /**
     * Create health bar above castle
     */
    _createHealthBar() {
        this.healthBarGroup = new THREE.Group();

        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 0.5),
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            })
        );
        this.healthBarGroup.add(bg);

        this.healthBarFill = new THREE.Mesh(
            new THREE.PlaneGeometry(5.8, 0.4),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
        );
        this.healthBarGroup.add(this.healthBarFill);

        this.scene.add(this.healthBarGroup);
    }

    /**
     * Update castle position based on terrain
     */
    updatePosition() {
        this.position.y = this.terrain.getHeight(this.position.x, this.position.z);
        this.syncPosition();

        if (this.healthBarGroup) {
            this.healthBarGroup.position.set(
                this.position.x,
                this.position.y + 18,
                this.position.z
            );
        }
    }

    /**
     * Make health bar face camera
     * @param {THREE.Camera} camera
     */
    updateHealthBar(camera) {
        if (!this.healthBarGroup || !camera) return;

        this.healthBarGroup.lookAt(camera.position);

        const pct = Math.max(0.01, this.getHealthPercent());
        this.healthBarFill.scale.x = pct;
        this.healthBarFill.position.x = (pct - 1) * 2.9;

        const color = this.health > 60 ? 0x00ff00 :
            (this.health > 30 ? 0xffff00 : 0xff0000);
        this.healthBarFill.material.color.setHex(color);
    }

    /**
     * Apply damage to castle - overrides DamageableEntity
     * @param {number} damage - Amount of damage
     * @param {THREE.Vector3} impactPoint - Optional point of impact
     * @returns {boolean} - True if castle was destroyed
     */
    takeDamage(damage, impactPoint) {
        if (!this.alive) return false;

        // If no impact point, use standard damage
        if (!impactPoint) {
            return super.takeDamage(damage);
        }

        // Find closest part to impact
        let closestPart = null;
        let closestDist = Infinity;

        this.parts.forEach(part => {
            if (part.destroyed) return;
            const worldPos = new THREE.Vector3();
            part.mesh.getWorldPosition(worldPos);
            const dist = worldPos.distanceTo(impactPoint);
            if (dist < closestDist) {
                closestDist = dist;
                closestPart = part;
            }
        });

        // Apply damage distribution
        if (closestPart && closestDist < 8) {
            closestPart.health -= damage * 0.7;
            this.health -= damage * 0.3;

            if (closestPart.health <= 0 && !closestPart.destroyed) {
                closestPart.destroyed = true;
                closestPart.mesh.material.transparent = true;
                closestPart.mesh.material.opacity = 0.3;
                closestPart.mesh.material.color.setHex(0x333333);
            }
        } else {
            this.health -= damage * 0.2;
        }

        this.health = Math.max(0, this.health);

        if (this.health <= 0 && this.alive) {
            this.kill();
            this.onDeath();
            return true;
        }

        this.onDamage(damage);
        return false;
    }

    /**
     * Called when castle takes damage (hook for effects)
     */
    onDamage(amount) {
        // Could add visual shake effect here
    }

    /**
     * Called when castle is destroyed
     */
    onDeath() {
        // Remove health bar immediately
        Utils.removeAndDispose(this.scene, this.healthBarGroup);
        this.healthBarGroup = null;

        // Delay full destruction for visual effect
        setTimeout(() => {
            if (!this.disposed) {
                this.dispose();
            }
        }, 2000);
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.disposed) return;

        // Clean up health bar
        Utils.removeAndDispose(this.scene, this.healthBarGroup);
        this.healthBarGroup = null;
        this.parts = [];

        // Call parent dispose (handles group)
        super.dispose();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Castle = Castle;
}
