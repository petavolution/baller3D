# Game Engine

Shared engine for Ballerburg3D, Worms3D, and future games.

## Load Order

Scripts must be loaded in this order (after Three.js):

```html
<!-- 1. Core utilities (no dependencies) -->
<script src="engine/core/Utils.js"></script>
<script src="engine/core/Debug.js"></script>
<script src="engine/core/ConfigBase.js"></script>

<!-- 2. Base classes -->
<script src="engine/entities/Entity.js"></script>

<!-- 3. World systems -->
<script src="engine/world/Terrain.js"></script>

<!-- 4. Physics systems -->
<script src="engine/physics/ParticleSystem.js"></script>
<script src="engine/physics/Projectile.js"></script>

<!-- 5. Main engine (depends on all above) -->
<script src="engine/core/Engine.js"></script>

<!-- 6. Game-specific code -->
<script src="games/ballerburg3D/Config.js"></script>
<script src="games/ballerburg3D/Game.js"></script>
```

## Usage

```javascript
// Create game config by extending engine defaults
const GameConfig = createGameConfig({
    PHYSICS: {
        GRAVITY: -25,
        WIND_MAX: 5
    },
    CAMERA: {
        DEFAULT_POSITION: { x: 0, y: 50, z: 80 }
    }
});

// Create game class extending Engine
class MyGame extends Engine {
    constructor() {
        super(GameConfig);
    }

    init() {
        super.init();
        // Game-specific setup
        this.particles = new ParticleSystem(this.scene, this.config);
        return this;
    }

    update(deltaTime) {
        // Game logic
        this.particles.update(deltaTime);
    }
}

// Start game
const game = new MyGame();
game.init().start();
```

## Components

### Core
- **Utils.js** - Three.js resource disposal, math helpers
- **Debug.js** - Logging, error tracking, performance timing
- **ConfigBase.js** - Default config with `createGameConfig()` helper
- **Engine.js** - Scene/camera/renderer setup, game loop, camera tracking

### Entities
- **Entity.js** - Base `Entity` and `DamageableEntity` classes

### World
- **Terrain.js** - `BaseTerrain` for destructible heightmap terrain (extend for custom generation)

### Physics
- **ParticleSystem.js** - Explosions, debris, floating text
- **Projectile.js** - `BaseProjectile` and `BouncingProjectile` for artillery mechanics
