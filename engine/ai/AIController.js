/**
 * Game Engine - AI Controller
 * Provides computer opponent logic using TrajectoryCalculator
 *
 * Based on original Ballerburg (1987) AI strategies by Eckhard Kruse:
 * - Tölpel (Dimwit): Random shots
 * - Dummel (Dummy): Aims for king but misses
 * - Brubbel (Grumbler): Targets cannons
 * - Raffzahn (Greedy): Prioritizes gold/resources
 * - Tückisch (Sneaky): Mixed strategy
 */

class AIController {
    /**
     * Create AI controller
     * @param {Object} config - Game configuration
     * @param {Object} options - AI options
     */
    constructor(config, options = {}) {
        this.config = config;
        this.difficulty = options.difficulty || 'normal'; // easy, normal, hard
        this.personality = options.personality || 'balanced';
        this.inaccuracy = this._getInaccuracy();
        this.thinkDelay = options.thinkDelay || 1000; // ms before acting
    }

    /**
     * Get inaccuracy based on difficulty
     */
    _getInaccuracy() {
        switch (this.difficulty) {
            case 'easy': return 0.25;    // 25% deviation
            case 'normal': return 0.12;  // 12% deviation
            case 'hard': return 0.05;    // 5% deviation
            default: return 0.12;
        }
    }

    /**
     * Calculate AI shot for artillery game (Ballerburg-style)
     * @param {Object} shooter - Shooter position and state {x, y, cannonAngle}
     * @param {Array} targets - Array of potential targets [{x, y, priority, type}]
     * @param {Object} wind - Wind state {strength, direction}
     * @param {number} gravity - Gravity constant
     * @returns {Object} Shot parameters {angle, power, targetType}
     */
    calculateShot(shooter, targets, wind, gravity) {
        // Select target based on personality
        const target = this._selectTarget(targets);
        if (!target) return null;

        // Calculate trajectory to target
        const source = { x: shooter.x, y: shooter.y };
        const windValue = wind ? wind.strength * wind.direction : 0;

        const trajectory = TrajectoryCalculator.calculateTrajectory(
            source,
            { x: target.x, y: target.y },
            gravity,
            windValue
        );

        if (!trajectory) return null;

        // Apply inaccuracy for difficulty
        const finalTrajectory = TrajectoryCalculator.addInaccuracy(
            trajectory,
            this.inaccuracy
        );

        return {
            angle: finalTrajectory.angle,
            power: Math.min(finalTrajectory.power, this.config.GAMEPLAY?.MAX_POWER || 35),
            vx: finalTrajectory.vx,
            vy: finalTrajectory.vy,
            targetType: target.type
        };
    }

    /**
     * Select target based on AI personality
     * @param {Array} targets - Potential targets with priorities
     * @returns {Object|null} Selected target
     */
    _selectTarget(targets) {
        if (!targets || targets.length === 0) return null;

        // Filter valid targets
        const validTargets = targets.filter(t => t && t.x !== undefined && t.y !== undefined);
        if (validTargets.length === 0) return null;

        switch (this.personality) {
            case 'aggressive':
                // Prioritize king/main target
                return this._selectByType(validTargets, ['king', 'castle', 'worm']) ||
                       this._selectRandom(validTargets);

            case 'tactical':
                // Prioritize cannons/weapons
                return this._selectByType(validTargets, ['cannon', 'weapon', 'worm']) ||
                       this._selectRandom(validTargets);

            case 'economic':
                // Prioritize resources
                return this._selectByType(validTargets, ['gold', 'resources', 'tower']) ||
                       this._selectRandom(validTargets);

            case 'random':
                return this._selectRandom(validTargets);

            case 'balanced':
            default:
                // Use priority weights
                return this._selectByPriority(validTargets);
        }
    }

    /**
     * Select target by type preference
     */
    _selectByType(targets, preferredTypes) {
        for (const type of preferredTypes) {
            const match = targets.find(t => t.type === type);
            if (match) return match;
        }
        return null;
    }

    /**
     * Select target by priority score
     */
    _selectByPriority(targets) {
        // Sort by priority (higher is better)
        const sorted = [...targets].sort((a, b) =>
            (b.priority || 0) - (a.priority || 0)
        );

        // Add some randomness - 70% chance for top target, 30% for others
        if (sorted.length > 1 && Math.random() > 0.7) {
            return sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
        }
        return sorted[0];
    }

    /**
     * Select random target
     */
    _selectRandom(targets) {
        return targets[Math.floor(Math.random() * targets.length)];
    }

    /**
     * Get AI action delay (thinking time)
     */
    getThinkDelay() {
        // Add some variation to seem more human
        return this.thinkDelay + Math.random() * 500;
    }

    /**
     * Decide cannon angle adjustments
     * @param {number} currentAngle - Current cannon angle
     * @param {number} targetAngle - Desired angle
     * @returns {number} Angle change step
     */
    getAngleAdjustment(currentAngle, targetAngle) {
        const diff = targetAngle - currentAngle;
        const step = 2 + Math.random(); // 2-3 degrees per adjustment
        return Math.sign(diff) * Math.min(Math.abs(diff), step);
    }

    /**
     * AI personalities available (based on original Ballerburg)
     */
    static get PERSONALITIES() {
        return {
            TOLPEL: { name: 'Tölpel', difficulty: 'easy', personality: 'random' },
            DUMMEL: { name: 'Dummel', difficulty: 'easy', personality: 'aggressive' },
            BRUBBEL: { name: 'Brubbel', difficulty: 'normal', personality: 'tactical' },
            RAFFZAHN: { name: 'Raffzahn', difficulty: 'normal', personality: 'economic' },
            TUCKISCH: { name: 'Tückisch', difficulty: 'hard', personality: 'balanced' }
        };
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AIController = AIController;
}
