/**
 * Ballerburg 3D - UI System
 * Handles all DOM-based user interface
 */

class UI {
    constructor() {
        // Cache DOM elements
        this.elements = {
            timer: document.getElementById('timer'),
            currentPlayer: document.getElementById('currentPlayer'),
            windArrow: document.getElementById('windArrow'),
            windStrength: document.getElementById('windStrength'),
            angleSlider: document.getElementById('angleSlider'),
            angleValue: document.getElementById('angleValue'),
            directionSlider: document.getElementById('directionSlider'),
            directionValue: document.getElementById('directionValue'),
            powerMeter: document.getElementById('powerMeter'),
            powerFill: document.getElementById('powerFill'),
            weaponButtons: document.querySelectorAll('.weapon-btn'),
            victoryModal: document.getElementById('victoryModal'),
            victoryTitle: document.getElementById('victoryTitle'),
            victoryMessage: document.getElementById('victoryMessage'),
            restartBtn: document.getElementById('restartBtn')
        };

        this.callbacks = {};
    }

    /**
     * Initialize UI event listeners
     */
    init(callbacks) {
        this.callbacks = callbacks;

        // Angle slider
        this.elements.angleSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.angleValue.textContent = value + '°';
            if (this.callbacks.onAngleChange) this.callbacks.onAngleChange(value);
        });

        // Direction slider
        this.elements.directionSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.directionValue.textContent = value + '°';
            if (this.callbacks.onDirectionChange) this.callbacks.onDirectionChange(value);
        });

        // Weapon buttons
        this.elements.weaponButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => this._selectWeapon(index));
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._selectWeapon(index);
            });
        });

        // Restart button
        this.elements.restartBtn.addEventListener('click', () => {
            if (this.callbacks.onRestart) this.callbacks.onRestart();
        });
    }

    /**
     * Select weapon
     */
    _selectWeapon(index) {
        this.elements.weaponButtons.forEach(btn => btn.classList.remove('active'));
        this.elements.weaponButtons[index].classList.add('active');
        if (this.callbacks.onWeaponChange) this.callbacks.onWeaponChange(index);
    }

    /**
     * Update timer display
     */
    updateTimer(seconds) {
        this.elements.timer.textContent = Math.ceil(seconds);
    }

    /**
     * Update current player display
     */
    updatePlayer(playerIndex) {
        const name = Config.PLAYER_COLORS[playerIndex].name;
        this.elements.currentPlayer.textContent = `${name} Castle's Turn`;
    }

    /**
     * Update wind indicator
     */
    updateWind(strength, direction) {
        this.elements.windArrow.style.transform = direction > 0 ? 'scaleX(1)' : 'scaleX(-1)';
        this.elements.windStrength.textContent = strength.toFixed(1);
    }

    /**
     * Update power meter
     */
    updatePower(power, visible) {
        this.elements.powerMeter.classList.toggle('visible', visible);
        this.elements.powerFill.style.width = power + '%';
    }

    /**
     * Update weapon ammo display
     */
    updateAmmo(ammoArray) {
        this.elements.weaponButtons.forEach((btn, index) => {
            const ammoEl = btn.querySelector('.ammo');
            const weapon = Config.WEAPONS[index];

            if (weapon.ammo === -1) {
                ammoEl.textContent = '∞';
                btn.classList.remove('disabled');
            } else {
                ammoEl.textContent = ammoArray[index];
                btn.classList.toggle('disabled', ammoArray[index] <= 0);
            }
        });
    }

    /**
     * Reset controls to default
     */
    resetControls() {
        this.elements.angleSlider.value = 45;
        this.elements.angleValue.textContent = '45°';
        this.elements.directionSlider.value = 0;
        this.elements.directionValue.textContent = '0°';
        this.elements.weaponButtons.forEach(btn => btn.classList.remove('active'));
        this.elements.weaponButtons[0].classList.add('active');
    }

    /**
     * Show victory screen
     */
    showVictory(winnerName, message) {
        this.elements.victoryTitle.textContent = `${winnerName} Wins!`;
        this.elements.victoryMessage.textContent = message;
        this.elements.victoryModal.classList.remove('hidden');
    }

    /**
     * Hide victory screen
     */
    hideVictory() {
        this.elements.victoryModal.classList.add('hidden');
    }

    /**
     * Get current slider values
     */
    getAimValues() {
        return {
            angle: parseInt(this.elements.angleSlider.value),
            direction: parseInt(this.elements.directionSlider.value)
        };
    }
}
