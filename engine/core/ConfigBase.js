/**
 * Game Engine - Base Configuration
 * Provides default values and structure for game configs
 * Games should extend this with their specific settings
 */

const EngineConfig = {
    // Physics defaults
    PHYSICS: {
        GRAVITY: -9.8,
        WIND_MAX: 4,
        PROJECTILE_SPEED_MULTIPLIER: 1.0
    },

    // Camera defaults
    CAMERA: {
        FOV: 50,
        NEAR: 0.1,
        FAR: 1000,
        DEFAULT_POSITION: { x: 0, y: 40, z: 60 },
        LOOK_AT: { x: 0, y: 15, z: 0 },
        TRACK_LERP_SPEED: 3
    },

    // Visual defaults
    COLORS: {
        SKY: 0x87CEEB,
        WATER: 0x006994,
        FOG: 0x87CEEB
    },

    // Turn-based game defaults
    TURNS: {
        TIME_LIMIT: 45,
        DELAY_AFTER_IMPACT: 1500
    },

    // Terrain defaults
    TERRAIN: {
        WIDTH: 120,
        DEPTH: 20,
        SEGMENTS: 100,
        WATER_LEVEL: -10
    }
};

/**
 * Deep merge utility for config objects
 */
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

/**
 * Create a game config by merging with engine defaults
 */
function createGameConfig(gameConfig) {
    const merged = mergeConfig(EngineConfig, gameConfig);

    // Deep freeze to prevent accidental modification
    function deepFreeze(obj) {
        Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === 'object') {
                deepFreeze(obj[key]);
            }
        });
        return Object.freeze(obj);
    }

    return deepFreeze(merged);
}

// Export for both browser and module environments
if (typeof window !== 'undefined') {
    window.EngineConfig = EngineConfig;
    window.createGameConfig = createGameConfig;
}
