/**
 * Ballerburg 3D - Main Game Controller
 * Extends Engine with game-specific logic
 */

class BallerGame extends Engine {
    constructor() {
        super(BallerConfig);
        Debug.info('BallerGame: Creating...');

        // Game entities
        this.terrain = null;
        this.castles = [];
        this.cannons = [];
        this.projectile = null;

        // Systems
        this.particles = null;

        // Game state
        this.state = {
            currentPlayer: 0,
            turnTimer: this.config.TURNS.TIME_LIMIT,
            gameOver: false,
            charging: false,
            power: 0,
            currentWeapon: 0,
            wind: { strength: 0, direction: 1 },
            ammo: []
        };

        // Turn management
        this._pendingTurnTimeout = null;
    }

    /**
     * Initialize game systems
     */
    init() {
        super.init();

        this._initSystems();
        this._initWorld();
        this._initControls();
        this._randomizeWind();
        this._initAmmo();

        Debug.info('BallerGame: Initialized');
        return this;
    }

    /**
     * Initialize game systems
     */
    _initSystems() {
        this.particles = new ParticleSystem(this.scene, this.config);
    }

    /**
     * Initialize game world
     */
    _initWorld() {
        // Create terrain using BallerTerrain
        this.terrain = new BallerTerrain(this.scene, this.config);
        this.terrain.generate();

        // Create water plane
        this._createWater();

        // Create castles and cannons
        for (let i = 0; i < this.config.GAMEPLAY.PLAYER_COUNT; i++) {
            const castle = new Castle(this.scene, this.terrain, i, this.config);
            this.castles.push(castle);

            const cannon = new Cannon(this.scene, castle);
            this.cannons.push(cannon);
        }

        Debug.info('World created', {
            castles: this.castles.length,
            cannons: this.cannons.length
        });
    }

    /**
     * Create water plane
     */
    _createWater() {
        const geometry = new THREE.PlaneGeometry(
            this.config.TERRAIN.WIDTH * 2,
            this.config.TERRAIN.DEPTH * 2
        );
        const material = new THREE.MeshPhongMaterial({
            color: this.config.COLORS.WATER,
            transparent: true,
            opacity: 0.7,
            shininess: 100
        });
        const water = new THREE.Mesh(geometry, material);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -8;
        this.scene.add(water);
    }

    /**
     * Initialize controls
     */
    _initControls() {
        // Keyboard
        window.addEventListener('keydown', e => this._onKeyDown(e));
        window.addEventListener('keyup', e => this._onKeyUp(e));

        // Fire button
        const fireBtn = document.getElementById('fireBtn');
        if (fireBtn) {
            fireBtn.addEventListener('mousedown', () => this._startCharge());
            fireBtn.addEventListener('mouseup', () => this._fire());
            fireBtn.addEventListener('touchstart', e => {
                e.preventDefault();
                this._startCharge();
            });
            fireBtn.addEventListener('touchend', e => {
                e.preventDefault();
                this._fire();
            });
        }

        // Weapon selector buttons
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const weaponIdx = parseInt(btn.dataset.weapon, 10);
                this._selectWeapon(weaponIdx);
            });
        });

        // Window resize
        window.addEventListener('resize', () => this._onResize());
    }

    /**
     * Select weapon by index
     */
    _selectWeapon(idx) {
        if (idx < 0 || idx >= this.config.WEAPONS.length) return;
        if (this.state.ammo[idx] === 0) return; // Out of ammo

        this.state.currentWeapon = idx;

        // Update button styles
        document.querySelectorAll('.weapon-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === idx);
            btn.classList.toggle('disabled', this.state.ammo[i] === 0);
        });

        Debug.debug('Weapon selected', { weapon: this.config.WEAPONS[idx].name });
    }

    /**
     * Initialize ammo from config
     */
    _initAmmo() {
        this.state.ammo = this.config.WEAPONS.map(w => w.ammo);
    }

    /**
     * Randomize wind
     */
    _randomizeWind() {
        this.state.wind = {
            strength: Math.random() * this.config.PHYSICS.WIND_MAX,
            direction: Math.random() > 0.5 ? 1 : -1
        };
        this._updateUI();
    }

    /**
     * Handle keyboard input
     */
    _onKeyDown(e) {
        if (this.state.gameOver || this.projectile) return;

        const cannon = this.cannons[this.state.currentPlayer];
        if (!cannon) return;

        switch (e.key) {
            case 'ArrowUp':
                cannon.setAim(cannon.verticalAngle + 2, cannon.horizontalAngle);
                break;
            case 'ArrowDown':
                cannon.setAim(cannon.verticalAngle - 2, cannon.horizontalAngle);
                break;
            case 'ArrowLeft':
                cannon.setAim(cannon.verticalAngle, cannon.horizontalAngle - 3);
                break;
            case 'ArrowRight':
                cannon.setAim(cannon.verticalAngle, cannon.horizontalAngle + 3);
                break;
            case ' ':
                this._startCharge();
                break;
            case '1': case '2': case '3': case '4': case '5':
                this._selectWeapon(parseInt(e.key, 10) - 1);
                break;
        }
        this._updateUI();
    }

    /**
     * Handle key release
     */
    _onKeyUp(e) {
        if (e.key === ' ' && this.state.charging) {
            this._fire();
        }
    }

    /**
     * Start charging power
     */
    _startCharge() {
        if (this.state.gameOver || this.projectile) return;
        this.state.charging = true;
        this.state.power = 0;
    }

    /**
     * Fire projectile
     */
    _fire() {
        if (!this.state.charging || this.projectile) return;
        this.state.charging = false;

        const cannon = this.cannons[this.state.currentPlayer];
        const weapon = this.config.WEAPONS[this.state.currentWeapon];
        const power = Math.max(10, this.state.power);

        // Check ammo
        if (this.state.ammo[this.state.currentWeapon] === 0) {
            Debug.warn('Out of ammo');
            return;
        }
        if (this.state.ammo[this.state.currentWeapon] > 0) {
            this.state.ammo[this.state.currentWeapon]--;
        }

        // Create projectile
        const position = cannon.getFirePosition();
        const direction = cannon.getFireDirection();
        const speed = power * weapon.speed;
        const velocity = direction.multiplyScalar(speed);

        this.projectile = new BaseProjectile(
            this.scene,
            position,
            velocity,
            this.config
        );
        this.projectile.weapon = weapon;

        // Track projectile with camera
        this.setCameraTarget(
            new THREE.Vector3(position.x * 0.5, position.y + 15, position.z + 40),
            position
        );

        Debug.debug('Fired', { power, weapon: weapon.name });
    }

    /**
     * Update game logic
     */
    update(deltaTime) {
        // Update charging
        if (this.state.charging) {
            this.state.power = Math.min(
                this.config.GAMEPLAY.MAX_POWER,
                this.state.power + deltaTime * 30
            );
        }

        // Update turn timer
        if (!this.state.gameOver && !this.projectile) {
            this.state.turnTimer -= deltaTime;
            if (this.state.turnTimer <= 0) {
                this._nextTurn();
            }
        }

        // Update projectile
        if (this.projectile) {
            const active = this.projectile.update(deltaTime, this.terrain, this.state.wind);

            // Track with camera
            if (active) {
                this.setCameraTarget(
                    new THREE.Vector3(
                        this.projectile.position.x * 0.5,
                        Math.max(this.projectile.position.y + 15, 30),
                        this.projectile.position.z + 40
                    ),
                    this.projectile.position
                );
            }

            if (!active) {
                this._onProjectileHit();
            }
        }

        // Update particles
        this.particles.update(deltaTime);

        // Update castle health bars (make them face camera)
        this.castles.forEach(castle => {
            castle.updateHealthBar(this.camera);
        });

        // Update UI
        this._updateUI();
    }

    /**
     * Handle projectile impact
     */
    _onProjectileHit() {
        if (!this.projectile) return;

        const pos = this.projectile.position;
        const weapon = this.projectile.weapon;

        // Create explosion
        if (!this.projectile.outOfBounds) {
            this.particles.createExplosion(pos, {
                radius: weapon.radius,
                count: 60
            });

            // Damage terrain
            this.terrain.damage(pos, weapon.radius);

            // Check castle damage
            this.castles.forEach((castle, i) => {
                if (!castle.alive) return;

                const dist = pos.distanceTo(castle.position);
                if (dist < weapon.radius + 5) {
                    const dmgFactor = 1 - (dist / (weapon.radius + 5));
                    const damage = weapon.damage * dmgFactor;
                    castle.takeDamage(damage, pos);

                    // Show damage number
                    this.particles.createFloatingText(castle.position.clone(), damage, {
                        color: this.config.PLAYERS[i].roof
                    });

                    if (!castle.alive) {
                        this._checkVictory();
                    }
                }
            });
        }

        // Clean up
        this.projectile.dispose();
        this.projectile = null;

        // Return camera
        this.resetCamera();

        // Schedule next turn
        this._pendingTurnTimeout = setTimeout(
            () => this._nextTurn(),
            this.config.TURNS.DELAY_AFTER_IMPACT
        );
    }

    /**
     * Switch to next player
     */
    _nextTurn() {
        if (this._pendingTurnTimeout) {
            clearTimeout(this._pendingTurnTimeout);
            this._pendingTurnTimeout = null;
        }

        this.state.currentPlayer = (this.state.currentPlayer + 1) % this.config.GAMEPLAY.PLAYER_COUNT;
        this.state.turnTimer = this.config.TURNS.TIME_LIMIT;
        this._randomizeWind();

        Debug.info(`Turn: Player ${this.state.currentPlayer + 1}`);
    }

    /**
     * Check for victory condition
     */
    _checkVictory() {
        const alive = this.castles.filter(c => c.alive);
        if (alive.length <= 1) {
            this.state.gameOver = true;
            const winner = alive.length === 1 ?
                this.castles.indexOf(alive[0]) + 1 : 0;

            Debug.info('Game Over', { winner });
            this._showVictory(winner);
        }
    }

    /**
     * Show victory screen
     */
    _showVictory(winner) {
        const modal = document.getElementById('victoryModal');
        const text = document.getElementById('victoryText');
        if (modal && text) {
            text.textContent = winner > 0 ?
                `Player ${winner} Wins!` : 'Draw!';
            modal.classList.remove('hidden');
        }
    }

    /**
     * Update UI elements
     */
    _updateUI() {
        const cannon = this.cannons[this.state.currentPlayer];
        if (!cannon) return;

        // Update display elements
        const elements = {
            'currentPlayer': `Player ${this.state.currentPlayer + 1}`,
            'turnTimer': Math.ceil(this.state.turnTimer),
            'angleValue': Math.round(cannon.verticalAngle),
            'directionValue': Math.round(cannon.horizontalAngle),
            'windValue': `${(this.state.wind.strength * this.state.wind.direction).toFixed(1)}`,
            'powerValue': Math.round(this.state.power)
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        // Update power bar
        const powerBar = document.getElementById('powerBar');
        if (powerBar) {
            powerBar.style.width = `${(this.state.power / this.config.GAMEPLAY.MAX_POWER) * 100}%`;
        }

        // Update health bars
        this.castles.forEach((castle, i) => {
            const bar = document.getElementById(`health${i + 1}`);
            if (bar) {
                bar.style.width = `${castle.getHealthPercent() * 100}%`;
            }
        });
    }

    /**
     * Restart game
     */
    restart() {
        // Clear pending timeout
        if (this._pendingTurnTimeout) {
            clearTimeout(this._pendingTurnTimeout);
            this._pendingTurnTimeout = null;
        }

        // Dispose entities
        if (this.projectile) {
            this.projectile.dispose();
            this.projectile = null;
        }

        this.castles.forEach(c => c.dispose());
        this.cannons.forEach(c => c.dispose());
        this.terrain.dispose();
        this.particles.clear();

        // Reset state
        this.state.currentPlayer = 0;
        this.state.turnTimer = this.config.TURNS.TIME_LIMIT;
        this.state.gameOver = false;
        this.state.charging = false;
        this.state.power = 0;

        // Rebuild world
        this.castles = [];
        this.cannons = [];
        this._initWorld();
        this._initAmmo();
        this._randomizeWind();
        this.resetCamera();

        // Hide victory modal
        const modal = document.getElementById('victoryModal');
        if (modal) modal.classList.add('hidden');

        Debug.info('Game restarted');
    }

    /**
     * Clean up
     */
    dispose() {
        if (this._pendingTurnTimeout) {
            clearTimeout(this._pendingTurnTimeout);
        }

        if (this.projectile) this.projectile.dispose();
        this.castles.forEach(c => c.dispose());
        this.cannons.forEach(c => c.dispose());
        if (this.terrain) this.terrain.dispose();
        if (this.particles) this.particles.dispose();

        super.dispose();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BallerGame = BallerGame;
}
