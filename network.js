// WebRTC PeerJS Ağ Modülü (Netlify & GitHub Pages Uyumlu Sıfır Sunucu P2P)
class NetworkManager {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    this.roomCode = null;
    this.connections = []; // Host için bağlı client'lar [ { conn, playerId: 2 }, { conn, playerId: 3 } ]
    this.hostConn = null; // Client için host bağlantısı
    this.localPlayerId = 1; // Hangi karakteri yönettiğimiz (1: P1, 2: P2, 3: P3)
    this.isOnline = false;
    this.playerSlots = {
      1: { connected: false, name: 'Oyuncu 1 (Kırmızı)' },
      2: { connected: false, name: 'Oyuncu 2 (Mavi)' },
      3: { connected: false, name: 'Oyuncu 3 (Yeşil)' }
    };

    // Callback dinleyicileri
    this.onStateUpdate = null; // Client'ın hosttan gelen pozisyonları alması
    this.onInputReceived = null; // Host'un clientlardan tuş alması
    this.onLobbyChange = null;
    this.onGameStart = null;
  }

  // 4 Haneli temiz oda kodu üretici
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CYBER-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // 1. Oda Kurucu (Host) Olarak Başlat
  createRoom(onReady) {
    this.isHost = true;
    this.localPlayerId = 1;
    this.isOnline = true;
    this.roomCode = this.generateRoomCode();

    // PeerJS bağlantısı başlat (Doğrudan PeerJS Cloud)
    this.peer = new Peer(this.roomCode, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      this.playerSlots[1].connected = true;
      this.playerSlots[1].name = 'Sen (Host - P1)';
      if (onReady) onReady(this.roomCode);
      if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
    });

    // Misafir bağlantılarını kabul et
    this.peer.on('connection', (conn) => {
      if (this.connections.length >= 2) {
        conn.close(); // Maksimum 3 kişilik arena dolu
        return;
      }

      // Oyuncu ID belirle: P2 mi P3 mü?
      const assignedId = !this.playerSlots[2].connected ? 2 : 3;
      this.playerSlots[assignedId].connected = true;
      this.playerSlots[assignedId].name = `Misafir (P${assignedId})`;

      conn.on('open', () => {
        this.connections.push({ conn, playerId: assignedId });

        // Bağlanan oyuncuya kim olduğunu bildir
        conn.send({
          type: 'WELCOME',
          assignedPlayerId: assignedId,
          slots: this.playerSlots
        });

        // Tüm bağlı kullanıcılara lobi durumunu yay
        this.broadcastLobby();
        if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
      });

      // Misafirden gelen veriler (Tuş girdileri)
      conn.on('data', (data) => {
        if (data.type === 'INPUT' && this.onInputReceived) {
          this.onInputReceived(data.playerId, data.inputs);
        }
      });

      // Bağlantı koptuğunda
      conn.on('close', () => {
        this.playerSlots[assignedId].connected = false;
        this.connections = this.connections.filter(c => c.conn !== conn);
        this.broadcastLobby();
        if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
      });
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS Hatası:', err);
      // Kod çakıştıysa yeni kodla tekrar dene
      if (err.type === 'unavailable-id') {
        this.createRoom(onReady);
      }
    });
  }

  // 2. Odaya Katıl (Client)
  joinRoom(targetCode, onSuccess, onError) {
    this.isHost = false;
    this.isOnline = true;
    this.roomCode = targetCode.toUpperCase().trim();

    // Client için rastgele peer oluştur
    this.peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on('open', () => {
      // Host'a bağlan
      const conn = this.peer.connect(this.roomCode, { reliable: false });
      this.hostConn = conn;

      conn.on('open', () => {
        if (onSuccess) onSuccess();
      });

      conn.on('data', (data) => {
        if (data.type === 'WELCOME') {
          this.localPlayerId = data.assignedPlayerId;
          this.playerSlots = data.slots;
          this.playerSlots[this.localPlayerId].name = `Sen (P${this.localPlayerId})`;
          if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
        } else if (data.type === 'LOBBY_UPDATE') {
          this.playerSlots = data.slots;
          this.playerSlots[this.localPlayerId].name = `Sen (P${this.localPlayerId})`;
          if (this.onLobbyChange) this.onLobbyChange(this.playerSlots);
        } else if (data.type === 'START_GAME') {
          if (this.onGameStart) this.onGameStart();
        } else if (data.type === 'STATE_SNAPSHOT') {
          if (this.onStateUpdate) this.onStateUpdate(data.payload);
        }
      });

      conn.on('close', () => {
        alert('Oda kurucusuyla bağlantı koptu!');
        location.reload();
      });

      conn.on('error', (err) => {
        if (onError) onError(err);
      });
    });

    this.peer.on('error', (err) => {
      if (onError) onError(err);
    });
  }

  // Lobi bilgisini herkese dağıt
  broadcastLobby() {
    this.connections.forEach(({ conn }) => {
      if (conn.open) {
        conn.send({
          type: 'LOBBY_UPDATE',
          slots: this.playerSlots
        });
      }
    });
  }

  // Host oyunu başlattığında
  broadcastStartGame() {
    this.connections.forEach(({ conn }) => {
      if (conn.open) {
        conn.send({ type: 'START_GAME' });
      }
    });
  }

  // Host: Oyun durumu snapshot'ını client'lara yayınla
  broadcastState(statePayload) {
    if (!this.isHost) return;
    this.connections.forEach(({ conn }) => {
      if (conn.open) {
        conn.send({
          type: 'STATE_SNAPSHOT',
          payload: statePayload
        });
      }
    });
  }

  // Client: Tuş hareketlerini host'a gönder
  sendInputs(inputs) {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'INPUT',
        playerId: this.localPlayerId,
        inputs
      });
    }
  }

  // Temiz çıkış
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
