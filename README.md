# 🐱 Catatin — Personal Finance Tracker

Aplikasi pencatatan keuangan pribadi serba cepat berbasis **Bot Telegram** (untuk input santai berbahasa Indonesia diparsing oleh AI) dan **Web Dashboard Mobile-Friendly** (untuk analitik perbandingan mingguan, tren hemat/boros, dan grafik kategori).

Dibangun dengan arsitektur efisien: **Node.js (TypeScript) + SQLite (WAL Mode) + Hono + grammY + Vite**.  
Dirancang khusus untuk konsumsi RAM sangat irit di VPS (**< 70MB RAM**) dan patuh pada prinsip estetika **Anti-Slop UI**.

---

## 🚀 Fitur Unggulan

1. **Input Percakapan Santai (Natural Language AI):**
   * Cukup kirim chat bebas di Telegram: *"tadi siang makan padang 25rb"*, *"bensin 30k sama kopi 18rb"*, atau *"kemarin belanja di indomaret 65rb"*.
   * Menggunakan model murah/cepat **Google Gemini Flash** dengan **fallback otomatis** ke provider kompatibel OpenAI / OpenRouter jika limit.
   * Dilengkapi *Smart Regex Fallback* jika sewaktu-waktu koneksi AI offline.
2. **Peringatan Boros Otomatis (Real-time Budget Alert):**
   * Notifikasi Telegram otomatis saat pengeluaran mingguan menyentuh **80% (Waspada)** atau **100%+ (Overbudget)**.
   * Menyebutkan kategori yang paling banyak menguras kantong.
3. **Rekap Mingguan via Cron:**
   * Berjalan otomatis setiap **Minggu malam pukul 21:00 WIB**.
   * Menampilkan status apakah Anda **lebih hemat** atau **lebih boros** dari minggu lalu (lengkap dengan persentase & selisih rupiah), target budget, dan top 3 kategori pengeluaran.
4. **Web Dashboard Mobile-First:**
   * Dibangun dengan **Vite** yang sangat ringan (< 10KB gzipped).
   * Grafik harian komparatif (Senin s.d. Minggu: Minggu ini vs Minggu lalu).
   * Visualisasi proporsi kategori pengeluaran.
   * Auto-login instan saat dibuka dari Telegram Web App, atau via keypad PIN jika diakses lewat browser umum di HP.
   * Port default unik: **`7878`**.

---

## 🛠️ Persiapan & Konfigurasi

### 1. Dapatkan Kredensial

1. **Token Bot Telegram:**
   * Buka [@BotFather](https://t.me/BotFather) di Telegram.
   * Kirim perintah `/newbot` dan ikuti petunjuk hingga mendapatkan token bot (misal: `123456:ABC-DEF...`).
2. **ID Akun Telegram Anda:**
   * Buka [@userinfobot](https://t.me/userinfobot) di Telegram untuk melihat ID angka Anda (misal: `987654321`).
3. **API Key Google Gemini (Gratis & Murah):**
   * Dapatkan di [Google AI Studio](https://aistudio.google.com/).
4. **(Opsional) Fallback AI Key:**
   * Kunci API dari [OpenRouter](https://openrouter.ai/) atau provider kompatibel OpenAI.

### 2. Konfigurasi File `.env`

Salin template konfigurasi:
```bash
cp .env.example .env
```

Sesuaikan isian di file `.env`:
```env
PORT=7878
ADMIN_TELEGRAM_ID=987654321
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
DASHBOARD_PIN=1234
WEEKLY_BUDGET=500000
WARNING_THRESHOLD_PERCENT=80
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Fallback AI (Opsional)
FALLBACK_AI_API_KEY=
FALLBACK_AI_BASE_URL=https://openrouter.ai/api/v1
FALLBACK_AI_MODEL=deepseek/deepseek-chat
```

---

## 💻 Menjalankan di Lokal / Pengembangan

```bash
# 1. Instal dependencies
npm install

# 2. Build frontend web dashboard
npm run build:web

# 3. Jalankan server & bot (mode dev)
npm run dev
```

Buka peramban di: `http://localhost:7878`

---

## ☁️ Panduan Deploy ke VPS Anda

### Langkah 1: Clone & Build di VPS
```bash
cd /opt/catatin # atau direktori pilihan Anda
git clone <repo-url> .
npm install
npm run build
```

### Langkah 2: Jalankan via PM2 (Hemat Resource)
```bash
# Pastikan PM2 terinstal
npm install -g pm2

# Jalankan aplikasi dengan konfigurasi PM2
pm2 start ecosystem.config.cjs

# Simpan konfigurasi autostart saat VPS reboot
pm2 save
pm2 startup
```

### Langkah 3: Konfigurasi Reverse Proxy Nginx (Opsional / Recommended)
Jika menggunakan domain sendiri (misal `catatin.domainanda.com`), arahkan proxy ke port `7878`:

```nginx
server {
    server_name catatin.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:7878;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Langkah 4: Hubungkan Tombol Menu Telegram Web App
Di [@BotFather](https://t.me/BotFather):
1. Kirim `/mybots` -> Pilih bot Anda.
2. Pilih **Bot Settings** -> **Menu Button** -> **Configure menu button**.
3. Masukkan URL web dashboard Anda (misal `https://catatin.domainanda.com`).
4. Beri judul tombol: `📊 Dashboard`.

Sekarang, bot Anda akan memiliki tombol menu di samping kolom chat yang bisa ditekan kapan saja untuk membuka dashboard analitik langsung di dalam Telegram!

---

## 🧪 Perintah Bot Telegram

| Perintah | Deskripsi |
|---|---|
| `/start` | Memulai bot dan menampilkan panduan input |
| `/rekap` | Memicu laporan ringkasan mingguan seketika |
| `/budget <nominal>` | Mengubah target budget mingguan (contoh: `/budget 600000`) |
| `/web` | Mengirim tautan langsung dan info akses ke Web Dashboard |
| `Chat bebas` | Input transaksi pengeluaran santai secara otomatis |
# catatin
