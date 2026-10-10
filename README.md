# 🥊 CYBER STRIKE - 3 Kişilik Online Dövüş Arenası

WebRTC (PeerJS) tabanlı, hiçbir harici sunucuya ihtiyaç duymadan doğrudan tarayıcılar arası (P2P) çalışan, **Netlify** ve **GitHub Pages** ile %100 uyumlu 3 kişilik online dövüş oyunu!

---

## 🚀 Netlify veya GitHub Pages ile Nasıl Yayına Alınır?

Bu proje tamamen statik dosyalardan (`index.html`, `style.css`, `game.js`, `network.js`, `audio.js`) oluştuğu için **ücretsiz** ve **anında** yayına alabilirsiniz:

### 1. Netlify ile Yayınlama (En Hızlı Yöntem - 30 Saniye)
1. [netlify.com](https://www.netlify.com) adresine ücretsiz kaydolun veya giriş yapın.
2. Dashboard ekranında **"Add new site"** -> **"Deploy manually"** seçeneğine tıklayın.
3. Masaüstünüzdeki `oyuna` klasörünü sürükleyip Netlify ekranına bırakın!
4. Netlify size anında çalışan bir link verecektir (Örn: `cyber-strike.netlify.app`).

### 2. GitHub + Netlify / GitHub Pages ile Yayınlama
1. GitHub üzerinde yeni bir repo oluşturun (Örn: `cyber-strike`).
2. Bu klasördeki dosyaları git ile yükleyin:
   ```bash
   git init
   git add .
   git commit -m "Cyber Strike 3-player online arena"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/cyber-strike.git
   git push -u origin main
   ```
3. **GitHub Pages için:** Reponuzun `Settings` -> `Pages` bölümünden `Branch: main` seçip kaydedin.
4. **Netlify için:** Netlify paneline gidip `Import from Git` diyerek bu repoyu bağlayın.

---

## 🎮 Arkadaşlarla Nasıl Oynanır?

1. **Kurucu (Host):**
   - **"Oda Kur & Kod Al"** butonuna basar.
   - Oluşan 5 haneli kodu ya da **"🔗 Katılım Linkini Kopyala"** diyerek linki arkadaşlarına atar.
2. **Katılımcılar (Misafirler):**
   - Arkadaşlarınız linke tıkladığı anda **hiçbir tuşa basmadan otomatik olarak odaya bağlanır!**
3. **Başlangıç & Bot Desteği:**
   - **Eksik Oyuncu mu Var?** Ekranda açık olan `🤖 Eksik oyuncuları BOT ile doldur` seçeneği sayesinde ister **1 kişi + 2 Bot**, ister **2 kişi + 1 Bot**, ister **3 gerçek kişi** hemen maçı başlatabilirsiniz!
   - Canlı bağlantı durumu alt konsoldan anbean takip edilebilir.

---

## 🛡️ NAT & Güvenlik Duvarı Engelleri Çözüldü
- **Açık TURN/STUN Röleleri Eklendi:** Farklı internet sağlayıcıları (Superonline, TTNet, Vodafone vb.) arasındaki CGNAT ve güvenlik duvarı engellerini aşmak için açık TURN aktarıcıları entegre edildi.
- **Sıfır Çakışma:** Özel oda isim alanı (`cs3p_room_...`) sayesinde diğer oyunlarla oda kodu karışması engellendi.

---

## 🕹️ Kontroller

### 🖱️ Mouse & Klavye (En Akıcı Deneyim):
- **🖱️ Sol Tık:** Hızlı Yumruk (Light Punch)
- **🖱️ Sağ Tık:** Ağır Tekme (Heavy Kick & Knockback)
- **⚙️ Orta Tık (Tekerlek) veya Q / E:** Özel Yetenek (Ateş / Buz / Yıldırım Topu)
- **🛡️ Space (Boşluk) veya Shift:** Blok Kalkanı (%80 hasar koruması)
- **W / A / S / D:** Koşma, Çift Zıplama, Eğilme
- **🎯 Mouse ile Yön Belirleme:** Mouse imleciniz hangi yöne bakarsa dövüşçünüz anında o yöne döner ve saldırıyı oraya yapar!

*(İsteyen oyuncular klavyedeki F / G / H tuşlarıyla da klasik tarzda saldırabilir).*

---

## 🏆 Özellikler
- **3 Kişilik Free-For-All Arenası:** 3 dövüşçü aynı anda birbirine saldırabilir.
- **Yüzen Neon Platformlar:** Rakipten kaçmak veya yüksekten saldırmak için zıplanabilir zeminler.
- **Gecikmesiz WebRTC Bağlantısı:** Veriler doğrudan oyuncuların tarayıcıları arasında akar.
- **Dahili Arcade Sesleri:** Web Audio API ile sıfır harici dosya gecikmesiz sentetik retro sesler.
