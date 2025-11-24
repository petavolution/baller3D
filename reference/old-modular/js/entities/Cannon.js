/**
 * Ballerburg 3D - Cannon
 * Player-controlled artillery piece
 */

class Cannon {
    constructor(scene, castle) {
        this.scene = scene;
        this.castle = castle;

        this.position = castle.position.clone();
        this.position.y += 12;

        this.verticalAngle = 45;    // 10-80 degrees
        this.horizontalAngle = 0;   // -45 to 45 degrees

        this.group = new THREE.Group();
        this._build();
        this.updateRotation();

        scene.add(this.group);
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

        this.group.position.copy(this.position);
    }

    /**
     * Update cannon rotation based on angles
     */
    updateRotation() {
        // Base direction: player 0 faces right (0°), player 1 faces left (180°)
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;

        this.group.rotation.y = (finalDir * Math.PI) / 180;
        this.barrel.rotation.z = (-this.verticalAngle * Math.PI) / 180;
    }

    /**
     * Get fire position (barrel end)
     */
    getFirePosition() {
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;
        const barrelLength = 2;

        const offset = new THREE.Vector3(
            Math.sin((finalDir * Math.PI) / 180) * Math.cos((this.verticalAngle * Math.PI) / 180) * barrelLength,
            Math.sin((this.verticalAngle * Math.PI) / 180) * barrelLength + 2,
            Math.cos((finalDir * Math.PI) / 180) * Math.cos((this.verticalAngle * Math.PI) / 180) * barrelLength
        );

        return this.position.clone().add(offset);
    }

    /**
     * Get fire direction vector
     */
    getFireDirection() {
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;

        return new THREE.Vector3(
            Math.sin((finalDir * Math.PI) / 180) * Math.cos((this.verticalAngle * Math.PI) / 180),
            Math.sin((this.verticalAngle * Math.PI) / 180),
            Math.cos((finalDir * Math.PI) / 180) * Math.cos((this.verticalAngle * Math.PI) / 180)
        ).normalize();
    }

    /**
     * Set aim angles
     */
    setAim(vertical, horizontal) {
        this.verticalAngle = Utils.clamp(vertical, 10, 80);
        this.horizontalAngle = Utils.clamp(horizontal, -45, 45);
        this.updateRotation();
    }

    /**
     * Clean up resources
     */
    dispose() {
        Utils.removeAndDispose(this.scene, this.group);
    }
}
