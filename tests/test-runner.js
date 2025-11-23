#!/usr/bin/env node
/**
 * Ballerburg 3D - CLI Test Runner
 * Runs all tests and outputs results to console and debug-log.txt
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Test Framework
// ============================================================================

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.startTime = Date.now();
        this.logFile = path.join(__dirname, '..', 'debug-log.txt');
    }

    /**
     * Register a test
     */
    test(name, fn) {
        this.tests.push({ name, fn });
    }

    /**
     * Register a test suite
     */
    describe(suiteName, fn) {
        this.log(`\n--- Suite: ${suiteName} ---`);
        fn();
    }

    /**
     * Assert equality
     */
    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
        }
    }

    /**
     * Assert truthy
     */
    assertTrue(value, message = 'Expected truthy value') {
        if (!value) {
            throw new Error(message);
        }
    }

    /**
     * Assert falsy
     */
    assertFalse(value, message = 'Expected falsy value') {
        if (value) {
            throw new Error(message);
        }
    }

    /**
     * Assert throws
     */
    assertThrows(fn, message = 'Expected function to throw') {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(message);
        }
    }

    /**
     * Assert nearly equal (for floats)
     */
    assertNearlyEqual(actual, expected, epsilon = 0.001, message = '') {
        if (Math.abs(actual - expected) > epsilon) {
            throw new Error(`${message}\nExpected: ${expected} (±${epsilon})\nActual: ${actual}`);
        }
    }

    /**
     * Assert defined
     */
    assertDefined(value, message = 'Expected value to be defined') {
        if (value === undefined || value === null) {
            throw new Error(message);
        }
    }

    /**
     * Assert type
     */
    assertType(value, type, message = '') {
        const actualType = typeof value;
        if (actualType !== type) {
            throw new Error(`${message}\nExpected type: ${type}\nActual type: ${actualType}`);
        }
    }

    /**
     * Log message
     */
    log(message) {
        console.log(message);
        this.appendToLog(message);
    }

    /**
     * Append to log file
     */
    appendToLog(message) {
        try {
            fs.appendFileSync(this.logFile, message + '\n');
        } catch (e) {
            // Ignore file write errors
        }
    }

    /**
     * Run all tests
     */
    async run() {
        // Clear log file
        try {
            fs.writeFileSync(this.logFile, '');
        } catch (e) {}

        const header = [
            '='.repeat(60),
            'BALLERBURG 3D - TEST RESULTS',
            '='.repeat(60),
            `Started: ${new Date().toISOString()}`,
            ''
        ].join('\n');

        this.log(header);

        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                this.results.push({ name: test.name, status: 'PASS' });
                this.log(`  ✓ PASS: ${test.name}`);
            } catch (error) {
                this.failed++;
                this.results.push({ name: test.name, status: 'FAIL', error: error.message });
                this.log(`  ✗ FAIL: ${test.name}`);
                this.log(`         ${error.message}`);
            }
        }

        this.printSummary();
        return this.failed === 0;
    }

    /**
     * Print summary
     */
    printSummary() {
        const duration = Date.now() - this.startTime;
        const summary = [
            '',
            '='.repeat(60),
            'SUMMARY',
            '='.repeat(60),
            `Total:  ${this.tests.length}`,
            `Passed: ${this.passed}`,
            `Failed: ${this.failed}`,
            `Duration: ${duration}ms`,
            '='.repeat(60),
            this.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED',
            ''
        ].join('\n');

        this.log(summary);
    }
}

// ============================================================================
// Mock Three.js for Node.js environment
// ============================================================================

global.THREE = {
    Vector3: class {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        clone() {
            return new global.THREE.Vector3(this.x, this.y, this.z);
        }
        copy(v) {
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            return this;
        }
        add(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            return this;
        }
        multiplyScalar(s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
            return this;
        }
        normalize() {
            const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            if (len > 0) {
                this.x /= len;
                this.y /= len;
                this.z /= len;
            }
            return this;
        }
        distanceTo(v) {
            const dx = this.x - v.x;
            const dy = this.y - v.y;
            const dz = this.z - v.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
    },
    Group: class {
        constructor() { this.children = []; this.position = new global.THREE.Vector3(); this.rotation = { x: 0, y: 0, z: 0 }; }
        add(child) { this.children.push(child); }
        remove(child) { const i = this.children.indexOf(child); if (i > -1) this.children.splice(i, 1); }
        traverse(fn) { this.children.forEach(fn); }
        clear() { this.children = []; }
    },
    Scene: class {
        constructor() { this.children = []; this.fog = null; }
        add(obj) { this.children.push(obj); }
        remove(obj) { const i = this.children.indexOf(obj); if (i > -1) this.children.splice(i, 1); }
    },
    Mesh: class {
        constructor(geometry, material) {
            this.geometry = geometry || {};
            this.material = material || {};
            this.position = new global.THREE.Vector3();
            this.rotation = { x: 0, y: 0, z: 0 };
            this.scale = { x: 1, y: 1, z: 1, multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; } };
            this.castShadow = false;
            this.receiveShadow = false;
            this.userData = {};
        }
        getWorldPosition(target) {
            target.copy(this.position);
            return target;
        }
    },
    BoxGeometry: class { dispose() {} },
    SphereGeometry: class { dispose() {} },
    CylinderGeometry: class { dispose() {} },
    ConeGeometry: class { dispose() {} },
    PlaneGeometry: class { dispose() {} },
    BufferGeometry: class {
        constructor() { this.attributes = {}; }
        setAttribute(name, attr) { this.attributes[name] = attr; }
        setIndex(indices) { this.indices = indices; }
        computeVertexNormals() {}
        dispose() {}
    },
    Float32BufferAttribute: class {
        constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
    },
    MeshPhongMaterial: class {
        constructor(opts = {}) { Object.assign(this, opts); this.color = { setHex(h) { this.hex = h; } }; }
        clone() { return new global.THREE.MeshPhongMaterial(this); }
        dispose() {}
    },
    MeshBasicMaterial: class {
        constructor(opts = {}) { Object.assign(this, opts); this.color = { setHex(h) { this.hex = h; } }; }
        clone() { return new global.THREE.MeshBasicMaterial(this); }
        dispose() {}
    },
    Fog: class { constructor() {} },
    AmbientLight: class { constructor() {} },
    DirectionalLight: class {
        constructor() { this.position = { set() {} }; this.shadow = { camera: {}, mapSize: {} }; this.castShadow = false; }
    },
    PointLight: class { constructor() { this.position = new global.THREE.Vector3(); } },
    PerspectiveCamera: class {
        constructor() { this.position = new global.THREE.Vector3(); this.fov = 50; this.aspect = 1; }
        lookAt() {}
        updateProjectionMatrix() {}
    },
    WebGLRenderer: class {
        constructor() { this.shadowMap = {}; }
        setSize() {}
        setClearColor() {}
        render() {}
    },
    DoubleSide: 2,
    BackSide: 1,
    PCFSoftShadowMap: 2
};

// ============================================================================
// Load Config
// ============================================================================

const Config = {
    TERRAIN_WIDTH: 120,
    TERRAIN_DEPTH: 20,
    TERRAIN_SEGMENTS: 100,
    GRAVITY: -9.8,
    WIND_MAX: 4,
    TURN_TIME: 45,
    MAX_POWER: 35,
    PLAYER_COUNT: 2,
    CASTLE_POSITIONS: [{ x: -40, z: 0 }, { x: 40, z: 0 }],
    PLAYER_COLORS: [
        { stone: 0x8B4513, roof: 0xCC0000, name: 'Red' },
        { stone: 0x4A4A4A, roof: 0x0066CC, name: 'Blue' }
    ],
    WEAPONS: [
        { name: 'Cannonball', damage: 60, radius: 8, speed: 1.0, ammo: -1 },
        { name: 'Explosive', damage: 80, radius: 12, speed: 0.9, ammo: 8 },
        { name: 'Chain Shot', damage: 40, radius: 15, speed: 0.7, ammo: 6 },
        { name: 'Fire Ball', damage: 45, radius: 10, speed: 1.1, ammo: 10 },
        { name: 'Stone Ball', damage: 35, radius: 6, speed: 1.3, ammo: -1 }
    ],
    CAMERA: { fov: 50, near: 0.1, far: 1000, defaultPosition: { x: 0, y: 40, z: 60 }, lookAt: { x: 0, y: 15, z: 0 } },
    COLORS: { sky: 0x87CEEB, water: 0x006994, terrain: 0x4a5d23, fog: 0x87CEEB }
};

global.Config = Config;

// ============================================================================
// Inline Entity Classes for Testing (mirrors actual implementations)
// ============================================================================

class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.heightMap = [];
        this.width = Config.TERRAIN_WIDTH;
        this.depth = Config.TERRAIN_DEPTH;
        this.segments = Config.TERRAIN_SEGMENTS;
    }

    generate() {
        this.heightMap = [];
        for (let i = 0; i <= this.segments; i++) {
            this.heightMap[i] = [];
            for (let j = 0; j <= this.segments; j++) {
                const x = (i / this.segments - 0.5) * this.width;
                const z = (j / this.segments - 0.5) * this.depth;
                let height = -5;
                const leftDist = Math.sqrt(Math.pow(x + 40, 2) + Math.pow(z, 2));
                if (leftDist < 25) height = Math.max(height, 30 - leftDist * 1.2);
                const rightDist = Math.sqrt(Math.pow(x - 40, 2) + Math.pow(z, 2));
                if (rightDist < 25) height = Math.max(height, 30 - rightDist * 1.2);
                height += (Math.random() - 0.5) * 2;
                this.heightMap[i][j] = Math.max(-10, Math.min(35, height));
            }
        }
    }

    getHeight(x, z) {
        const tx = (x / this.width + 0.5);
        const tz = (z / this.depth + 0.5);
        if (tx < 0 || tx > 1 || tz < 0 || tz > 1) return -100;
        const i = Math.floor(tx * this.segments);
        const j = Math.floor(tz * this.segments);
        return this.heightMap[Math.min(i, this.segments)][Math.min(j, this.segments)] || 0;
    }

    damage(position, radius) {
        for (let i = 0; i <= this.segments; i++) {
            for (let j = 0; j <= this.segments; j++) {
                const x = (i / this.segments - 0.5) * this.width;
                const z = (j / this.segments - 0.5) * this.depth;
                const y = this.heightMap[i][j];
                const dist = Math.sqrt(Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2) + Math.pow(z - position.z, 2));
                if (dist < radius) {
                    this.heightMap[i][j] -= (1 - dist / radius) * (1 - dist / radius) * radius * 0.6;
                    this.heightMap[i][j] = Math.max(-10, this.heightMap[i][j]);
                }
            }
        }
    }

    dispose() {}
}

class Castle {
    constructor(scene, terrain, playerIndex) {
        this.scene = scene;
        this.terrain = terrain;
        this.playerIndex = playerIndex;
        const pos = Config.CASTLE_POSITIONS[playerIndex];
        this.position = new THREE.Vector3(pos.x, 0, pos.z);
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.parts = [
            { type: 'base', health: 30, destroyed: false, mesh: new THREE.Mesh() },
            { type: 'tower', health: 40, destroyed: false, mesh: new THREE.Mesh() }
        ];
        this.group = new THREE.Group();
    }

    updatePosition() {
        this.position.y = this.terrain.getHeight(this.position.x, this.position.z);
    }

    updateHealthBar() {}

    takeDamage(damage, impactPoint) {
        if (!this.alive) return;
        this.health -= damage * 0.3;
        this.health = Math.max(0, this.health);
        if (this.health <= 0) this.alive = false;
    }

    dispose() {}
}

class Cannon {
    constructor(scene, castle) {
        this.scene = scene;
        this.castle = castle;
        this.position = castle.position.clone();
        this.position.y += 12;
        this.verticalAngle = 45;
        this.horizontalAngle = 0;
        this.group = new THREE.Group();
        this.barrel = new THREE.Mesh();
    }

    setAim(vertical, horizontal) {
        this.verticalAngle = Math.max(10, Math.min(80, vertical));
        this.horizontalAngle = Math.max(-45, Math.min(45, horizontal));
    }

    getFireDirection() {
        const baseDir = this.castle.playerIndex === 0 ? 0 : 180;
        const finalDir = baseDir + this.horizontalAngle;
        return new THREE.Vector3(
            Math.sin((finalDir * Math.PI) / 180) * Math.cos((this.verticalAngle * Math.PI) / 180),
            Math.sin((this.verticalAngle * Math.PI) / 180),
            Math.cos((finalDir * Math.PI) / 180) * Math.cos((this.verticalAngle * Math.PI) / 180)
        ).normalize();
    }

    getFirePosition() {
        return this.position.clone();
    }

    dispose() {}
}

class Projectile {
    constructor(scene, position, velocity, weapon) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.weapon = weapon;
        this.exploded = false;
        this.mesh = new THREE.Mesh();
    }

    update(deltaTime, terrain, wind) {
        if (this.exploded) return false;
        this.velocity.y += Config.GRAVITY * deltaTime;
        this.velocity.x += wind.strength * wind.direction * deltaTime * 0.3;
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        const terrainY = terrain.getHeight(this.position.x, this.position.z);
        if (this.position.y <= terrainY) return false;
        if (Math.abs(this.position.x) > Config.TERRAIN_WIDTH / 2 + 20) return false;
        return true;
    }

    explode() { this.exploded = true; }
    dispose() {}
}

global.Terrain = Terrain;
global.Castle = Castle;
global.Cannon = Cannon;
global.Projectile = Projectile;

// ============================================================================
// Tests
// ============================================================================

const runner = new TestRunner();

// --- Config Tests ---
runner.describe('Config', () => {
    runner.test('Config object exists', () => {
        runner.assertDefined(Config);
    });

    runner.test('Config.TERRAIN_WIDTH is valid', () => {
        runner.assertType(Config.TERRAIN_WIDTH, 'number');
        runner.assertTrue(Config.TERRAIN_WIDTH > 0, 'TERRAIN_WIDTH should be positive');
    });

    runner.test('Config.GRAVITY is negative', () => {
        runner.assertTrue(Config.GRAVITY < 0, 'Gravity should be negative');
    });

    runner.test('Config.WEAPONS has entries', () => {
        runner.assertTrue(Config.WEAPONS.length > 0, 'Should have at least one weapon');
    });

    runner.test('Config.PLAYER_COUNT matches positions', () => {
        runner.assertEqual(Config.PLAYER_COUNT, Config.CASTLE_POSITIONS.length);
    });
});

// --- Vector3 Tests ---
runner.describe('THREE.Vector3', () => {
    runner.test('Vector3 clone creates independent copy', () => {
        const v1 = new THREE.Vector3(1, 2, 3);
        const v2 = v1.clone();
        v2.x = 10;
        runner.assertEqual(v1.x, 1, 'Original should not be modified');
        runner.assertEqual(v2.x, 10, 'Clone should be modified');
    });

    runner.test('Vector3 multiplyScalar works', () => {
        const v = new THREE.Vector3(2, 3, 4);
        v.multiplyScalar(2);
        runner.assertEqual(v.x, 4);
        runner.assertEqual(v.y, 6);
        runner.assertEqual(v.z, 8);
    });

    runner.test('Vector3 distanceTo is correct', () => {
        const v1 = new THREE.Vector3(0, 0, 0);
        const v2 = new THREE.Vector3(3, 4, 0);
        runner.assertEqual(v1.distanceTo(v2), 5, 'Distance should be 5 (3-4-5 triangle)');
    });
});

// --- Terrain Tests ---
runner.describe('Terrain', () => {
    runner.test('Terrain generates heightMap', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        runner.assertTrue(terrain.heightMap.length > 0, 'HeightMap should be generated');
    });

    runner.test('Terrain getHeight returns value for valid coords', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const height = terrain.getHeight(0, 0);
        runner.assertType(height, 'number');
    });

    runner.test('Terrain getHeight returns -100 for out of bounds', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const height = terrain.getHeight(1000, 1000);
        runner.assertEqual(height, -100);
    });

    runner.test('Terrain damage modifies heightMap', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const before = terrain.getHeight(0, 0);
        terrain.damage(new THREE.Vector3(0, before, 0), 5);
        const after = terrain.getHeight(0, 0);
        runner.assertTrue(after <= before, 'Height should decrease or stay same after damage');
    });
});

// --- Castle Tests ---
runner.describe('Castle', () => {
    runner.test('Castle initializes with correct health', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        runner.assertEqual(castle.health, 100);
        runner.assertEqual(castle.maxHealth, 100);
        runner.assertTrue(castle.alive);
    });

    runner.test('Castle has parts', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        runner.assertTrue(castle.parts.length > 0, 'Castle should have parts');
    });

    runner.test('Castle takeDamage reduces health', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        castle.takeDamage(50, new THREE.Vector3(-40, 10, 0));
        runner.assertTrue(castle.health < 100, 'Health should be reduced');
    });

    runner.test('Castle dies at 0 health', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        castle.takeDamage(500, new THREE.Vector3(-40, 10, 0));
        runner.assertFalse(castle.alive, 'Castle should be dead');
    });
});

// --- Cannon Tests ---
runner.describe('Cannon', () => {
    runner.test('Cannon initializes with default angles', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        const cannon = new Cannon(scene, castle);
        runner.assertEqual(cannon.verticalAngle, 45);
        runner.assertEqual(cannon.horizontalAngle, 0);
    });

    runner.test('Cannon setAim clamps values', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        const cannon = new Cannon(scene, castle);
        cannon.setAim(0, 100);  // Out of range
        runner.assertEqual(cannon.verticalAngle, 10, 'Vertical should clamp to 10');
        runner.assertEqual(cannon.horizontalAngle, 45, 'Horizontal should clamp to 45');
    });

    runner.test('Cannon getFireDirection returns normalized vector', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const castle = new Castle(scene, terrain, 0);
        const cannon = new Cannon(scene, castle);
        const dir = cannon.getFireDirection();
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        runner.assertNearlyEqual(len, 1, 0.01, 'Direction should be normalized');
    });
});

// --- Projectile Tests ---
runner.describe('Projectile', () => {
    runner.test('Projectile initializes with cloned position', () => {
        const scene = new THREE.Scene();
        const pos = new THREE.Vector3(10, 20, 30);
        const vel = new THREE.Vector3(1, 1, 0);
        const weapon = Config.WEAPONS[0];
        const proj = new Projectile(scene, pos, vel, weapon);
        pos.x = 999;  // Modify original
        runner.assertEqual(proj.position.x, 10, 'Projectile position should be independent');
    });

    runner.test('Projectile update applies gravity', () => {
        const scene = new THREE.Scene();
        const terrain = new Terrain(scene);
        terrain.generate();
        const pos = new THREE.Vector3(0, 50, 0);
        const vel = new THREE.Vector3(10, 0, 0);
        const weapon = Config.WEAPONS[0];
        const proj = new Projectile(scene, pos, vel, weapon);
        const initialVelY = proj.velocity.y;
        proj.update(0.1, terrain, { strength: 0, direction: 1 });
        runner.assertTrue(proj.velocity.y < initialVelY, 'Velocity Y should decrease due to gravity');
    });
});

// ============================================================================
// Engine Tests
// ============================================================================

// --- Utils Tests ---
const Utils = {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    lerp: (a, b, t) => a + (b - a) * t,
    degToRad: (degrees) => degrees * Math.PI / 180,
    random: (min, max) => min + Math.random() * (max - min)
};
global.Utils = Utils;

runner.describe('Utils', () => {
    runner.test('Utils.clamp works correctly', () => {
        runner.assertEqual(Utils.clamp(5, 0, 10), 5, 'Value in range');
        runner.assertEqual(Utils.clamp(-5, 0, 10), 0, 'Value below min');
        runner.assertEqual(Utils.clamp(15, 0, 10), 10, 'Value above max');
    });

    runner.test('Utils.lerp interpolates correctly', () => {
        runner.assertEqual(Utils.lerp(0, 10, 0), 0, 'lerp at t=0');
        runner.assertEqual(Utils.lerp(0, 10, 1), 10, 'lerp at t=1');
        runner.assertEqual(Utils.lerp(0, 10, 0.5), 5, 'lerp at t=0.5');
    });

    runner.test('Utils.degToRad converts correctly', () => {
        runner.assertNearlyEqual(Utils.degToRad(180), Math.PI, 0.0001);
        runner.assertNearlyEqual(Utils.degToRad(90), Math.PI / 2, 0.0001);
        runner.assertNearlyEqual(Utils.degToRad(0), 0, 0.0001);
    });
});

// --- Entity Base Class Tests ---
class Entity {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.position = new THREE.Vector3();
        this.alive = true;
        this.disposed = false;
        this.scene.add(this.group);
    }
    kill() { this.alive = false; }
    isActive() { return this.alive && !this.disposed; }
    syncPosition() { this.group.position.copy(this.position); }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.scene.remove(this.group);
    }
}

class DamageableEntity extends Entity {
    constructor(scene, maxHealth = 100) {
        super(scene);
        this.health = maxHealth;
        this.maxHealth = maxHealth;
    }
    takeDamage(amount) {
        if (!this.alive) return false;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) { this.kill(); return true; }
        return false;
    }
    heal(amount) { this.health = Math.min(this.maxHealth, this.health + amount); }
    getHealthPercent() { return this.health / this.maxHealth; }
}

global.Entity = Entity;
global.DamageableEntity = DamageableEntity;

runner.describe('Entity', () => {
    runner.test('Entity initializes correctly', () => {
        const scene = new THREE.Scene();
        const entity = new Entity(scene);
        runner.assertTrue(entity.alive, 'Entity should be alive');
        runner.assertFalse(entity.disposed, 'Entity should not be disposed');
    });

    runner.test('Entity.kill marks entity as dead', () => {
        const scene = new THREE.Scene();
        const entity = new Entity(scene);
        entity.kill();
        runner.assertFalse(entity.alive, 'Entity should be dead');
        runner.assertTrue(entity.isActive() === false, 'isActive should return false');
    });

    runner.test('Entity.dispose is safe to call multiple times', () => {
        const scene = new THREE.Scene();
        const entity = new Entity(scene);
        entity.dispose();
        entity.dispose(); // Should not throw
        runner.assertTrue(entity.disposed, 'Entity should be disposed');
    });
});

runner.describe('DamageableEntity', () => {
    runner.test('DamageableEntity initializes with health', () => {
        const scene = new THREE.Scene();
        const entity = new DamageableEntity(scene, 50);
        runner.assertEqual(entity.health, 50);
        runner.assertEqual(entity.maxHealth, 50);
    });

    runner.test('DamageableEntity.takeDamage reduces health', () => {
        const scene = new THREE.Scene();
        const entity = new DamageableEntity(scene, 100);
        entity.takeDamage(30);
        runner.assertEqual(entity.health, 70);
    });

    runner.test('DamageableEntity dies at 0 health', () => {
        const scene = new THREE.Scene();
        const entity = new DamageableEntity(scene, 50);
        const died = entity.takeDamage(50);
        runner.assertTrue(died, 'takeDamage should return true when killed');
        runner.assertFalse(entity.alive, 'Entity should be dead');
    });

    runner.test('DamageableEntity.heal increases health', () => {
        const scene = new THREE.Scene();
        const entity = new DamageableEntity(scene, 100);
        entity.takeDamage(50);
        entity.heal(20);
        runner.assertEqual(entity.health, 70);
    });

    runner.test('DamageableEntity.heal caps at maxHealth', () => {
        const scene = new THREE.Scene();
        const entity = new DamageableEntity(scene, 100);
        entity.takeDamage(10);
        entity.heal(50);
        runner.assertEqual(entity.health, 100, 'Health should not exceed max');
    });

    runner.test('DamageableEntity.getHealthPercent returns correct value', () => {
        const scene = new THREE.Scene();
        const entity = new DamageableEntity(scene, 100);
        entity.takeDamage(25);
        runner.assertNearlyEqual(entity.getHealthPercent(), 0.75, 0.01);
    });
});

// --- Config System Tests ---
const EngineConfig = {
    PHYSICS: { GRAVITY: -9.8 },
    CAMERA: { FOV: 50 }
};

function mergeConfig(base, override) {
    const result = { ...base };
    for (const key in override) {
        if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
            result[key] = mergeConfig(base[key] || {}, override[key]);
        } else {
            result[key] = override[key];
        }
    }
    return result;
}

function createGameConfig(gameConfig) {
    return mergeConfig(EngineConfig, gameConfig);
}

global.EngineConfig = EngineConfig;
global.createGameConfig = createGameConfig;

runner.describe('Config System', () => {
    runner.test('createGameConfig merges with defaults', () => {
        const gameConfig = createGameConfig({
            PHYSICS: { WIND_MAX: 5 }
        });
        runner.assertEqual(gameConfig.PHYSICS.GRAVITY, -9.8, 'Should have default gravity');
        runner.assertEqual(gameConfig.PHYSICS.WIND_MAX, 5, 'Should have game-specific wind');
    });

    runner.test('createGameConfig overrides defaults', () => {
        const gameConfig = createGameConfig({
            PHYSICS: { GRAVITY: -25 }
        });
        runner.assertEqual(gameConfig.PHYSICS.GRAVITY, -25, 'Should override gravity');
    });

    runner.test('createGameConfig preserves nested defaults', () => {
        const gameConfig = createGameConfig({
            GAMEPLAY: { MAX_POWER: 50 }
        });
        runner.assertEqual(gameConfig.CAMERA.FOV, 50, 'Should preserve camera defaults');
        runner.assertEqual(gameConfig.GAMEPLAY.MAX_POWER, 50, 'Should have new setting');
    });
});

// --- ParticleSystem Tests ---
class ParticleSystem {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config || { PHYSICS: { GRAVITY: -9.8 } };
        this.particles = [];
    }

    createExplosion(position, options = {}) {
        const count = options.count || 10;
        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                userData: { life: 1, decay: 0.02, velocity: new THREE.Vector3() }
            };
            this.particles.push(particle);
        }
    }

    createSplash(position, options = {}) {
        const count = options.count || 15;
        for (let i = 0; i < count; i++) {
            const particle = {
                position: position.clone(),
                userData: { life: 0.8, decay: 0.03, velocity: new THREE.Vector3(0, 5, 0) }
            };
            this.particles.push(particle);
        }
    }

    createSpeechBubble(position, text, options = {}) {
        const sprite = {
            position: position.clone(),
            text: text,
            userData: { life: options.duration || 1.5, decay: 1, isSprite: true }
        };
        this.particles.push(sprite);
    }

    createDebris(position, options = {}) {
        const count = options.count || 8;
        for (let i = 0; i < count; i++) {
            const debris = {
                position: position.clone(),
                userData: { life: 3, decay: 0.3, velocity: new THREE.Vector3() }
            };
            this.particles.push(debris);
        }
    }

    get count() { return this.particles.length; }
    clear() { this.particles = []; }
    dispose() { this.clear(); }
}

global.ParticleSystem = ParticleSystem;

runner.describe('ParticleSystem', () => {
    runner.test('ParticleSystem initializes empty', () => {
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        runner.assertEqual(ps.count, 0, 'Should start with no particles');
    });

    runner.test('ParticleSystem.createExplosion adds particles', () => {
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        ps.createExplosion(new THREE.Vector3(0, 0, 0), { count: 20 });
        runner.assertEqual(ps.count, 20, 'Should have 20 particles');
    });

    runner.test('ParticleSystem.createSplash adds particles', () => {
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        ps.createSplash(new THREE.Vector3(0, -5, 0), { count: 10 });
        runner.assertEqual(ps.count, 10, 'Should have 10 splash particles');
    });

    runner.test('ParticleSystem.createSpeechBubble adds sprite', () => {
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        ps.createSpeechBubble(new THREE.Vector3(0, 5, 0), 'Fire!');
        runner.assertEqual(ps.count, 1, 'Should have 1 speech bubble');
        runner.assertEqual(ps.particles[0].text, 'Fire!', 'Should store text');
    });

    runner.test('ParticleSystem.createDebris adds debris particles', () => {
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        ps.createDebris(new THREE.Vector3(0, 10, 0), { count: 5 });
        runner.assertEqual(ps.count, 5, 'Should have 5 debris particles');
    });

    runner.test('ParticleSystem.clear removes all particles', () => {
        const scene = new THREE.Scene();
        const ps = new ParticleSystem(scene);
        ps.createExplosion(new THREE.Vector3(0, 0, 0), { count: 30 });
        ps.clear();
        runner.assertEqual(ps.count, 0, 'Should have no particles after clear');
    });
});

// --- TrajectoryPreview Tests ---
class TrajectoryPreview {
    constructor(scene, config, options = {}) {
        this.scene = scene;
        this.config = config || { PHYSICS: { GRAVITY: -9.8 } };
        this.points = [];
        this.pointCount = options.pointCount || 25;
        this.timeStep = options.timeStep || 0.1;
    }

    update(startPos, velocity, wind = null, terrain = null) {
        this.clear();
        const gravity = this.config.PHYSICS ? this.config.PHYSICS.GRAVITY : -9.8;
        const pos = startPos.clone();
        const vel = velocity.clone();

        for (let i = 0; i < this.pointCount; i++) {
            vel.y += gravity * this.timeStep;
            if (wind) {
                vel.x += wind.strength * wind.direction * this.timeStep * 0.3;
            }
            pos.add(vel.clone().multiplyScalar(this.timeStep));
            this.points.push(pos.clone());
        }
    }

    clear() { this.points = []; }
    dispose() { this.clear(); }
}

global.TrajectoryPreview = TrajectoryPreview;

runner.describe('TrajectoryPreview', () => {
    runner.test('TrajectoryPreview initializes empty', () => {
        const scene = new THREE.Scene();
        const tp = new TrajectoryPreview(scene, { PHYSICS: { GRAVITY: -9.8 } });
        runner.assertEqual(tp.points.length, 0, 'Should start with no points');
    });

    runner.test('TrajectoryPreview.update generates points', () => {
        const scene = new THREE.Scene();
        const tp = new TrajectoryPreview(scene, { PHYSICS: { GRAVITY: -9.8 } }, { pointCount: 10 });
        tp.update(new THREE.Vector3(0, 20, 0), new THREE.Vector3(5, 10, 0));
        runner.assertEqual(tp.points.length, 10, 'Should have 10 trajectory points');
    });

    runner.test('TrajectoryPreview applies gravity to trajectory', () => {
        const scene = new THREE.Scene();
        const tp = new TrajectoryPreview(scene, { PHYSICS: { GRAVITY: -9.8 } }, { pointCount: 5 });
        tp.update(new THREE.Vector3(0, 50, 0), new THREE.Vector3(10, 0, 0));
        // Points should fall due to gravity
        runner.assertTrue(tp.points[4].y < 50, 'End point should be lower due to gravity');
    });

    runner.test('TrajectoryPreview applies wind', () => {
        const scene = new THREE.Scene();
        const tp = new TrajectoryPreview(scene, { PHYSICS: { GRAVITY: -9.8 } }, { pointCount: 10 });
        tp.update(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, 10, 0), { strength: 5, direction: 1 });
        // Wind should push trajectory in x direction
        runner.assertTrue(tp.points[9].x > 0, 'Trajectory should drift with wind');
    });

    runner.test('TrajectoryPreview.clear removes all points', () => {
        const scene = new THREE.Scene();
        const tp = new TrajectoryPreview(scene, { PHYSICS: { GRAVITY: -9.8 } });
        tp.update(new THREE.Vector3(0, 20, 0), new THREE.Vector3(5, 10, 0));
        tp.clear();
        runner.assertEqual(tp.points.length, 0, 'Should have no points after clear');
    });
});

// --- TrajectoryCalculator Tests ---
// Based on BALLER2.C comp() function by Eckhard Kruse (1987)
class TrajectoryCalculator {
    static calculateTrajectory(source, target, gravity, wind = 0, options = {}) {
        const dragFactor = options.dragFactor || 150;
        const maxVelocity = options.maxVelocity || 50;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.abs(dx);
        const direction = dx > 0 ? 1 : -1;

        const g = Math.abs(gravity) * 0.02;
        const windTarget = wind * 0.5;

        let bestVx = null;
        let bestVy = null;
        let x2 = -1;

        for (let vx = 0.5; vx < maxVelocity && (x2 < distance || Math.abs(bestVy) / 3.5 > vx); vx += 0.4) {
            let t = 0;
            x2 = 0;
            let vx2 = vx;

            while (vx2 > 0 && x2 < distance) {
                x2 += vx2;
                vx2 += (windTarget - vx2) / dragFactor;
                t++;
            }

            if (t > 0) {
                bestVy = dy / t + 0.5 * g * t;
                bestVx = vx;
            }
        }

        if (bestVx === null) return null;

        const finalVx = bestVx * direction;
        const finalVy = bestVy;
        const angle = Math.atan2(finalVy, Math.abs(finalVx)) * (180 / Math.PI);
        const power = Math.sqrt(finalVx * finalVx + finalVy * finalVy);

        return { vx: finalVx, vy: finalVy, angle, power, direction };
    }

    static addInaccuracy(trajectory, inaccuracy = 0.1) {
        if (!trajectory) return null;
        const factor = 1 + (Math.random() * 2 - 1) * inaccuracy;
        return {
            vx: trajectory.vx * factor,
            vy: trajectory.vy * (1 + (Math.random() * 2 - 1) * inaccuracy),
            angle: trajectory.angle,
            power: trajectory.power * factor,
            direction: trajectory.direction
        };
    }
}

global.TrajectoryCalculator = TrajectoryCalculator;

runner.describe('TrajectoryCalculator', () => {
    runner.test('TrajectoryCalculator calculates basic trajectory', () => {
        const source = { x: 0, y: 20 };
        const target = { x: 50, y: 20 };
        const result = TrajectoryCalculator.calculateTrajectory(source, target, -9.8);
        runner.assertDefined(result, 'Should return trajectory');
        runner.assertTrue(result.vx > 0, 'Velocity should be positive for right target');
        runner.assertEqual(result.direction, 1, 'Direction should be 1 (right)');
    });

    runner.test('TrajectoryCalculator handles left target', () => {
        const source = { x: 100, y: 20 };
        const target = { x: 50, y: 20 };
        const result = TrajectoryCalculator.calculateTrajectory(source, target, -9.8);
        runner.assertDefined(result, 'Should return trajectory');
        runner.assertTrue(result.vx < 0, 'Velocity should be negative for left target');
        runner.assertEqual(result.direction, -1, 'Direction should be -1 (left)');
    });

    runner.test('TrajectoryCalculator adjusts for height difference', () => {
        const source = { x: 0, y: 10 };
        const target = { x: 50, y: 30 }; // Higher target
        const result = TrajectoryCalculator.calculateTrajectory(source, target, -9.8);
        runner.assertDefined(result, 'Should return trajectory');
        runner.assertTrue(result.vy > 0, 'Should have upward velocity for higher target');
        runner.assertTrue(result.angle > 0, 'Angle should be positive for upward shot');
    });

    runner.test('TrajectoryCalculator compensates for wind', () => {
        const source = { x: 0, y: 20 };
        const target = { x: 50, y: 20 };
        const noWind = TrajectoryCalculator.calculateTrajectory(source, target, -9.8, 0);
        const withWind = TrajectoryCalculator.calculateTrajectory(source, target, -9.8, 5);
        runner.assertDefined(noWind, 'No wind trajectory should exist');
        runner.assertDefined(withWind, 'Wind trajectory should exist');
        // Wind should affect the calculation
        runner.assertTrue(noWind.vx !== withWind.vx || noWind.vy !== withWind.vy,
            'Wind should affect trajectory calculation');
    });

    runner.test('TrajectoryCalculator.addInaccuracy modifies trajectory', () => {
        const source = { x: 0, y: 20 };
        const target = { x: 50, y: 20 };
        const original = TrajectoryCalculator.calculateTrajectory(source, target, -9.8);
        const modified = TrajectoryCalculator.addInaccuracy(original, 0.2);
        runner.assertDefined(modified, 'Should return modified trajectory');
        runner.assertEqual(modified.direction, original.direction, 'Direction should be preserved');
    });

    runner.test('TrajectoryCalculator.addInaccuracy handles null', () => {
        const result = TrajectoryCalculator.addInaccuracy(null, 0.1);
        runner.assertEqual(result, null, 'Should return null for null input');
    });
});

// ============================================================================
// Run Tests
// ============================================================================

runner.run().then(success => {
    process.exit(success ? 0 : 1);
});
