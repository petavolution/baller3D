/**
 * Game Engine - Core Engine Class
 * Provides Three.js scene setup, rendering loop, and basic infrastructure
 * Games extend this class with their specific logic
 */

class Engine {
    /**
     * Create engine instance
     * @param {Object} config - Game configuration (use createGameConfig)
     * @param {HTMLElement} container - DOM element for canvas (optional)
     */
    constructor(config, container = null) {
        this.config = config || EngineConfig;
        this.container = container || document.body;

        // Core Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Timing
        this.clock = null;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.running = false;

        // Camera tracking
        this._cameraMode = 'default';
        this._cameraTarget = null;
        this._cameraLookAt = null;
        this._cameraDefaultPos = null;
        this._cameraDefaultLookAt = null;

        // Bound methods for event listeners
        this._boundAnimate = this._animate.bind(this);
        this._boundResize = this._onResize.bind(this);

        Debug.info('Engine created');
    }

    /**
     * Initialize the engine (call before start)
     */
    init() {
        this._setupScene();
        this._setupCamera();
        this._setupRenderer();
        this._setupLighting();
        this._setupEventListeners();

        // Initialize camera vectors
        const camConfig = this.config.CAMERA;
        this._cameraTarget = new THREE.Vector3(
            camConfig.DEFAULT_POSITION.x,
            camConfig.DEFAULT_POSITION.y,
            camConfig.DEFAULT_POSITION.z
        );
        this._cameraLookAt = new THREE.Vector3(
            camConfig.LOOK_AT.x,
            camConfig.LOOK_AT.y,
            camConfig.LOOK_AT.z
        );
        this._cameraDefaultPos = this._cameraTarget.clone();
        this._cameraDefaultLookAt = this._cameraLookAt.clone();

        Debug.info('Engine initialized', {
            renderer: this.renderer.info.render,
            pixelRatio: this.renderer.getPixelRatio()
        });

        return this;
    }

    /**
     * Setup Three.js scene
     */
    _setupScene() {
        this.scene = new THREE.Scene();

        // Background color
        if (this.config.COLORS && this.config.COLORS.SKY) {
            this.scene.background = new THREE.Color(this.config.COLORS.SKY);
        }

        // Fog for depth
        if (this.config.COLORS && this.config.COLORS.FOG) {
            this.scene.fog = new THREE.Fog(
                this.config.COLORS.FOG,
                50,
                this.config.CAMERA.FAR * 0.8
            );
        }
    }

    /**
     * Setup camera
     */
    _setupCamera() {
        const camConfig = this.config.CAMERA;
        const aspect = window.innerWidth / window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            camConfig.FOV,
            aspect,
            camConfig.NEAR,
            camConfig.FAR
        );

        this.camera.position.set(
            camConfig.DEFAULT_POSITION.x,
            camConfig.DEFAULT_POSITION.y,
            camConfig.DEFAULT_POSITION.z
        );

        this.camera.lookAt(
            camConfig.LOOK_AT.x,
            camConfig.LOOK_AT.y,
            camConfig.LOOK_AT.z
        );
    }

    /**
     * Setup WebGL renderer
     */
    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Setup basic lighting (games can override or add more)
     */
    _setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Main directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(50, 80, 30);
        sun.castShadow = true;

        // Shadow settings
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 200;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;

        this.scene.add(sun);

        // Fill light
        const fill = new THREE.DirectionalLight(0x9999ff, 0.2);
        fill.position.set(-30, 20, -30);
        this.scene.add(fill);
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        window.addEventListener('resize', this._boundResize);
    }

    /**
     * Handle window resize
     */
    _onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.running) return;

        this.running = true;
        this.clock = new THREE.Clock();
        this.lastTime = 0;

        Debug.info('Engine started');
        this._animate();
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
        Debug.info('Engine stopped');
    }

    /**
     * Main animation loop
     */
    _animate() {
        if (!this.running) return;

        requestAnimationFrame(this._boundAnimate);

        // Calculate delta time
        const currentTime = this.clock.getElapsedTime();
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time (prevents huge jumps after tab switch)
        this.deltaTime = Math.min(this.deltaTime, 0.1);

        // Update game logic (override in subclass)
        if (this.deltaTime > 0) {
            this.update(this.deltaTime);
        }

        // Update camera
        this._updateCamera(this.deltaTime);

        // Always render
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update camera position and look-at (smooth tracking)
     */
    _updateCamera(deltaTime) {
        if (!this._cameraTarget || !this._cameraLookAt) return;

        const lerpSpeed = this.config.CAMERA.TRACK_LERP_SPEED * deltaTime;

        // Smooth interpolation to target
        this.camera.position.lerp(this._cameraTarget, lerpSpeed);

        // Update look-at smoothly
        const currentLookAt = new THREE.Vector3();
        this.camera.getWorldDirection(currentLookAt);
        currentLookAt.multiplyScalar(100).add(this.camera.position);
        currentLookAt.lerp(this._cameraLookAt, lerpSpeed);
        this.camera.lookAt(this._cameraLookAt);
    }

    /**
     * Set camera to track a position
     * @param {THREE.Vector3} targetPos - Position to move camera toward
     * @param {THREE.Vector3} lookAtPos - Position to look at
     */
    setCameraTarget(targetPos, lookAtPos) {
        this._cameraMode = 'tracking';
        this._cameraTarget.copy(targetPos);
        this._cameraLookAt.copy(lookAtPos);
    }

    /**
     * Return camera to default position
     */
    resetCamera() {
        this._cameraMode = 'default';
        this._cameraTarget.copy(this._cameraDefaultPos);
        this._cameraLookAt.copy(this._cameraDefaultLookAt);
    }

    /**
     * Update game logic (override in game class)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Override in subclass
    }

    /**
     * Clean up all resources
     */
    dispose() {
        this.stop();

        window.removeEventListener('resize', this._boundResize);

        // Dispose scene contents
        if (this.scene) {
            this.scene.traverse(child => {
                Utils.disposeMesh(child);
            });
            this.scene.clear();
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        Debug.info('Engine disposed');
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.Engine = Engine;
}
