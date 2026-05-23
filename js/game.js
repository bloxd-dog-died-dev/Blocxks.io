/**
 * Main game loop and initialization
 */

let scene, renderer, camera;
let world, player;
let ui;
let textureFactory;

let lastTime = 0;
let paused = false;
let started = false;
let dead = false;

const CHUNK_REBUILD_LIMIT = 3; // chunks rebuilt per frame max

function init() {
    // ---- Renderer ----
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87ceeb); // sky blue

    // ---- Scene ----
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 60, 160);

    // ---- Camera ----
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    // ---- Lighting ----
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbe0, 0.9);
    sunLight.position.set(80, 200, 60);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left   = -80;
    sunLight.shadow.camera.right  =  80;
    sunLight.shadow.camera.top    =  80;
    sunLight.shadow.camera.bottom = -80;
    sunLight.shadow.camera.near   = 0.1;
    sunLight.shadow.camera.far    = 400;
    sunLight.shadow.mapSize.set(2048, 2048);
    scene.add(sunLight);

    // ---- Sky dome ----
    const skyGeo = new THREE.SphereGeometry(180, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // ---- Clouds ----
    _addClouds();

    // ---- Texture factory ----
    textureFactory = new TextureFactory();

    // ---- World ----
    world = new World(scene, textureFactory);

    // ---- Player ----
    player = new Player(camera, world);
    window.player = player; // global for keybindings

    // ---- UI ----
    ui = new UI(player, textureFactory);
    window.ui = ui;

    // ---- Pointer lock ----
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => {
        if (!started || paused) return;
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement && started && !dead) {
            togglePause(true);
        }
    });

    // ---- ESC key ----
    document.addEventListener('keydown', e => {
        if (e.code === 'Escape') {
            if (!started) return;
            if (dead) return;
            togglePause(!paused);
        }
        if (e.code === 'KeyT' && document.pointerLockElement) {
            // Open chat (stub)
            document.exitPointerLock();
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.style.display = 'block';
                chatInput.focus();
            }
        }
    });

    // ---- Chat submit ----
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.code === 'Enter') {
                const msg = chatInput.value.trim();
                if (msg) ui.addChatMessage(`You: ${msg}`, '#ffff88');
                chatInput.value = '';
                chatInput.style.display = 'none';
                document.getElementById('game-canvas').requestPointerLock();
            }
            if (e.code === 'Escape') {
                chatInput.value = '';
                chatInput.style.display = 'none';
                document.getElementById('game-canvas').requestPointerLock();
            }
        });
    }

    // ---- Start button ----
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', () => togglePause(false));
    document.getElementById('respawn-btn').addEventListener('click', respawnPlayer);
    document.getElementById('settings-btn').addEventListener('click', () => {
        // simple alert for now
        alert('Settings:\n\nW/A/S/D — Move\nSpace — Jump\nF — Toggle Fly\nScroll / 1-9 — Select block\nLeft click — Break block\nRight click — Place block\nShift — Sprint / Fly down\nESC — Pause\nT — Chat');
    });

    // ---- Resize ----
    window.addEventListener('resize', onResize);

    // ---- Preload chunks ----
    ui.addChatMessage('🌍 World generating…', '#aaffaa');
    world.updateChunksAround(player.pos.x, player.pos.z);

    // Show start screen
    ui.showStartScreen(true);

    // ---- Start loop ----
    requestAnimationFrame(gameLoop);
}

function _addClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
    for (let i = 0; i < 30; i++) {
        const w = 12 + Math.random() * 18;
        const d = 6 + Math.random() * 10;
        const cloudGeo = new THREE.BoxGeometry(w, 2, d);
        const cloud = new THREE.Mesh(cloudGeo, cloudMat);
        cloud.position.set(
            (Math.random() - 0.5) * 240,
            70 + Math.random() * 20,
            (Math.random() - 0.5) * 240
        );
        scene.add(cloud);
    }
}

function startGame() {
    started = true;
    ui.showStartScreen(false);
    ui.addChatMessage('Welcome to Blocxks.io! Press F to fly, T to chat.', '#aaddff');
    document.getElementById('game-canvas').requestPointerLock();
}

function respawnPlayer() {
    dead = false;
    player.respawn();
    ui.showDeathScreen(false);
    ui.updateHealth();
    document.getElementById('game-canvas').requestPointerLock();
}

function togglePause(doPause) {
    paused = doPause;
    ui.showPauseMenu(paused);
    if (!paused) {
        document.getElementById('game-canvas').requestPointerLock();
    } else {
        document.exitPointerLock();
    }
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let _coordUpdateTimer = 0;

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((time - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = time;

    if (!started || paused || dead) {
        renderer.render(scene, camera);
        return;
    }

    // ---- Update player ----
    player.update(dt);

    // ---- Check death ----
    if (player.health <= 0 && !dead) {
        dead = true;
        ui.showDeathScreen(true);
        document.exitPointerLock();
    }

    // ---- Void death ----
    if (player.pos.y < -10) {
        player.health = 0;
        ui.updateHealth();
    }

    // ---- Update chunks ----
    world.updateChunksAround(player.pos.x, player.pos.z);

    // ---- Coords HUD ----
    _coordUpdateTimer += dt;
    if (_coordUpdateTimer > 0.1) {
        ui.updateCoords();
        _coordUpdateTimer = 0;
    }

    // ---- Underwater fog ----
    const headY = Math.floor(player.pos.y + PLAYER_HEIGHT - 0.15);
    const bx = Math.floor(player.pos.x);
    const bz = Math.floor(player.pos.z);
    const headBlock = world.getBlock(bx, headY, bz);
    if (headBlock === BLOCK_TYPE.WATER) {
        scene.fog.color.set(0x1040a0);
        scene.fog.near = 2;
        scene.fog.far  = 18;
        renderer.setClearColor(0x1040a0);
    } else {
        scene.fog.color.set(0x87ceeb);
        scene.fog.near = 60;
        scene.fog.far  = 160;
        renderer.setClearColor(0x87ceeb);
    }

    renderer.render(scene, camera);
}

// Kick off when DOM + Three.js are ready
window.addEventListener('DOMContentLoaded', init);
