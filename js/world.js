/**
 * Chunk-based voxel world
 */

const CHUNK_SIZE = 16;    // horizontal size of a chunk
const CHUNK_HEIGHT = 64;  // vertical height of a chunk
const RENDER_DISTANCE = 4; // chunks in each direction
const SEA_LEVEL = 28;

class Chunk {
    constructor(cx, cz, world) {
        this.cx = cx;
        this.cz = cz;
        this.world = world;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
        this.dirty = true;
    }

    getIndex(lx, ly, lz) {
        return (ly * CHUNK_SIZE + lz) * CHUNK_SIZE + lx;
    }

    getBlock(lx, ly, lz) {
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            // Query neighbour
            const wx = this.cx * CHUNK_SIZE + lx;
            const wz = this.cz * CHUNK_SIZE + lz;
            return this.world.getBlock(wx, ly, wz);
        }
        return this.blocks[this.getIndex(lx, ly, lz)];
    }

    setBlock(lx, ly, lz, type) {
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) return;
        this.blocks[this.getIndex(lx, ly, lz)] = type;
        this.dirty = true;
    }
}

class World {
    constructor(scene, textureFactory) {
        this.scene = scene;
        this.tf = textureFactory;
        this.chunks = new Map();
        this.noise = new SimplexNoise(Math.random());
        this.noise2 = new SimplexNoise(Math.random());
    }

    chunkKey(cx, cz) { return `${cx},${cz}`; }

    getOrCreateChunk(cx, cz) {
        const key = this.chunkKey(cx, cz);
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(cx, cz, this);
            this.chunks.set(key, chunk);
            this._generateChunk(chunk);
        }
        return this.chunks.get(key);
    }

    getBlock(wx, wy, wz) {
        if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK_TYPE.AIR;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const key = this.chunkKey(cx, cz);
        if (!this.chunks.has(key)) return BLOCK_TYPE.AIR;
        const chunk = this.chunks.get(key);
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunk.blocks[chunk.getIndex(lx, wy, lz)];
    }

    setBlock(wx, wy, wz, type) {
        if (wy < 0 || wy >= CHUNK_HEIGHT) return;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const chunk = this.getOrCreateChunk(cx, cz);
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        chunk.setBlock(lx, wy, lz, type);

        // Mark neighbouring chunks dirty if on border
        if (lx === 0)                this.markDirty(cx - 1, cz);
        if (lx === CHUNK_SIZE - 1)   this.markDirty(cx + 1, cz);
        if (lz === 0)                this.markDirty(cx, cz - 1);
        if (lz === CHUNK_SIZE - 1)   this.markDirty(cx, cz + 1);
    }

    markDirty(cx, cz) {
        const key = this.chunkKey(cx, cz);
        if (this.chunks.has(key)) this.chunks.get(key).dirty = true;
    }

    _generateChunk(chunk) {
        const { cx, cz } = chunk;
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const wx = cx * CHUNK_SIZE + lx;
                const wz = cz * CHUNK_SIZE + lz;
                this._generateColumn(chunk, lx, lz, wx, wz);
            }
        }
        // Trees
        this._generateTrees(chunk);
    }

    _generateColumn(chunk, lx, lz, wx, wz) {
        const scale = 0.008;
        const scale2 = 0.03;

        // Base height
        const baseH = this.noise.fbm(wx * scale, wz * scale, 6, 2.0, 0.5);
        const detail = this.noise2.fbm(wx * scale2, wz * scale2, 4, 2.0, 0.5);
        const heightF = (baseH * 0.7 + detail * 0.3) * 0.5 + 0.5; // 0..1
        const surfaceY = Math.floor(SEA_LEVEL + heightF * 22);

        // Biome (temp)
        const tempVal = this.noise.noise2D(wx * 0.003, wz * 0.003);
        const isSandy = surfaceY <= SEA_LEVEL + 2 || tempVal < -0.3;
        const isSnowy = tempVal > 0.55;

        // Bedrock
        chunk.setBlock(lx, 0, lz, BLOCK_TYPE.BEDROCK);

        for (let y = 1; y < CHUNK_HEIGHT; y++) {
            let blockType = BLOCK_TYPE.AIR;

            if (y < surfaceY - 4) {
                // Stone layer, with occasional ores
                const r = Math.random();
                if (r < 0.012)       blockType = BLOCK_TYPE.COAL_ORE;
                else if (r < 0.018)  blockType = BLOCK_TYPE.IRON_ORE;
                else if (y < 20 && r < 0.022) blockType = BLOCK_TYPE.GOLD_ORE;
                else if (y < 12 && r < 0.024) blockType = BLOCK_TYPE.DIAMOND_ORE;
                else                 blockType = BLOCK_TYPE.STONE;
            } else if (y < surfaceY - 1) {
                blockType = isSandy ? BLOCK_TYPE.SAND : BLOCK_TYPE.DIRT;
            } else if (y < surfaceY) {
                if (isSandy)       blockType = BLOCK_TYPE.SAND;
                else if (isSnowy)  blockType = BLOCK_TYPE.SNOW;
                else               blockType = BLOCK_TYPE.GRASS;
            } else if (y < SEA_LEVEL && y >= surfaceY) {
                blockType = BLOCK_TYPE.WATER;
            }

            if (blockType !== BLOCK_TYPE.AIR) {
                chunk.setBlock(lx, y, lz, blockType);
            }
        }
    }

    _generateTrees(chunk) {
        for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
            for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
                const wx = chunk.cx * CHUNK_SIZE + lx;
                const wz = chunk.cz * CHUNK_SIZE + lz;

                // Check if this spot should have a tree (sparse)
                const v = Math.abs(this.noise.noise2D(wx * 0.15, wz * 0.15));
                if (v > 0.85 && Math.random() < 0.25) {
                    // Find surface
                    for (let y = CHUNK_HEIGHT - 1; y > SEA_LEVEL; y--) {
                        if (chunk.blocks[chunk.getIndex(lx, y, lz)] === BLOCK_TYPE.GRASS) {
                            this._placeTree(chunk, lx, y + 1, lz);
                            break;
                        }
                    }
                }
            }
        }
    }

    _placeTree(chunk, lx, y, lz) {
        const height = 4 + Math.floor(Math.random() * 3);
        // Trunk
        for (let i = 0; i < height; i++) {
            if (y + i < CHUNK_HEIGHT) chunk.setBlock(lx, y + i, lz, BLOCK_TYPE.WOOD);
        }
        // Leaves
        const topY = y + height - 1;
        for (let dy = -2; dy <= 1; dy++) {
            const ly = topY + dy;
            if (ly < 0 || ly >= CHUNK_HEIGHT) continue;
            const r = dy < -1 ? 2 : (dy < 0 ? 3 : 1);
            for (let dlx = -r; dlx <= r; dlx++) {
                for (let dlz = -r; dlz <= r; dlz++) {
                    if (Math.abs(dlx) === r && Math.abs(dlz) === r) continue;
                    const nlx = lx + dlx;
                    const nlz = lz + dlz;
                    if (nlx < 0 || nlx >= CHUNK_SIZE || nlz < 0 || nlz >= CHUNK_SIZE) continue;
                    if (chunk.blocks[chunk.getIndex(nlx, ly, nlz)] === BLOCK_TYPE.AIR) {
                        chunk.setBlock(nlx, ly, nlz, BLOCK_TYPE.LEAVES);
                    }
                }
            }
        }
    }

    /**
     * Builds (or rebuilds) the mesh for a chunk.
     * Faces are batched per (blockType, faceSlot) where faceSlot is:
     *   0 = side (+X), 1 = side (-X), 2 = top (+Y), 3 = bottom (-Y), 4 = side (+Z), 5 = side (-Z)
     */
    buildChunkMesh(chunk) {
        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            chunk.mesh.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
            });
        }

        const group = new THREE.Group();
        group.position.set(
            chunk.cx * CHUNK_SIZE,
            0,
            chunk.cz * CHUNK_SIZE
        );

        // Key: `blockType-faceSlot` (0=side,2=top,3=bottom)
        // faceSlot 0 covers +X,-X,+Z,-Z (sides), 2=top, 3=bottom
        const facesMap = new Map();

        const dirs = [
            { dir: [1,0,0],  corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], normal: [1,0,0],  slot: 'side'   },
            { dir: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], normal: [-1,0,0], slot: 'side'   },
            { dir: [0,1,0],  corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], normal: [0,1,0],  slot: 'top'    },
            { dir: [0,-1,0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], normal: [0,-1,0], slot: 'bottom' },
            { dir: [0,0,1],  corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], normal: [0,0,1],  slot: 'side'   },
            { dir: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], normal: [0,0,-1], slot: 'side'   },
        ];

        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const blockType = chunk.blocks[chunk.getIndex(lx, ly, lz)];
                    if (blockType === BLOCK_TYPE.AIR || blockType === BLOCK_TYPE.WATER) continue;

                    const blockData = BLOCK_DATA[blockType];
                    if (!blockData) continue;

                    for (let d = 0; d < 6; d++) {
                        const { dir, corners, normal, slot } = dirs[d];
                        const nx = lx + dir[0];
                        const ny = ly + dir[1];
                        const nz = lz + dir[2];
                        const neighbour = chunk.getBlock(nx, ny, nz);
                        const nData = BLOCK_DATA[neighbour];

                        // Only render face if neighbour is transparent/air/water
                        if (neighbour !== BLOCK_TYPE.AIR && (!nData || !nData.transparent)) continue;

                        const key = `${blockType}-${slot}`;
                        if (!facesMap.has(key)) {
                            facesMap.set(key, { blockType, slot, positions: [], normals: [], uvs: [], indices: [] });
                        }
                        const faceData = facesMap.get(key);
                        const vi = faceData.positions.length / 3;

                        for (const [cx2, cy, cz2] of corners) {
                            faceData.positions.push(lx + cx2, ly + cy, lz + cz2);
                            faceData.normals.push(...normal);
                        }
                        faceData.uvs.push(0,0, 0,1, 1,1, 1,0);
                        faceData.indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
                    }
                }
            }
        }

        // Create meshes per (blockType, slot)
        for (const fData of facesMap.values()) {
            if (fData.positions.length === 0) continue;

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(fData.positions, 3));
            geo.setAttribute('normal',   new THREE.Float32BufferAttribute(fData.normals, 3));
            geo.setAttribute('uv',       new THREE.Float32BufferAttribute(fData.uvs, 2));
            geo.setIndex(fData.indices);

            const materials = this.tf.getMaterials(fData.blockType);
            let mat;
            if (materials) {
                if (fData.slot === 'top')    mat = materials[2];
                else if (fData.slot === 'bottom') mat = materials[3];
                else mat = materials[0]; // side
            } else {
                mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
        }

        // Water as separate transparent layer
        this._buildWaterMesh(chunk, group);

        this.scene.add(group);
        chunk.mesh = group;
        chunk.dirty = false;
    }

    _buildWaterMesh(chunk, group) {
        const positions = [], uvs = [], indices = [];
        const dirs = [
            { dir: [0,1,0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
        ];

        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    if (chunk.blocks[chunk.getIndex(lx, ly, lz)] !== BLOCK_TYPE.WATER) continue;
                    const above = chunk.getBlock(lx, ly + 1, lz);
                    if (above !== BLOCK_TYPE.AIR) continue;
                    const vi = positions.length / 3;
                    // Slightly lower water surface
                    for (const [cx2, cy, cz2] of dirs[0].corners) {
                        positions.push(lx + cx2, ly + cy - 0.1, lz + cz2);
                    }
                    uvs.push(0,0, 0,1, 1,1, 1,0);
                    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
                }
            }
        }

        if (positions.length === 0) return;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const waterMat = new THREE.MeshLambertMaterial({
            color: 0x1e78c8,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, waterMat);
        group.add(mesh);
    }

    updateChunksAround(playerX, playerZ) {
        const pcx = Math.floor(playerX / CHUNK_SIZE);
        const pcz = Math.floor(playerZ / CHUNK_SIZE);

        // Load needed chunks
        for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
            for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                const cx = pcx + dx;
                const cz = pcz + dz;
                this.getOrCreateChunk(cx, cz);
            }
        }

        // Rebuild dirty chunks
        for (const chunk of this.chunks.values()) {
            if (chunk.dirty) {
                const dx = chunk.cx - pcx;
                const dz = chunk.cz - pcz;
                if (Math.abs(dx) <= RENDER_DISTANCE + 1 && Math.abs(dz) <= RENDER_DISTANCE + 1) {
                    this.buildChunkMesh(chunk);
                }
            }
        }

        // Remove far chunks
        const toRemove = [];
        for (const [key, chunk] of this.chunks) {
            const dx = chunk.cx - pcx;
            const dz = chunk.cz - pcz;
            if (Math.abs(dx) > RENDER_DISTANCE + 2 || Math.abs(dz) > RENDER_DISTANCE + 2) {
                if (chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                    chunk.mesh.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose();
                    });
                    chunk.mesh = null;
                }
                toRemove.push(key);
            }
        }
        toRemove.forEach(k => this.chunks.delete(k));
    }

    /**
     * Raycast into the world to find the block the player is looking at.
     * Returns { pos, face } or null.
     */
    raycast(origin, direction, maxDist = 6) {
        let x = origin.x, y = origin.y, z = origin.z;
        const dx = direction.x, dy = direction.y, dz = direction.z;

        const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
        const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
        const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

        let ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);

        const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
        const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
        const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

        let tMaxX = stepX > 0 ? (Math.ceil(x) - x) * tDeltaX : stepX < 0 ? (x - Math.floor(x)) * tDeltaX : Infinity;
        let tMaxY = stepY > 0 ? (Math.ceil(y) - y) * tDeltaY : stepY < 0 ? (y - Math.floor(y)) * tDeltaY : Infinity;
        let tMaxZ = stepZ > 0 ? (Math.ceil(z) - z) * tDeltaZ : stepZ < 0 ? (z - Math.floor(z)) * tDeltaZ : Infinity;

        let face = null;
        let dist = 0;

        while (dist < maxDist) {
            const b = this.getBlock(ix, iy, iz);
            if (b !== BLOCK_TYPE.AIR && b !== BLOCK_TYPE.WATER && BLOCK_DATA[b]?.solid) {
                return {
                    pos: new THREE.Vector3(ix, iy, iz),
                    face,
                };
            }

            if (tMaxX < tMaxY && tMaxX < tMaxZ) {
                dist = tMaxX;
                ix += stepX;
                tMaxX += tDeltaX;
                face = new THREE.Vector3(-stepX, 0, 0);
            } else if (tMaxY < tMaxZ) {
                dist = tMaxY;
                iy += stepY;
                tMaxY += tDeltaY;
                face = new THREE.Vector3(0, -stepY, 0);
            } else {
                dist = tMaxZ;
                iz += stepZ;
                tMaxZ += tDeltaZ;
                face = new THREE.Vector3(0, 0, -stepZ);
            }
        }
        return null;
    }
}
