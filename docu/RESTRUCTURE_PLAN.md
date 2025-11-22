# Ballerburg3D + Worms3D - Shared Engine Architecture Plan

## Overview

Both games share significant code (~70% overlap). This plan creates a shared engine with game-specific modules.

## Proposed Directory Structure

```
/
├── engine/                      # Shared game engine
│   ├── core/
│   │   ├── Engine.js           # Main engine class, scene setup
│   │   ├── Config.js           # Base config system
│   │   ├── Debug.js            # Logging system
│   │   ├── Utils.js            # Math, dispose helpers
│   │   └── AssetLoader.js      # Resource loading
│   │
│   ├── physics/
│   │   ├── Projectile.js       # Generic projectile physics
│   │   ├── Gravity.js          # Gravity constants/helpers
│   │   ├── Wind.js             # Wind system
│   │   └── Collision.js        # Collision detection
│   │
│   ├── world/
│   │   ├── Terrain.js          # Destructible terrain
│   │   ├── Water.js            # Water plane
│   │   └── Sky.js              # Skybox/atmosphere
│   │
│   ├── entities/
│   │   ├── Entity.js           # Base entity class
│   │   ├── Character.js        # Base for movable characters
│   │   └── Structure.js        # Base for static structures
│   │
│   ├── systems/
│   │   ├── Camera.js           # Camera tracking, smooth movement
│   │   ├── Particles.js        # Explosions, effects
│   │   ├── DamageNumbers.js    # Floating damage text
│   │   ├── TurnManager.js      # Turn-based game flow
│   │   └── HealthBar.js        # Billboard health bars
│   │
│   ├── input/
│   │   ├── Input.js            # Unified input handler
│   │   ├── Keyboard.js         # Keyboard events
│   │   ├── Mouse.js            # Mouse events
│   │   └── Touch.js            # Touch/mobile events
│   │
│   ├── ui/
│   │   ├── UIManager.js        # DOM UI management
│   │   ├── PowerMeter.js       # Charge meter
│   │   ├── WeaponSelector.js   # Weapon buttons
│   │   └── Modal.js            # Victory/menu screens
│   │
│   └── index.js                # Engine exports
│
├── games/
│   ├── ballerburg3D/
│   │   ├── index.html          # Entry point
│   │   ├── css/
│   │   │   └── style.css       # Game-specific styles
│   │   ├── js/
│   │   │   ├── BallerConfig.js # Game constants
│   │   │   ├── BallerGame.js   # Main game controller
│   │   │   ├── Castle.js       # Castle entity
│   │   │   ├── Cannon.js       # Cannon entity
│   │   │   └── BallerUI.js     # Game-specific UI
│   │   └── assets/             # Game-specific assets
│   │
│   └── worms3D/
│       ├── index.html          # Entry point
│       ├── css/
│       │   └── style.css       # Game-specific styles
│       ├── js/
│       │   ├── WormsConfig.js  # Game constants
│       │   ├── WormsGame.js    # Main game controller
│       │   ├── Worm.js         # Worm character entity
│       │   ├── WormPhysics.js  # Character movement physics
│       │   └── WormsUI.js      # Game-specific UI
│       └── assets/             # Game-specific assets
│
├── shared/
│   └── css/
│       └── base.css            # Shared base styles
│
├── tests/
│   ├── engine/                 # Engine tests
│   └── games/                  # Game-specific tests
│
├── docs/                       # Documentation
│   ├── project-vision.md
│   └── RESTRUCTURE_PLAN.md
│
└── reference/                  # Original source files
    ├── baller_sources/         # Atari ST C sources
    └── monolithic/             # Original single-file versions
```

## Shared Engine Components Analysis

### 1. Core Systems (100% Shared)

| Component | Current Location | Shared Usage |
|-----------|-----------------|--------------|
| Debug.js | js/core/Debug.js | Both games |
| Utils.js | js/core/Utils.js | Both games |
| Config pattern | js/core/Config.js | Template for both |

### 2. Physics (95% Shared)

**Projectile Physics** - Nearly identical in both games:
- Gravity application
- Wind effects
- Terrain collision detection
- Trail rendering
- Out-of-bounds handling

**Differences:**
- Worms: Bouncing grenades, timer-based explosions
- Ballerburg: Simpler direct impact

**Solution:** Base Projectile class with game-specific extensions

### 3. Terrain System (90% Shared)

**Shared:**
- Height map generation
- Mesh creation
- Crater/damage deformation
- getHeight() interpolation

**Differences:**
- Ballerburg: Dual mountain peaks for castles
- Worms: More varied procedural terrain

**Solution:** Configurable terrain generator

### 4. Camera System (100% Shared)

Current Ballerburg camera tracking can be reused:
- Follow projectile mode
- Smooth lerp interpolation
- Return to default position
- Could add: Character following for Worms

### 5. Visual Effects (100% Shared)

- Particle explosions
- Floating damage numbers
- Health bars (billboard)

### 6. UI Systems (80% Shared)

**Shared:**
- Power meter
- Weapon selector
- Timer display
- Wind indicator
- Victory modal

**Game-Specific:**
- Ballerburg: Angle/direction sliders
- Worms: Movement controls, aim indicator

## Implementation Phases

### Phase 1: Engine Extraction (Foundation)
1. Create `engine/` directory structure
2. Extract and generalize Debug, Utils, Config
3. Create base Entity class
4. Extract terrain system with configurable generation

### Phase 2: Physics Engine
1. Create generic Projectile class
2. Extract collision detection
3. Create Wind system
4. Create Particles/Effects system

### Phase 3: Camera & Rendering
1. Extract camera tracking system
2. Create damage number system
3. Create health bar system

### Phase 4: Input & UI
1. Create unified input handler
2. Extract UI components
3. Create turn management system

### Phase 5: Ballerburg3D Game
1. Create game-specific directory
2. Implement Castle, Cannon using engine
3. Create game controller
4. Implement game-specific UI

### Phase 6: Worms3D Game
1. Create game-specific directory
2. Implement Worm character with physics
3. Implement weapon varieties
4. Create game-specific UI

### Phase 7: Testing & Polish
1. Create comprehensive test suite
2. Performance optimization
3. Mobile touch refinement

## Code Sharing Patterns

### Pattern 1: Inheritance
```javascript
// engine/entities/Entity.js
class Entity {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
    }
    dispose() {
        Utils.removeAndDispose(this.scene, this.group);
    }
}

// games/ballerburg3D/js/Castle.js
class Castle extends Entity {
    constructor(scene, terrain, playerIndex) {
        super(scene);
        // Castle-specific code
    }
}
```

### Pattern 2: Composition
```javascript
// Engine provides components, games compose them
class BallerGame {
    constructor() {
        this.engine = new Engine();
        this.camera = new CameraTracker(this.engine.camera);
        this.particles = new ParticleSystem(this.engine.scene);
        this.turns = new TurnManager();
    }
}
```

### Pattern 3: Configuration
```javascript
// Games provide config, engine uses it
const BallerConfig = {
    terrain: { width: 120, depth: 20, style: 'dual_peaks' },
    camera: { fov: 50, defaultPos: {x:0, y:40, z:60} },
    physics: { gravity: -9.8, windMax: 4 }
};
```

## File Size Targets

All files should remain under 300 lines for maintainability:

| Module | Target Lines |
|--------|-------------|
| Engine core files | < 150 |
| Entity classes | < 200 |
| System classes | < 250 |
| Game controllers | < 300 |

## Benefits of This Architecture

1. **Code Reuse**: ~70% shared between games
2. **Maintainability**: Fix once, works everywhere
3. **Extensibility**: Easy to add new games (Artillery, Tank Wars, etc.)
4. **Testing**: Test engine once, games inherit stability
5. **Performance**: Shared optimizations benefit all games
6. **Learning**: Clean separation of concerns

## Migration Strategy

1. Keep current working code as reference
2. Build engine incrementally
3. Test each extracted component
4. Rebuild Ballerburg3D using engine
5. Build Worms3D using same engine
6. Archive monolithic files in `reference/`

## Progress Tracking

### Phase 1: Engine Extraction - COMPLETE ✓

**Engine Core:**
- [x] `engine/core/Utils.js` - Three.js disposal, math helpers
- [x] `engine/core/Debug.js` - Logging and error tracking
- [x] `engine/core/ConfigBase.js` - Base config with `createGameConfig()`
- [x] `engine/core/Engine.js` - Scene/camera/renderer setup, game loop, camera tracking

**Engine Entities:**
- [x] `engine/entities/Entity.js` - Base Entity and DamageableEntity classes

**Engine World:**
- [x] `engine/world/Terrain.js` - BaseTerrain for destructible heightmap

**Engine Physics:**
- [x] `engine/physics/ParticleSystem.js` - Explosions, debris, floating text
- [x] `engine/physics/Projectile.js` - BaseProjectile and BouncingProjectile

**Documentation:**
- [x] `engine/README.md` - Load order and usage documentation
- [x] `engine/test-engine.html` - Standalone engine test

### Phase 5: Ballerburg3D Game - COMPLETE ✓

**Game Config & Extensions:**
- [x] `games/ballerburg3D/js/BallerConfig.js` - Game config using engine
- [x] `games/ballerburg3D/js/BallerTerrain.js` - Dual-mountain terrain

**Entities (extend engine base classes):**
- [x] `games/ballerburg3D/js/Castle.js` - Extends DamageableEntity
- [x] `games/ballerburg3D/js/Cannon.js` - Extends Entity

**Game Controller:**
- [x] `games/ballerburg3D/js/BallerGame.js` - Extends Engine
- [x] `games/ballerburg3D/index.html` - Entry point with weapon selector

**Features:**
- [x] Weapon selector UI with keyboard (1-5) and buttons
- [x] Health bar billboard updates
- [x] Part-based castle damage with impact point

### Phase 6: Worms3D Game - COMPLETE ✓

**Game Config & Extensions:**
- [x] `games/worms3D/js/WormsConfig.js` - Game config with team/worm settings
- [x] `games/worms3D/js/WormsTerrain.js` - Procedural varied terrain

**Entities:**
- [x] `games/worms3D/js/Worm.js` - Extends DamageableEntity with movement/aiming

**Game Controller:**
- [x] `games/worms3D/js/WormsGame.js` - Extends Engine with turn-based worm gameplay
- [x] `games/worms3D/index.html` - Entry point with controls help

**Features:**
- [x] Worm movement (walk, jump)
- [x] Fall damage
- [x] Team-based turns
- [x] Bouncing projectiles (grenades)
- [x] Knockback from explosions
- [x] Water death zones

### Phase 7: Testing & Polish - IN PROGRESS

**Tests (47 tests passing):**
- [x] Config tests
- [x] Vector3 tests
- [x] Terrain tests
- [x] Castle tests
- [x] Cannon tests
- [x] Projectile tests
- [x] Utils tests
- [x] Entity tests
- [x] DamageableEntity tests
- [x] Config System tests
- [x] ParticleSystem tests (6 tests)
- [x] TrajectoryPreview tests (5 tests)

### Monolithic Feature Ports - COMPLETE ✓

Features analyzed and ported from `ballerburg3D-remixed-59b3f135.html` and `worms3D-remixed-01.html`:

**Engine ParticleSystem Enhancements:**
- [x] `createSplash()` - Water impact particle effects
- [x] `createSpeechBubble()` - Character speech/death phrases
- [x] Explosion flash light (PointLight)
- [x] Mobile vibration feedback (`navigator.vibrate`)

**New TrajectoryPreview Class:**
- [x] `engine/physics/TrajectoryPreview.js` - Visual trajectory dots showing projectile path

**Enhanced Worm Visuals & Animations:**
- [x] Smooth body with 7 overlapping spheres
- [x] Cartoon eyes with white backgrounds, black pupils, shine
- [x] Eye tracking based on movement direction
- [x] Blinking animation (random 2-5s intervals)
- [x] Breathing idle animation (subtle scale pulse)
- [x] Landing squash/stretch effect
- [x] Selection indicator (bobbing yellow cone)
- [x] `damageShowTimer` - Health bar visible 3s after damage
- [x] Terminal velocity cap (-30)
- [x] Ground friction (0.85 factor)

**WormsGame Improvements:**
- [x] Battle cry speech bubbles ("Fire!", "Incoming!", etc.)
- [x] Death phrases when falling in water ("Nooo!", "Argh!", etc.)
- [x] Water splash effects
- [x] Selection indicator updates on turn change

## Next Steps

1. ~~Create directory structure~~ ✓
2. ~~Start with `engine/core/` extraction~~ ✓
3. ~~Create Entity base class~~ ✓
4. ~~Extract terrain system~~ ✓
5. ~~Create generic Projectile class~~ ✓
6. ~~Create Ballerburg3D game using engine~~ ✓
7. ~~Migrate entities to use engine base classes~~ ✓
8. ~~Add weapon selector UI~~ ✓
9. ~~Create comprehensive tests for engine~~ ✓
10. ~~Create Worms3D game using engine~~ ✓
11. ~~Port enhanced features from monolithic files~~ ✓
12. Add input system abstraction to engine
13. Add tests for new engine features (TrajectoryPreview, splash, speech)
14. Performance optimization
15. Mobile touch improvements

---

*This plan ensures both games share a robust foundation while maintaining their unique gameplay characteristics.*
