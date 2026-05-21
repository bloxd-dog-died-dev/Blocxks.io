/**
 * Player controller: physics, movement, camera, block interaction
 */

const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.3;
const GRAVITY = -28;
const JUMP_SPEED = 10;
const WALK_SPEED = 5.5;
const SPRINT_SPEED = 9.0;
const FLY_SPEED = 12;
const FLY_ACCEL = 20;
const MAX_REACH = 6;

class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;

        this.pos = new THREE.Vector3(8, SEA_LEVEL + 12, 8);
        this.vel = new THREE.Vector3(0, 0, 0);

        this.pitch = 0;   // radians up/down
        this.yaw = 0;     // radians left/right

        this.onGround = false;
        this.flying = false;
        this.inWater = false;
        this.sprinting = false;

        this.health = 20;
        this.maxHealth = 20;
        this.hunger = 20;
        this.maxHunger = 20;
        this.oxygen = 10;
        this.maxOxygen = 10;
        this._oxygenTimer = 0;

        // Input
        this.keys = {};
        this.mouseDx = 0;
        this.mouseDy = 0;
        this.mouseSensitivity = 0.002;

        // Block selection
        this.hotbarIndex = 0;
        this.hotbar = [...HOTBAR_BLOCKS];

        // Highlight cube
        this.highlightMesh = this._createHighlight();

        // Place block indicator
        this.placeMesh = this._createPlaceIndicator();

        this._setupInput();
    }

    _createHighlight() {
        const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        this.world.scene.add(mesh);
        return mesh;
    }

    _createPlaceIndicator() {
        const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x88ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.4,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        this.world.scene.add(mesh);
        return mesh;
    }

    _setupInput() {
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.onGround && !this.flying) {
                this.vel.y = JUMP_SPEED;
                this.onGround = false;
            }
            if (e.code === 'Space' && this.flying) {
                this.vel.y = FLY_SPEED;
            }
            if (e.code === 'ShiftLeft' && this.flying) {
                this.vel.y = -FLY_SPEED;
            }
            // Toggle fly with double-jump or F key
            if (e.code === 'KeyF') {
                this.flying = !this.flying;
                this.vel.y = 0;
            }
            // Scroll / number keys for hotbar
            if (e.code.startsWith('Digit')) {
                const n = parseInt(e.code.replace('Digit', '')) - 1;
                if (n >= 0 && n < this.hotbar.length) {
                    this.hotbarIndex = n;
                    if (window.ui) window.ui.updateHotbar();
                }
            }
        });

        document.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });

        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement) {
                this.mouseDx += e.movementX;
                this.mouseDy += e.movementY;
            }
        });

        document.addEventListener('wheel', e => {
            if (document.pointerLockElement) {
                const dir = e.deltaY > 0 ? 1 : -1;
                this.hotbarIndex = ((this.hotbarIndex + dir) + this.hotbar.length) % this.hotbar.length;
                if (window.ui) window.ui.updateHotbar();
            }
        });

        document.addEventListener('mousedown', e => {
            if (!document.pointerLockElement) return;
            if (e.button === 0) this._breakBlock();
            if (e.button === 2) this._placeBlock();
        });

        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    _getDirection() {
        const dir = new THREE.Vector3();
        dir.set(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(-this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        ).negate();
        // Actually Three.js camera looks -Z by default
        // Use camera getWorldDirection
        this.camera.getWorldDirection(dir);
        return dir;
    }

    _getHitResult() {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return this.world.raycast(this.camera.position, dir, MAX_REACH);
    }

    _breakBlock() {
        const hit = this._getHitResult();
        if (!hit) return;
        this.world.setBlock(hit.pos.x, hit.pos.y, hit.pos.z, BLOCK_TYPE.AIR);
    }

    _placeBlock() {
        const hit = this._getHitResult();
        if (!hit || !hit.face) return;
        const placePos = hit.pos.clone().add(hit.face);
        // Don't place inside player
        const px = Math.floor(this.pos.x);
        const py = Math.floor(this.pos.y);
        const pz = Math.floor(this.pos.z);
        if (placePos.x === px && placePos.z === pz && (placePos.y === py || placePos.y === py + 1)) return;

        const blockType = this.hotbar[this.hotbarIndex];
        if (blockType !== BLOCK_TYPE.AIR) {
            this.world.setBlock(placePos.x, placePos.y, placePos.z, blockType);
        }
    }

    update(dt) {
        // Mouse look
        this.yaw   -= this.mouseDx * this.mouseSensitivity;
        this.pitch -= this.mouseDy * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        this.mouseDx = 0;
        this.mouseDy = 0;

        // Camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        // Movement
        const speed = this.flying ? FLY_SPEED : (this.sprinting ? SPRINT_SPEED : WALK_SPEED);
        const moveVec = new THREE.Vector3();

        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right   = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        // Sprint only when on ground and not flying (Shift is used for fly-descent in fly mode)
        this.sprinting = this.keys['ShiftLeft'] && !this.flying && this.onGround;

        if (this.keys['KeyW']) moveVec.addScaledVector(forward, speed);
        if (this.keys['KeyS']) moveVec.addScaledVector(forward, -speed);
        if (this.keys['KeyA']) moveVec.addScaledVector(right, -speed);
        if (this.keys['KeyD']) moveVec.addScaledVector(right, speed);

        if (this.inWater && !this.flying) {
            // Swimming
            if (this.keys['Space']) this.vel.y = 3.5;
            else if (!this.keys['ShiftLeft']) this.vel.y += (-2 - this.vel.y) * 0.1;
        }

        if (this.flying) {
            if (this.keys['Space'])     this.vel.y = FLY_SPEED;
            else if (this.keys['ShiftLeft']) this.vel.y = -FLY_SPEED;
            else this.vel.y *= 0.8;
        }

        // Apply gravity
        if (!this.flying) {
            this.vel.y += GRAVITY * dt;
            if (this.inWater) this.vel.y = Math.max(this.vel.y, -3);
        }

        // Horizontal movement
        this.vel.x = moveVec.x;
        this.vel.z = moveVec.z;

        if (this.inWater && !this.flying) {
            this.vel.x *= 0.6;
            this.vel.z *= 0.6;
        }

        // Collision and move
        this._moveAndCollide(dt);

        // Check water
        const headY = Math.floor(this.pos.y + PLAYER_HEIGHT - 0.1);
        const feetY = Math.floor(this.pos.y);
        const bx = Math.floor(this.pos.x);
        const bz = Math.floor(this.pos.z);
        this.inWater = this.world.getBlock(bx, feetY, bz) === BLOCK_TYPE.WATER;

        // Update camera position (eye at shoulder height)
        this.camera.position.set(
            this.pos.x,
            this.pos.y + PLAYER_HEIGHT - 0.15,
            this.pos.z
        );

        // Update highlight
        this._updateHighlight();
    }

    _moveAndCollide(dt) {
        // X axis
        this.pos.x += this.vel.x * dt;
        if (this._collides()) {
            this.pos.x -= this.vel.x * dt;
            this.vel.x = 0;
        }

        // Y axis
        this.pos.y += this.vel.y * dt;
        if (this._collides()) {
            if (this.vel.y < 0) {
                this.onGround = true;
                // Fall damage
                if (this.vel.y < -15) {
                    const dmg = Math.floor((-this.vel.y - 15) * 0.5);
                    this.health = Math.max(0, this.health - dmg);
                    if (window.ui) window.ui.updateHealth();
                }
            }
            this.pos.y -= this.vel.y * dt;
            this.vel.y = 0;
        } else {
            this.onGround = false;
        }

        // Z axis
        this.pos.z += this.vel.z * dt;
        if (this._collides()) {
            this.pos.z -= this.vel.z * dt;
            this.vel.z = 0;
        }
    }

    _collides() {
        const minX = this.pos.x - PLAYER_RADIUS;
        const maxX = this.pos.x + PLAYER_RADIUS;
        const minY = this.pos.y;
        const maxY = this.pos.y + PLAYER_HEIGHT;
        const minZ = this.pos.z - PLAYER_RADIUS;
        const maxZ = this.pos.z + PLAYER_RADIUS;

        for (let bx = Math.floor(minX); bx <= Math.floor(maxX); bx++) {
            for (let by = Math.floor(minY); by <= Math.floor(maxY); by++) {
                for (let bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
                    const b = this.world.getBlock(bx, by, bz);
                    if (b !== BLOCK_TYPE.AIR && b !== BLOCK_TYPE.WATER && BLOCK_DATA[b]?.solid) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    _updateHighlight() {
        const hit = this._getHitResult();
        if (hit) {
            this.highlightMesh.visible = true;
            this.highlightMesh.position.set(
                hit.pos.x + 0.5,
                hit.pos.y + 0.5,
                hit.pos.z + 0.5
            );

            if (hit.face) {
                const placePos = hit.pos.clone().add(hit.face);
                this.placeMesh.visible = true;
                this.placeMesh.position.set(
                    placePos.x + 0.5,
                    placePos.y + 0.5,
                    placePos.z + 0.5
                );
            } else {
                this.placeMesh.visible = false;
            }
        } else {
            this.highlightMesh.visible = false;
            this.placeMesh.visible = false;
        }
    }

    // Respawn player above terrain
    respawn() {
        this.pos.set(8, SEA_LEVEL + 20, 8);
        this.vel.set(0, 0, 0);
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        if (window.ui) window.ui.updateHealth();
    }
}
