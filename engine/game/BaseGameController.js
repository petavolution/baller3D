/**
 * Game Engine - Base Game Controller
 * Shared functionality for turn-based artillery games
 * Extended by specific game implementations (BallerGame, WormsGame)
 */

class BaseGameController extends Engine {
    /**
     * Create game controller
     * @param {Object} config - Game configuration
     */
    constructor(config) {
        super(config);

        // Core systems (null until initialized)
        this.terrain = null;
        this.projectile = null;
        this.particles = null;
        this.trajectoryPreview = null;

        // Core game state (shared by all games)
        this.state = {
            turnTimer: config.TURNS?.TIME_LIMIT || 30,
            gameOver: false,
            charging: false,
            power: 0,
            currentWeapon: 0,
            wind: { strength: 0, direction: 1 },
            ammo: []
        };

        // Turn management
        this._pendingTurnTimeout = null;
        this._aiActionTimeout = null;
    }

    /**
     * Initialize game - override to add game-specific init
     */
    init() {
        super.init();
        this._initSystems();
        this._initWorld();
        this._initControls();
        this._initAmmo();
        this._randomizeWind();
        return this;
    }

    /**
     * Initialize shared systems
     * @protected
     */
    _initSystems() {
        this.particles = new ParticleSystem(this.scene, this.config);
    }

    /**
     * Initialize game world - override in subclass
     * @abstract
     * @protected
     */
    _initWorld() {
        throw new Error('_initWorld must be implemented by subclass');
    }

    /**
     * Initialize controls - override in subclass
     * @abstract
     * @protected
     */
    _initControls() {
        throw new Error('_initControls must be implemented by subclass');
    }

    /**
     * Create water plane for terrain
     * @protected
     * @param {number} yPosition - Y position of water surface
     * @param {number} opacity - Water opacity (default 0.7)
     */
    _createWater(yPosition = -8, opacity = 0.7) {
        const geometry = new THREE.PlaneGeometry(
            this.config.TERRAIN.WIDTH * 2,
            this.config.TERRAIN.DEPTH * 2
        );
        const material = new THREE.MeshPhongMaterial({
            color: this.config.COLORS?.WATER || 0x4499ff,
            transparent: true,
            opacity: opacity,
            shininess: 100
        });
        const water = new THREE.Mesh(geometry, material);
        water.rotation.x = -Math.PI / 2;
        water.position.y = yPosition;
        this.scene.add(water);
    }

    /**
     * Initialize ammo from weapon config
     * @protected
     */
    _initAmmo() {
        this.state.ammo = this.config.WEAPONS.map(w => w.ammo);
    }

    /**
     * Randomize wind for new turn
     * @protected
     */
    _randomizeWind() {
        this.state.wind = {
            strength: Math.random() * this.config.PHYSICS.WIND_MAX,
            direction: Math.random() > 0.5 ? 1 : -1
        };
        this._updateUI();
    }

    /**
     * Select weapon by index
     * @param {number} idx - Weapon index
     * @protected
     */
    _selectWeapon(idx) {
        if (idx < 0 || idx >= this.config.WEAPONS.length) return;
        if (this.state.ammo[idx] === 0) return;

        this.state.currentWeapon = idx;

        // Update weapon buttons
        document.querySelectorAll('.weapon-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === idx);
            btn.classList.toggle('disabled', this.state.ammo[i] === 0);
        });

        Debug.log(`Selected weapon: ${this.config.WEAPONS[idx].name}`);
    }

    /**
     * Start charging power
     * @protected
     */
    _startCharge() {
        if (this.state.gameOver || this.projectile) return;
        this.state.charging = true;
        this.state.power = 0;
    }

    /**
     * Stop charging and fire
     * @protected
     */
    _stopCharge() {
        if (!this.state.charging) return;
        this._fire();
    }

    /**
     * Fire projectile - override in subclass
     * @abstract
     * @protected
     */
    _fire() {
        throw new Error('_fire must be implemented by subclass');
    }

    /**
     * Common fire logic (call from subclass _fire)
     * @protected
     * @returns {Object|null} Fire data if valid, null otherwise
     */
    _getFireData() {
        if (!this.state.charging || this.projectile) return null;
        this.state.charging = false;

        // Clear trajectory preview
        if (this.trajectoryPreview) {
            this.trajectoryPreview.clear();
        }

        const weapon = this.config.WEAPONS[this.state.currentWeapon];
        const power = Math.max(10, this.state.power);

        // Check ammo
        if (this.state.ammo[this.state.currentWeapon] === 0) return null;
        if (this.state.ammo[this.state.currentWeapon] > 0) {
            this.state.ammo[this.state.currentWeapon]--;
        }

        return {
            weapon,
            power,
            speed: power * weapon.speed
        };
    }

    /**
     * Handle projectile impact
     * @protected
     */
    _onProjectileHit() {
        if (!this.projectile) return;

        const pos = this.projectile.position;
        const weapon = this.projectile.weapon;

        if (!this.projectile.outOfBounds) {
            // Create explosion
            this.particles.createExplosion(pos, {
                radius: weapon.radius,
                count: Math.floor(weapon.radius * 8)
            });

            // Damage terrain
            this.terrain.damage(pos, weapon.radius);

            // Apply entity damage (override for game-specific entities)
            this._applyDamageToEntities(pos, weapon);
        }

        // Cleanup
        this.projectile.dispose();
        this.projectile = null;
        this.resetCamera();

        // Check victory
        this._checkVictory();

        // Schedule next turn
        if (!this.state.gameOver) {
            this._pendingTurnTimeout = setTimeout(
                () => this._nextTurn(),
                this.config.TURNS.DELAY_AFTER_IMPACT
            );
        }
    }

    /**
     * Apply damage to game entities - override in subclass
     * @abstract
     * @protected
     * @param {THREE.Vector3} position - Impact position
     * @param {Object} weapon - Weapon data
     */
    _applyDamageToEntities(position, weapon) {
        throw new Error('_applyDamageToEntities must be implemented by subclass');
    }

    /**
     * Update game loop
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Update charging
        if (this.state.charging) {
            this.state.power = Math.min(
                this.config.GAMEPLAY.MAX_POWER,
                this.state.power + deltaTime * this._getChargeRate()
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
            this._updateProjectile(deltaTime);
        }

        // Update particles
        this.particles.update(deltaTime);

        // Update UI
        this._updateUI();
    }

    /**
     * Get charge rate (override for game-specific rates)
     * @protected
     * @returns {number} Charge rate per second
     */
    _getChargeRate() {
        return 30;
    }

    /**
     * Update projectile physics
     * @protected
     * @param {number} deltaTime
     */
    _updateProjectile(deltaTime) {
        const active = this.projectile.update(deltaTime, this.terrain, this.state.wind);

        if (active) {
            this.setCameraTarget(this.projectile.position);
        }

        if (!active) {
            this._onProjectileHit();
        }
    }

    /**
     * Advance to next turn - override in subclass
     * @abstract
     * @protected
     */
    _nextTurn() {
        throw new Error('_nextTurn must be implemented by subclass');
    }

    /**
     * Common next turn logic (call from subclass _nextTurn)
     * @protected
     */
    _prepareNextTurn() {
        this._clearTimeouts();
        this.state.turnTimer = this.config.TURNS.TIME_LIMIT;
        this._randomizeWind();
    }

    /**
     * Check victory conditions - override in subclass
     * @abstract
     * @protected
     */
    _checkVictory() {
        throw new Error('_checkVictory must be implemented by subclass');
    }

    /**
     * Show victory modal
     * @protected
     * @param {number} winner - Winner index (0 for draw, 1+ for player)
     * @param {string} customMessage - Optional custom message
     */
    _showVictory(winner, customMessage = null) {
        const modal = document.getElementById('victoryModal');
        const text = document.getElementById('victoryText');
        if (modal && text) {
            text.textContent = customMessage ||
                (winner > 0 ? `Player ${winner} Wins!` : 'Draw!');
            modal.classList.remove('hidden');
        }
    }

    /**
     * Update UI elements - override in subclass
     * @abstract
     * @protected
     */
    _updateUI() {
        throw new Error('_updateUI must be implemented by subclass');
    }

    /**
     * Common UI update helper
     * @protected
     * @param {Object} elements - Map of element IDs to values
     */
    _updateUIElements(elements) {
        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        // Power bar
        const powerBar = document.getElementById('powerBar');
        if (powerBar) {
            const pct = (this.state.power / this.config.GAMEPLAY.MAX_POWER) * 100;
            powerBar.style.width = `${pct}%`;
        }
    }

    /**
     * Clear all pending timeouts
     * @protected
     */
    _clearTimeouts() {
        if (this._pendingTurnTimeout) {
            clearTimeout(this._pendingTurnTimeout);
            this._pendingTurnTimeout = null;
        }
        if (this._aiActionTimeout) {
            clearTimeout(this._aiActionTimeout);
            this._aiActionTimeout = null;
        }
    }

    /**
     * Reset common game state
     * @protected
     */
    _resetGameState() {
        this.state.turnTimer = this.config.TURNS.TIME_LIMIT;
        this.state.gameOver = false;
        this.state.charging = false;
        this.state.power = 0;
    }

    /**
     * Restart game - override in subclass
     * @abstract
     */
    restart() {
        throw new Error('restart must be implemented by subclass');
    }

    /**
     * Common restart logic (call from subclass restart)
     * @protected
     */
    _baseRestart() {
        this._clearTimeouts();

        if (this.projectile) {
            this.projectile.dispose();
            this.projectile = null;
        }

        this.particles.clear();
        if (this.trajectoryPreview) {
            this.trajectoryPreview.clear();
        }

        this._resetGameState();

        // Hide victory modal
        const modal = document.getElementById('victoryModal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * Clean up resources
     */
    dispose() {
        this._clearTimeouts();

        if (this.projectile) this.projectile.dispose();
        if (this.terrain) this.terrain.dispose();
        if (this.particles) this.particles.dispose();
        if (this.trajectoryPreview) this.trajectoryPreview.dispose();

        super.dispose();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BaseGameController = BaseGameController;
}
