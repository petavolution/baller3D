/**
 * Ballerburg 3D - Utility Functions
 * Common helpers for Three.js resource management
 */

const Utils = {
    /**
     * Dispose a Three.js mesh (geometry + material)
     */
    disposeMesh(mesh) {
        if (!mesh) return;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        }
    },

    /**
     * Dispose all children of a Three.js object
     */
    disposeObject(obj) {
        if (!obj) return;
        obj.traverse(child => {
            Utils.disposeMesh(child);
        });
    },

    /**
     * Remove object from scene and dispose all resources
     */
    removeAndDispose(scene, obj) {
        if (!obj) return;
        scene.remove(obj);
        Utils.disposeObject(obj);
    },

    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Random value in range
     */
    random(min, max) {
        return min + Math.random() * (max - min);
    },

    /**
     * Degrees to radians
     */
    degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
};

// Freeze to prevent modification
Object.freeze(Utils);
