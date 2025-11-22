/**
 * Ballerburg 3D - Physics System
 * Handles explosions, particles, and physics effects
 */

class Physics {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    /**
     * Create explosion at position
     */
    createExplosion(position, radius) {
        const particleCount = 60;

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(Math.random() * 0.8 + 0.3, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * radius + radius / 2;

            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.random() * radius + radius / 2,
                    Math.sin(angle) * speed
                ),
                life: 1,
                decay: Math.random() * 0.015 + 0.01
            };

            this.scene.add(particle);
            this.particles.push(particle);
        }

        // Flash light
        const light = new THREE.PointLight(0xff6600, 15, radius * 4);
        light.position.copy(position);
        this.scene.add(light);
        setTimeout(() => this.scene.remove(light), 300);
    }

    /**
     * Create rubble debris
     */
    createRubble(position) {
        for (let i = 0; i < 8; i++) {
            const geometry = new THREE.BoxGeometry(
                Math.random() * 0.8 + 0.3,
                Math.random() * 0.8 + 0.3,
                Math.random() * 0.8 + 0.3
            );
            const material = new THREE.MeshPhongMaterial({
                color: Math.random() > 0.5 ? 0x8B4513 : 0x654321,
                transparent: true,
                opacity: 0.9
            });

            const rubble = new THREE.Mesh(geometry, material);
            rubble.position.copy(position);
            rubble.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 2,
                (Math.random() - 0.5) * 4
            ));

            rubble.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 10 + 5,
                    (Math.random() - 0.5) * 8
                ),
                life: 3 + Math.random() * 2,
                decay: 0.3
            };

            this.scene.add(rubble);
            this.particles.push(rubble);
        }
    }

    /**
     * Update all particles
     */
    update(deltaTime) {
        this.particles = this.particles.filter(particle => {
            const data = particle.userData;

            data.velocity.y += Config.GRAVITY * deltaTime;
            particle.position.add(data.velocity.clone().multiplyScalar(deltaTime));

            data.life -= data.decay;
            particle.material.opacity = Math.max(0, data.life);
            particle.scale.multiplyScalar(0.98);

            if (data.life <= 0) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                return false;
            }
            return true;
        });
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles.forEach(particle => {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });
        this.particles = [];
    }
}
