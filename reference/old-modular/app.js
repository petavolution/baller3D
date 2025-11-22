// Ballerburg - Classic Atari ST Artillery Game
// Monochrome Three.js implementation

class BallerBurg {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.castles = [];
        this.cannons = [];
        this.projectile = null;
        this.particles = [];
        
        // Game state
        this.currentPlayer = 0;
        this.turnNumber = 1;
        this.gameRunning = true;
        this.charging = false;
        this.power = 0;
        this.maxPower = 35;
        this.turnTimeLeft = 45;
        
        // Controls
        this.angle = 45;
        this.direction = 0;
        this.currentWeapon = 0;
        
        // Wind
        this.windStrength = 0;
        this.windDirection = 0;
        
        // Weapons data
        this.weapons = [
            {name: "Cannonball", damage: 60, radius: 8, speed: 1.0, ammo: -1, icon: "●"},
            {name: "Explosive Shell", damage: 80, radius: 12, speed: 0.9, ammo: 8, icon: "◉"},
            {name: "Chain Shot", damage: 40, radius: 15, speed: 0.7, ammo: 6, icon: "○○"},
            {name: "Fire Ball", damage: 45, radius: 10, speed: 1.1, ammo: 10, icon: "☀"},
            {name: "Stone Ball", damage: 35, radius: 6, speed: 1.3, ammo: -1, icon: "■"}
        ];
        
        // Constants
        this.GRAVITY = -9.8;
        this.TERRAIN_WIDTH = 120;
        this.TERRAIN_DEPTH = 20;
        this.TERRAIN_HEIGHT = 40;
        
        this.init();
    }
    
    init() {
        this.initThreeJS();
        this.generateTerrain();
        this.createCastles();
        this.createCannons();
        this.setupLighting();
        this.setupControls();
        this.setupUI();
        this.generateWind();
        this.updateUI();
        this.startTurnTimer();
        this.animate();
    }
    
    initThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFFFFF); // White background
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 40, 80);
        this.camera.lookAt(0, 10, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = false; // No shadows for monochrome aesthetic
        document.getElementById('gameCanvas').appendChild(this.renderer.domElement);
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    generateTerrain() {
        const width = this.TERRAIN_WIDTH;
        const depth = this.TERRAIN_DEPTH;
        
        // Create terrain geometry
        const geometry = new THREE.PlaneGeometry(width, depth, width-1, depth-1);
        geometry.rotateX(-Math.PI / 2);
        
        // Generate mountain terrain with valley
        const vertices = geometry.attributes.position.array;
        this.terrainVertices = new Float32Array(vertices); // Store original for damage
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Create two mountains with valley in between
            let height = 0;
            if (x < -20) {
                // Left mountain
                height = Math.max(0, 15 - Math.abs(x + 40) * 0.3);
            } else if (x > 20) {
                // Right mountain
                height = Math.max(0, 15 - Math.abs(x - 40) * 0.3);
            } else {
                // Valley
                height = Math.max(0, 3 - Math.abs(x) * 0.1);
            }
            
            vertices[i + 1] = height;
            this.terrainVertices[i + 1] = height; // Store original
        }
        
        geometry.computeVertexNormals();
        
        // Solid black material for better impact visibility
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            wireframe: false,
            transparent: false
        });
        
        this.terrain = new THREE.Mesh(geometry, material);
        this.scene.add(this.terrain);
    }
    
    createCastles() {
        const positions = [
            { x: -40, z: 0 },
            { x: 40, z: 0 }
        ];
        
        positions.forEach((pos, index) => {
            const castle = new Castle(pos.x, this.getTerrainHeight(pos.x, pos.z), pos.z, index);
            this.castles.push(castle);
            this.scene.add(castle.group);
        });
    }
    
    createCannons() {
        this.castles.forEach((castle, index) => {
            const cannon = new Cannon(castle.x, castle.y + 8, castle.z, index);
            this.cannons.push(cannon);
            this.scene.add(cannon.group);
        });
    }
    
    setupLighting() {
        // Simple ambient light for monochrome aesthetic
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
        this.scene.add(ambientLight);
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse/touch controls for mobile
        this.renderer.domElement.addEventListener('touchstart', (e) => this.onTouch(e));
        this.renderer.domElement.addEventListener('touchmove', (e) => this.onTouchMove(e));
    }
    
    setupUI() {
        // Sliders
        document.getElementById('angleSlider').addEventListener('input', (e) => {
            this.angle = parseFloat(e.target.value);
            document.getElementById('angleValue').textContent = this.angle;
        });
        
        document.getElementById('directionSlider').addEventListener('input', (e) => {
            this.direction = parseFloat(e.target.value);
            document.getElementById('directionValue').textContent = this.direction;
        });
        
        // Weapon buttons
        document.querySelectorAll('.weapon-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => this.selectWeapon(index));
        });
        
        // Fire button
        document.getElementById('fireButton').addEventListener('click', () => this.fire());
        
        // Restart button
        document.getElementById('restartButton').addEventListener('click', () => this.restart());
    }
    
    onKeyDown(event) {
        if (!this.gameRunning) return;
        
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                if (!this.charging && !this.projectile) {
                    this.charging = true;
                    this.chargePower();
                }
                break;
            case 'Digit1':
                this.selectWeapon(0);
                break;
            case 'Digit2':
                this.selectWeapon(1);
                break;
            case 'Digit3':
                this.selectWeapon(2);
                break;
            case 'Digit4':
                this.selectWeapon(3);
                break;
            case 'Digit5':
                this.selectWeapon(4);
                break;
        }
    }
    
    onKeyUp(event) {
        if (event.code === 'Space' && this.charging) {
            this.charging = false;
            this.fire();
        }
    }
    
    selectWeapon(index) {
        this.currentWeapon = index;
        document.querySelectorAll('.weapon-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
    }
    
    chargePower() {
        if (!this.charging) return;
        
        this.power = Math.min(this.power + 2, this.maxPower);
        document.getElementById('powerValue').textContent = Math.round((this.power / this.maxPower) * 100);
        document.getElementById('powerFill').style.width = `${(this.power / this.maxPower) * 100}%`;
        
        if (this.power < this.maxPower) {
            setTimeout(() => this.chargePower(), 80);
        }
    }
    
    fire() {
        if (this.projectile || this.power === 0) return;
        
        const cannon = this.cannons[this.currentPlayer];
        const weapon = this.weapons[this.currentWeapon];
        
        // Calculate firing direction
        const angleRad = (this.angle * Math.PI) / 180;
        const directionRad = (this.direction * Math.PI) / 180;
        
        const velocity = (this.power / this.maxPower) * 40 * weapon.speed;
        const vx = velocity * Math.cos(angleRad) * Math.sin(directionRad);
        const vy = velocity * Math.sin(angleRad);
        const vz = velocity * Math.cos(angleRad) * Math.cos(directionRad);
        
        // Apply player direction (left castle fires right, right castle fires left)
        const playerDirection = this.currentPlayer === 0 ? 1 : -1;
        
        this.projectile = new Projectile(
            cannon.x, cannon.y + 2, cannon.z,
            vx * playerDirection, vy, vz * playerDirection,
            weapon
        );
        this.scene.add(this.projectile.mesh);
        
        // Reset power
        this.power = 0;
        document.getElementById('powerValue').textContent = '0';
        document.getElementById('powerFill').style.width = '0%';
        
        // Disable controls during flight
        document.getElementById('fireButton').disabled = true;
    }
    
    updateProjectile() {
        if (!this.projectile) return;
        
        const hit = this.projectile.update(this.windStrength, this.windDirection);
        
        if (hit.hit) {
            this.handleImpact(hit.x, hit.y, hit.z);
            this.scene.remove(this.projectile.mesh);
            this.projectile = null;
            
            // Next turn
            setTimeout(() => this.nextTurn(), 2000);
        }
    }
    
    handleImpact(x, y, z) {
        const weapon = this.weapons[this.currentWeapon];
        
        // Create explosion effect
        this.createExplosion(x, y, z, weapon.radius);
        
        // Damage terrain
        this.damageTerrain(x, z, weapon.radius);
        
        // Check castle damage
        this.castles.forEach(castle => {
            const distance = Math.sqrt((castle.x - x) ** 2 + (castle.z - z) ** 2);
            if (distance < weapon.radius + 5) {
                const damage = weapon.damage * Math.max(0.1, (1 - distance / (weapon.radius + 5)));
                castle.takeDamage(damage);
                this.updateHealthBar(castle.index, castle.health / castle.maxHealth);
            }
        });
        
        // Check victory
        this.checkVictory();
    }
    
    createExplosion(x, y, z, radius) {
        // Create large explosion sphere
        const explosionGeometry = new THREE.SphereGeometry(radius * 0.8, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.set(x, y + radius * 0.5, z);
        this.scene.add(explosion);
        
        // Remove explosion after delay
        setTimeout(() => {
            this.scene.remove(explosion);
        }, 1500);
        
        // Create particle explosion effect
        const particleCount = 30;
        const particleGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(x, y, z);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 15 + 5,
                (Math.random() - 0.5) * 20
            );
            
            this.particles.push({ mesh: particle, velocity, life: 120, gravity: -0.3 });
            this.scene.add(particle);
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.velocity.y += particle.gravity;
            particle.mesh.position.add(particle.velocity.clone().multiplyScalar(0.05));
            particle.life--;
            
            // Fade particle
            particle.mesh.material.transparent = true;
            particle.mesh.material.opacity = particle.life / 120;
            
            if (particle.life <= 0 || particle.mesh.position.y < -5) {
                this.scene.remove(particle.mesh);
                return false;
            }
            return true;
        });
    }
    
    damageTerrain(x, z, radius) {
        // Create crater in terrain
        const vertices = this.terrain.geometry.attributes.position.array;
        let needsUpdate = false;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i];
            const vz = vertices[i + 2];
            const distance = Math.sqrt((vx - x) ** 2 + (vz - z) ** 2);
            
            if (distance < radius) {
                const damage = (1 - distance / radius) * 5;
                const newHeight = Math.max(vertices[i + 1] - damage, -3);
                if (newHeight !== vertices[i + 1]) {
                    vertices[i + 1] = newHeight;
                    needsUpdate = true;
                }
            }
        }
        
        if (needsUpdate) {
            this.terrain.geometry.attributes.position.needsUpdate = true;
            this.terrain.geometry.computeVertexNormals();
        }
    }
    
    getTerrainHeight(x, z) {
        // Simple terrain height calculation
        if (x < -20) {
            return Math.max(0, 15 - Math.abs(x + 40) * 0.3);
        } else if (x > 20) {
            return Math.max(0, 15 - Math.abs(x - 40) * 0.3);
        } else {
            return Math.max(0, 3 - Math.abs(x) * 0.1);
        }
    }
    
    generateWind() {
        this.windStrength = Math.random() * 8 - 4;
        this.windDirection = this.windStrength >= 0 ? 1 : -1;
        
        const windText = `${Math.abs(this.windStrength).toFixed(0)} ${this.windStrength >= 0 ? 'E' : 'W'}`;
        document.getElementById('windValue').textContent = windText;
        document.getElementById('windFlag').textContent = this.windStrength >= 0 ? '→' : '←';
    }
    
    nextTurn() {
        this.currentPlayer = 1 - this.currentPlayer;
        this.turnNumber++;
        this.turnTimeLeft = 45;
        this.generateWind();
        this.updateUI();
        this.startTurnTimer();
        
        document.getElementById('fireButton').disabled = false;
    }
    
    updateUI() {
        document.getElementById('currentPlayer').textContent = `Player ${this.currentPlayer + 1}`;
        document.getElementById('turnNumber').textContent = this.turnNumber;
    }
    
    updateHealthBar(castleIndex, healthPercent) {
        const healthFill = document.getElementById(`health${castleIndex + 1}`);
        healthFill.style.width = `${Math.max(0, healthPercent * 100)}%`;
        
        if (healthPercent < 0.3) {
            healthFill.style.background = 'var(--color-error)';
        } else if (healthPercent < 0.6) {
            healthFill.style.background = 'var(--color-warning)';
        }
    }
    
    startTurnTimer() {
        if (this.turnTimer) clearInterval(this.turnTimer);
        
        this.turnTimer = setInterval(() => {
            this.turnTimeLeft--;
            document.getElementById('turnTimer').textContent = this.turnTimeLeft;
            
            if (this.turnTimeLeft <= 0) {
                clearInterval(this.turnTimer);
                if (!this.projectile) {
                    this.nextTurn();
                }
            }
        }, 1000);
    }
    
    checkVictory() {
        const destroyedCastles = this.castles.filter(castle => castle.health <= 0);
        
        if (destroyedCastles.length > 0) {
            this.gameRunning = false;
            clearInterval(this.turnTimer);
            
            const winner = destroyedCastles[0].index === 0 ? 2 : 1;
            this.showVictory(`Player ${winner}`, "Enemy castle destroyed!");
        }
    }
    
    showVictory(winner, message) {
        document.getElementById('victoryText').textContent = `${winner} Wins!`;
        document.getElementById('victoryMessage').textContent = message;
        document.getElementById('victoryModal').classList.remove('hidden');
    }
    
    restart() {
        // Reset game state
        this.gameRunning = true;
        this.currentPlayer = 0;
        this.turnNumber = 1;
        this.power = 0;
        this.turnTimeLeft = 45;
        
        // Clear scene
        if (this.projectile) {
            this.scene.remove(this.projectile.mesh);
            this.projectile = null;
        }
        
        this.particles.forEach(particle => this.scene.remove(particle.mesh));
        this.particles = [];
        
        // Reset castles
        this.castles.forEach(castle => {
            this.scene.remove(castle.group);
            castle.reset();
            this.scene.add(castle.group);
            this.updateHealthBar(castle.index, 1);
        });
        
        // Regenerate terrain
        this.scene.remove(this.terrain);
        this.generateTerrain();
        
        // Reset UI
        this.generateWind();
        this.updateUI();
        document.getElementById('victoryModal').classList.add('hidden');
        document.getElementById('fireButton').disabled = false;
        document.getElementById('powerValue').textContent = '0';
        document.getElementById('powerFill').style.width = '0%';
        
        this.startTurnTimer();
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateProjectile();
        this.updateParticles();
        
        this.renderer.render(this.scene, this.camera);
    }
}

class Castle {
    constructor(x, y, z, index) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.index = index;
        this.health = 100;
        this.maxHealth = 100;
        this.parts = [];
        
        this.group = new THREE.Group();
        this.createCastle();
    }
    
    createCastle() {
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            wireframe: false
        });
        
        // Main keep (central tower)
        const keepGeometry = new THREE.BoxGeometry(6, 12, 6);
        const keep = new THREE.Mesh(keepGeometry, material);
        keep.position.set(this.x, this.y + 6, this.z);
        keep.userData = { type: 'keep', health: 30 };
        this.group.add(keep);
        this.parts.push(keep);
        
        // Side towers
        const towerGeometry = new THREE.BoxGeometry(4, 8, 4);
        const leftTower = new THREE.Mesh(towerGeometry, material);
        leftTower.position.set(this.x - 8, this.y + 4, this.z);
        leftTower.userData = { type: 'tower', health: 20 };
        this.group.add(leftTower);
        this.parts.push(leftTower);
        
        const rightTower = new THREE.Mesh(towerGeometry, material);
        rightTower.position.set(this.x + 8, this.y + 4, this.z);
        rightTower.userData = { type: 'tower', health: 20 };
        this.group.add(rightTower);
        this.parts.push(rightTower);
        
        // Walls
        const wallGeometry = new THREE.BoxGeometry(8, 6, 2);
        const frontWall = new THREE.Mesh(wallGeometry, material);
        frontWall.position.set(this.x, this.y + 3, this.z + 4);
        frontWall.userData = { type: 'wall', health: 15 };
        this.group.add(frontWall);
        this.parts.push(frontWall);
        
        const backWall = new THREE.Mesh(wallGeometry, material);
        backWall.position.set(this.x, this.y + 3, this.z - 4);
        backWall.userData = { type: 'wall', health: 15 };
        this.group.add(backWall);
        this.parts.push(backWall);
        
        // Roofs (triangular)
        const roofGeometry = new THREE.ConeGeometry(4, 4, 4);
        const keepRoof = new THREE.Mesh(roofGeometry, material);
        keepRoof.position.set(this.x, this.y + 14, this.z);
        keepRoof.userData = { type: 'roof', health: 10 };
        this.group.add(keepRoof);
        this.parts.push(keepRoof);
        
        const leftRoof = new THREE.Mesh(roofGeometry, material);
        leftRoof.position.set(this.x - 8, this.y + 10, this.z);
        leftRoof.userData = { type: 'roof', health: 10 };
        this.group.add(leftRoof);
        this.parts.push(leftRoof);
        
        const rightRoof = new THREE.Mesh(roofGeometry, material);
        rightRoof.position.set(this.x + 8, this.y + 10, this.z);
        rightRoof.userData = { type: 'roof', health: 10 };
        this.group.add(rightRoof);
        this.parts.push(rightRoof);
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Remove parts based on damage - weakest parts first
        while (amount > 0 && this.parts.length > 0) {
            // Find weakest part
            let weakestPart = null;
            let weakestHealth = Infinity;
            
            this.parts.forEach(part => {
                if (part.userData.health < weakestHealth) {
                    weakestHealth = part.userData.health;
                    weakestPart = part;
                }
            });
            
            if (weakestPart && amount >= weakestHealth) {
                amount -= weakestHealth;
                this.removePart(weakestPart);
            } else if (weakestPart) {
                weakestPart.userData.health -= amount;
                amount = 0;
            } else {
                break;
            }
        }
    }
    
    removePart(part) {
        const index = this.parts.indexOf(part);
        if (index > -1) {
            this.parts.splice(index, 1);
            this.group.remove(part);
        }
    }
    
    reset() {
        this.health = this.maxHealth;
        this.parts = [];
        this.group.clear();
        this.createCastle();
    }
}

class Cannon {
    constructor(x, y, z, index) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.index = index;
        
        this.group = new THREE.Group();
        this.createCannon();
    }
    
    createCannon() {
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Cannon base
        const baseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 8);
        const base = new THREE.Mesh(baseGeometry, material);
        base.position.set(this.x, this.y, this.z);
        this.group.add(base);
        
        // Cannon barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
        const barrel = new THREE.Mesh(barrelGeometry, material);
        barrel.position.set(this.x, this.y + 1, this.z);
        barrel.rotation.z = Math.PI / 4;
        this.group.add(barrel);
    }
}

class Projectile {
    constructor(x, y, z, vx, vy, vz, weapon) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(vx, vy, vz);
        this.weapon = weapon;
        this.gravity = -9.8;
        this.age = 0;
        
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
    }
    
    update(windStrength, windDirection) {
        this.age++;
        
        // Apply gravity
        this.velocity.y += this.gravity * 0.05;
        
        // Apply wind
        this.velocity.x += windStrength * windDirection * 0.02;
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(0.05));
        this.mesh.position.copy(this.position);
        
        // Check ground collision or timeout
        if (this.position.y <= 1 || this.age > 1000) {
            return { hit: true, x: this.position.x, y: Math.max(0, this.position.y), z: this.position.z };
        }
        
        return { hit: false };
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new BallerBurg();
});
