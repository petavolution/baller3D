/**
 * Ballerburg 3D - Cannon Entity
 * Player-controlled artillery piece extending Entity
 */

class Cannon extends Entity {
    /**
     * Create cannon
     * @param {THREE.Scene} scene
     * @param {Castle} castle - Parent castle
     */
    constructor(scene, castle) {
        super(scene);

        this.castle = castle;

        // Position above castle
        this.position.copy(castle.position);
        this.position.y += 12;

        // Aim angles
        this.verticalAngle = 45;    // 10-80 degrees
        this.horizontalAngle = 0;   // -45 to 45 degrees

        // Build cannon model
        this._build();
        this.updateRotation();
        this.syncPosition();
    }

    /**
     * Build cannon model
     */
    _build() {
        const metal = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 50 });
        const wood = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

        // Base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1.5), metal);
        base.position.y = 0.75;
        base.castShadow = true;
        this.group.add(base);

        // Barrel
        this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4), metal);
        this.barrel.position.y = 1.5;
        this.barrel.castShadow = true;
        this.group.add(this.barrel);

        // Wheels
        [-1.2, 1.2].forEach(x => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2), wood);
            wheel.position.set(x, 0.6, 0);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            this.group.add(wheel);
        });
    }

    /**
     * Update cannon rotation based on angles
     */
    updateRotation() {
        // Base direction: player 0 faces right (0°), player 1 faces left (180°)
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;

        this.group.rotation.y = Utils.degToRad(finalDir);
        this.barrel.rotation.z = Utils.degToRad(-this.verticalAngle);
    }

    /**
     * Get fire position (barrel end)
     * @returns {THREE.Vector3}
     */
    getFirePosition() {
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;
        const barrelLength = 2;

        const vertRad = Utils.degToRad(this.verticalAngle);
        const horizRad = Utils.degToRad(finalDir);

        const offset = new THREE.Vector3(
            Math.sin(horizRad) * Math.cos(vertRad) * barrelLength,
            Math.sin(vertRad) * barrelLength + 2,
            Math.cos(horizRad) * Math.cos(vertRad) * barrelLength
        );

        return this.position.clone().add(offset);
    }

    /**
     * Get fire direction vector
     * @returns {THREE.Vector3}
     */
    getFireDirection() {
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;

        const vertRad = Utils.degToRad(this.verticalAngle);
        const horizRad = Utils.degToRad(finalDir);

        return new THREE.Vector3(
            Math.sin(horizRad) * Math.cos(vertRad),
            Math.sin(vertRad),
            Math.cos(horizRad) * Math.cos(vertRad)
        ).normalize();
    }

    /**
     * Set aim angles
     * @param {number} vertical - Vertical angle (10-80)
     * @param {number} horizontal - Horizontal angle (-45 to 45)
     */
    setAim(vertical, horizontal) {
        this.verticalAngle = Utils.clamp(vertical, 10, 80);
        this.horizontalAngle = Utils.clamp(horizontal, -45, 45);
        this.updateRotation();
    }

    /**
     * Update cannon (called each frame)
     */
    update(deltaTime) {
        // Could add animation/effects here
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Cannon = Cannon;
}
