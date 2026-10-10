// HARAMBALL - HaxBall 2D Fizik & Futbol Motoru
class HaramballEngine {
  constructor() {
    this.active = false;
    this.pitch = {
      x: 70,
      y: 50,
      width: 1012,
      height: 548,
      goalWidth: 155,
      goalDepth: 45
    };

    // Top
    this.ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: 0,
      vy: 0,
      radius: 11,
      mass: 1,
      color: '#ffffff'
    };

    // Oyuncular (Haxball Diskleri)
    this.players = [
      {
        id: 1,
        team: 'red',
        x: canvas.width / 2 - 220,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        radius: 21,
        speed: 0.65,
        maxSpeed: 6.2,
        color: '#e74c3c',
        border: '#ffffff',
        label: '1',
        isKicking: false
      },
      {
        id: 2,
        team: 'blue',
        x: canvas.width / 2 + 220,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        radius: 21,
        speed: 0.65,
        maxSpeed: 6.2,
        color: '#3498db',
        border: '#ffffff',
        label: '2',
        isKicking: false
      },
      {
        id: 3,
        team: 'red',
        x: canvas.width / 2 - 280,
        y: canvas.height / 2 - 120,
        vx: 0,
        vy: 0,
        radius: 21,
        speed: 0.65,
        maxSpeed: 6.2,
        color: '#2ecc71',
        border: '#ffffff',
        label: '3',
        isKicking: false
      }
    ];

    this.redScore = 0;
    this.blueScore = 0;
    this.matchTime = 180; // 3 dakika
    this.timerInterval = null;
    this.goalCelebration = false;
  }

  init() {
    this.resetPositions();
    this.redScore = 0;
    this.blueScore = 0;
    this.matchTime = 180;
    this.goalCelebration = false;
  }

  resetPositions() {
    this.ball.x = canvas.width / 2;
    this.ball.y = canvas.height / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;

    this.players[0].x = canvas.width / 2 - 220;
    this.players[0].y = canvas.height / 2;
    this.players[0].vx = 0;
    this.players[0].vy = 0;

    this.players[1].x = canvas.width / 2 + 220;
    this.players[1].y = canvas.height / 2;
    this.players[1].vx = 0;
    this.players[1].vy = 0;

    this.players[2].x = canvas.width / 2 - 260;
    this.players[2].y = canvas.height / 2 - 110;
    this.players[2].vx = 0;
    this.players[2].vy = 0;
  }

  // Oyuncu Girdilerini Uygula
  applyInputs(pIndex, inputState) {
    const p = this.players[pIndex];
    if (!p) return;

    let ax = 0;
    let ay = 0;

    if (inputState.left) ax -= p.speed;
    if (inputState.right) ax += p.speed;
    if (inputState.up) ay -= p.speed;
    if (inputState.down) ay += p.speed;

    p.vx += ax;
    p.vy += ay;

    // Hız Sınırlandırması
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > p.maxSpeed) {
      p.vx = (p.vx / speed) * p.maxSpeed;
      p.vy = (p.vy / speed) * p.maxSpeed;
    }

    // Şut Atma (Kick) - Boşluk, Sol Tık, X
    const isKickPressed = inputState.punch || inputState.kick || inputState.special || inputState.block;
    p.isKicking = !!isKickPressed;

    if (isKickPressed) {
      this.tryKick(p);
    }
  }

  tryKick(p) {
    const dx = this.ball.x - p.x;
    const dy = this.ball.y - p.y;
    const dist = Math.hypot(dx, dy);

    // Vuruş Menzili (Disk yarıçapı + Top yarıçapı + tolerans)
    if (dist < p.radius + this.ball.radius + 10) {
      const angle = Math.atan2(dy, dx);
      const kickPower = 11.5;
      this.ball.vx = Math.cos(angle) * kickPower + p.vx * 0.4;
      this.ball.vy = Math.sin(angle) * kickPower + p.vy * 0.4;
      sounds.playKick();
      createParticles(this.ball.x, this.ball.y, '#ffffff', 8);
    }
  }

  // Fizik Güncellemesi (Host Tarafı)
  updatePhysics() {
    if (this.goalCelebration) return;

    // 1. Oyuncuları Güncelle
    this.players.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.90; // HaxBall Sürtünmesi
      p.vy *= 0.90;

      // Saha Duvar Sınırları
      const minX = this.pitch.x + p.radius;
      const maxX = this.pitch.x + this.pitch.width - p.radius;
      const minY = this.pitch.y + p.radius;
      const maxY = this.pitch.y + this.pitch.height - p.radius;

      if (p.x < minX) { p.x = minX; p.vx = 0; }
      if (p.x > maxX) { p.x = maxX; p.vx = 0; }
      if (p.y < minY) { p.y = minY; p.vy = 0; }
      if (p.y > maxY) { p.y = maxY; p.vy = 0; }
    });

    // 2. Oyuncu - Oyuncu Çarpışmaları (Elastik Disk Çarpışması)
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const p1 = this.players[i];
        const p2 = this.players[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          // Hız aktarımı
          const p = 2 * (p1.vx * nx + p1.vy * ny - p2.vx * nx - p2.vy * ny) / 2;
          p1.vx -= p * nx;
          p1.vy -= p * ny;
          p2.vx += p * nx;
          p2.vy += p * ny;
        }
      }
    }

    // 3. Top Fiziği
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.vx *= 0.988; // Top Yuvarlanma Sürtünmesi
    this.ball.vy *= 0.988;

    // Top - Oyuncu Çarpışması
    this.players.forEach(p => {
      const dx = this.ball.x - p.x;
      const dy = this.ball.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + this.ball.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        this.ball.x += nx * overlap;
        this.ball.y += ny * overlap;

        // Sekme
        const dot = this.ball.vx * nx + this.ball.vy * ny;
        this.ball.vx = (this.ball.vx - 1.6 * dot * nx) + p.vx * 0.7;
        this.ball.vy = (this.ball.vy - 1.6 * dot * ny) + p.vy * 0.7;
      }
    });

    // 4. Saha Sınırları ve Kale Direkleri
    const goalTop = canvas.height / 2 - this.pitch.goalWidth / 2;
    const goalBottom = canvas.height / 2 + this.pitch.goalWidth / 2;
    const leftWall = this.pitch.x + this.ball.radius;
    const rightWall = this.pitch.x + this.pitch.width - this.ball.radius;
    const topWall = this.pitch.y + this.ball.radius;
    const bottomWall = this.pitch.y + this.pitch.height - this.ball.radius;

    // Üst ve Alt Duvar Sekmesi
    if (this.ball.y < topWall) {
      this.ball.y = topWall;
      this.ball.vy = -this.ball.vy * 0.8;
      sounds.playPunch();
    }
    if (this.ball.y > bottomWall) {
      this.ball.y = bottomWall;
      this.ball.vy = -this.ball.vy * 0.8;
      sounds.playPunch();
    }

    // Sol Duvar (Kale Ağzı Hariç)
    if (this.ball.x < leftWall) {
      if (this.ball.y < goalTop || this.ball.y > goalBottom) {
        this.ball.x = leftWall;
        this.ball.vx = -this.ball.vx * 0.8;
        sounds.playPunch();
      } else {
        // KALE İÇİNE GİRDİ! Sol Kale Arkası
        if (this.ball.x < this.pitch.x - this.pitch.goalDepth + this.ball.radius) {
          this.checkGoal('blue');
        }
      }
    }

    // Sağ Duvar (Kale Ağzı Hariç)
    if (this.ball.x > rightWall) {
      if (this.ball.y < goalTop || this.ball.y > goalBottom) {
        this.ball.x = rightWall;
        this.ball.vx = -this.ball.vx * 0.8;
        sounds.playPunch();
      } else {
        // KALE İÇİNE GİRDİ! Sağ Kale Arkası
        if (this.ball.x > this.pitch.x + this.pitch.width + this.pitch.goalDepth - this.ball.radius) {
          this.checkGoal('red');
        }
      }
    }
  }

  // Gol Kontrolü
  checkGoal(scoringTeam) {
    if (this.goalCelebration) return;
    this.goalCelebration = true;

    if (scoringTeam === 'red') {
      this.redScore++;
    } else {
      this.blueScore++;
    }

    sounds.playKO();
    triggerShake(12);
    createParticles(this.ball.x, this.ball.y, scoringTeam === 'red' ? '#e74c3c' : '#3498db', 35, 2.5);

    const bannerText = scoringTeam === 'red' ? '⚽ GOOOOL! KIRMIZI ATTI!' : '⚽ GOOOOL! MAVİ ATTI!';
    gameManager.showBanner(bannerText, 2200, () => {
      this.resetPositions();
      this.goalCelebration = false;
    });

    this.updateScoreboard();
  }

  updateScoreboard() {
    const redEl = document.getElementById('hb-red-score');
    const blueEl = document.getElementById('hb-blue-score');
    if (redEl) redEl.textContent = this.redScore;
    if (blueEl) blueEl.textContent = this.blueScore;
  }

  // Futbol Botu Beyni
  getBotInput(botIndex) {
    const bot = this.players[botIndex];
    if (!bot) return {};

    const dx = this.ball.x - bot.x;
    const dy = this.ball.y - bot.y;
    const dist = Math.hypot(dx, dy);

    // Kendi kalesine değil rakip kaleye doğru yönel
    const targetGoalX = bot.team === 'red' ? (this.pitch.x + this.pitch.width) : this.pitch.x;
    const inKickRange = dist < bot.radius + this.ball.radius + 12;

    return {
      left: dx < -15,
      right: dx > 15,
      up: dy < -15,
      down: dy > 15,
      punch: inKickRange, // Yaklaştığında vur
      kick: inKickRange
    };
  }

  // Sahayı Çiz (HaxBall Klasik Stadyumu)
  draw() {
    // 1. Dış Çim / Stadyum Zemin
    ctx.fillStyle = '#557a46';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Ana Saha (Koyu HaxBall Çimi)
    ctx.fillStyle = '#718c5a';
    ctx.fillRect(this.pitch.x, this.pitch.y, this.pitch.width, this.pitch.height);

    // Saha Çizgileri
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;

    // Dış Sınır
    ctx.strokeRect(this.pitch.x, this.pitch.y, this.pitch.width, this.pitch.height);

    // Orta Çizgi
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, this.pitch.y);
    ctx.lineTo(canvas.width / 2, this.pitch.y + this.pitch.height);
    ctx.stroke();

    // Orta Yuvarlak
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 75, 0, Math.PI * 2);
    ctx.stroke();

    // Orta Nokta
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Kaleler
    const goalTop = canvas.height / 2 - this.pitch.goalWidth / 2;

    // Sol Kale (Kırmızı Savunur / Mavi Atar)
    ctx.fillStyle = 'rgba(231, 76, 60, 0.25)';
    ctx.fillRect(this.pitch.x - this.pitch.goalDepth, goalTop, this.pitch.goalDepth, this.pitch.goalWidth);
    ctx.strokeRect(this.pitch.x - this.pitch.goalDepth, goalTop, this.pitch.goalDepth, this.pitch.goalWidth);

    // Sağ Kale (Mavi Savunur / Kırmızı Atar)
    ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
    ctx.fillRect(this.pitch.x + this.pitch.width, goalTop, this.pitch.goalDepth, this.pitch.goalWidth);
    ctx.strokeRect(this.pitch.x + this.pitch.width, goalTop, this.pitch.goalDepth, this.pitch.goalWidth);

    // Kale Direkleri (Direk Noktaları)
    const drawPost = (x, y) => {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawPost(this.pitch.x, goalTop);
    drawPost(this.pitch.x, goalTop + this.pitch.goalWidth);
    drawPost(this.pitch.x + this.pitch.width, goalTop);
    drawPost(this.pitch.x + this.pitch.width, goalTop + this.pitch.goalWidth);

    ctx.restore();

    // 3. Topu Çiz
    ctx.save();
    // Top Gölgesi
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.ball.x, this.ball.y + 4, this.ball.radius, this.ball.radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top Gövdesi
    ctx.fillStyle = this.ball.color;
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Oyuncuları Çiz (HaxBall Diskleri)
    this.players.forEach(p => {
      ctx.save();
      // Disk Gölgesi
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 5, p.radius, p.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vuruş Efekti (Kick Ring)
      if (p.isKicking) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ana Disk Gövdesi
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Numara / Avatar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Press Start 2P", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x, p.y);
      ctx.restore();
    });
  }

  // Network Senkronizasyonu
  getSnapshot() {
    return {
      ball: {
        x: Math.round(this.ball.x),
        y: Math.round(this.ball.y),
        vx: Math.round(this.ball.vx * 10) / 10,
        vy: Math.round(this.ball.vy * 10) / 10
      },
      players: this.players.map(p => ({
        id: p.id,
        x: Math.round(p.x),
        y: Math.round(p.y),
        vx: Math.round(p.vx * 10) / 10,
        vy: Math.round(p.vy * 10) / 10,
        isKicking: p.isKicking
      })),
      redScore: this.redScore,
      blueScore: this.blueScore
    };
  }

  applySnapshot(snap) {
    this.ball.x = snap.ball.x;
    this.ball.y = snap.ball.y;
    this.ball.vx = snap.ball.vx;
    this.ball.vy = snap.ball.vy;

    snap.players.forEach(pSnap => {
      const p = this.players.find(x => x.id === pSnap.id);
      if (p) {
        p.x = pSnap.x;
        p.y = pSnap.y;
        p.vx = pSnap.vx;
        p.vy = pSnap.vy;
        p.isKicking = pSnap.isKicking;
      }
    });

    this.redScore = snap.redScore;
    this.blueScore = snap.blueScore;
    this.updateScoreboard();
  }
}

const haramball = new HaramballEngine();
