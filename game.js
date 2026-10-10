// CYBER STRIKE - 3 Kişilik Online & Yerel Dövüş Arenası
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elementleri
const lobbyScreen = document.getElementById('lobby-screen');
const gameUI = document.getElementById('game-ui');
const onlinePanel = document.getElementById('online-panel');
const localPanel = document.getElementById('local-panel');
const tabOnlineBtn = document.getElementById('tabOnlineBtn');
const tabLocalBtn = document.getElementById('tabLocalBtn');

const createRoomBtn = document.getElementById('createRoomBtn');
const hostInfo = document.getElementById('host-info');
const myRoomCode = document.getElementById('myRoomCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const hostStatus = document.getElementById('hostStatus');

const joinRoomCode = document.getElementById('joinRoomCode');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const joinStatus = document.getElementById('joinStatus');

const startOnlineMatchBtn = document.getElementById('startOnlineMatchBtn');
const waitHostText = document.getElementById('wait-host-text');
const startLocalMatchBtn = document.getElementById('startLocalMatchBtn');

// HUD Elementleri (3 Oyuncu)
const p1HealthBar = document.getElementById('p1-health');
const p1HealthDelayed = document.getElementById('p1-health-delayed');
const p1EnergyBar = document.getElementById('p1-energy');
const p1WinsText = document.getElementById('p1-wins');
const p1Label = document.getElementById('p1-label');

const p2HealthBar = document.getElementById('p2-health');
const p2HealthDelayed = document.getElementById('p2-health-delayed');
const p2EnergyBar = document.getElementById('p2-energy');
const p2WinsText = document.getElementById('p2-wins');
const p2Label = document.getElementById('p2-label');

const p3HealthBar = document.getElementById('p3-health');
const p3HealthDelayed = document.getElementById('p3-health-delayed');
const p3EnergyBar = document.getElementById('p3-energy');
const p3WinsText = document.getElementById('p3-wins');
const p3Label = document.getElementById('p3-label');

const timerEl = document.getElementById('timer');
const roundTextEl = document.getElementById('round-text');
const netBadge = document.getElementById('net-badge');
const bannerTextEl = document.getElementById('banner-text');
const ctrlHints = document.getElementById('ctrl-hints');

const gameOverModal = document.getElementById('game-over-modal');
const winnerTitle = document.getElementById('winner-title');
const winnerSub = document.getElementById('winner-sub');
const nextRoundBtn = document.getElementById('nextRoundBtn');
const returnLobbyBtn = document.getElementById('returnLobbyBtn');
const leaveMatchBtn = document.getElementById('leaveMatchBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');

// Oyun Sabitleri
const GRAVITY = 0.8;
const FLOOR_Y = canvas.height - 80;

// Platformlar (3 Kişi için Atlama Alanları)
const platforms = [
  { x: 180, y: FLOOR_Y - 140, width: 220, height: 18 },
  { x: canvas.width - 400, y: FLOOR_Y - 140, width: 220, height: 18 },
  { x: canvas.width / 2 - 120, y: FLOOR_Y - 260, width: 240, height: 18 }
];

// Klavye Takip
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Parçacık Sistemi
const particles = [];
function createParticles(x, y, color, count = 10, speedMult = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 4 + 2) * speedMult;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      color,
      size: Math.random() * 4 + 2,
      alpha: 1,
      decay: Math.random() * 0.03 + 0.02
    });
  }
}

// Ekran Sarsıntısı
let screenShake = 0;
function triggerShake(intensity = 8) {
  screenShake = intensity;
}

// Mermi / Ateş Topu Sınıfı
class Projectile {
  constructor(x, y, direction, ownerId, color, glowColor) {
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 20;
    this.direction = direction;
    this.speed = 11;
    this.ownerId = ownerId;
    this.color = color;
    this.glowColor = glowColor;
    this.active = true;
    this.life = 120;
    this.radius = 13;
  }

  update() {
    this.x += this.direction * this.speed;
    this.life--;
    if (this.life <= 0 || this.x < -50 || this.x > canvas.width + 50) {
      this.active = false;
    }
  }

  draw() {
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x + this.direction * 3, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const projectiles = [];

// Dövüşçü (Fighter) Sınıfı
class Fighter {
  constructor({ id, name, x, y, facing, color, accentColor, glowColor }) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = 52;
    this.height = 110;
    this.facing = facing;
    this.color = color;
    this.accentColor = accentColor;
    this.glowColor = glowColor;

    this.vx = 0;
    this.vy = 0;
    this.speed = 6.4;
    this.jumpForce = -15.5;
    this.jumpCount = 0;
    this.maxJumps = 2;

    this.health = 100;
    this.maxHealth = 100;
    this.energy = 30;
    this.maxEnergy = 100;
    this.wins = 0;

    this.isGrounded = false;
    this.isCrouching = false;
    this.isBlocking = false;
    this.isAttacking = false;
    this.attackType = null;
    this.attackFrame = 0;
    this.attackCooldown = 0;
    this.specialCooldown = 0;
    this.isHit = 0;
    this.isAlive = true;

    this.animTimer = 0;
  }

  reset(x, facing) {
    this.x = x;
    this.y = FLOOR_Y - this.height;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.health = 100;
    this.isGrounded = true;
    this.isCrouching = false;
    this.isBlocking = false;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.specialCooldown = 0;
    this.isHit = 0;
    this.isAlive = true;
  }

  applyInputs(inputState) {
    if (!this.isAlive || gameManager.state !== 'FIGHTING') {
      this.isBlocking = false;
      this.isCrouching = false;
      return;
    }

    this.isBlocking = inputState.block && !this.isAttacking;
    this.isCrouching = inputState.down && this.isGrounded && !this.isAttacking;

    // Yatay Hareket
    if (!this.isBlocking && !this.isCrouching && !this.isAttacking) {
      if (inputState.left) {
        this.vx = -this.speed;
        this.facing = -1;
      } else if (inputState.right) {
        this.vx = this.speed;
        this.facing = 1;
      } else {
        this.vx = 0;
      }
    } else {
      this.vx = 0;
    }

    // Zıplama (Çift Zıplama)
    if (inputState.up) {
      if (this.isGrounded && !this.jumpPressed) {
        this.vy = this.jumpForce;
        this.isGrounded = false;
        this.jumpCount = 1;
        this.jumpPressed = true;
        sounds.playJump();
        createParticles(this.x + this.width / 2, this.y + this.height, '#ffffff', 5);
      } else if (!this.isGrounded && this.jumpCount < this.maxJumps && !this.jumpPressed) {
        this.vy = this.jumpForce * 0.88;
        this.jumpCount++;
        this.jumpPressed = true;
        sounds.playJump();
        createParticles(this.x + this.width / 2, this.y + this.height, this.accentColor, 8);
      }
    } else {
      this.jumpPressed = false;
    }

    // Saldırılar
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.specialCooldown > 0) this.specialCooldown--;

    if (!this.isAttacking && !this.isBlocking && this.attackCooldown === 0) {
      if (inputState.punch) {
        this.startAttack('punch', 14);
        sounds.playPunch();
      } else if (inputState.kick) {
        this.startAttack('kick', 20);
        sounds.playKick();
      } else if (inputState.special && this.specialCooldown === 0 && this.energy >= 25) {
        this.shootSpecial();
      }
    }
  }

  startAttack(type, duration) {
    this.isAttacking = true;
    this.attackType = type;
    this.attackFrame = 0;
    this.attackDuration = duration;
    this.hasHitThisAttack = false;
  }

  shootSpecial() {
    this.energy -= 25;
    this.specialCooldown = 45;
    this.startAttack('special', 18);
    sounds.playFireball();

    const spawnX = this.x + (this.facing === 1 ? this.width + 15 : -15);
    const spawnY = this.y + 40;
    projectiles.push(new Projectile(spawnX, spawnY, this.facing, this.id, this.accentColor, this.glowColor));
    triggerShake(4);
  }

  takeDamage(amount, knockbackX = 6, isHeavy = false) {
    if (!this.isAlive) return;

    if (this.isBlocking) {
      amount *= 0.2;
      knockbackX *= 0.4;
      sounds.playBlock();
      createParticles(this.x + this.width / 2, this.y + 40, '#ffd700', 8);
    } else {
      this.isHit = 8;
      createParticles(this.x + this.width / 2, this.y + 40, this.color, isHeavy ? 18 : 10, isHeavy ? 1.5 : 1);
      triggerShake(isHeavy ? 10 : 5);
      if (isHeavy) sounds.playKick();
      else sounds.playPunch();
    }

    this.health = Math.max(0, this.health - amount);
    this.vx = -this.facing * knockbackX;
    this.gainEnergy(amount * 0.35);

    if (this.health <= 0) {
      this.isAlive = false;
      sounds.playKO();
      gameManager.checkRoundState();
    }
  }

  gainEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  getHitbox() {
    if (!this.isAttacking || this.hasHitThisAttack || !this.isAlive) return null;

    let range = 44;
    let height = 25;
    let offsetY = 35;

    if (this.attackType === 'kick') {
      range = 58;
      height = 32;
      offsetY = 55;
    }

    const hitX = this.facing === 1 ? this.x + this.width : this.x - range;
    return {
      x: hitX,
      y: this.y + offsetY,
      width: range,
      height: height,
      damage: this.attackType === 'punch' ? 8 : 15,
      knockback: this.attackType === 'punch' ? 6 : 13,
      isHeavy: this.attackType === 'kick'
    };
  }

  updatePhysics() {
    if (!this.isAlive) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y + 40 >= FLOOR_Y) {
        this.y = FLOOR_Y - 40;
        this.vy = 0;
      }
      this.vx *= 0.8;
      this.x += this.vx;
      return;
    }

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    const actualHeight = this.isCrouching ? this.height * 0.7 : this.height;

    // Platform Çarpışmaları (Yukarıdan düşerken basabilme)
    let onPlatform = false;
    for (const plat of platforms) {
      if (
        this.vy >= 0 &&
        this.y + actualHeight >= plat.y &&
        this.y + actualHeight - this.vy <= plat.y + 8 &&
        this.x + this.width > plat.x &&
        this.x < plat.x + plat.width
      ) {
        this.y = plat.y - actualHeight;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
        onPlatform = true;
        break;
      }
    }

    // Zemin Çarpışması
    if (!onPlatform) {
      if (this.y + actualHeight >= FLOOR_Y) {
        this.y = FLOOR_Y - actualHeight;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
      } else {
        this.isGrounded = false;
      }
    }

    // Arena Duvar Sınırları
    if (this.x < 15) this.x = 15;
    if (this.x + this.width > canvas.width - 15) this.x = canvas.width - 15 - this.width;

    this.vx *= 0.82;

    if (this.isAttacking) {
      this.attackFrame++;
      if (this.attackFrame >= this.attackDuration) {
        this.isAttacking = false;
        this.attackCooldown = 8;
      }
    }

    if (this.isHit > 0) this.isHit--;

    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + 0.05);
    }

    this.animTimer += 0.15;
  }

  draw() {
    ctx.save();

    // Gölge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x + this.width / 2, this.y + this.height + 2, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eğer K.O. olduysa yere yatır
    if (!this.isAlive) {
      ctx.fillStyle = '#666';
      ctx.fillRect(this.x - 10, FLOOR_Y - 25, 75, 25);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#ff0055';
      ctx.fillText('K.O.', this.x + 10, FLOOR_Y - 35);
      ctx.restore();
      return;
    }

    const actualHeight = this.isCrouching ? this.height * 0.7 : this.height;
    const bodyY = this.y;
    const centerX = this.x + this.width / 2;

    // Vurulduğunda parlama
    if (this.isHit > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 12;
    }

    // Blok Kalkanı
    if (this.isBlocking) {
      ctx.save();
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.accentColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      const shieldX = this.facing === 1 ? this.x + this.width + 8 : this.x - 8;
      ctx.arc(shieldX, bodyY + actualHeight / 2, 42, -Math.PI / 2, Math.PI / 2, this.facing === -1);
      ctx.stroke();
      ctx.restore();
    }

    // Baş üstü Oyuncu İsmi Tag'i
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = this.accentColor;
    ctx.textAlign = 'center';
    ctx.fillText(`P${this.id}`, centerX, bodyY - 14);

    // 1. Gövde
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x + 8, bodyY + 30, this.width - 16, actualHeight - 65);

    // Kuşak
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(this.x + 6, bodyY + 56, this.width - 12, 8);

    // 2. Kafa
    ctx.fillStyle = '#ffdfba';
    ctx.beginPath();
    ctx.arc(centerX, bodyY + 16, 14, 0, Math.PI * 2);
    ctx.fill();

    // Kafa Bandı
    ctx.fillStyle = this.accentColor;
    ctx.fillRect(centerX - 14, bodyY + 8, 28, 8);
    ctx.beginPath();
    ctx.moveTo(centerX - this.facing * 12, bodyY + 12);
    ctx.lineTo(centerX - this.facing * 26, bodyY + 14 + Math.sin(this.animTimer) * 4);
    ctx.lineTo(centerX - this.facing * 24, bodyY + 20);
    ctx.fill();

    // Siber Vizör
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX + (this.facing === 1 ? 2 : -10), bodyY + 14, 8, 4);

    // 3. Bacaklar
    const legY = bodyY + actualHeight - 35;
    ctx.fillStyle = '#151124';
    if (this.isCrouching) {
      ctx.fillRect(this.x + 4, legY, this.width - 8, 35);
    } else {
      const legOffset = Math.sin(this.animTimer * 1.5) * (Math.abs(this.vx) > 0.5 ? 8 : 1);
      ctx.fillRect(this.x + 8 - legOffset, legY, 13, 35);
      ctx.fillRect(this.x + this.width - 21 + legOffset, legY, 13, 35);

      ctx.fillStyle = this.accentColor;
      ctx.fillRect(this.x + 7 - legOffset, legY + 25, 15, 10);
      ctx.fillRect(this.x + this.width - 22 + legOffset, legY + 25, 15, 10);
    }

    // 4. Kollar ve Saldırılar
    ctx.fillStyle = this.color;
    const armY = bodyY + 36;

    if (this.isAttacking && this.attackType === 'punch') {
      const punchLength = 48;
      const punchDir = this.facing;
      ctx.fillStyle = this.accentColor;
      ctx.fillRect(punchDir === 1 ? centerX : centerX - punchLength, armY, punchLength, 14);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(punchDir === 1 ? centerX + punchLength : centerX - punchLength, armY + 7, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.isAttacking && this.attackType === 'kick') {
      const kickLength = 54;
      const kickDir = this.facing;
      ctx.save();
      ctx.fillStyle = this.accentColor;
      ctx.shadowColor = this.accentColor;
      ctx.shadowBlur = 15;
      ctx.fillRect(kickDir === 1 ? centerX : centerX - kickLength, legY + 4, kickLength, 16);
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.facing === 1 ? this.x + this.width - 12 : this.x, armY + Math.sin(this.animTimer) * 2, 12, 28);
    }

    ctx.restore();
  }

  // Durumu paketle (Host -> Clients)
  getSnapshot() {
    return {
      id: this.id,
      x: Math.round(this.x),
      y: Math.round(this.y),
      vx: Math.round(this.vx * 10) / 10,
      vy: Math.round(this.vy * 10) / 10,
      facing: this.facing,
      health: Math.round(this.health),
      energy: Math.round(this.energy),
      isAttacking: this.isAttacking,
      attackType: this.attackType,
      isBlocking: this.isBlocking,
      isCrouching: this.isCrouching,
      isHit: this.isHit,
      isAlive: this.isAlive,
      wins: this.wins
    };
  }

  // Durumu uygula (Client side)
  applySnapshot(snap) {
    this.x = snap.x;
    this.y = snap.y;
    this.vx = snap.vx;
    this.vy = snap.vy;
    this.facing = snap.facing;
    this.health = snap.health;
    this.energy = snap.energy;
    this.isAttacking = snap.isAttacking;
    this.attackType = snap.attackType;
    this.isBlocking = snap.isBlocking;
    this.isCrouching = snap.isCrouching;
    this.isHit = snap.isHit;
    this.isAlive = snap.isAlive;
    this.wins = snap.wins;
  }
}

// 3 Dövüşçüyü Tanımla
const fighters = [
  new Fighter({
    id: 1,
    name: 'Oyuncu 1',
    x: 140,
    y: FLOOR_Y - 110,
    facing: 1,
    color: '#d62246',
    accentColor: '#ff0055',
    glowColor: '#ff0055'
  }),
  new Fighter({
    id: 2,
    name: 'Oyuncu 2',
    x: canvas.width / 2 - 26,
    y: FLOOR_Y - 110,
    facing: 1,
    color: '#0066cc',
    accentColor: '#00d2ff',
    glowColor: '#00f0ff'
  }),
  new Fighter({
    id: 3,
    name: 'Oyuncu 3',
    x: canvas.width - 190,
    y: FLOOR_Y - 110,
    facing: -1,
    color: '#00994d',
    accentColor: '#00ff88',
    glowColor: '#00ff88'
  })
];

// Oyun Yöneticisi
class GameManager {
  constructor() {
    this.mode = 'ONLINE'; // 'ONLINE' veya 'LOCAL'
    this.state = 'LOBBY'; // 'LOBBY', 'BANNER', 'FIGHTING', 'ROUND_OVER', 'MATCH_OVER'
    this.currentRound = 1;
    this.timeLeft = 99;
    this.timerInterval = null;
    this.clientInputs = { 1: {}, 2: {}, 3: {} };
  }

  startMatch() {
    this.state = 'BANNER';
    lobbyScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    gameOverModal.classList.add('hidden');

    fighters.forEach(f => f.wins = 0);
    this.currentRound = 1;

    // Kontrol ipucu güncellemesi
    if (this.mode === 'ONLINE') {
      netBadge.textContent = 'PEER-TO-PEER ONLINE';
      const myId = network.localPlayerId;
      ctrlHints.textContent = `P${myId} sensin! [W/A/S/D]: Koş/Zıpla | [F]: Yumruk | [G]: Tekme | [H]: Özel Güç | [Space]: Blok`;
    } else {
      netBadge.textContent = 'YEREL (AYNI KLAVYE)';
      ctrlHints.textContent = `P1: WASD+F/G/H/Space | P2: Oklar+K/L/O/P | P3: IJKL+U/Y/T/N`;
    }

    this.startRound();
  }

  startRound() {
    this.state = 'BANNER';
    this.timeLeft = 99;
    timerEl.textContent = this.timeLeft;
    roundTextEl.textContent = `ROUND ${this.currentRound}`;

    // Pozisyonları sıfırla
    fighters[0].reset(160, 1);
    fighters[1].reset(canvas.width / 2 - 26, 1);
    fighters[2].reset(canvas.width - 210, -1);
    projectiles.length = 0;

    this.showBanner(`ROUND ${this.currentRound}`, 1200, () => {
      this.showBanner('FIGHT!', 800, () => {
        this.state = 'FIGHTING';
        sounds.playFight();
        if (this.mode === 'LOCAL' || network.isHost) {
          this.startTimer();
        }
      });
    });
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state === 'FIGHTING') {
        this.timeLeft--;
        timerEl.textContent = this.timeLeft;
        if (this.timeLeft <= 0) {
          this.onTimeUp();
        }
      }
    }, 1000);
  }

  showBanner(text, duration, callback) {
    bannerTextEl.textContent = text;
    bannerTextEl.classList.add('show');
    setTimeout(() => {
      bannerTextEl.classList.remove('show');
      if (callback) callback();
    }, duration);
  }

  checkRoundState() {
    if (this.state !== 'FIGHTING') return;

    const aliveFighters = fighters.filter(f => f.isAlive);
    if (aliveFighters.length <= 1) {
      this.state = 'ROUND_OVER';
      clearInterval(this.timerInterval);

      if (aliveFighters.length === 1) {
        const winner = aliveFighters[0];
        winner.wins++;
        this.showBanner(`${winner.name.toUpperCase()} KAZANDI!`, 2000, () => {
          this.showRoundEndModal(winner);
        });
      } else {
        this.showBanner('BERABERE!', 2000, () => {
          this.showRoundEndModal(null);
        });
      }
    }
  }

  onTimeUp() {
    this.state = 'ROUND_OVER';
    clearInterval(this.timerInterval);

    // Canı en yüksek olan kazanır
    let highestHealthFighter = fighters[0];
    for (const f of fighters) {
      if (f.health > highestHealthFighter.health) {
        highestHealthFighter = f;
      }
    }

    highestHealthFighter.wins++;
    this.showBanner('SÜRE BİTTİ!', 1800, () => {
      this.showRoundEndModal(highestHealthFighter);
    });
  }

  showRoundEndModal(winner) {
    if (winner) {
      winnerTitle.textContent = `ŞAMPİYON: ${winner.name.toUpperCase()}!`;
      winnerSub.textContent = `Toplam Galibiyet: ${winner.wins}`;
    } else {
      winnerTitle.textContent = 'RAUNT BERABERE BİTTİ!';
      winnerSub.textContent = 'Kimse ayakta kalamadı.';
    }
    gameOverModal.classList.remove('hidden');
  }

  nextRound() {
    gameOverModal.classList.add('hidden');
    this.currentRound++;
    this.startRound();
  }

  returnToLobby() {
    clearInterval(this.timerInterval);
    network.disconnect();
    location.reload();
  }
}

const gameManager = new GameManager();

// Çarpışma Testi
function checkCollision(r1, r2) {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

// Arenayı Çiz
function drawArena() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#0c0717');
  skyGrad.addColorStop(0.6, '#1a1033');
  skyGrad.addColorStop(1, '#0c0915');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Siber Binalar
  ctx.fillStyle = 'rgba(25, 17, 46, 0.75)';
  for (let i = 0; i < 18; i++) {
    const bw = 65 + (i % 4) * 20;
    const bh = 140 + ((i * 41) % 220);
    const bx = i * 70 - 20;
    ctx.fillRect(bx, FLOOR_Y - bh, bw, bh);

    ctx.fillStyle = (i % 3 === 0) ? 'rgba(0, 255, 136, 0.2)' : (i % 2 === 0 ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255, 0, 85, 0.25)');
    for (let r = 0; r < bh - 40; r += 24) {
      for (let c = 8; c < bw - 15; c += 18) {
        if ((r + c + i) % 3 === 0) {
          ctx.fillRect(bx + c, FLOOR_Y - bh + 20 + r, 8, 11);
        }
      }
    }
    ctx.fillStyle = 'rgba(25, 17, 46, 0.75)';
  }

  // Havada Duran Platformları Çiz
  platforms.forEach(plat => {
    ctx.save();
    ctx.fillStyle = '#1e1438';
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

    ctx.strokeStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(plat.x, plat.y);
    ctx.lineTo(plat.x + plat.width, plat.y);
    ctx.stroke();

    ctx.fillStyle = '#ff007f';
    ctx.fillRect(plat.x + 8, plat.y + plat.height - 4, plat.width - 16, 3);
    ctx.restore();
  });

  // Zemin
  ctx.fillStyle = '#130e21';
  ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);

  ctx.strokeStyle = '#a855f7';
  ctx.shadowColor = '#d946ef';
  ctx.shadowBlur = 15;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(canvas.width, FLOOR_Y);
  ctx.stroke();

  // Grid
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.lineTo(x + (x - canvas.width / 2) * 0.4, canvas.height);
    ctx.stroke();
  }
}

// Oyuncu Tuş Girişlerini Toplama
function collectLocalInputs() {
  if (gameManager.mode === 'ONLINE') {
    // Online modda her oyuncu kendi bilgisayarında rahat standart tuşları kullanır
    return {
      left: keys['KeyA'] || keys['ArrowLeft'],
      right: keys['KeyD'] || keys['ArrowRight'],
      up: keys['KeyW'] || keys['ArrowUp'],
      down: keys['KeyS'] || keys['ArrowDown'],
      punch: keys['KeyF'] || keys['KeyK'],
      kick: keys['KeyG'] || keys['KeyL'],
      special: keys['KeyH'] || keys['KeyO'],
      block: keys['Space'] || keys['KeyP']
    };
  } else {
    // Yerel modda (Aynı klavyede 3 kişi)
    return {
      p1: {
        left: keys['KeyA'],
        right: keys['KeyD'],
        up: keys['KeyW'],
        down: keys['KeyS'],
        punch: keys['KeyF'],
        kick: keys['KeyG'],
        special: keys['KeyH'],
        block: keys['Space']
      },
      p2: {
        left: keys['ArrowLeft'],
        right: keys['ArrowRight'],
        up: keys['ArrowUp'],
        down: keys['ArrowDown'],
        punch: keys['KeyK'],
        kick: keys['KeyL'],
        special: keys['KeyO'],
        block: keys['KeyP']
      },
      p3: {
        left: keys['KeyJ'],
        right: keys['KeyL'],
        up: keys['KeyI'],
        down: keys['KeyK'],
        punch: keys['KeyU'],
        kick: keys['KeyY'],
        special: keys['KeyT'],
        block: keys['KeyN']
      }
    };
  }
}

// Ana Oyun Döngüsü
function gameLoop() {
  ctx.save();
  if (screenShake > 0) {
    const sx = (Math.random() - 0.5) * screenShake * 2;
    const sy = (Math.random() - 0.5) * screenShake * 2;
    ctx.translate(sx, sy);
    screenShake *= 0.88;
    if (screenShake < 0.2) screenShake = 0;
  }

  drawArena();

  // 1. Girdileri Yönet & Fizik Hesapla
  if (gameManager.mode === 'LOCAL') {
    const localIn = collectLocalInputs();
    fighters[0].applyInputs(localIn.p1);
    fighters[1].applyInputs(localIn.p2);
    fighters[2].applyInputs(localIn.p3);

    fighters.forEach(f => f.updatePhysics());
    checkCombatCollisions();
  } else if (gameManager.mode === 'ONLINE') {
    const myInputs = collectLocalInputs();

    if (network.isHost) {
      // Host: Kendi girdilerini uygula
      fighters[0].applyInputs(myInputs);

      // Misafirlerin gelen girdilerini uygula
      if (gameManager.clientInputs[2]) fighters[1].applyInputs(gameManager.clientInputs[2]);
      if (gameManager.clientInputs[3]) fighters[2].applyInputs(gameManager.clientInputs[3]);

      fighters.forEach(f => f.updatePhysics());
      checkCombatCollisions();

      // Durumu client'lara yayınla
      const snapshot = {
        timeLeft: gameManager.timeLeft,
        fighters: fighters.map(f => f.getSnapshot()),
        projectiles: projectiles.map(p => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
          direction: p.direction,
          ownerId: p.ownerId,
          color: p.color,
          glowColor: p.glowColor
        }))
      };
      network.broadcastState(snapshot);
    } else {
      // Client: Host'a tuşları gönder
      network.sendInputs(myInputs);
    }
  }

  // 2. Mermileri Güncelle & Çiz
  if (gameManager.mode === 'LOCAL' || network.isHost) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      proj.update();
      proj.draw();

      if (proj.active) {
        // Merminin diğer 2 oyuncuya çarpma kontrolü
        for (const target of fighters) {
          if (target.id !== proj.ownerId && target.isAlive) {
            const targetRect = { x: target.x, y: target.y, width: target.width, height: target.height };
            const projRect = { x: proj.x - proj.radius, y: proj.y - proj.radius, width: proj.radius * 2, height: proj.radius * 2 };

            if (checkCollision(projRect, targetRect)) {
              target.takeDamage(18, 9, true);
              createParticles(proj.x, proj.y, proj.color, 20, 1.8);
              proj.active = false;
              break;
            }
          }
        }
      }

      if (!proj.active) projectiles.splice(i, 1);
    }
  } else {
    // Client sadece mermileri çizer
    projectiles.forEach(p => p.draw());
  }

  // 3. Parçacıkları Güncelle & Çiz
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    } else {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 4. Dövüşçüleri Çiz
  fighters.forEach(f => f.draw());

  ctx.restore();

  updateHUD();
  requestAnimationFrame(gameLoop);
}

// 3 Oyuncu Arasındaki Yakın Dövüş Çarpışmaları (Free-For-All)
function checkCombatCollisions() {
  fighters.forEach(attacker => {
    const hitbox = attacker.getHitbox();
    if (hitbox) {
      fighters.forEach(defender => {
        if (attacker.id !== defender.id && defender.isAlive) {
          const defTarget = { x: defender.x, y: defender.y, width: defender.width, height: defender.height };
          if (checkCollision(hitbox, defTarget)) {
            defender.takeDamage(hitbox.damage, hitbox.knockback, hitbox.isHeavy);
            attacker.hasHitThisAttack = true;
            attacker.gainEnergy(hitbox.isHeavy ? 15 : 9);
          }
        }
      });
    }
  });
}

function updateHUD() {
  p1HealthBar.style.width = `${Math.max(0, fighters[0].health)}%`;
  p1HealthDelayed.style.width = `${Math.max(0, fighters[0].health)}%`;
  p1EnergyBar.style.width = `${fighters[0].energy}%`;
  p1WinsText.textContent = `🏆 ${fighters[0].wins} Galibiyet`;

  p2HealthBar.style.width = `${Math.max(0, fighters[1].health)}%`;
  p2HealthDelayed.style.width = `${Math.max(0, fighters[1].health)}%`;
  p2EnergyBar.style.width = `${fighters[1].energy}%`;
  p2WinsText.textContent = `🏆 ${fighters[1].wins} Galibiyet`;

  p3HealthBar.style.width = `${Math.max(0, fighters[2].health)}%`;
  p3HealthDelayed.style.width = `${Math.max(0, fighters[2].health)}%`;
  p3EnergyBar.style.width = `${fighters[2].energy}%`;
  p3WinsText.textContent = `🏆 ${fighters[2].wins} Galibiyet`;
}

// ================= NETWORK ETKİLEŞİMİ =================
// Host: Client'tan gelen tuşları kaydet
network.onInputReceived = (playerId, inputState) => {
  gameManager.clientInputs[playerId] = inputState;
};

// Client: Host'tan gelen dünya durumunu senkronize et
network.onStateUpdate = (payload) => {
  gameManager.timeLeft = payload.timeLeft;
  timerEl.textContent = payload.timeLeft;

  payload.fighters.forEach(snap => {
    const f = fighters.find(x => x.id === snap.id);
    if (f) f.applySnapshot(snap);
  });

  // Mermileri güncelle
  projectiles.length = 0;
  payload.projectiles.forEach(pData => {
    const proj = new Projectile(pData.x, pData.y, pData.direction, pData.ownerId, pData.color, pData.glowColor);
    projectiles.push(proj);
  });
};

// Lobi Güncellemesi (Slotların doluluğu)
network.onLobbyChange = (slots) => {
  for (let id = 1; id <= 3; id++) {
    const roleEl = document.getElementById(`slot-role-${id}`);
    if (slots[id] && slots[id].connected) {
      roleEl.textContent = slots[id].name;
      roleEl.classList.add('ready');
    } else {
      roleEl.textContent = 'Bekleniyor...';
      roleEl.classList.remove('ready');
    }
  }

  // En az 2 kişi varsa kurucu maçı başlatabilir
  const connectedCount = Object.values(slots).filter(s => s.connected).length;
  if (network.isHost && connectedCount >= 2) {
    startOnlineMatchBtn.classList.remove('hidden');
    hostStatus.textContent = `${connectedCount} / 3 Oyuncu Hazır!`;
  }
};

network.onGameStart = () => {
  gameManager.mode = 'ONLINE';
  gameManager.startMatch();
};

// ================= LOBİ ARAYÜZ VE BUTONLARI =================
// Sekme geçişleri
tabOnlineBtn.addEventListener('click', () => {
  tabOnlineBtn.classList.add('active');
  tabLocalBtn.classList.remove('active');
  onlinePanel.classList.add('active');
  localPanel.classList.remove('active');
});

tabLocalBtn.addEventListener('click', () => {
  tabLocalBtn.classList.add('active');
  tabOnlineBtn.classList.remove('active');
  localPanel.classList.add('active');
  onlinePanel.classList.remove('active');
});

// 1. Oda Kur
createRoomBtn.addEventListener('click', () => {
  createRoomBtn.disabled = true;
  createRoomBtn.textContent = 'Oda Kuruluyor...';

  network.createRoom((code) => {
    myRoomCode.value = code;
    hostInfo.classList.remove('hidden');
    createRoomBtn.classList.add('hidden');
    hostStatus.textContent = 'Arkadaşlarını bekliyor... (Link veya kodu paylaş)';
  });
});

// Kod Kopyala
copyCodeBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(myRoomCode.value);
  copyCodeBtn.textContent = 'Kopyalandı!';
  setTimeout(() => copyCodeBtn.textContent = 'Kodu Kopyala', 1500);
});

// Link Kopyala
copyLinkBtn.addEventListener('click', () => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${myRoomCode.value}`;
  navigator.clipboard.writeText(joinUrl);
  copyLinkBtn.textContent = '🔗 Link Kopyalandı!';
  setTimeout(() => copyLinkBtn.textContent = '🔗 Katılım Linkini Kopyala', 1800);
});

// 2. Odaya Katıl
joinRoomBtn.addEventListener('click', () => {
  const code = joinRoomCode.value.trim();
  if (!code) {
    alert('Lütfen geçerli bir oda kodu girin!');
    return;
  }

  joinRoomBtn.disabled = true;
  joinStatus.classList.remove('hidden');
  joinStatus.textContent = 'Odaya bağlanılıyor...';

  network.joinRoom(code, () => {
    joinStatus.textContent = 'Bağlandı! Kurucu oyunu başlatınca dövüş başlayacak.';
    waitHostText.classList.remove('hidden');
    joinRoomBtn.classList.add('hidden');
  }, (err) => {
    alert('Odaya bağlanılamadı! Oda kodunu kontrol edin.');
    joinStatus.classList.add('hidden');
    joinRoomBtn.disabled = false;
  });
});

// Kurucunun Dövüşü Başlatması
startOnlineMatchBtn.addEventListener('click', () => {
  network.broadcastStartGame();
  gameManager.mode = 'ONLINE';
  gameManager.startMatch();
});

// Yerel Maçı Başlat
startLocalMatchBtn.addEventListener('click', () => {
  gameManager.mode = 'LOCAL';
  gameManager.startMatch();
});

// Sonraki Raunt
nextRoundBtn.addEventListener('click', () => {
  gameManager.nextRound();
});

// Lobiye Dön
returnLobbyBtn.addEventListener('click', () => {
  gameManager.returnToLobby();
});
leaveMatchBtn.addEventListener('click', () => {
  gameManager.returnToLobby();
});

toggleAudioBtn.addEventListener('click', () => {
  const isEnabled = sounds.toggle();
  toggleAudioBtn.textContent = isEnabled ? '🔊 Ses Açık' : '🔇 Ses Kapalı';
});

// URL Parametresinden Otomatik Oda Kodu Doldurma
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    joinRoomCode.value = room.toUpperCase();
    tabOnlineBtn.click();
  }
});

// Başlangıç Döngüsü
requestAnimationFrame(gameLoop);
