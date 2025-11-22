/**
 * Ballerburg 3D - Configuration
 * Central configuration for game constants and settings
 */

const Config = {
    // World dimensions
    TERRAIN_WIDTH: 120,
    TERRAIN_DEPTH: 20,
    TERRAIN_SEGMENTS: 100,

    // Physics
    GRAVITY: -9.8,
    WIND_MAX: 4,

    // Gameplay
    TURN_TIME: 45,
    MAX_POWER: 35,
    PLAYER_COUNT: 2,

    // Castle positions
    CASTLE_POSITIONS: [
        { x: -40, z: 0 },
        { x: 40, z: 0 }
    ],

    // Player colors
    PLAYER_COLORS: [
        { stone: 0x8B4513, roof: 0xCC0000, name: 'Red' },   // Player 1: Brown/Red
        { stone: 0x4A4A4A, roof: 0x0066CC, name: 'Blue' }   // Player 2: Gray/Blue
    ],

    // Weapons configuration
    WEAPONS: [
        { name: 'Cannonball',     damage: 60, radius: 8,  speed: 1.0, ammo: -1, icon: '●' },
        { name: 'Explosive',      damage: 80, radius: 12, speed: 0.9, ammo: 8,  icon: '◉' },
        { name: 'Chain Shot',     damage: 40, radius: 15, speed: 0.7, ammo: 6,  icon: '○○' },
        { name: 'Fire Ball',      damage: 45, radius: 10, speed: 1.1, ammo: 10, icon: '☀' },
        { name: 'Stone Ball',     damage: 35, radius: 6,  speed: 1.3, ammo: -1, icon: '■' }
    ],

    // Camera settings
    CAMERA: {
        fov: 50,
        near: 0.1,
        far: 1000,
        defaultPosition: { x: 0, y: 40, z: 60 },
        lookAt: { x: 0, y: 15, z: 0 }
    },

    // Visual settings
    COLORS: {
        sky: 0x87CEEB,
        water: 0x006994,
        terrain: 0x4a5d23,
        fog: 0x87CEEB
    }
};

// Freeze config to prevent accidental modification
Object.freeze(Config);
Object.freeze(Config.WEAPONS);
Object.freeze(Config.PLAYER_COLORS);
Object.freeze(Config.CASTLE_POSITIONS);
Object.freeze(Config.CAMERA);
Object.freeze(Config.COLORS);
