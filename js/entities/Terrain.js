/**
 * Ballerburg 3D - Terrain
 * Handles terrain generation, rendering, and destruction
 */

class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.heightMap = [];
        this.width = Config.TERRAIN_WIDTH;
        this.depth = Config.TERRAIN_DEPTH;
        this.segments = Config.TERRAIN_SEGMENTS;
    }

    /**
     * Generate Ballerburg-style terrain with two mountains
     */
    generate() {
        this.heightMap = [];

        for (let i = 0; i <= this.segments; i++) {
            this.heightMap[i] = [];
            for (let j = 0; j <= this.segments; j++) {
                const x = (i / this.segments - 0.5) * this.width;
                const z = (j / this.segments - 0.5) * this.depth;

                let height = -5; // Base water level

                // Left mountain (for left castle)
                const leftDist = Math.sqrt(Math.pow(x + 40, 2) + Math.pow(z, 2));
                if (leftDist < 25) {
                    height = Math.max(height, 30 - leftDist * 1.2);
                }

                // Right mountain (for right castle)
                const rightDist = Math.sqrt(Math.pow(x - 40, 2) + Math.pow(z, 2));
                if (rightDist < 25) {
                    height = Math.max(height, 30 - rightDist * 1.2);
                }

                // Random variation
                height += (Math.random() - 0.5) * 2;

                // Edge falloff
                const edgeX = Math.abs(i / this.segments - 0.5) * 2;
                const edgeZ = Math.abs(j / this.segments - 0.5) * 2;
                const edgeFactor = Math.max(edgeX, edgeZ);
                if (edgeFactor > 0.8) {
                    height *= Math.cos((edgeFactor - 0.8) * Math.PI / 0.4) * 0.5 + 0.5;
                }

                this.heightMap[i][j] = Math.max(-10, Math.min(35, height));
            }
        }

        this._smooth();
        this._updateMesh();
    }

    /**
     * Smooth the terrain
     */
    _smooth() {
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

    /**
     * Create/update terrain mesh
     */
    _updateMesh() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

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

        // Generate indices
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
            color: Config.COLORS.terrain,
            shininess: 5,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    /**
     * Get terrain height at world coordinates
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

        const h00 = this.heightMap[i0][j0];
        const h10 = this.heightMap[i1][j0];
        const h01 = this.heightMap[i0][j1];
        const h11 = this.heightMap[i1][j1];

        return (h00 * (1-fx) + h10 * fx) * (1-fz) + (h01 * (1-fx) + h11 * fx) * fz;
    }

    /**
     * Create crater at impact point
     */
    damage(position, radius) {
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
                    this.heightMap[i][j] -= factor * factor * radius * 0.6;
                    this.heightMap[i][j] = Math.max(-10, this.heightMap[i][j]);
                    modified = true;
                }
            }
        }

        if (modified) this._updateMesh();
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
