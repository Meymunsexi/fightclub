// WebRTC PeerJS Gelişmiş Ağ Yöneticisi (NAT Delme, Heartbeat & Kusursuz Yeniden Bağlanma)
class NetworkManager {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    this.roomCode = null;
    this.connections = []; // Host: [ { conn, playerId, missedHeartbeats: 0 } ]
    this.hostConn = null; // Client: host bağlantısı
    this.localPlayerId = 1;
    this.isOnline = false;
    this.botEnabled = true;

    this.playerSlots = {
      1: { connected: false, name: 'Oyuncu 1 (Kırmızı)', isBot: false },
      2: { connected: false, name: 'Oyuncu 2 (Mavi)', isBot: false },
      3: { connected: false, name: 'Oyuncu 3 (Yeşil)', isBot: false }
    };

    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Callback dinleyicileri
    this.onStateUpdate = null;
    this.onInputReceived = null;
    this.onLobbyChange = null;
    this.onGameStart = null;
    this.onNextRound = null;
    this.onReturnLobby = null;
    this.onLog = null;
  }

  log(msg, type = 'info') {
    console.log(`[NET] ${msg}`);
    if (this.onLog) this.onLog(msg, type);
  }

  generateRoomCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  getPeerIdForRoom(code) {
    return `cs3p_room_${code}`;
  }

  getIceConfig() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:openrelay.metered.ca:80' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelay',
          credential: 'openrelay'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelay',
          credential: 'openrelay'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelay',
          credential: 'openrelay'
        }
      ],
      iceCandidatePoolSize: 10
    };
  }

  // Ölü veya kopmuş bağlantıları temizle (Slotları anında serbest bırak)
  auditConnections() {
    let changed = false;

    // Açık olmayan bağlantıları listeden çıkar
    for (let i = this.connections.length - 1; i >= 0; i--) {
      const entry = this.connections[i];
      if (!entry.conn || !entry.conn.open || entry.missedHeartbeats >= 4) {
        this.log(`⚠️ Oyuncu ${entry.playerId} bağlantısı koptu (slot boşaltıldı).`, 'warn');
        this.playerSlots[entry.playerId].connected = false;
        try { if (entry.conn) entry.conn.close(); } catch(e) {}
        this.connections.splice(i, 1);
        changed = true;
      }
    }

    // Slot 2 ve 3 kontrolü
    [2, 3].forEach(id => {
      const hasActive = this.connections.some(c => c.playerId === id && c.conn && c.conn.open);
      if (!hasActive && this.playerSlots[id].connected) {
        this.playerSlots[id].connected = false;
        changed = true;
      }
    });

    if (changed) {
      this.broadcastLobby();
      if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
    }
  }

  // Host: Heartbeat (Nabız) Başlat
  startHeartbeat() {
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.isHost) return;

      this.connections.forEach(entry => {
        if (entry.conn && entry.conn.open) {
          entry.missedHeartbeats = (entry.missedHeartbeats || 0) + 1;
          try {
            entry.conn.send({ type: 'PING' });
          } catch(e) {}
        }
      });

      this.auditConnections();
    }, 1500);
  }

  // 1. Oda Kur (Host)
  createRoom(onReady, onError) {
    this.isHost = true;
    this.localPlayerId = 1;
    this.isOnline = true;
    this.roomCode = this.generateRoomCode();
    const peerId = this.getPeerIdForRoom(this.roomCode);

    this.log(`Oda sunucusuna bağlanılıyor (Kod: ${this.roomCode})...`);

    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
    }

    this.peer = new Peer(peerId, {
      debug: 1,
      config: this.getIceConfig()
    });

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      this.playerSlots[1].connected = true;
      this.playerSlots[1].name = 'Sen (Host - P1)';
      this.playerSlots[1].isBot = false;

      this.log(`✅ Oda açıldı! Kod: ${this.roomCode}. Arkadaşların katılabilir.`, 'success');
      this.startHeartbeat();

      if (onReady) onReady(this.roomCode);
      if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
    });

    // Misafir bağlantısı kabul et
    this.peer.on('connection', (conn) => {
      this.log(`Yeni oyuncu bağlanmaya çalışıyor...`);

      // Önce mevcut bağlantıları denetle (düşen varsa hemen temizle)
      this.auditConnections();

      // Boş slot bul (2 veya 3)
      let assignedId = null;
      if (!this.playerSlots[2].connected) assignedId = 2;
      else if (!this.playerSlots[3].connected) assignedId = 3;

      // Eğer slotlar dolu görünüyorsa ama eski bir bağlantı kapalıysa o slotu al
      if (!assignedId) {
        for (let i = 0; i < this.connections.length; i++) {
          if (!this.connections[i].conn || !this.connections[i].conn.open) {
            assignedId = this.connections[i].playerId;
            this.connections.splice(i, 1);
            break;
          }
        }
      }

      if (!assignedId) {
        this.log(`❌ Oda dolu! (Zaten 3 kişi var).`, 'warn');
        try { conn.send({ type: 'ROOM_FULL' }); } catch(e) {}
        setTimeout(() => conn.close(), 500);
        return;
      }

      conn.on('open', () => {
        this.log(`🎉 Oyuncu ${assignedId} başarıyla odaya bağlandı!`, 'success');
        this.playerSlots[assignedId].connected = true;
        this.playerSlots[assignedId].name = `Arkadaşın (P${assignedId})`;
        this.playerSlots[assignedId].isBot = false;

        // Eski kaydı varsa çıkar
        this.connections = this.connections.filter(c => c.playerId !== assignedId);
        this.connections.push({ conn, playerId: assignedId, missedHeartbeats: 0 });

        conn.send({
          type: 'WELCOME',
          assignedPlayerId: assignedId,
          slots: this.playerSlots
        });

        this.broadcastLobby();
        if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
      });

      conn.on('data', (data) => {
        if (data.type === 'PONG') {
          const entry = this.connections.find(c => c.conn === conn);
          if (entry) entry.missedHeartbeats = 0;
        } else if (data.type === 'INPUT' && this.onInputReceived) {
          this.onInputReceived(data.playerId, data.inputs);
        } else if (data.type === 'REQUEST_NEXT_ROUND' && this.onNextRound) {
          this.onNextRound();
        }
      });

      conn.on('close', () => {
        this.log(`⚠️ Oyuncu ${assignedId} ayrıldı.`, 'warn');
        this.playerSlots[assignedId].connected = false;
        this.connections = this.connections.filter(c => c.conn !== conn);
        this.broadcastLobby();
        if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
      });

      conn.on('error', (err) => {
        this.log(`Bağlantı hatası (P${assignedId}): ${err.message || err}`, 'warn');
        this.auditConnections();
      });
    });

    this.peer.on('error', (err) => {
      this.log(`❌ Sunucu hatası: ${err.type || err}`, 'error');
      if (err.type === 'unavailable-id') {
        this.createRoom(onReady, onError);
      } else if (onError) {
        onError(err);
      }
    });

    this.peer.on('disconnected', () => {
      this.log(`Sunucu bağlantısı koptu, yeniden bağlanılıyor...`, 'warn');
      try { this.peer.reconnect(); } catch(e) {}
    });
  }

  // 2. Odaya Katıl (Client)
  joinRoom(targetCode, onSuccess, onError) {
    this.isHost = false;
    this.isOnline = true;
    this.roomCode = targetCode.toString().trim();
    const hostPeerId = this.getPeerIdForRoom(this.roomCode);

    this.log(`Oda ${this.roomCode} aranıyor...`);

    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
    }

    this.peer = new Peer({
      debug: 1,
      config: this.getIceConfig()
    });

    this.peer.on('open', () => {
      this.log(`Kurucuya bağlanılıyor (${hostPeerId})...`);

      const conn = this.peer.connect(hostPeerId, {
        reliable: true
      });
      this.hostConn = conn;

      let isConnected = false;
      const timeout = setTimeout(() => {
        if (!isConnected && (!conn || !conn.open)) {
          this.log(`❌ Zaman aşımı! Kurucunun odayı açtığından emin olun.`, 'error');
          if (onError) onError('Zaman aşımı! Kurucu henüz odayı açmamış olabilir.');
        }
      }, 10000);

      conn.on('open', () => {
        isConnected = true;
        clearTimeout(timeout);
        this.reconnectAttempts = 0;
        this.log(`✅ Odaya bağlandın! Kurucu başlattığında oyun başlayacak.`, 'success');
        if (onSuccess) onSuccess();
      });

      conn.on('data', (data) => {
        if (data.type === 'PING') {
          try { conn.send({ type: 'PONG' }); } catch(e) {}
        } else if (data.type === 'WELCOME') {
          this.localPlayerId = data.assignedPlayerId;
          this.playerSlots = data.slots;
          this.playerSlots[this.localPlayerId].name = `Sen (P${this.localPlayerId})`;
          this.log(`Dövüşçün hazır: OYUNCU ${this.localPlayerId}`, 'info');
          if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
        } else if (data.type === 'LOBBY_UPDATE') {
          this.playerSlots = data.slots;
          this.playerSlots[this.localPlayerId].name = `Sen (P${this.localPlayerId})`;
          if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
        } else if (data.type === 'START_GAME') {
          this.log(`🔥 DÖVÜŞ BAŞLIYOR!`, 'success');
          if (this.onGameStart) this.onGameStart();
        } else if (data.type === 'NEXT_ROUND') {
          if (this.onNextRound) this.onNextRound();
        } else if (data.type === 'RETURN_LOBBY') {
          if (this.onReturnLobby) this.onReturnLobby();
        } else if (data.type === 'STATE_SNAPSHOT') {
          if (this.onStateUpdate) this.onStateUpdate(data.payload);
        } else if (data.type === 'ROOM_FULL') {
          this.log(`❌ Bu oda şu an tamamen dolu!`, 'error');
          alert('Bu oda dolu! Lütfen kurucunun birini çıkarmasını veya yeni oda açmasını isteyin.');
        } else if (data.type === 'KICKED') {
          this.log(`👢 Kurucu tarafından odadan atıldınız!`, 'error');
          alert('Kurucu tarafından odadan atıldınız!');
          this.disconnect();
          location.reload();
        } else if (data.type === 'ROOM_CLOSED') {
          this.log(`🔒 Kurucu odayı kapattı.`, 'warn');
          alert('Kurucu odayı kapattı.');
          this.disconnect();
          location.reload();
        } else if (data.type === 'GAME_TYPE_CHANGE') {
          if (this.onGameTypeChange) this.onGameTypeChange(data.gameType);
        }
      });

      conn.on('close', () => {
        this.log(`⚠️ Kurucu ile bağlantı koptu. Yeniden deneniyor...`, 'warn');
        this.handleAutoReconnect();
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        this.log(`Bağlantı hatası: ${err.message || err}`, 'warn');
        this.handleAutoReconnect();
      });
    });

    this.peer.on('error', (err) => {
      this.log(`❌ Hata: ${err.type || err}`, 'error');
      if (onError) onError(err);
    });
  }

  // Otomatik yeniden bağlanma
  handleAutoReconnect() {
    if (this.isHost || !this.roomCode) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.log(`🔄 Tekrar bağlanılıyor (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'info');
      setTimeout(() => {
        this.joinRoom(this.roomCode, null, null);
      }, 2000);
    } else {
      this.log(`❌ Bağlantı kurulamadı. Sayfayı yenileyip kodu tekrar deneyin.`, 'error');
    }
  }

  // Lobi bilgisini herkese dağıt
  broadcastLobby() {
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        try {
          conn.send({
            type: 'LOBBY_UPDATE',
            slots: this.playerSlots
          });
        } catch(e) {}
      }
    });
  }

  broadcastStartGame() {
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        try { conn.send({ type: 'START_GAME' }); } catch(e) {}
      }
    });
  }

  broadcastNextRound() {
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        try { conn.send({ type: 'NEXT_ROUND' }); } catch(e) {}
      }
    });
  }

  broadcastReturnLobby() {
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        try { conn.send({ type: 'RETURN_LOBBY' }); } catch(e) {}
      }
    });
  }

  broadcastState(statePayload) {
    if (!this.isHost) return;
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        try {
          conn.send({
            type: 'STATE_SNAPSHOT',
            payload: statePayload
          });
        } catch(e) {}
      }
    });
  }

  sendInputs(inputs) {
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send({
          type: 'INPUT',
          playerId: this.localPlayerId,
          inputs
        });
      } catch(e) {}
    }
  }

  requestNextRound() {
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send({ type: 'REQUEST_NEXT_ROUND' });
      } catch(e) {}
    }
  }

  // Kurucu: Belirli oyuncuyu odadan at
  kickPlayer(playerId) {
    if (!this.isHost) return;
    const entry = this.connections.find(c => c.playerId === playerId);
    if (entry && entry.conn) {
      try { entry.conn.send({ type: 'KICKED' }); } catch(e) {}
      setTimeout(() => {
        try { entry.conn.close(); } catch(e) {}
      }, 200);
    }
    this.connections = this.connections.filter(c => c.playerId !== playerId);
    this.playerSlots[playerId].connected = false;
    this.playerSlots[playerId].name = `Oyuncu ${playerId}`;
    this.log(`👢 Oyuncu ${playerId} kurucu tarafından odadan atıldı.`, 'warn');
    this.broadcastLobby();
    if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
  }

  // Kurucu: Odayı tamamen kapat
  closeRoom() {
    if (!this.isHost) return;
    this.log(`🔒 Oda kurucu tarafından kapatıldı.`, 'warn');
    this.connections.forEach(entry => {
      if (entry.conn && entry.conn.open) {
        try { entry.conn.send({ type: 'ROOM_CLOSED' }); } catch(e) {}
        try { entry.conn.close(); } catch(e) {}
      }
    });
    this.disconnect();
    this.roomCode = null;
    this.isHost = false;
    this.playerSlots[1].connected = false;
    this.playerSlots[2].connected = false;
    this.playerSlots[3].connected = false;
    if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
  }

  // Kurucu: Oyun Modunu Herkese Dağıt (FIGHT veya HARAMBALL)
  broadcastGameType(gameType) {
    if (!this.isHost) return;
    this.connections.forEach(entry => {
      if (entry.conn && entry.conn.open) {
        try { entry.conn.send({ type: 'GAME_TYPE_CHANGE', gameType }); } catch(e) {}
      }
    });
  }

  disconnect() {
    clearInterval(this.heartbeatTimer);
    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
    }
    this.connections = [];
    this.hostConn = null;
    this.isOnline = false;
  }
}

const network = new NetworkManager();
