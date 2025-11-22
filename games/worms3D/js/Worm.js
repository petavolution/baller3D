/**
 * Worms 3D - Worm Entity
 * Extends DamageableEntity with movement and aiming
 */

class Worm extends DamageableEntity {
    /**
     * Create worm
     * @param {THREE.Scene} scene
     * @param {WormsTerrain} terrain
     * @param {number} teamIndex
     * @param {number} wormIndex
     * @param {Object} config
     */
    constructor(scene, terrain, teamIndex, wormIndex, config) {
        const maxHealth = config.GAMEPLAY ? config.GAMEPLAY.WORM_HEALTH : 100;
        super(scene, maxHealth);

        this.terrain = terrain;
        this.teamIndex = teamIndex;
        this.wormIndex = wormIndex;
        this.config = config;

        // Get team color
        this.teamColor = config.TEAMS[teamIndex].color;

        // Movement state
        this.velocity = new THREE.Vector3();
        this.grounded = false;
        this.facing = teamIndex === 0 ? 1 : -1; // Direction facing

        // Aiming
        this.aimAngle = 45; // 0-90 degrees

        // Build worm model
        this._build();

        // Health bar
        this.healthBarGroup = null;
        this._createHealthBar();
    }

    /**
     * Build worm model (simple capsule shape)
     */
    _build() {
        const bodyMat = new THREE.MeshPhongMaterial({ color: this.teamColor, shininess: 30 });
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const pupilMat = new THREE.MeshPhongMaterial({ color: 0x000000 });

        // Body (stretched sphere)
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 12, 8),
            bodyMat
        );
        body.scale.set(1, 1.3, 1);
        body.position.y = 1;
        body.castShadow = true;
        this.group.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 10, 8),
            bodyMat
        );
        head.position.y = 2.2;
        head.castShadow = true;
        this.group.add(head);

        // Eyes
        [-0.2, 0.2].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), eyeMat);
            eye.position.set(x, 2.3, 0.4);
            this.group.add(eye);

            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), pupilMat);
            pupil.position.set(x, 2.3, 0.5);
            this.group.add(pupil);
        });

        // Aim indicator (small line showing direction)
        const aimGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
        const aimMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        this.aimIndicator = new THREE.Mesh(aimGeo, aimMat);
        this.aimIndicator.position.y = 2;
        this.group.add(this.aimIndicator);
    }

    /**
     * Create health bar above worm
     */
    _createHealthBar() {
        this.healthBarGroup = new THREE.Group();

        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 0.3),
            new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            })
        );
        this.healthBarGroup.add(bg);

        this.healthBarFill = new THREE.Mesh(
            new THREE.PlaneGeometry(1.9, 0.25),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
        );
        this.healthBarGroup.add(this.healthBarFill);

        this.scene.add(this.healthBarGroup);
    }

    /**
     * Set position and update terrain height
     */
    setSpawnPosition(x, y, z) {
        this.position.set(x, y + 1, z);
        this.syncPosition();
    }

    /**
     * Update worm state
     */
    update(deltaTime) {
        if (!this.alive) return;

        const physics = this.config.PHYSICS;

        // Apply gravity
        this.velocity.y += physics.GRAVITY * deltaTime;

        // Move
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Ground collision
        const groundY = this.terrain.getHeight(this.position.x, this.position.z);
        if (this.position.y <= groundY + 0.8) {
            // Check for fall damage
            if (!this.grounded && this.velocity.y < -physics.FALL_DAMAGE_THRESHOLD) {
                const fallDamage = Math.abs(this.velocity.y) * physics.FALL_DAMAGE_MULTIPLIER;
                this.takeDamage(fallDamage);
            }

            this.position.y = groundY + 0.8;
            this.velocity.y = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        // Sync position
        this.syncPosition();

        // Update aim indicator
        this._updateAimIndicator();
    }

    /**
     * Update aim indicator rotation
     */
    _updateAimIndicator() {
        const angleRad = Utils.degToRad(this.aimAngle);
        this.aimIndicator.rotation.z = -angleRad * this.facing;
        this.aimIndicator.position.x = Math.cos(angleRad) * 0.5 * this.facing;
        this.aimIndicator.position.y = 2 + Math.sin(angleRad) * 0.5;
    }

    /**
     * Move worm horizontally
     */
    move(direction) {
        if (!this.alive || !this.grounded) return;

        const speed = this.config.PHYSICS.MOVE_SPEED;
        this.velocity.x = direction * speed;
        this.facing = direction;
        this.group.rotation.y = direction > 0 ? 0 : Math.PI;
    }

    /**
     * Stop horizontal movement
     */
    stopMove() {
        this.velocity.x = 0;
    }

    /**
     * Jump
     */
    jump() {
        if (!this.alive || !this.grounded) return;

        this.velocity.y = this.config.PHYSICS.JUMP_FORCE;
        this.grounded = false;
    }

    /**
     * Set aim angle
     */
    setAim(angle) {
        this.aimAngle = Utils.clamp(angle, 0, 90);
        this._updateAimIndicator();
    }

    /**
     * Get fire position
     */
    getFirePosition() {
        const angleRad = Utils.degToRad(this.aimAngle);
        return new THREE.Vector3(
            this.position.x + Math.cos(angleRad) * 1.5 * this.facing,
            this.position.y + 1.5 + Math.sin(angleRad) * 1,
            this.position.z
        );
    }

    /**
     * Get fire direction
     */
    getFireDirection() {
        const angleRad = Utils.degToRad(this.aimAngle);
        return new THREE.Vector3(
            Math.cos(angleRad) * this.facing,
            Math.sin(angleRad),
            0
        ).normalize();
    }

    /**
     * Update health bar
     */
    updateHealthBar(camera) {
        if (!this.healthBarGroup || !camera || !this.alive) return;

        this.healthBarGroup.position.set(
            this.position.x,
            this.position.y + 3.5,
            this.position.z
        );
        this.healthBarGroup.lookAt(camera.position);

        const pct = Math.max(0.01, this.getHealthPercent());
        this.healthBarFill.scale.x = pct;
        this.healthBarFill.position.x = (pct - 1) * 0.95;

        const color = this.health > 60 ? 0x00ff00 :
            (this.health > 30 ? 0xffff00 : 0xff0000);
        this.healthBarFill.material.color.setHex(color);
    }

    /**
     * Called on death
     */
    onDeath() {
        Utils.removeAndDispose(this.scene, this.healthBarGroup);
        this.healthBarGroup = null;

        // Death animation - sink into ground
        setTimeout(() => {
            if (!this.disposed) this.dispose();
        }, 1500);
    }

    /**
     * Clean up
     */
    dispose() {
        if (this.disposed) return;
        Utils.removeAndDispose(this.scene, this.healthBarGroup);
        this.healthBarGroup = null;
        super.dispose();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Worm = Worm;
}
