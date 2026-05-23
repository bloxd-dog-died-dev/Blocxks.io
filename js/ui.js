/**
 * UI Manager — HUD, hotbar, health, menus, chat overlay
 */

class UI {
    constructor(player, tf) {
        this.player = player;
        this.tf = tf;
        this._build();
        this.updateHotbar();
        this.updateHealth();
        this.updateCoords();
    }

    _build() {
        // --- Crosshair ---
        const crosshair = document.getElementById('crosshair');
        if (!crosshair) {
            const c = document.createElement('div');
            c.id = 'crosshair';
            document.getElementById('hud').appendChild(c);
        }

        // --- Hotbar ---
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';
        for (let i = 0; i < this.player.hotbar.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.id = `slot-${i}`;

            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            slot.appendChild(canvas);

            const label = document.createElement('div');
            label.className = 'hotbar-label';
            label.textContent = (i + 1);
            slot.appendChild(label);

            hotbar.appendChild(slot);
        }

        // --- Health bar ---
        const healthBar = document.getElementById('health-bar');
        healthBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            heart.id = `heart-${i}`;
            heart.innerHTML = '❤';
            healthBar.appendChild(heart);
        }

        // --- Hunger bar ---
        const hungerBar = document.getElementById('hunger-bar');
        hungerBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const hunger = document.createElement('div');
            hunger.className = 'hunger';
            hunger.id = `hunger-${i}`;
            hunger.innerHTML = '🍗';
            hungerBar.appendChild(hunger);
        }
    }

    updateHotbar() {
        for (let i = 0; i < this.player.hotbar.length; i++) {
            const slot = document.getElementById(`slot-${i}`);
            if (!slot) continue;
            slot.classList.toggle('selected', i === this.player.hotbarIndex);

            const canvas = slot.querySelector('canvas');
            const blockType = this.player.hotbar[i];
            const tex = this.tf.getIconTexture(blockType);
            if (tex && tex.image) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 48, 48);
                ctx.drawImage(tex.image, 0, 0, 48, 48);

                // Block name tooltip
                const data = BLOCK_DATA[blockType];
                slot.title = data ? data.name : '';
            }
        }
    }

    updateHealth() {
        const hp = this.player.health;
        for (let i = 0; i < 10; i++) {
            const el = document.getElementById(`heart-${i}`);
            if (!el) continue;
            const filled = hp > i * 2 + 1;
            const half   = hp === i * 2 + 1;
            el.style.opacity = filled || half ? '1' : '0.25';
            el.style.color   = filled ? '#e03030' : half ? '#e07030' : '#888';
        }
    }

    updateHunger() {
        const hg = this.player.hunger;
        for (let i = 0; i < 10; i++) {
            const el = document.getElementById(`hunger-${i}`);
            if (!el) continue;
            el.style.opacity = hg > i * 2 ? '1' : '0.25';
        }
    }

    updateCoords() {
        const el = document.getElementById('coords');
        if (!el) return;
        const p = this.player.pos;
        el.textContent = `X: ${p.x.toFixed(1)}  Y: ${p.y.toFixed(1)}  Z: ${p.z.toFixed(1)}`;
    }

    showDeathScreen(show) {
        document.getElementById('death-screen').style.display = show ? 'flex' : 'none';
    }

    showPauseMenu(show) {
        document.getElementById('pause-menu').style.display = show ? 'flex' : 'none';
    }

    showStartScreen(show) {
        document.getElementById('start-screen').style.display = show ? 'flex' : 'none';
    }

    addChatMessage(msg, color = '#fff') {
        const chat = document.getElementById('chat-log');
        if (!chat) return;
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = msg;
        chat.appendChild(line);
        chat.scrollTop = chat.scrollHeight;
        // Fade out after 8s
        setTimeout(() => {
            line.style.transition = 'opacity 1s';
            line.style.opacity = '0';
            setTimeout(() => line.remove(), 1000);
        }, 8000);
    }
}
