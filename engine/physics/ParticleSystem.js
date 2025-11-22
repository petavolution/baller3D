/**
 * Game Engine - Particle System
 * Handles particles, explosions, debris, and floating text
 * Reusable across different games
 */

class ParticleSystem {
    /**
     * Create particle system
     * @param {THREE.Scene} scene - The scene to add particles to
     * @param {Object} config - Configuration with PHYSICS.GRAVITY
     */
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.particles = [];
    }

    /**
     * Create explosion particles at position
     * @param {THREE.Vector3} position - Center of explosion
     * @param {Object} options - Explosion options
     */
    createExplosion(position, options = {}) {
        const count = options.count || 60;
        const radius = options.radius || 5;
        const colors = options.colors || [0xff6600, 0xffaa00];
        const minSize = options.minSize || 0.3;
        const maxSize = options.maxSize || 1.1;

        for (let i = 0; i < count; i++) {
            const size = Utils.random(minSize, maxSize);
            const geometry = new THREE.SphereGeometry(size, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);

            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(radius / 2, radius);

            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Utils.random(radius / 2, radius),
                    Math.sin(angle) * speed
                ),
                life: 1,
                decay: Utils.random(0.01, 0.025),
                shrinkRate: options.shrinkRate || 0.98
            };

            this.scene.add(particle);
            this.particles.push(particle);
        }

        // Flash light effect
        if (options.flash !== false) {
            this._createFlash(position, radius);
        }
    }

    /**
     * Create flash light for explosion
     */
    _createFlash(position, radius) {
        const light = new THREE.PointLight(0xff6600, 15, radius * 4);
        light.position.copy(position);
        this.scene.add(light);
        setTimeout(() => this.scene.remove(light), 300);
    }

    /**
     * Create rubble/debris particles
     * @param {THREE.Vector3} position - Origin position
     * @param {Object} options - Debris options
     */
    createDebris(position, options = {}) {
        const count = options.count || 8;
        const colors = options.colors || [0x8B4513, 0x654321];
        const spread = options.spread || 4;

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.BoxGeometry(
                Utils.random(0.3, 1.1),
                Utils.random(0.3, 1.1),
                Utils.random(0.3, 1.1)
            );
            const material = new THREE.MeshPhongMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.9
            });

            const debris = new THREE.Mesh(geometry, material);
            debris.position.copy(position);
            debris.position.add(new THREE.Vector3(
                Utils.random(-spread / 2, spread / 2),
                Utils.random(0, spread / 2),
                Utils.random(-spread / 2, spread / 2)
            ));

            debris.userData = {
                velocity: new THREE.Vector3(
                    Utils.random(-8, 8),
                    Utils.random(5, 15),
                    Utils.random(-8, 8)
                ),
                life: Utils.random(3, 5),
                decay: 0.3,
                shrinkRate: 1.0 // Don't shrink debris
            };

            this.scene.add(debris);
            this.particles.push(debris);
        }
    }

    /**
     * Create floating damage number
     * @param {THREE.Vector3} position - World position
     * @param {number} value - Number to display
     * @param {Object} options - Display options
     */
    createFloatingText(position, value, options = {}) {
        const color = options.color || 0xff0000;
        const prefix = options.prefix || '-';
        const fontSize = options.fontSize || 48;
        const scale = options.scale || [4, 2, 1];

        // Create canvas for text
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw text
        const colorHex = '#' + color.toString(16).padStart(6, '0');
        ctx.fillStyle = colorHex;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prefix + Math.floor(value), 64, 32);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(scale[0], scale[1], scale[2]);
        sprite.position.copy(position);
        sprite.position.y += 2;

        sprite.userData = {
            velocity: new THREE.Vector3(0, options.riseSpeed || 8, 0),
            life: options.life || 1.5,
            decay: options.decay || 1,
            shrinkRate: 1.0,
            isSprite: true
        };

        this.scene.add(sprite);
        this.particles.push(sprite);
    }

    /**
     * Update all particles
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        const gravity = this.config.PHYSICS ? this.config.PHYSICS.GRAVITY : -9.8;

        this.particles = this.particles.filter(particle => {
            const data = particle.userData;

            // Apply gravity (not to sprites/text)
            if (!data.isSprite) {
                data.velocity.y += gravity * deltaTime;
            }

            // Move particle
            particle.position.add(
                data.velocity.clone().multiplyScalar(deltaTime)
            );

            // Decay life
            data.life -= data.decay * deltaTime;

            // Update opacity
            particle.material.opacity = Math.max(0, data.life);

            // Shrink
            if (data.shrinkRate < 1.0) {
                particle.scale.multiplyScalar(data.shrinkRate);
            }

            // Remove dead particles
            if (data.life <= 0) {
                Utils.removeAndDispose(this.scene, particle);
                return false;
            }
            return true;
        });
    }

    /**
     * Get particle count
     */
    get count() {
        return this.particles.length;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles.forEach(p => Utils.removeAndDispose(this.scene, p));
        this.particles = [];
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.clear();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ParticleSystem = ParticleSystem;
}
