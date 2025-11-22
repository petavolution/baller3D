/**
 * Worms 3D - Worm Entity
 * Extends DamageableEntity with movement and aiming
 * Enhanced with detailed visuals and animations
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

        // Animation state
        this.animationTime = Math.random() * Math.PI * 2;
        this.blinkTimer = 2 + Math.random() * 3;
        this.leftPupil = null;
        this.rightPupil = null;

        // Build worm model
        this._build();

        // Health bar
        this.healthBarGroup = null;
        this._createHealthBar();

        // Selection indicator
        this._createSelectionIndicator();
    }

    /**
     * Build worm model with smooth body and cartoon eyes
     */
    _build() {
        const bodyMat = new THREE.MeshPhongMaterial({
            color: this.teamColor,
            shininess: 60,
            specular: 0x222222
        });

        // Build smooth worm body with overlapping spheres
        const segments = [
            { y: -0.5, radius: 0.55, scale: [1.1, 0.9, 0.9] },
            { y: -0.2, radius: 0.52, scale: [1.05, 1, 0.95] },
            { y: 0.1, radius: 0.5, scale: [1, 1.05, 1] },
            { y: 0.4, radius: 0.48, scale: [0.95, 1.1, 1] },
            { y: 0.7, radius: 0.46, scale: [0.9, 1.15, 1] },
            { y: 1.0, radius: 0.45, scale: [0.9, 1.2, 1] },
            { y: 1.3, radius: 0.48, scale: [1.1, 1.25, 1.1] } // Head
        ];

        segments.forEach(seg => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(seg.radius, 16, 12),
                bodyMat
            );
            mesh.position.y = seg.y + 1; // Offset for base height
            mesh.scale.set(...seg.scale);
            mesh.castShadow = true;
            this.group.add(mesh);
        });

        // Create eye group
        const eyeGroup = new THREE.Group();
        eyeGroup.position.set(0, 2.3, 0.35);

        // Large white eye backgrounds
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.2, 0.2].forEach(x => {
            const eyeWhite = new THREE.Mesh(
                new THREE.SphereGeometry(0.25, 16, 12),
                eyeWhiteMat
            );
            eyeWhite.position.x = x;
            eyeWhite.scale.set(1.3, 1.5, 0.7);
            eyeGroup.add(eyeWhite);
        });

        // Black pupils that can track movement
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.leftPupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 8),
            pupilMat
        );
        this.leftPupil.position.set(-0.2, 0, 0.18);
        this.leftPupil.scale.set(1.1, 1.3, 0.6);
        eyeGroup.add(this.leftPupil);

        this.rightPupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 8),
            pupilMat
        );
        this.rightPupil.position.set(0.2, 0, 0.18);
        this.rightPupil.scale.set(1.1, 1.3, 0.6);
        eyeGroup.add(this.rightPupil);

        // Eye shine for life
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.23, 0.17].forEach((x, i) => {
            const shine = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 6),
                shineMat
            );
            shine.position.set(x, 0.06, 0.25);
            eyeGroup.add(shine);
        });

        this.group.add(eyeGroup);

        // Aim indicator
        const aimGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
        const aimMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        this.aimIndicator = new THREE.Mesh(aimGeo, aimMat);
        this.aimIndicator.position.y = 2;
        this.group.add(this.aimIndicator);
    }

    /**
     * Create selection indicator (yellow cone above worm)
     */
    _createSelectionIndicator() {
        const geometry = new THREE.ConeGeometry(0.3, 0.6, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.selectionIndicator = new THREE.Mesh(geometry, material);
        this.selectionIndicator.position.y = 3.8;
        this.selectionIndicator.rotation.x = Math.PI; // Point downward
        this.selectionIndicator.visible = false;
        this.group.add(this.selectionIndicator);
    }

    /**
     * Set whether this worm is selected (current turn)
     */
    setSelected(selected) {
        if (this.selectionIndicator) {
            this.selectionIndicator.visible = selected;
        }
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
     * Update worm state including animations
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
            // Check for fall damage and landing squash
            if (!this.grounded && this.velocity.y < -5) {
                // Landing squash effect
                this.group.scale.y = 0.7;
                this.group.scale.x = 1.2;
                this.group.scale.z = 1.2;
            }

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

        // Gradually return to normal scale (from landing squash)
        if (this.group.scale.x !== 1 || this.group.scale.z !== 1) {
            this.group.scale.x += (1 - this.group.scale.x) * deltaTime * 5;
            this.group.scale.z += (1 - this.group.scale.z) * deltaTime * 5;
            this.group.scale.y += (1 - this.group.scale.y) * deltaTime * 5;
        }

        // Breathing animation (subtle idle movement)
        this.animationTime += deltaTime;
        const breathe = Math.sin(this.animationTime * 2) * 0.02;
        if (Math.abs(this.group.scale.y - 1) < 0.1) {
            this.group.scale.y = 1 + breathe;
        }

        // Blinking animation
        this.blinkTimer -= deltaTime;
        if (this.blinkTimer <= 0) {
            this._blink();
            this.blinkTimer = 2 + Math.random() * 3;
        }

        // Eye tracking based on movement
        this._updateEyeTracking(deltaTime);

        // Sync position
        this.syncPosition();

        // Update aim indicator
        this._updateAimIndicator();

        // Animate selection indicator (bob up and down)
        if (this.selectionIndicator && this.selectionIndicator.visible) {
            this.selectionIndicator.position.y = 3.8 + Math.sin(this.animationTime * 4) * 0.2;
        }
    }

    /**
     * Blink animation
     */
    _blink() {
        if (!this.leftPupil || !this.rightPupil) return;

        const originalScaleY = this.leftPupil.scale.y;
        this.leftPupil.scale.y = 0.1;
        this.rightPupil.scale.y = 0.1;

        setTimeout(() => {
            if (this.alive && this.leftPupil && this.rightPupil) {
                this.leftPupil.scale.y = originalScaleY;
                this.rightPupil.scale.y = originalScaleY;
            }
        }, 100);
    }

    /**
     * Update eye tracking based on velocity
     */
    _updateEyeTracking(deltaTime) {
        if (!this.leftPupil || !this.rightPupil) return;

        // Track movement direction
        if (Math.abs(this.velocity.x) > 0.1) {
            const lookX = Math.sign(this.velocity.x) * 0.04;
            this.leftPupil.position.x = -0.2 + lookX;
            this.rightPupil.position.x = 0.2 + lookX;
        } else {
            // Return to center
            this.leftPupil.position.x += (-0.2 - this.leftPupil.position.x) * deltaTime * 5;
            this.rightPupil.position.x += (0.2 - this.rightPupil.position.x) * deltaTime * 5;
        }
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
