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
   - Oyuna girer ve **"Oda Kur & Kod Al"** butonuna basar.
   - Oluşan oda kodunu ya da **"🔗 Katılım Linkini Kopyala"** butonuna basarak linki 2 arkadaşına WhatsApp/Discord'dan atar.
2. **Katılımcılar (Misafirler):**
   - Arkadaşları linke tıkladıklarında oda kodu otomatik dolar; sadece **"Katıl"** derler.
3. **Başlangıç:**
   - 2 veya 3 kişi bağlandığında kurucu **"DÖVÜŞÜ BAŞLAT!"** butonuna basar ve maç başlar!

---

## 🕹️ Kontroller

### Online Modda (Herkes Kendi Bilgisayarında):
- **W / A / S / D:** Koşma, Zıplama (Çift Zıplama destekli), Çökme
- **F:** Seri Yumruk
- **G:** Ağır Tekme (Yüksek hasar & geri savurma)
- **H:** Özel Güç (Ateş / Buz / Yıldırım Topu - Enerji gerektirir)
- **Space (Boşluk):** Blok Kalkanı (%80 hasar indirimi)

---

## 🏆 Özellikler
- **3 Kişilik Free-For-All Arenası:** 3 dövüşçü aynı anda birbirine saldırabilir.
- **Yüzen Neon Platformlar:** Rakipten kaçmak veya yüksekten saldırmak için zıplanabilir zeminler.
- **Gecikmesiz WebRTC Bağlantısı:** Veriler doğrudan oyuncuların tarayıcıları arasında akar.
- **Dahili Arcade Sesleri:** Web Audio API ile sıfır harici dosya gecikmesiz sentetik retro sesler.
