/**
 * Game Engine - AI Controller
 * Precisely ported from original Ballerburg (1987) BALLER2.C by Eckhard Kruse
 *
 * Original AI strategies (cw values):
 * - cw=1: Default king, 30% gold, 30% powder/balls
 * - cw=2: Cannons primary, 90% also gold
 * - cw=3: 50% cannons, 20% gold, 20% powder, 33% towers
 * - cw=4: Only cannons
 * - cw=5: Cannons, 90% towers
 *
 * Original targeting functions:
 * - z_kn(): Target king
 * - z_ka(): Target random enemy cannon
 * - z_ft(): Target enemy tower
 * - z_ge(): Target gold (if enemy >100)
 * - z_pk(): Target powder or cannonballs
 */

class AIController {
    /**
     * Create AI controller
     * @param {Object} config - Game configuration
     * @param {Object} options - AI options
     */
    constructor(config, options = {}) {
        this.config = config;

        // Original: cw[n] values 1-5, cx[n] skill 1-5
        this.strategy = options.strategy || 3;  // Default: balanced (cw=3)
        this.skillLevel = options.skillLevel || 3;  // 1-5, affects accuracy

        // Calculate inaccuracy from skill (original: t=49-cx[n]*16)
        // cx=1: t=33, cx=3: t=1, cx=5: t=-31 (very accurate)
        this.accuracyRange = 49 - this.skillLevel * 16;

        this.thinkDelay = options.thinkDelay || 1000;
    }

    /**
     * AI Personalities matching original Ballerburg
     * cw values determine targeting strategy
     */
    static get STRATEGIES() {
        return {
            // cw=1: King default, 30% gold, 30% powder
            TOLPEL: { name: 'Tölpel', strategy: 1, skillLevel: 1, desc: 'Dimwit - random targeting' },

            // cw=2: Cannons + 90% gold
            DUMMEL: { name: 'Dummel', strategy: 2, skillLevel: 2, desc: 'Dummy - targets cannons and gold' },

            // cw=3: Balanced - 50% cannons, 20% gold, 20% powder, 33% towers
            BRUBBEL: { name: 'Brubbel', strategy: 3, skillLevel: 3, desc: 'Grumbler - balanced strategy' },

            // cw=4: Only cannons
            RAFFZAHN: { name: 'Raffzahn', strategy: 4, skillLevel: 4, desc: 'Greedy - cannon hunter' },

            // cw=5: Cannons + 90% towers
            TUCKISCH: { name: 'Tückisch', strategy: 5, skillLevel: 5, desc: 'Sneaky - targets infrastructure' }
        };
    }

    /**
     * Calculate shot using original Ballerburg targeting logic
     * @param {Object} shooter - {x, y} cannon position
     * @param {Object} gameState - Current game state with targets
     * @param {Object} wind - {strength, direction}
     * @param {number} gravity - Gravity constant
     * @returns {Object} Shot parameters
     */
    calculateShot(shooter, gameState, wind, gravity) {
        // Select target using original strategy logic
        const target = this._selectTargetByStrategy(gameState);
        if (!target) return null;

        // Apply accuracy offset (original: -t/2+Random()%t)
        const offset = this.accuracyRange > 0
            ? -this.accuracyRange / 2 + Math.random() * this.accuracyRange
            : Math.random() * 5 - 2.5; // High skill = small random offset

        const adjustedTarget = {
            x: target.x + offset,
            y: target.y
        };

        // Calculate trajectory
        const windValue = wind ? wind.strength * wind.direction : 0;
        const trajectory = TrajectoryCalculator.calculateTrajectory(
            { x: shooter.x, y: shooter.y },
            adjustedTarget,
            gravity,
            windValue
        );

        if (!trajectory) return null;

        return {
            angle: trajectory.angle,
            power: Math.min(trajectory.power * 2, this.config.GAMEPLAY?.MAX_POWER || 35),
            vx: trajectory.vx,
            vy: trajectory.vy,
            targetType: target.type,
            targetName: target.name || target.type
        };
    }

    /**
     * Select target using original Ballerburg strategy switch
     * Precisely matches comp() function strategy selection
     */
    _selectTargetByStrategy(gameState) {
        const t = Math.floor(Math.random() * 100); // Original: t=Random()%100

        // Default: target king (z_kn) - always called first if cw[n] > 0
        let target = this._z_kn(gameState);

        switch (this.strategy) {
            case 1:
                // Original: if( t<30 ) z_ge(); if( t>60 ) z_pk();
                if (t < 30) {
                    target = this._z_ge(gameState) || target;
                }
                if (t > 60) {
                    target = this._z_pk(gameState) || target;
                }
                break;

            case 2:
                // Original: z_ka(); if( t<90 ) z_ge();
                target = this._z_ka(gameState) || target;
                if (t < 90) {
                    target = this._z_ge(gameState) || target;
                }
                break;

            case 3:
                // Original: if( t<50 )z_ka(); else if( t<70 )z_ge(); else if( t<90 )z_pk();
                //           if( !(Random()%3) ) z_ft();
                if (t < 50) {
                    target = this._z_ka(gameState) || target;
                } else if (t < 70) {
                    target = this._z_ge(gameState) || target;
                } else if (t < 90) {
                    target = this._z_pk(gameState) || target;
                }
                // 33% chance to target tower instead
                if (Math.floor(Math.random() * 3) === 0) {
                    target = this._z_ft(gameState) || target;
                }
                break;

            case 4:
                // Original: z_ka();
                target = this._z_ka(gameState) || target;
                break;

            case 5:
                // Original: z_ka(); if( t<90 ) z_ft();
                target = this._z_ka(gameState) || target;
                if (t < 90) {
                    target = this._z_ft(gameState) || target;
                }
                break;
        }

        return target;
    }

    /**
     * z_kn() - Target king (throne room)
     * Original: zx=!n*639-f*(bh[21]+15); zy=by[!n]-bh[22]-5;
     */
    _z_kn(gameState) {
        const castle = gameState.enemyCastle;
        if (!castle || !castle.alive) return null;

        return {
            x: castle.position.x,
            y: castle.position.y + 20, // King is at top of castle
            type: 'king',
            name: 'König',
            priority: 15
        };
    }

    /**
     * z_ka() - Target random enemy cannon
     * Original: do i=Random()%10; while( ka[!n][i].x==-1 );
     *           zx=ka[!n][i].x+10; zy=ka[!n][i].y;
     */
    _z_ka(gameState) {
        const cannons = gameState.enemyCannons?.filter(c => c && c.alive !== false);
        if (!cannons || cannons.length === 0) return null;

        // Select random cannon (original picks random valid cannon)
        const cannon = cannons[Math.floor(Math.random() * cannons.length)];
        return {
            x: cannon.x + 10,
            y: cannon.y,
            type: 'cannon',
            name: 'Kanone',
            priority: 10
        };
    }

    /**
     * z_ft() - Target enemy tower (Förderturm)
     * Original: zx=ft[!n][i].x-15*f; zy=ft[!n][i].y-10;
     */
    _z_ft(gameState) {
        const towers = gameState.enemyTowers?.filter(t => t && t.alive !== false);
        if (!towers || towers.length === 0) return null;

        const tower = towers[Math.floor(Math.random() * towers.length)];
        return {
            x: tower.x,
            y: tower.y - 10,
            type: 'tower',
            name: 'Förderturm',
            priority: 8
        };
    }

    /**
     * z_ge() - Target gold storage
     * Original: if( ge[!n]>100 ) { zx=!n*639-f*(bh[25]+bh[31]/2); zy=by[!n]-bh[26]; }
     */
    _z_ge(gameState) {
        // Only target gold if enemy has significant amount (>100 in original)
        if (!gameState.enemyGold || gameState.enemyGold <= 100) return null;

        const castle = gameState.enemyCastle;
        if (!castle) return null;

        return {
            x: castle.position.x + (castle.position.x > 0 ? -8 : 8),
            y: castle.position.y + 5,
            type: 'gold',
            name: 'Goldlager',
            priority: 7
        };
    }

    /**
     * z_pk() - Target powder or cannonballs storage
     * Original: if( ku[!n] || pu[!n]>19 ) { i=Random()&2; ... }
     */
    _z_pk(gameState) {
        // Only target if enemy has powder (>19) or cannonballs
        const hasPowder = gameState.enemyPowder && gameState.enemyPowder > 19;
        const hasBalls = gameState.enemyBalls && gameState.enemyBalls > 0;

        if (!hasPowder && !hasBalls) return null;

        const castle = gameState.enemyCastle;
        if (!castle) return null;

        // Original randomly picks powder or balls (i=Random()&2)
        const targetPowder = Math.random() > 0.5;

        return {
            x: castle.position.x + (castle.position.x > 0 ? -12 : 12),
            y: castle.position.y + 8,
            type: targetPowder ? 'powder' : 'balls',
            name: targetPowder ? 'Pulverlager' : 'Kugellager',
            priority: 6
        };
    }

    /**
     * Get AI thinking delay
     */
    getThinkDelay() {
        return this.thinkDelay + Math.random() * 500;
    }

    /**
     * Create AI from personality preset
     */
    static fromPersonality(config, personalityName) {
        const preset = AIController.STRATEGIES[personalityName.toUpperCase()];
        if (!preset) {
            return new AIController(config);
        }
        return new AIController(config, {
            strategy: preset.strategy,
            skillLevel: preset.skillLevel
        });
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AIController = AIController;
}
