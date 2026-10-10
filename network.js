// WebRTC PeerJS Gelişmiş Ağ Yöneticisi (NAT Delme & TURN/STUN Desteği)
class NetworkManager {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    this.roomCode = null;
    this.connections = []; // Host: [ { conn, playerId: 2 }, { conn, playerId: 3 } ]
    this.hostConn = null; // Client: host bağlantısı
    this.localPlayerId = 1;
    this.isOnline = false;
    this.botEnabled = true; // Boş slotları AI bot doldurur

    this.playerSlots = {
      1: { connected: false, name: 'Oyuncu 1 (Kırmızı)', isBot: false },
      2: { connected: false, name: 'Oyuncu 2 (Mavi)', isBot: false },
      3: { connected: false, name: 'Oyuncu 3 (Yeşil)', isBot: false }
    };

    // Callback dinleyicileri
    this.onStateUpdate = null;
    this.onInputReceived = null;
    this.onLobbyChange = null;
    this.onGameStart = null;
    this.onLog = null;
  }

  log(msg, type = 'info') {
    console.log(`[NET] ${msg}`);
    if (this.onLog) this.onLog(msg, type);
  }

  // 5 Haneli Temiz Oda Numarası
  generateRoomCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  // Global çakışmayı önlemek için benzersiz Peer ID
  getPeerIdForRoom(code) {
    return `cs3p_room_${code}`;
  }

  // Gelişmiş ICE / STUN / TURN Yapılandırması (Türkiye ISP'leri & CGNAT Desteği)
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

  // 1. Oda Kur (Host)
  createRoom(onReady, onError) {
    this.isHost = true;
    this.localPlayerId = 1;
    this.isOnline = true;
    this.roomCode = this.generateRoomCode();
    const peerId = this.getPeerIdForRoom(this.roomCode);

    this.log(`Oda sunucusuna bağlanılıyor (Kod: ${this.roomCode})...`);

    if (this.peer) this.peer.destroy();

    this.peer = new Peer(peerId, {
      debug: 1,
      config: this.getIceConfig()
    });

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      this.playerSlots[1].connected = true;
      this.playerSlots[1].name = 'Sen (Host - P1)';
      this.playerSlots[1].isBot = false;

      this.log(`✅ Oda açıldı! Kod: ${this.roomCode}. Arkadaşlarını bekle.`, 'success');
      if (onReady) onReady(this.roomCode);
      if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
    });

    // Misafir bağlantılarını kabul et
    this.peer.on('connection', (conn) => {
      this.log(`Bir oyuncu bağlanmaya çalışıyor...`);

      // Boş slot bul (2 veya 3)
      let assignedId = null;
      if (!this.playerSlots[2].connected) assignedId = 2;
      else if (!this.playerSlots[3].connected) assignedId = 3;

      if (!assignedId) {
        this.log(`❌ Oda dolu! Yeni bağlantı reddedildi.`, 'warn');
        conn.close();
        return;
      }

      this.playerSlots[assignedId].connected = true;
      this.playerSlots[assignedId].name = `Arkadaşın (P${assignedId})`;
      this.playerSlots[assignedId].isBot = false;

      conn.on('open', () => {
        this.log(`🎉 Oyuncu ${assignedId} başarıyla odaya bağlandı!`, 'success');
        this.connections.push({ conn, playerId: assignedId });

        // Misafire hoş geldin ve slot bilgisini gönder
        conn.send({
          type: 'WELCOME',
          assignedPlayerId: assignedId,
          slots: this.playerSlots
        });

        this.broadcastLobby();
        if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
      });

      conn.on('data', (data) => {
        if (data.type === 'INPUT' && this.onInputReceived) {
          this.onInputReceived(data.playerId, data.inputs);
        }
      });

      conn.on('close', () => {
        this.log(`⚠️ Oyuncu ${assignedId} odadan ayrıldı.`, 'warn');
        this.playerSlots[assignedId].connected = false;
        this.connections = this.connections.filter(c => c.conn !== conn);
        this.broadcastLobby();
        if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
      });

      conn.on('error', (err) => {
        this.log(`Bağlantı hatası: ${err.message || err}`, 'error');
      });
    });

    this.peer.on('error', (err) => {
      this.log(`❌ Sunucu hatası: ${err.type || err}`, 'error');
      if (err.type === 'unavailable-id') {
        // Çakışma varsa yeni kodla hemen tekrar dene
        this.createRoom(onReady, onError);
      } else if (onError) {
        onError(err);
      }
    });

    this.peer.on('disconnected', () => {
      this.log(`Bağlantı kesildi, tekrar deneniyor...`, 'warn');
      this.peer.reconnect();
    });
  }

  // 2. Odaya Katıl (Client / Misafir)
  joinRoom(targetCode, onSuccess, onError) {
    this.isHost = false;
    this.isOnline = true;
    this.roomCode = targetCode.toString().trim();
    const hostPeerId = this.getPeerIdForRoom(this.roomCode);

    this.log(`Oda ${this.roomCode} aranıyor...`);

    if (this.peer) this.peer.destroy();

    // Client için rastgele peer oluştur
    this.peer = new Peer({
      debug: 1,
      config: this.getIceConfig()
    });

    this.peer.on('open', () => {
      this.log(`Kurucuya bağlanılıyor (${hostPeerId})...`);

      // reliable: true ile güvenli veri kanalı
      const conn = this.peer.connect(hostPeerId, {
        reliable: true
      });
      this.hostConn = conn;

      // 8 saniye zaman aşımı kontrolü
      const timeout = setTimeout(() => {
        if (!conn.open) {
          this.log(`❌ Zaman aşımı! Kurucu odayı henüz açmamış veya kod yanlış olabilir.`, 'error');
          if (onError) onError('Zaman aşımı! Oda bulunamadı.');
        }
      }, 9000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.log(`✅ Odaya başarıyla bağlandın! Kurucunun başlatması bekleniyor.`, 'success');
        if (onSuccess) onSuccess();
      });

      conn.on('data', (data) => {
        if (data.type === 'WELCOME') {
          this.localPlayerId = data.assignedPlayerId;
          this.playerSlots = data.slots;
          this.playerSlots[this.localPlayerId].name = `Sen (P${this.localPlayerId})`;
          this.log(`Dövüşçün belirlendi: OYUNCU ${this.localPlayerId}`, 'info');
          if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
        } else if (data.type === 'LOBBY_UPDATE') {
          this.playerSlots = data.slots;
          this.playerSlots[this.localPlayerId].name = `Sen (P${this.localPlayerId})`;
          if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
        } else if (data.type === 'START_GAME') {
          this.log(`🔥 DÖVÜŞ BAŞLIYOR!`, 'success');
          if (this.onGameStart) this.onGameStart();
        } else if (data.type === 'STATE_SNAPSHOT') {
          if (this.onStateUpdate) this.onStateUpdate(data.payload);
        }
      });

      conn.on('close', () => {
        this.log(`⚠️ Kurucu ile bağlantı koptu.`, 'warn');
        alert('Oda kurucusuyla bağlantı koptu!');
        location.reload();
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        this.log(`Bağlantı hatası: ${err.message || err}`, 'error');
        if (onError) onError(err);
      });
    });

    this.peer.on('error', (err) => {
      this.log(`❌ Hata: ${err.type || err}`, 'error');
      if (onError) onError(err);
    });
  }

  // Lobi durumunu tüm bağlı clientlara gönder
  broadcastLobby() {
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        conn.send({
          type: 'LOBBY_UPDATE',
          slots: this.playerSlots
        });
      }
    });
  }

  // Oyunu başlat
  broadcastStartGame() {
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        conn.send({ type: 'START_GAME' });
      }
    });
  }

  // Host: Oyun durumu snapshot'ını yayınla
  broadcastState(statePayload) {
    if (!this.isHost) return;
    this.connections.forEach(({ conn }) => {
      if (conn && conn.open) {
        conn.send({
          type: 'STATE_SNAPSHOT',
          payload: statePayload
        });
      }
    });
  }

  // Client: Tuşları host'a gönder
  sendInputs(inputs) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'INPUT',
        playerId: this.localPlayerId,
        inputs
      });
    }
  }

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
    }
    this.connections = [];
    this.hostConn = null;
    this.isOnline = false;
  }
}

const network = new NetworkManager();
