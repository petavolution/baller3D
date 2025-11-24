/**
 * Worms 3D - Main Game Controller
 * Extends BaseGameController with worms-specific gameplay
 */

class WormsGame extends BaseGameController {
    constructor() {
        super(WormsConfig);
        Debug.info('WormsGame: Creating...');

        // Game entities (Worms-specific)
        this.teams = []; // Array of arrays of worms

        // Worms-specific state
        this.state.currentTeam = 0;
        this.state.currentWorm = 0;
        this.state.phase = 'move'; // 'move', 'aim', 'fire', 'wait'

        this._keysDown = {};
    }

    /**
     * Initialize game
     */
    init() {
        super.init();
        this._updateSelectionIndicators();
        Debug.info('WormsGame: Initialized');
        return this;
    }

    /**
     * Initialize game world (override)
     */
    _initWorld() {
        // Create terrain
        this.terrain = new WormsTerrain(this.scene, this.config);
        this.terrain.generate();

        // Create water
        this._createWater(-6, 0.8);

        // Spawn worms for each team
        const totalWorms = this.config.GAMEPLAY.TEAM_COUNT * this.config.GAMEPLAY.WORMS_PER_TEAM;
        const spawnPositions = this.terrain.getSpawnPositions(totalWorms);

        let posIndex = 0;
        for (let t = 0; t < this.config.GAMEPLAY.TEAM_COUNT; t++) {
            const team = [];
            for (let w = 0; w < this.config.GAMEPLAY.WORMS_PER_TEAM; w++) {
                const worm = new Worm(this.scene, this.terrain, t, w, this.config);
                const pos = spawnPositions[posIndex++];
                worm.setSpawnPosition(pos.x, pos.y, pos.z);
                team.push(worm);
            }
            this.teams.push(team);
        }

        Debug.info('World created', {
            teams: this.teams.length,
            wormsPerTeam: this.config.GAMEPLAY.WORMS_PER_TEAM
        });
    }

    /**
     * Initialize controls (override)
     */
    _initControls() {
        window.addEventListener('keydown', e => this._onKeyDown(e));
        window.addEventListener('keyup', e => this._onKeyUp(e));

        // Fire button
        const fireBtn = document.getElementById('fireBtn');
        if (fireBtn) {
            fireBtn.addEventListener('mousedown', () => this._startCharge());
            fireBtn.addEventListener('mouseup', () => this._fire());
            fireBtn.addEventListener('touchstart', e => { e.preventDefault(); this._startCharge(); });
            fireBtn.addEventListener('touchend', e => { e.preventDefault(); this._fire(); });
        }

        // Weapon buttons
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.weapon, 10);
                this._selectWeapon(idx);
            });
        });
    }

    /**
     * Get current worm
     */
    getCurrentWorm() {
        const team = this.teams[this.state.currentTeam];
        if (!team) return null;

        // Find next alive worm
        for (let i = 0; i < team.length; i++) {
            const idx = (this.state.currentWorm + i) % team.length;
            if (team[idx] && team[idx].alive) {
                this.state.currentWorm = idx;
                return team[idx];
            }
        }
        return null;
    }

    /**
     * Update selection indicators on all worms
     */
    _updateSelectionIndicators() {
        const currentWorm = this.getCurrentWorm();
        this.teams.forEach(team => {
            team.forEach(worm => {
                if (worm.setSelected) {
                    worm.setSelected(worm === currentWorm);
                }
            });
        });
    }

    /**
     * Handle key down
     */
    _onKeyDown(e) {
        if (this.state.gameOver) return;
        this._keysDown[e.key] = true;

        const worm = this.getCurrentWorm();
        if (!worm) return;

        switch (e.key) {
            case 'ArrowLeft':
                if (this.state.phase === 'move') worm.move(-1);
                break;
            case 'ArrowRight':
                if (this.state.phase === 'move') worm.move(1);
                break;
            case 'ArrowUp':
                if (this.state.phase === 'aim') {
                    worm.setAim(worm.aimAngle + 3);
                } else if (this.state.phase === 'move') {
                    worm.jump();
                }
                break;
            case 'ArrowDown':
                if (this.state.phase === 'aim') {
                    worm.setAim(worm.aimAngle - 3);
                }
                break;
            case ' ':
                if (this.state.phase === 'move') {
                    this.state.phase = 'aim';
                } else if (this.state.phase === 'aim') {
                    this._startCharge();
                }
                break;
            case 'Enter':
                if (this.state.phase === 'move') {
                    this.state.phase = 'aim';
                }
                break;
            case '1': case '2': case '3': case '4': case '5':
                this._selectWeapon(parseInt(e.key, 10) - 1);
                break;
        }
        this._updateUI();
    }

    /**
     * Handle key up
     */
    _onKeyUp(e) {
        this._keysDown[e.key] = false;

        const worm = this.getCurrentWorm();
        if (!worm) return;

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            worm.stopMove();
        }

        if (e.key === ' ' && this.state.charging) {
            this._fire();
        }
    }

    /**
     * Start charging (override with phase check)
     */
    _startCharge() {
        if (this.state.phase !== 'aim') return;
        super._startCharge();
    }

    /**
     * Fire projectile (override)
     */
    _fire() {
        const fireData = this._getFireData();
        if (!fireData) return;

        this.state.phase = 'wait';

        const worm = this.getCurrentWorm();
        if (!worm) return;

        // Battle cry speech bubble
        const battleCries = ['Fire!', 'Incoming!', 'Take this!', 'Eat this!'];
        const cry = battleCries[Math.floor(Math.random() * battleCries.length)];
        this.particles.createSpeechBubble(worm.position.clone(), cry);

        const position = worm.getFirePosition();
        const direction = worm.getFireDirection();
        const velocity = direction.multiplyScalar(fireData.speed);

        // Create projectile based on type
        if (fireData.weapon.type === 'bouncing') {
            this.projectile = new BouncingProjectile(
                this.scene, position, velocity, this.config,
                { timer: fireData.weapon.timer, maxBounces: 3 }
            );
        } else {
            this.projectile = new BaseProjectile(
                this.scene, position, velocity, this.config
            );
        }
        this.projectile.weapon = fireData.weapon;

        // Track with camera
        this.setCameraTarget(
            new THREE.Vector3(position.x, position.y + 10, position.z + 30),
            position
        );

        Debug.debug('Fired', { power: fireData.power, weapon: fireData.weapon.name });
    }

    /**
     * Get charge rate (override - slightly faster for Worms)
     */
    _getChargeRate() {
        return 35;
    }

    /**
     * Update game logic (override)
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
        if (!this.state.gameOver && !this.projectile && this.state.phase !== 'wait') {
            this.state.turnTimer -= deltaTime;
            if (this.state.turnTimer <= 0) {
                this._nextTurn();
            }
        }

        // Update all worms
        const currentWorm = this.getCurrentWorm();
        this.teams.forEach(team => {
            team.forEach(worm => {
                if (worm.alive) {
                    worm.update(deltaTime);
                    worm.updateHealthBar(this.camera, worm === currentWorm);

                    // Check water death with splash
                    if (worm.position.y < -5) {
                        // Create splash before death
                        this.particles.createSplash(
                            new THREE.Vector3(worm.position.x, -5, worm.position.z)
                        );
                        // Death phrase
                        const deathPhrases = ['Nooo!', 'Argh!', 'Bye!', 'Oof!'];
                        const phrase = deathPhrases[Math.floor(Math.random() * deathPhrases.length)];
                        this.particles.createSpeechBubble(worm.position.clone(), phrase);
                        worm.takeDamage(worm.health); // Instant death
                    }
                }
            });
        });

        // Update projectile
        if (this.projectile) {
            const active = this.projectile.update(deltaTime, this.terrain, this.state.wind);

            if (active) {
                this.setCameraTarget(
                    new THREE.Vector3(
                        this.projectile.position.x,
                        Math.max(this.projectile.position.y + 10, 20),
                        this.projectile.position.z + 30
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

        // Update UI
        this._updateUI();
    }

    /**
     * Apply damage to entities (override)
     */
    _applyDamageToEntities(position, weapon) {
        this.teams.forEach(team => {
            team.forEach(worm => {
                if (!worm.alive) return;

                const dist = position.distanceTo(worm.position);
                if (dist < weapon.radius + 2) {
                    const dmgFactor = 1 - (dist / (weapon.radius + 2));
                    const damage = weapon.damage * dmgFactor;
                    worm.takeDamage(damage);

                    this.particles.createFloatingText(
                        worm.position.clone(),
                        damage,
                        { color: this.config.TEAMS[worm.teamIndex].color }
                    );

                    // Knockback
                    const knockDir = worm.position.clone().sub(position).normalize();
                    worm.velocity.add(knockDir.multiplyScalar(dmgFactor * 15));
                }
            });
        });

        this._checkVictory();
    }

    /**
     * Next turn (override)
     */
    _nextTurn() {
        this._prepareNextTurn();

        // Move to next team
        this.state.currentTeam = (this.state.currentTeam + 1) % this.config.GAMEPLAY.TEAM_COUNT;

        // Find next alive worm in team
        const team = this.teams[this.state.currentTeam];
        let found = false;
        for (let i = 0; i < team.length; i++) {
            const idx = (this.state.currentWorm + 1 + i) % team.length;
            if (team[idx] && team[idx].alive) {
                this.state.currentWorm = idx;
                found = true;
                break;
            }
        }

        if (!found) {
            // No alive worms in this team, try next
            this._checkVictory();
            if (!this.state.gameOver) {
                this._nextTurn();
                return;
            }
        }

        this.state.phase = 'move';

        // Update selection indicators
        this._updateSelectionIndicators();

        // Focus camera on current worm
        const worm = this.getCurrentWorm();
        if (worm) {
            this.setCameraTarget(
                new THREE.Vector3(worm.position.x, worm.position.y + 15, worm.position.z + 35),
                worm.position
            );
        }

        Debug.info(`Turn: Team ${this.state.currentTeam + 1}, Worm ${this.state.currentWorm + 1}`);
    }

    /**
     * Check victory (override)
     */
    _checkVictory() {
        const aliveTeams = this.teams.filter(team =>
            team.some(worm => worm.alive)
        );

        if (aliveTeams.length <= 1) {
            this.state.gameOver = true;
            const winnerIdx = aliveTeams.length === 1 ?
                this.teams.indexOf(aliveTeams[0]) : -1;

            Debug.info('Game Over', { winner: winnerIdx + 1 });

            // Custom victory message with team name
            const msg = winnerIdx >= 0 ?
                `${this.config.TEAMS[winnerIdx].name} Wins!` : 'Draw!';
            this._showVictory(winnerIdx + 1, msg);
        }
    }

    /**
     * Update UI (override)
     */
    _updateUI() {
        const worm = this.getCurrentWorm();

        const elements = {
            'currentTeam': `Team ${this.state.currentTeam + 1}`,
            'turnTimer': Math.ceil(this.state.turnTimer),
            'aimValue': worm ? Math.round(worm.aimAngle) : 0,
            'phaseValue': this.state.phase,
            'windValue': `${(this.state.wind.strength * this.state.wind.direction).toFixed(1)}`,
            'powerValue': Math.round(this.state.power)
        };

        this._updateUIElements(elements);
    }

    /**
     * Restart (override)
     */
    restart() {
        this._baseRestart();

        // Dispose Worms-specific entities
        this.teams.forEach(team => team.forEach(w => w.dispose()));
        this.terrain.dispose();

        // Reset state
        this.teams = [];
        this.state.currentTeam = 0;
        this.state.currentWorm = 0;
        this.state.phase = 'move';

        // Rebuild world
        this._initWorld();
        this._initAmmo();
        this._randomizeWind();
        this.resetCamera();
        this._updateSelectionIndicators();

        Debug.info('Game restarted');
    }

    /**
     * Dispose (override)
     */
    dispose() {
        this.teams.forEach(team => team.forEach(w => w.dispose()));
        super.dispose();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.WormsGame = WormsGame;
}
