/**
 * Ballerburg 3D - Castle
 * Medieval castle with destructible parts
 */

class Castle {
    constructor(scene, terrain, playerIndex) {
        this.scene = scene;
        this.terrain = terrain;
        this.playerIndex = playerIndex;

        const pos = Config.CASTLE_POSITIONS[playerIndex];
        const colors = Config.PLAYER_COLORS[playerIndex];

        this.position = new THREE.Vector3(pos.x, 0, pos.z);
        this.colors = colors;
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.parts = [];

        this.group = new THREE.Group();
        this.healthBar = null;

        this._build();
        this._createHealthBar();
        this.updatePosition();

        scene.add(this.group);
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
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
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
        this.group.position.copy(this.position);

        if (this.healthBarGroup) {
            this.healthBarGroup.position.set(this.position.x, this.position.y + 18, this.position.z);
        }
    }

    /**
     * Make health bar face camera
     */
    updateHealthBar(camera) {
        if (!this.healthBarGroup || !camera) return;

        this.healthBarGroup.lookAt(camera.position);

        const pct = Math.max(0.01, this.health / this.maxHealth);
        this.healthBarFill.scale.x = pct;
        this.healthBarFill.position.x = (pct - 1) * 2.9;

        const color = this.health > 60 ? 0x00ff00 : (this.health > 30 ? 0xffff00 : 0xff0000);
        this.healthBarFill.material.color.setHex(color);
    }

    /**
     * Apply damage to castle
     */
    takeDamage(damage, impactPoint) {
        if (!this.alive) return;

        // Find closest part
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

        // Apply damage
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
            this.alive = false;
            this._destroy();
        }
    }

    /**
     * Destroy castle - visual effect then full cleanup
     */
    _destroy() {
        // Remove health bar immediately
        if (this.healthBarGroup) {
            this.scene.remove(this.healthBarGroup);
            this.healthBarGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.healthBarGroup = null;
        }

        // Delayed removal with full cleanup
        setTimeout(() => {
            this.scene.remove(this.group);
            this.parts.forEach(part => {
                if (part.mesh.geometry) part.mesh.geometry.dispose();
                if (part.mesh.material) part.mesh.material.dispose();
            });
        }, 2000);
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.group) {
            this.scene.remove(this.group);
            this.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        if (this.healthBarGroup) {
            this.scene.remove(this.healthBarGroup);
            this.healthBarGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.healthBarGroup = null;
        }
        this.parts = [];
    }
}
