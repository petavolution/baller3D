/**
 * Ballerburg 3D - Main Game Controller
 * Extends BaseGameController with Ballerburg-specific logic
 */

class BallerGame extends BaseGameController {
    constructor() {
        super(BallerConfig);
        Debug.info('BallerGame: Creating...');

        // Game entities (Ballerburg-specific)
        this.castles = [];
        this.cannons = [];

        // Ballerburg-specific state
        this.state.currentPlayer = 0;

        // AI support - player types: 'human' or 'ai'
        this.playerTypes = ['human', 'ai']; // Player 1 human, Player 2 AI by default
        this.aiControllers = [null, null];
    }

    /**
     * Initialize game systems
     */
    init() {
        super.init();
        Debug.info('BallerGame: Initialized');
        return this;
    }

    /**
     * Initialize game systems (override)
     */
    _initSystems() {
        super._initSystems();

        // Trajectory preview for aiming visualization
        this.trajectoryPreview = new TrajectoryPreview(this.scene, this.config, {
            pointCount: 30,
            pointRadius: 0.2,
            color: 0xffff00,
            timeStep: 0.08
        });

        // Initialize AI controllers using original Ballerburg personality system
        // Strategy (cw) 1-5 and skill (cx) 1-5 from BALLER2.C
        this.playerTypes.forEach((type, i) => {
            if (type === 'ai') {
                // BRUBBEL: strategy=3 (balanced), skill=3 (medium accuracy)
                this.aiControllers[i] = AIController.fromPersonality(this.config, 'BRUBBEL');
                Debug.info(`AI Controller initialized for Player ${i + 1}`,
                    AIController.STRATEGIES.BRUBBEL);
            }
        });
    }

    /**
     * Initialize game world (override)
     */
    _initWorld() {
        // Create terrain using BallerTerrain
        this.terrain = new BallerTerrain(this.scene, this.config);
        this.terrain.generate();

        // Create water plane
        this._createWater(-8, 0.7);

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
     * Initialize controls (override)
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
     * Handle keyboard input
     */
    _onKeyDown(e) {
        // Block input during game over, projectile flight, or AI turn
        if (this.state.gameOver || this.projectile || this._isCurrentPlayerAI()) return;

        const cannon = this.cannons[this.state.currentPlayer];
        if (!cannon) return;

        switch (e.key) {
            case 'ArrowUp':
                cannon.setAim(cannon.verticalAngle + 2, cannon.horizontalAngle);
                this._updateTrajectoryPreview();
                break;
            case 'ArrowDown':
                cannon.setAim(cannon.verticalAngle - 2, cannon.horizontalAngle);
                this._updateTrajectoryPreview();
                break;
            case 'ArrowLeft':
                cannon.setAim(cannon.verticalAngle, cannon.horizontalAngle - 3);
                this._updateTrajectoryPreview();
                break;
            case 'ArrowRight':
                cannon.setAim(cannon.verticalAngle, cannon.horizontalAngle + 3);
                this._updateTrajectoryPreview();
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
     * Update trajectory preview based on current aim
     */
    _updateTrajectoryPreview() {
        if (!this.trajectoryPreview || this._isCurrentPlayerAI()) return;

        const cannon = this.cannons[this.state.currentPlayer];
        if (!cannon) return;

        // Calculate preview velocity (use current power or default)
        const weapon = this.config.WEAPONS[this.state.currentWeapon];
        const power = this.state.charging ? this.state.power : 20;
        const speed = Math.max(10, power) * weapon.speed;

        const position = cannon.getFirePosition();
        const direction = cannon.getFireDirection();
        const velocity = direction.multiplyScalar(speed);

        this.trajectoryPreview.update(position, velocity, this.state.wind, this.terrain);
    }

    /**
     * Fire projectile (override)
     */
    _fire() {
        const fireData = this._getFireData();
        if (!fireData) return;

        const cannon = this.cannons[this.state.currentPlayer];

        // Create projectile
        const position = cannon.getFirePosition();
        const direction = cannon.getFireDirection();
        const velocity = direction.multiplyScalar(fireData.speed);

        this.projectile = new BaseProjectile(
            this.scene,
            position,
            velocity,
            this.config
        );
        this.projectile.weapon = fireData.weapon;

        // Track projectile with camera
        this.setCameraTarget(
            new THREE.Vector3(position.x * 0.5, position.y + 15, position.z + 40),
            position
        );

        Debug.debug('Fired', { power: fireData.power, weapon: fireData.weapon.name });
    }

    /**
     * Update game logic (override)
     */
    update(deltaTime) {
        // Update charging and trajectory preview
        if (this.state.charging) {
            this.state.power = Math.min(
                this.config.GAMEPLAY.MAX_POWER,
                this.state.power + deltaTime * this._getChargeRate()
            );
            // Update trajectory preview during charge to show power changes
            this._updateTrajectoryPreview();
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
     * Apply damage to entities (override)
     */
    _applyDamageToEntities(position, weapon) {
        this.castles.forEach((castle, i) => {
            if (!castle.alive) return;

            const dist = position.distanceTo(castle.position);
            if (dist < weapon.radius + 5) {
                const dmgFactor = 1 - (dist / (weapon.radius + 5));
                const damage = weapon.damage * dmgFactor;
                castle.takeDamage(damage, position);

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

    /**
     * Switch to next player (override)
     */
    _nextTurn() {
        this._prepareNextTurn();

        this.state.currentPlayer = (this.state.currentPlayer + 1) % this.config.GAMEPLAY.PLAYER_COUNT;

        Debug.info(`Turn: Player ${this.state.currentPlayer + 1}`);

        // Trigger AI turn if current player is AI
        if (this._isCurrentPlayerAI()) {
            // Clear trajectory preview for AI turns
            if (this.trajectoryPreview) this.trajectoryPreview.clear();
            this._scheduleAIAction();
        } else {
            // Show initial trajectory preview for human player
            this._updateTrajectoryPreview();
        }
    }

    /**
     * Check if current player is AI
     */
    _isCurrentPlayerAI() {
        return this.playerTypes[this.state.currentPlayer] === 'ai';
    }

    /**
     * Schedule AI action with thinking delay
     */
    _scheduleAIAction() {
        const ai = this.aiControllers[this.state.currentPlayer];
        if (!ai) return;

        const delay = ai.getThinkDelay();
        Debug.debug(`AI thinking for ${Math.round(delay)}ms...`);

        this._aiActionTimeout = setTimeout(() => {
            this._executeAITurn();
        }, delay);
    }

    /**
     * Execute AI turn using original Ballerburg targeting logic
     */
    _executeAITurn() {
        if (this.state.gameOver || this.projectile) return;

        const ai = this.aiControllers[this.state.currentPlayer];
        const cannon = this.cannons[this.state.currentPlayer];
        if (!ai || !cannon) return;

        // Build game state for AI (matches original z_* function requirements)
        const gameState = this._getAIGameState();

        // Calculate shot using original strategy selection
        const firePos = cannon.getFirePosition();
        const shot = ai.calculateShot(
            { x: firePos.x, y: firePos.y },
            gameState,
            this.state.wind,
            this.config.PHYSICS.GRAVITY
        );

        if (!shot) {
            Debug.warn('AI could not calculate shot');
            return;
        }

        // Set cannon angle and fire
        cannon.setAim(shot.angle, cannon.horizontalAngle);
        this.state.power = Math.min(shot.power, this.config.GAMEPLAY.MAX_POWER);

        Debug.debug('AI firing', {
            target: shot.targetName,
            angle: shot.angle.toFixed(1),
            power: this.state.power.toFixed(1)
        });

        // Fire after brief aiming animation
        this.state.charging = true;
        setTimeout(() => {
            if (!this.state.gameOver && !this.projectile) {
                this._fire();
            }
        }, 300);
    }

    /**
     * Build game state for AI targeting (mirrors original Ballerburg data structures)
     * Provides data for z_kn, z_ka, z_ft, z_ge, z_pk target functions
     */
    _getAIGameState() {
        const enemyIdx = (this.state.currentPlayer + 1) % 2;
        const enemyCastle = this.castles[enemyIdx];
        const enemyCannon = this.cannons[enemyIdx];

        return {
            // For z_kn() - king targeting
            enemyCastle: enemyCastle && enemyCastle.alive ? {
                position: enemyCastle.position,
                alive: enemyCastle.alive
            } : null,

            // For z_ka() - cannon targeting
            enemyCannons: enemyCannon && enemyCannon.mesh ? [{
                x: enemyCannon.getFirePosition().x,
                y: enemyCannon.getFirePosition().y,
                alive: true
            }] : [],

            // For z_ft() - tower targeting (not implemented yet, but ready)
            enemyTowers: [],

            // For z_ge() - gold targeting (always has gold in simplified version)
            enemyGold: 500,

            // For z_pk() - powder/balls targeting
            enemyPowder: 100,
            enemyBalls: 10
        };
    }

    /**
     * Check for victory condition (override)
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
     * Update UI elements (override)
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

        this._updateUIElements(elements);

        // Update health bars
        this.castles.forEach((castle, i) => {
            const bar = document.getElementById(`health${i + 1}`);
            if (bar) {
                bar.style.width = `${castle.getHealthPercent() * 100}%`;
            }
        });
    }

    /**
     * Restart game (override)
     */
    restart() {
        this._baseRestart();

        // Dispose Ballerburg-specific entities
        this.castles.forEach(c => c.dispose());
        this.cannons.forEach(c => c.dispose());
        this.terrain.dispose();

        // Reset state
        this.state.currentPlayer = 0;

        // Rebuild world
        this.castles = [];
        this.cannons = [];
        this._initWorld();
        this._initAmmo();
        this._randomizeWind();
        this.resetCamera();

        Debug.info('Game restarted');
    }

    /**
     * Clean up (override)
     */
    dispose() {
        this.castles.forEach(c => c.dispose());
        this.cannons.forEach(c => c.dispose());
        super.dispose();
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BallerGame = BallerGame;
}
