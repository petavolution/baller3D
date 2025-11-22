/**
 * Ballerburg 3D - Main Game Controller
 * Orchestrates all game systems and manages game loop
 */

class Game {
    constructor() {
        Debug.info('Game: Initializing...');

        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Game entities
        this.terrain = null;
        this.castles = [];
        this.cannons = [];
        this.projectile = null;

        // Systems
        this.physics = null;
        this.ui = null;

        // Game state
        this.state = {
            currentPlayer: 0,
            turnTimer: Config.TURN_TIME,
            gameOver: false,
            charging: false,
            power: 0,
            currentWeapon: 0,
            wind: { strength: 0, direction: 1 },
            ammo: []
        };

        // Animation
        this.lastTime = 0;
        this.trajectoryPoints = [];
        this._pendingTurnTimeout = null;

        try {
            this._init();
            Debug.info('Game: Initialization complete');
        } catch (e) {
            Debug.error('Game: Initialization failed', { error: e.message, stack: e.stack });
            throw e;
        }
    }

    /**
     * Initialize game
     */
    _init() {
        this._initThree();
        this._initSystems();
        this._initWorld();
        this._initControls();
        this._randomizeWind();
        this._animate(0);
    }

    /**
     * Initialize Three.js
     */
    _initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(Config.COLORS.fog, 80, 200);

        // Camera
        const cam = Config.CAMERA;
        this.camera = new THREE.PerspectiveCamera(
            cam.fov,
            window.innerWidth / window.innerHeight,
            cam.near,
            cam.far
        );
        this.camera.position.set(cam.defaultPosition.x, cam.defaultPosition.y, cam.defaultPosition.z);
        this.camera.lookAt(cam.lookAt.x, cam.lookAt.y, cam.lookAt.z);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(Config.COLORS.sky);

        // Lighting
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        this.scene.add(sun);

        // Sky
        const sky = new THREE.Mesh(
            new THREE.BoxGeometry(800, 800, 800),
            new THREE.MeshBasicMaterial({ color: Config.COLORS.sky, side: THREE.BackSide })
        );
        this.scene.add(sky);

        // Water
        const water = new THREE.Mesh(
            new THREE.PlaneGeometry(400, 400),
            new THREE.MeshPhongMaterial({
                color: Config.COLORS.water,
                transparent: true,
                opacity: 0.8,
                shininess: 100,
                side: THREE.DoubleSide
            })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = -10;
        water.receiveShadow = true;
        this.scene.add(water);

        // Resize handler
        window.addEventListener('resize', () => this._onResize());
    }

    /**
     * Initialize game systems
     */
    _initSystems() {
        this.physics = new Physics(this.scene);

        this.ui = new UI();
        this.ui.init({
            onAngleChange: (v) => this._updateCannon(),
            onDirectionChange: (v) => this._updateCannon(),
            onWeaponChange: (i) => { this.state.currentWeapon = i; },
            onRestart: () => this.restart(),
            onChargeStart: () => this._startCharging(),
            onChargeEnd: () => this._stopCharging()
        });

        // Initialize ammo
        Config.WEAPONS.forEach((w, i) => {
            this.state.ammo[i] = w.ammo;
        });
        this.ui.updateAmmo(this.state.ammo);
    }

    /**
     * Initialize game world
     */
    _initWorld() {
        // Terrain
        this.terrain = new Terrain(this.scene);
        this.terrain.generate();

        // Castles
        this.castles = [];
        for (let i = 0; i < Config.PLAYER_COUNT; i++) {
            this.castles.push(new Castle(this.scene, this.terrain, i));
        }

        // Cannons
        this.cannons = [];
        this.castles.forEach(castle => {
            this.cannons.push(new Cannon(this.scene, castle));
        });
    }

    /**
     * Initialize input controls
     */
    _initControls() {
        // Keyboard
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));

        // Mouse wheel for zoom
        window.addEventListener('wheel', (e) => {
            this.camera.fov = Math.max(30, Math.min(90, this.camera.fov + e.deltaY * 0.05));
            this.camera.updateProjectionMatrix();
        });
    }

    /**
     * Key down handler
     */
    _onKeyDown(e) {
        if (this.state.gameOver) return;

        // Weapon selection (1-5)
        if (e.key >= '1' && e.key <= '5') {
            const idx = parseInt(e.key) - 1;
            if (this.state.ammo[idx] !== 0) {
                this.state.currentWeapon = idx;
                document.querySelectorAll('.weapon-btn').forEach((btn, i) => {
                    btn.classList.toggle('active', i === idx);
                });
            }
        }

        // Space for charging
        if (e.key === ' ') {
            e.preventDefault();
            this._startCharging();
        }
    }

    /**
     * Key up handler
     */
    _onKeyUp(e) {
        if (e.key === ' ' && this.state.charging) {
            this._stopCharging();
        }
    }

    /**
     * Start charging (keyboard or touch)
     */
    _startCharging() {
        if (this.state.gameOver || this.state.charging || this.projectile) return;
        this.state.charging = true;
    }

    /**
     * Stop charging and fire (keyboard or touch)
     */
    _stopCharging() {
        if (!this.state.charging) return;
        this.state.charging = false;
        this._fire();
    }

    /**
     * Update current cannon aim
     */
    _updateCannon() {
        const cannon = this.cannons[this.state.currentPlayer];
        if (!cannon) return;

        const aim = this.ui.getAimValues();
        cannon.setAim(aim.angle, aim.direction);
        this._updateTrajectory();
    }

    /**
     * Update trajectory preview
     */
    _updateTrajectory() {
        // Clear old trajectory points AND dispose materials to prevent memory leak
        this.trajectoryPoints.forEach(p => {
            this.scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        });
        this.trajectoryPoints = [];

        if (this.projectile || !this.state.charging) return;

        const cannon = this.cannons[this.state.currentPlayer];
        if (!cannon) return;

        const pos = cannon.getFirePosition();
        const dir = cannon.getFireDirection();
        const power = (this.state.power / 100) * Config.MAX_POWER;
        // CRITICAL: Clone direction before multiplying to avoid mutation
        const vel = dir.clone().multiplyScalar(power);

        for (let i = 0; i < 25; i++) {
            vel.y += Config.GRAVITY * 0.1;
            vel.x += this.state.wind.strength * this.state.wind.direction * 0.03;
            pos.add(vel.clone().multiplyScalar(0.1));

            const point = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 1 - i / 25
                })
            );
            point.position.copy(pos);
            this.scene.add(point);
            this.trajectoryPoints.push(point);

            if (this.terrain.getHeight(pos.x, pos.z) > pos.y) break;
        }
    }

    /**
     * Fire projectile
     */
    _fire() {
        if (this.projectile || this.state.power < 5) {
            this.state.power = 0;
            this.ui.updatePower(0, false);
            return;
        }

        const cannon = this.cannons[this.state.currentPlayer];
        const weapon = Config.WEAPONS[this.state.currentWeapon];

        // Check ammo
        if (weapon.ammo !== -1 && this.state.ammo[this.state.currentWeapon] <= 0) {
            this.state.power = 0;
            this.ui.updatePower(0, false);
            return;
        }

        const pos = cannon.getFirePosition();
        const dir = cannon.getFireDirection();
        const power = (this.state.power / 100) * Config.MAX_POWER;
        // CRITICAL: Clone direction before multiplying to avoid mutation
        const vel = dir.clone().multiplyScalar(power);

        Debug.debug('Fire projectile', { power, weapon: weapon.name, position: pos, velocity: vel });
        this.projectile = new Projectile(this.scene, pos, vel, weapon);

        // Consume ammo
        if (weapon.ammo !== -1) {
            this.state.ammo[this.state.currentWeapon]--;
            this.ui.updateAmmo(this.state.ammo);
        }

        // Clear trajectory with proper disposal
        this.trajectoryPoints.forEach(p => {
            this.scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        });
        this.trajectoryPoints = [];

        this.state.power = 0;
        this.ui.updatePower(0, false);
        // Note: Turn change is now triggered by impact detection in _animate()
    }

    /**
     * Handle projectile impact
     */
    _handleImpact(position, weapon) {
        // Explosion effect
        this.physics.createExplosion(position, weapon.radius);

        // Terrain damage
        this.terrain.damage(position, weapon.radius);

        // Castle damage
        this.castles.forEach(castle => {
            if (!castle.alive) return;
            const dist = castle.position.distanceTo(position);
            if (dist < weapon.radius + 8) {
                const damage = Math.floor(weapon.damage * (1 - dist / (weapon.radius + 8)));
                castle.takeDamage(damage, position);
            }
        });

        // Check victory
        this._checkVictory();
    }

    /**
     * Check for victory condition
     */
    _checkVictory() {
        const alive = this.castles.filter(c => c.alive);
        if (alive.length < 2) {
            this.state.gameOver = true;
            const winner = alive.length > 0 ? Config.PLAYER_COLORS[alive[0].playerIndex].name : 'Nobody';
            this.ui.showVictory(winner, 'Castle Destroyed!');
        }
    }

    /**
     * Switch to next turn
     */
    _nextTurn() {
        // Clear timeout reference
        this._pendingTurnTimeout = null;

        // Clean up projectile
        if (this.projectile) {
            this.projectile.dispose();
            this.projectile = null;
        }

        if (this.state.gameOver) return;

        // Switch player
        this.state.currentPlayer = 1 - this.state.currentPlayer;
        this.state.turnTimer = Config.TURN_TIME;

        this._randomizeWind();
        this.ui.updatePlayer(this.state.currentPlayer);
        this.ui.resetControls();
        this._updateCannon();
    }

    /**
     * Randomize wind
     */
    _randomizeWind() {
        this.state.wind.strength = Math.random() * Config.WIND_MAX;
        this.state.wind.direction = Math.random() > 0.5 ? 1 : -1;
        this.ui.updateWind(this.state.wind.strength, this.state.wind.direction);
    }

    /**
     * Restart game
     */
    restart() {
        Debug.info('Game: Restarting...');

        // Cancel any pending turn change
        if (this._pendingTurnTimeout) {
            clearTimeout(this._pendingTurnTimeout);
            this._pendingTurnTimeout = null;
        }

        // Cleanup with proper disposal
        this.castles.forEach(c => c.dispose());
        this.cannons.forEach(c => c.dispose());
        if (this.terrain) this.terrain.dispose();
        if (this.physics) this.physics.clear();
        if (this.projectile) {
            this.projectile.dispose();
            this.projectile = null;
        }

        // Dispose trajectory points properly
        this.trajectoryPoints.forEach(p => {
            this.scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        });

        // Reset state
        this.state = {
            currentPlayer: 0,
            turnTimer: Config.TURN_TIME,
            gameOver: false,
            charging: false,
            power: 0,
            currentWeapon: 0,
            wind: { strength: 0, direction: 1 },
            ammo: []
        };

        Config.WEAPONS.forEach((w, i) => {
            this.state.ammo[i] = w.ammo;
        });

        // Reinitialize
        this._initWorld();
        this._randomizeWind();
        this.ui.hideVictory();
        this.ui.resetControls();
        this.ui.updateAmmo(this.state.ammo);
        this.ui.updatePlayer(0);
    }

    /**
     * Handle window resize
     */
    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Main animation loop
     */
    _animate(time) {
        requestAnimationFrame((t) => this._animate(t));

        const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        // Skip game logic updates on first frame (deltaTime=0), but still render
        if (deltaTime > 0 && !this.state.gameOver) {
            // Turn timer
            this.state.turnTimer -= deltaTime;
            if (this.state.turnTimer <= 0 && !this.projectile) {
                this._nextTurn();
            }
            this.ui.updateTimer(this.state.turnTimer);

            // Charging
            if (this.state.charging) {
                this.state.power = Math.min(100, this.state.power + 80 * deltaTime);
                this.ui.updatePower(this.state.power, true);
                this._updateTrajectory();
            }

            // Update projectile
            if (this.projectile) {
                const active = this.projectile.update(deltaTime, this.terrain, this.state.wind);
                if (!active && !this.projectile.exploded) {
                    this.projectile.explode();

                    // Only create explosion effects for in-bounds impacts
                    if (!this.projectile.outOfBounds) {
                        this._handleImpact(this.projectile.position, this.projectile.weapon);
                    }

                    // Schedule turn change after brief delay for explosion visibility
                    this._pendingTurnTimeout = setTimeout(() => this._nextTurn(), 1500);
                }
            }

            // Update castles
            this.castles.forEach(castle => {
                castle.updatePosition();
                castle.updateHealthBar(this.camera);
            });

            // Update physics
            this.physics.update(deltaTime);
        }

        this.renderer.render(this.scene, this.camera);
    }
}
