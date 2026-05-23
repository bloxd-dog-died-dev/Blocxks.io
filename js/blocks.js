/**
 * Block definitions, types, and texture generation
 */

const BLOCK_TYPE = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    WOOD: 6,
    LEAVES: 7,
    PLANKS: 8,
    BRICK: 9,
    GLASS: 10,
    SNOW: 11,
    GRAVEL: 12,
    BEDROCK: 13,
    COAL_ORE: 14,
    IRON_ORE: 15,
    GOLD_ORE: 16,
    DIAMOND_ORE: 17,
    OBSIDIAN: 18,
    TNT: 19,
    CRAFTING_TABLE: 20,
    BOOKSHELF: 21,
    MOSSY_STONE: 22,
    COBBLESTONE: 23,
    SPONGE: 24,
};

const BLOCK_DATA = {
    [BLOCK_TYPE.AIR]:           { name: 'Air',            solid: false, transparent: true,  liquid: false },
    [BLOCK_TYPE.GRASS]:         { name: 'Grass',          solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.DIRT]:          { name: 'Dirt',           solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.STONE]:         { name: 'Stone',          solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.SAND]:          { name: 'Sand',           solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.WATER]:         { name: 'Water',          solid: false, transparent: true,  liquid: true  },
    [BLOCK_TYPE.WOOD]:          { name: 'Wood Log',       solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.LEAVES]:        { name: 'Leaves',         solid: true,  transparent: true,  liquid: false },
    [BLOCK_TYPE.PLANKS]:        { name: 'Wood Planks',    solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.BRICK]:         { name: 'Brick',          solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.GLASS]:         { name: 'Glass',          solid: true,  transparent: true,  liquid: false },
    [BLOCK_TYPE.SNOW]:          { name: 'Snow',           solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.GRAVEL]:        { name: 'Gravel',         solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.BEDROCK]:       { name: 'Bedrock',        solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.COAL_ORE]:      { name: 'Coal Ore',       solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.IRON_ORE]:      { name: 'Iron Ore',       solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.GOLD_ORE]:      { name: 'Gold Ore',       solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.DIAMOND_ORE]:   { name: 'Diamond Ore',   solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.OBSIDIAN]:      { name: 'Obsidian',       solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.TNT]:           { name: 'TNT',            solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.CRAFTING_TABLE]:{ name: 'Crafting Table', solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.BOOKSHELF]:     { name: 'Bookshelf',      solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.MOSSY_STONE]:   { name: 'Mossy Stone',    solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.COBBLESTONE]:   { name: 'Cobblestone',    solid: true,  transparent: false, liquid: false },
    [BLOCK_TYPE.SPONGE]:        { name: 'Sponge',         solid: true,  transparent: false, liquid: false },
};

// Hotbar block order for the player
const HOTBAR_BLOCKS = [
    BLOCK_TYPE.GRASS,
    BLOCK_TYPE.DIRT,
    BLOCK_TYPE.STONE,
    BLOCK_TYPE.WOOD,
    BLOCK_TYPE.PLANKS,
    BLOCK_TYPE.LEAVES,
    BLOCK_TYPE.SAND,
    BLOCK_TYPE.BRICK,
    BLOCK_TYPE.GLASS,
];

/**
 * Generates canvas-based pixel textures for each block type
 */
class TextureFactory {
    constructor() {
        this.size = 32;
        this.textures = {};
        this._generateAll();
    }

    _canvas() {
        const c = document.createElement('canvas');
        c.width = this.size;
        c.height = this.size;
        return c;
    }

    _noise(x, y, scale = 4) {
        return ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1 + 1) / 2 * scale;
    }

    _fillRect(ctx, color, x, y, w, h) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    _generatePixel(ctx, baseR, baseG, baseB, variance = 20) {
        const sz = this.size;
        const imgData = ctx.createImageData(sz, sz);
        for (let py = 0; py < sz; py++) {
            for (let px = 0; px < sz; px++) {
                const v = (Math.random() - 0.5) * variance;
                const i = (py * sz + px) * 4;
                imgData.data[i]     = Math.min(255, Math.max(0, baseR + v));
                imgData.data[i + 1] = Math.min(255, Math.max(0, baseG + v));
                imgData.data[i + 2] = Math.min(255, Math.max(0, baseB + v));
                imgData.data[i + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    _makeTexture(drawFn) {
        const c = this._canvas();
        const ctx = c.getContext('2d');
        drawFn(ctx, c);
        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    _grassTop(ctx) {
        this._generatePixel(ctx, 86, 153, 47, 18);
        // Some darker patches
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            ctx.fillStyle = 'rgba(60,120,30,0.4)';
            ctx.fillRect(x, y, 2, 2);
        }
    }

    _grassSide(ctx) {
        // Bottom part - dirt
        this._generatePixel(ctx, 134, 96, 67, 15);
        // Top strip - green
        const stripH = 6;
        const imgData = ctx.getImageData(0, 0, this.size, this.size);
        for (let py = 0; py < stripH; py++) {
            for (let px = 0; px < this.size; px++) {
                const v = (Math.random() - 0.5) * 18;
                const i = (py * this.size + px) * 4;
                imgData.data[i]     = Math.min(255, Math.max(0, 86 + v));
                imgData.data[i + 1] = Math.min(255, Math.max(0, 153 + v));
                imgData.data[i + 2] = Math.min(255, Math.max(0, 47 + v));
                imgData.data[i + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    _dirt(ctx)    { this._generatePixel(ctx, 134, 96, 67, 15); }
    _stone(ctx)   { this._generatePixel(ctx, 130, 130, 130, 20); }
    _sand(ctx)    { this._generatePixel(ctx, 219, 207, 136, 12); }

    _cobblestone(ctx) {
        this._generatePixel(ctx, 120, 120, 120, 12);
        const ctx2 = ctx;
        ctx2.strokeStyle = 'rgba(60,60,60,0.6)';
        ctx2.lineWidth = 1;
        // Grid pattern
        for (let y = 0; y < this.size; y += 8) {
            for (let x = 0; x < this.size; x += 8) {
                ctx2.strokeRect(x + 1, y + 1, 6, 6);
            }
        }
    }

    _wood(ctx) {
        // Rings pattern for log top/side
        this._generatePixel(ctx, 100, 75, 35, 10);
        // Vertical lines for side
        ctx.fillStyle = 'rgba(80,55,20,0.3)';
        for (let x = 0; x < this.size; x += 4) {
            ctx.fillRect(x, 0, 2, this.size);
        }
    }

    _leaves(ctx) {
        this._generatePixel(ctx, 50, 120, 30, 25);
        // Occasional holes
        for (let i = 0; i < 12; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            ctx.fillStyle = 'rgba(30,80,15,0.5)';
            ctx.fillRect(x, y, 3, 3);
        }
    }

    _planks(ctx) {
        this._generatePixel(ctx, 162, 130, 78, 12);
        ctx.fillStyle = 'rgba(120,90,40,0.4)';
        for (let y = 0; y < this.size; y += 8) {
            ctx.fillRect(0, y, this.size, 1);
        }
        for (let x = 0; x < this.size; x += 16) {
            ctx.fillRect(x, 0, 1, this.size);
        }
    }

    _brick(ctx) {
        this._generatePixel(ctx, 180, 80, 60, 10);
        ctx.fillStyle = 'rgba(100,40,30,0.6)';
        const bh = 6, bw = 14;
        for (let row = 0; row * bh < this.size; row++) {
            const offset = (row % 2) * 7;
            for (let col = -1; col * bw < this.size; col++) {
                const x = col * bw + offset;
                ctx.fillRect(x, row * bh, 1, bh);
            }
            ctx.fillRect(0, row * bh, this.size, 1);
        }
    }

    _glass(ctx) {
        const imgData = ctx.createImageData(this.size, this.size);
        for (let py = 0; py < this.size; py++) {
            for (let px = 0; px < this.size; px++) {
                const i = (py * this.size + px) * 4;
                imgData.data[i]     = 180;
                imgData.data[i + 1] = 220;
                imgData.data[i + 2] = 240;
                imgData.data[i + 3] = 120;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        // Border
        ctx.strokeStyle = 'rgba(100,160,200,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.size - 2, this.size - 2);
        // Cross pane
        ctx.strokeStyle = 'rgba(150,200,230,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.size / 2, 0); ctx.lineTo(this.size / 2, this.size);
        ctx.moveTo(0, this.size / 2); ctx.lineTo(this.size, this.size / 2);
        ctx.stroke();
    }

    _water(ctx) {
        const imgData = ctx.createImageData(this.size, this.size);
        for (let py = 0; py < this.size; py++) {
            for (let px = 0; px < this.size; px++) {
                const wave = Math.sin((px + py) * 0.4) * 15;
                const i = (py * this.size + px) * 4;
                imgData.data[i]     = 20;
                imgData.data[i + 1] = 90 + wave;
                imgData.data[i + 2] = 200 + wave * 0.5;
                imgData.data[i + 3] = 180;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    _snow(ctx) { this._generatePixel(ctx, 240, 245, 250, 8); }

    _gravel(ctx) {
        this._generatePixel(ctx, 110, 105, 100, 25);
        // Random stones
        for (let i = 0; i < 16; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            ctx.fillStyle = `rgba(${80 + Math.random() * 40},${80 + Math.random() * 40},${80 + Math.random() * 40},0.6)`;
            ctx.fillRect(x, y, 3, 2);
        }
    }

    _bedrock(ctx) {
        this._generatePixel(ctx, 40, 40, 40, 10);
        for (let i = 0; i < 20; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            ctx.fillStyle = 'rgba(20,20,20,0.7)';
            ctx.fillRect(x, y, 2, 2);
        }
    }

    _coalOre(ctx) {
        this._stone(ctx);
        // Coal spots
        for (let i = 0; i < 6; i++) {
            const x = Math.floor(Math.random() * (this.size - 4));
            const y = Math.floor(Math.random() * (this.size - 4));
            ctx.fillStyle = 'rgba(20,20,20,0.9)';
            ctx.fillRect(x, y, 4, 4);
        }
    }

    _ironOre(ctx) {
        this._stone(ctx);
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * (this.size - 4));
            const y = Math.floor(Math.random() * (this.size - 4));
            ctx.fillStyle = 'rgba(200,150,120,0.9)';
            ctx.fillRect(x, y, 4, 4);
        }
    }

    _goldOre(ctx) {
        this._stone(ctx);
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * (this.size - 4));
            const y = Math.floor(Math.random() * (this.size - 4));
            ctx.fillStyle = 'rgba(255,210,0,0.95)';
            ctx.fillRect(x, y, 4, 4);
        }
    }

    _diamondOre(ctx) {
        this._stone(ctx);
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * (this.size - 4));
            const y = Math.floor(Math.random() * (this.size - 4));
            ctx.fillStyle = 'rgba(80,240,240,0.95)';
            ctx.fillRect(x, y, 4, 4);
        }
    }

    _obsidian(ctx) {
        this._generatePixel(ctx, 15, 10, 25, 8);
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            ctx.fillStyle = 'rgba(80,30,120,0.4)';
            ctx.fillRect(x, y, 3, 3);
        }
    }

    _tnt(ctx) {
        // Red body
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(0, 0, this.size, this.size);
        // White TNT label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${this.size / 3}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TNT', this.size / 2, this.size / 2);
        // Black border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.size - 2, this.size - 2);
    }

    _craftingTable(ctx) {
        this._planks(ctx);
        // Cross marks
        ctx.fillStyle = 'rgba(60,40,20,0.7)';
        ctx.fillRect(this.size / 4, this.size / 4, this.size / 2, 2);
        ctx.fillRect(this.size / 4, this.size * 3 / 4, this.size / 2, 2);
        ctx.fillRect(this.size / 4, this.size / 4, 2, this.size / 2);
        ctx.fillRect(this.size * 3 / 4, this.size / 4, 2, this.size / 2);
    }

    _bookshelf(ctx) {
        this._planks(ctx);
        // Books
        const bookColors = ['#cc4444', '#4444cc', '#44cc44', '#cccc44', '#cc44cc'];
        for (let row = 0; row < 3; row++) {
            for (let b = 0; b < 5; b++) {
                ctx.fillStyle = bookColors[(row * 5 + b) % bookColors.length];
                ctx.fillRect(b * 6 + 1, row * 10 + 2, 5, 7);
            }
        }
    }

    _mossyStone(ctx) {
        this._stone(ctx);
        this._generatePixel(ctx, 100, 140, 80, 15);
    }

    _sponge(ctx) {
        this._generatePixel(ctx, 200, 190, 60, 15);
        // Holes
        for (let i = 0; i < 12; i++) {
            const x = Math.floor(Math.random() * (this.size - 3));
            const y = Math.floor(Math.random() * (this.size - 3));
            ctx.fillStyle = 'rgba(150,140,30,0.8)';
            ctx.fillRect(x, y, 3, 3);
        }
    }

    _generateAll() {
        // Grass: different face textures
        this.textures[BLOCK_TYPE.GRASS] = {
            top:    this._makeTexture(ctx => this._grassTop(ctx)),
            side:   this._makeTexture(ctx => this._grassSide(ctx)),
            bottom: this._makeTexture(ctx => this._dirt(ctx)),
        };

        const simple = {
            [BLOCK_TYPE.DIRT]:          ctx => this._dirt(ctx),
            [BLOCK_TYPE.STONE]:         ctx => this._stone(ctx),
            [BLOCK_TYPE.SAND]:          ctx => this._sand(ctx),
            [BLOCK_TYPE.WATER]:         ctx => this._water(ctx),
            [BLOCK_TYPE.WOOD]:          ctx => this._wood(ctx),
            [BLOCK_TYPE.LEAVES]:        ctx => this._leaves(ctx),
            [BLOCK_TYPE.PLANKS]:        ctx => this._planks(ctx),
            [BLOCK_TYPE.BRICK]:         ctx => this._brick(ctx),
            [BLOCK_TYPE.GLASS]:         ctx => this._glass(ctx),
            [BLOCK_TYPE.SNOW]:          ctx => this._snow(ctx),
            [BLOCK_TYPE.GRAVEL]:        ctx => this._gravel(ctx),
            [BLOCK_TYPE.BEDROCK]:       ctx => this._bedrock(ctx),
            [BLOCK_TYPE.COAL_ORE]:      ctx => this._coalOre(ctx),
            [BLOCK_TYPE.IRON_ORE]:      ctx => this._ironOre(ctx),
            [BLOCK_TYPE.GOLD_ORE]:      ctx => this._goldOre(ctx),
            [BLOCK_TYPE.DIAMOND_ORE]:   ctx => this._diamondOre(ctx),
            [BLOCK_TYPE.OBSIDIAN]:      ctx => this._obsidian(ctx),
            [BLOCK_TYPE.TNT]:           ctx => this._tnt(ctx),
            [BLOCK_TYPE.CRAFTING_TABLE]:ctx => this._craftingTable(ctx),
            [BLOCK_TYPE.BOOKSHELF]:     ctx => this._bookshelf(ctx),
            [BLOCK_TYPE.MOSSY_STONE]:   ctx => this._mossyStone(ctx),
            [BLOCK_TYPE.COBBLESTONE]:   ctx => this._cobblestone(ctx),
            [BLOCK_TYPE.SPONGE]:        ctx => this._sponge(ctx),
        };

        for (const [type, fn] of Object.entries(simple)) {
            const tex = this._makeTexture(fn);
            this.textures[+type] = { top: tex, side: tex, bottom: tex };
        }
    }

    getMaterials(blockType) {
        const t = this.textures[blockType];
        if (!t) return null;
        const makeM = (tex, transparent) => new THREE.MeshLambertMaterial({
            map: tex,
            transparent,
            opacity: transparent ? 0.75 : 1,
            side: transparent ? THREE.DoubleSide : THREE.FrontSide,
        });
        const data = BLOCK_DATA[blockType];
        const trans = data ? data.transparent : false;
        return [
            makeM(t.side, trans),   // right (+X)
            makeM(t.side, trans),   // left  (-X)
            makeM(t.top,  trans),   // top   (+Y)
            makeM(t.bottom, trans), // bottom(-Y)
            makeM(t.side, trans),   // front (+Z)
            makeM(t.side, trans),   // back  (-Z)
        ];
    }

    // Returns a single texture for UI icons
    getIconTexture(blockType) {
        const t = this.textures[blockType];
        return t ? t.top : null;
    }
}
