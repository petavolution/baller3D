/**
 * Ballerburg 3D - Game Configuration
 * Extends engine defaults with game-specific settings
 */

const BallerConfig = createGameConfig({
    // Physics tuning
    PHYSICS: {
        GRAVITY: -9.8,
        WIND_MAX: 4,
        PROJECTILE_SPEED_MULTIPLIER: 1.0
    },

    // Camera settings
    CAMERA: {
        FOV: 50,
        NEAR: 0.1,
        FAR: 1000,
        DEFAULT_POSITION: { x: 0, y: 40, z: 60 },
        LOOK_AT: { x: 0, y: 15, z: 0 },
        TRACK_LERP_SPEED: 3
    },

    // Terrain configuration
    TERRAIN: {
        WIDTH: 120,
        DEPTH: 20,
        SEGMENTS: 100,
        MIN_HEIGHT: -10,
        MAX_HEIGHT: 35
    },

    // Visual settings
    COLORS: {
        SKY: 0x87CEEB,
        WATER: 0x006994,
        TERRAIN: 0x4a5d23,
        FOG: 0x87CEEB
    },

    // Turn-based settings
    TURNS: {
        TIME_LIMIT: 45,
        DELAY_AFTER_IMPACT: 1500
    },

    // Ballerburg-specific settings
    GAMEPLAY: {
        MAX_POWER: 35,
        PLAYER_COUNT: 2,

        // Castle starting health
        CASTLE_HEALTH: 100,

        // Mountain positions for terrain generation
        MOUNTAIN_POSITIONS: [
            { x: -40, z: 0 },
            { x: 40, z: 0 }
        ]
    },

    // Player definitions
    PLAYERS: [
        { stone: 0x8B4513, roof: 0xCC0000, name: 'Red' },
        { stone: 0x4A4A4A, roof: 0x0066CC, name: 'Blue' }
    ],

    // Weapons configuration
    WEAPONS: [
        { name: 'Cannonball', damage: 60, radius: 8,  speed: 1.0, ammo: -1, icon: '●' },
        { name: 'Explosive',  damage: 80, radius: 12, speed: 0.9, ammo: 8,  icon: '◉' },
        { name: 'Chain Shot', damage: 40, radius: 15, speed: 0.7, ammo: 6,  icon: '○○' },
        { name: 'Fire Ball',  damage: 45, radius: 10, speed: 1.1, ammo: 10, icon: '☀' },
        { name: 'Stone Ball', damage: 35, radius: 6,  speed: 1.3, ammo: -1, icon: '■' }
    ]
});

// Legacy compatibility - expose flat config values for existing code
// This allows gradual migration without breaking existing systems
const Config = {
    // Map to new structure for backward compatibility
    TERRAIN_WIDTH: BallerConfig.TERRAIN.WIDTH,
    TERRAIN_DEPTH: BallerConfig.TERRAIN.DEPTH,
    TERRAIN_SEGMENTS: BallerConfig.TERRAIN.SEGMENTS,
    GRAVITY: BallerConfig.PHYSICS.GRAVITY,
    WIND_MAX: BallerConfig.PHYSICS.WIND_MAX,
    TURN_TIME: BallerConfig.TURNS.TIME_LIMIT,
    MAX_POWER: BallerConfig.GAMEPLAY.MAX_POWER,
    PLAYER_COUNT: BallerConfig.GAMEPLAY.PLAYER_COUNT,
    CASTLE_POSITIONS: BallerConfig.GAMEPLAY.MOUNTAIN_POSITIONS,
    PLAYER_COLORS: BallerConfig.PLAYERS,
    WEAPONS: BallerConfig.WEAPONS,
    CAMERA: {
        fov: BallerConfig.CAMERA.FOV,
        near: BallerConfig.CAMERA.NEAR,
        far: BallerConfig.CAMERA.FAR,
        defaultPosition: BallerConfig.CAMERA.DEFAULT_POSITION,
        lookAt: BallerConfig.CAMERA.LOOK_AT
    },
    COLORS: {
        sky: BallerConfig.COLORS.SKY,
        water: BallerConfig.COLORS.WATER,
        terrain: BallerConfig.COLORS.TERRAIN,
        fog: BallerConfig.COLORS.FOG
    }
};

Object.freeze(Config);

// Export for browser
if (typeof window !== 'undefined') {
    window.BallerConfig = BallerConfig;
    window.Config = Config; // Legacy support
}
