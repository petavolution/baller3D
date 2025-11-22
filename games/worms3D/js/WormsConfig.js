/**
 * Worms 3D - Game Configuration
 * Extends engine defaults with worms-specific settings
 */

const WormsConfig = createGameConfig({
    // Physics tuning for character movement
    PHYSICS: {
        GRAVITY: -15,
        WIND_MAX: 3,
        JUMP_FORCE: 12,
        MOVE_SPEED: 8,
        PROJECTILE_SPEED_MULTIPLIER: 0.8
    },

    // Camera settings
    CAMERA: {
        FOV: 55,
        NEAR: 0.1,
        FAR: 1000,
        DEFAULT_POSITION: { x: 0, y: 30, z: 50 },
        LOOK_AT: { x: 0, y: 5, z: 0 },
        TRACK_LERP_SPEED: 4
    },

    // Terrain configuration (wider, varied)
    TERRAIN: {
        WIDTH: 100,
        DEPTH: 30,
        SEGMENTS: 80,
        MIN_HEIGHT: -8,
        MAX_HEIGHT: 25
    },

    // Visual settings
    COLORS: {
        SKY: 0x6EBFFF,
        WATER: 0x0077BE,
        TERRAIN: 0x3D9140,
        FOG: 0x6EBFFF
    },

    // Turn-based settings
    TURNS: {
        TIME_LIMIT: 30,
        DELAY_AFTER_IMPACT: 1000
    },

    // Worms-specific settings
    GAMEPLAY: {
        MAX_POWER: 40,
        TEAM_COUNT: 2,
        WORMS_PER_TEAM: 3,
        WORM_HEALTH: 100,
        FALL_DAMAGE_THRESHOLD: 8,
        FALL_DAMAGE_MULTIPLIER: 3
    },

    // Team colors
    TEAMS: [
        { color: 0xFF4444, name: 'Red Team' },
        { color: 0x4444FF, name: 'Blue Team' }
    ],

    // Weapons configuration
    WEAPONS: [
        { name: 'Bazooka',    damage: 45, radius: 6,  speed: 1.0, ammo: -1, icon: '🚀', type: 'projectile' },
        { name: 'Grenade',    damage: 50, radius: 8,  speed: 0.8, ammo: 5,  icon: '💣', type: 'bouncing', timer: 3 },
        { name: 'Shotgun',    damage: 25, radius: 3,  speed: 1.5, ammo: 8,  icon: '🔫', type: 'hitscan' },
        { name: 'Dynamite',   damage: 75, radius: 12, speed: 0,   ammo: 2,  icon: '🧨', type: 'placed', timer: 5 },
        { name: 'Air Strike', damage: 30, radius: 5,  speed: 1.2, ammo: 1,  icon: '✈️', type: 'airstrike' }
    ]
});

// Export for browser
if (typeof window !== 'undefined') {
    window.WormsConfig = WormsConfig;
}
