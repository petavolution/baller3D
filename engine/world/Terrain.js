/**
 * Game Engine - Base Terrain System
 * Destructible heightmap terrain with mesh rendering
 * Games extend this with their specific generation logic
 */

class BaseTerrain {
    /**
     * Create terrain
     * @param {THREE.Scene} scene - The scene to add terrain to
     * @param {Object} config - Configuration with TERRAIN settings
     */
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;

        this.mesh = null;
        this.heightMap = [];

        // Get dimensions from config
        const terrainConfig = config.TERRAIN || {};
        this.width = terrainConfig.WIDTH || 120;
        this.depth = terrainConfig.DEPTH || 20;
        this.segments = terrainConfig.SEGMENTS || 100;
        this.minHeight = terrainConfig.MIN_HEIGHT || -10;
        this.maxHeight = terrainConfig.MAX_HEIGHT || 35;
        this.color = (config.COLORS && config.COLORS.TERRAIN) || 0x228822;
    }

    /**
     * Generate terrain - override in subclass for custom shapes
     * @param {Object} options - Generation options
     */
    generate(options = {}) {
        this.heightMap = [];

        for (let i = 0; i <= this.segments; i++) {
            this.heightMap[i] = [];
            for (let j = 0; j <= this.segments; j++) {
                const x = (i / this.segments - 0.5) * this.width;
                const z = (j / this.segments - 0.5) * this.depth;

                // Base flat terrain - subclasses override _generateHeight
                let height = this._generateHeight(x, z, i, j, options);

                // Apply edge falloff
                height = this._applyEdgeFalloff(height, i, j);

                // Clamp to bounds
                this.heightMap[i][j] = Utils.clamp(height, this.minHeight, this.maxHeight);
            }
        }

        // Post-processing
        if (options.smooth !== false) {
            this._smooth(options.smoothPasses || 1);
        }

        this._updateMesh();
    }

    /**
     * Generate height at position - override in subclass
     * @protected
     */
    _generateHeight(x, z, i, j, options) {
        // Base implementation: flat with random noise
        const baseHeight = options.baseHeight || 0;
        const noise = options.noise || 1;
        return baseHeight + (Math.random() - 0.5) * noise;
    }

    /**
     * Apply edge falloff to prevent harsh borders
     * @protected
     */
    _applyEdgeFalloff(height, i, j) {
        const edgeX = Math.abs(i / this.segments - 0.5) * 2;
        const edgeZ = Math.abs(j / this.segments - 0.5) * 2;
        const edgeFactor = Math.max(edgeX, edgeZ);

        if (edgeFactor > 0.8) {
            return height * (Math.cos((edgeFactor - 0.8) * Math.PI / 0.4) * 0.5 + 0.5);
        }
        return height;
    }

    /**
     * Smooth the terrain heightmap
     * @protected
     */
    _smooth(passes = 1) {
        for (let p = 0; p < passes; p++) {
            const smoothed = [];
            for (let i = 0; i <= this.segments; i++) {
                smoothed[i] = [];
                for (let j = 0; j <= this.segments; j++) {
                    let sum = this.heightMap[i][j] * 4;
                    let count = 4;

                    if (i > 0) { sum += this.heightMap[i-1][j]; count++; }
                    if (i < this.segments) { sum += this.heightMap[i+1][j]; count++; }
                    if (j > 0) { sum += this.heightMap[i][j-1]; count++; }
                    if (j < this.segments) { sum += this.heightMap[i][j+1]; count++; }

                    smoothed[i][j] = sum / count;
                }
            }
            this.heightMap = smoothed;
        }
    }

    /**
     * Create/update terrain mesh from heightmap
     * @protected
     */
    _updateMesh() {
        Utils.removeAndDispose(this.scene, this.mesh);

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const uvs = [];
        const indices = [];

        // Generate vertices
        for (let i = 0; i <= this.segments; i++) {
            for (let j = 0; j <= this.segments; j++) {
                const x = (i / this.segments - 0.5) * this.width;
                const z = (j / this.segments - 0.5) * this.depth;
                vertices.push(x, this.heightMap[i][j], z);
                uvs.push(i / this.segments, j / this.segments);
            }
        }

        // Generate indices (triangles)
        for (let i = 0; i < this.segments; i++) {
            for (let j = 0; j < this.segments; j++) {
                const a = i * (this.segments + 1) + j;
                const b = a + 1;
                const c = a + this.segments + 1;
                const d = c + 1;
                indices.push(a, c, b, b, c, d);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            shininess: 5,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    /**
     * Get interpolated terrain height at world coordinates
     * @param {number} x - World X position
     * @param {number} z - World Z position
     * @returns {number} Height at position, or -100 if out of bounds
     */
    getHeight(x, z) {
        const tx = (x / this.width + 0.5);
        const tz = (z / this.depth + 0.5);

        if (tx < 0 || tx > 1 || tz < 0 || tz > 1) return -100;

        const i = tx * this.segments;
        const j = tz * this.segments;

        const i0 = Math.floor(i);
        const j0 = Math.floor(j);
        const i1 = Math.min(i0 + 1, this.segments);
        const j1 = Math.min(j0 + 1, this.segments);

        const fx = i - i0;
        const fz = j - j0;

        // Bilinear interpolation
        const h00 = this.heightMap[i0][j0];
        const h10 = this.heightMap[i1][j0];
        const h01 = this.heightMap[i0][j1];
        const h11 = this.heightMap[i1][j1];

        return (h00 * (1-fx) + h10 * fx) * (1-fz) + (h01 * (1-fx) + h11 * fx) * fz;
    }

    /**
     * Check if position is within terrain bounds
     */
    isInBounds(x, z) {
        const tx = (x / this.width + 0.5);
        const tz = (z / this.depth + 0.5);
        return tx >= 0 && tx <= 1 && tz >= 0 && tz <= 1;
    }

    /**
     * Create crater at impact point
     * @param {THREE.Vector3} position - Impact position
     * @param {number} radius - Crater radius
     * @param {number} depth - Crater depth multiplier (default 0.6)
     */
    damage(position, radius, depth = 0.6) {
        let modified = false;

        for (let i = 0; i <= this.segments; i++) {
            for (let j = 0; j <= this.segments; j++) {
                const x = (i / this.segments - 0.5) * this.width;
                const z = (j / this.segments - 0.5) * this.depth;
                const y = this.heightMap[i][j];

                const dist = Math.sqrt(
                    Math.pow(x - position.x, 2) +
                    Math.pow(y - position.y, 2) +
                    Math.pow(z - position.z, 2)
                );

                if (dist < radius) {
                    const factor = 1 - (dist / radius);
                    this.heightMap[i][j] -= factor * factor * radius * depth;
                    this.heightMap[i][j] = Math.max(this.minHeight, this.heightMap[i][j]);
                    modified = true;
                }
            }
        }

        if (modified) this._updateMesh();
        return modified;
    }

    /**
     * Clean up resources
     */
    dispose() {
        Utils.removeAndDispose(this.scene, this.mesh);
        this.mesh = null;
        this.heightMap = [];
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BaseTerrain = BaseTerrain;
}
