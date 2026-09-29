# Catatin: Personal Finance Bot & Mobile Analytics Dashboard
Dokumentasi Desain Sistem & Panduan Arsitektur (Final Design Specification)

---

## 1. Ringkasan Kebutuhan (Understanding Summary)

* **Nama Produk:** Catatin (Personal Finance Tracker)
* **Tujuan Utama:** Aplikasi pencatatan keuangan pribadi serba cepat dan otomatis yang memadukan kenyamanan chat di Telegram dengan ketajaman visual analitik mingguan di web mobile-friendly.
* **Target Pengguna:** Penggunaan tunggal (*single user*), dikhususkan untuk pemilik bot melalui verifikasi ID Telegram.
* **Fitur Utama:**
  1. **Input Natural Language via AI:** Pengguna mencatat transaksi melalui chat santai ke Telegram Bot (misal: *"tadi siang makan padang 25rb sama isi bensin 30k"*). AI mengekstrak nominal, kategori, tanggal, dan deskripsi secara otomatis.
  2. **Dual-Engine AI Failover:** Prioritas utama menggunakan **Google Gemini Flash** (sangat murah, akurat bahasa Indonesia, dan kuota melimpah). Dilengkapi **fallback otomatis ke provider OpenAI-compatible / OpenRouter** jika limit/error.
  3. **Peringatan Boros Proaktif (Real-Time Alert):** Notifikasi otomatis ke Telegram ketika pengeluaran mingguan menyentuh ambang batas waspada (80%) atau menembus target budget (100%+ Overbudget).
  4. **Rekap Mingguan via Cron:** Cron job otomatis setiap hari Minggu pukul 21.00 WIB untuk menghitung komparasi pengeluaran (lebih hemat atau lebih boros dari minggu lalu), top spender, dan mengirim pesan rangkuman beserta tombol langsung ke Web Dashboard.
  5. **Web Dashboard Mobile-Friendly (Vite):** Tampilan analitik ringan dan responsif untuk smartphone yang memvisualisasikan perbandingan hari demi hari (minggu ini vs minggu lalu), distribusi kategori, dan riwayat mutasi.
  6. **Autentikasi Aman & Praktis:** Auto-login instan saat dibuka via Telegram Web App (validasi HMAC-SHA256 `initData`), serta form input PIN sederhana jika diakses dari peramban biasa.

---

## 2. Asumsi & Kebutuhan Non-Fungsional

1. **Efisiensi Sumber Daya VPS:** Total konsumsi memori RAM ditargetkan **< 75 MB** di VPS. Backend dan Bot berjalan dalam satu proses Node.js.
2. **Keamanan & Privasi:**
   * Bot Telegram hanya merespons pesan dari akun yang sesuai dengan konfigurasi `ADMIN_TELEGRAM_ID`.
   * Akses ke API Dashboard terlindungi token sesi terenkripsi (setelah validasi PIN atau Telegram WebApp).
3. **Penyimpanan Lokal:** Menggunakan **SQLite dengan WAL mode** (*Write-Ahead Logging*). Seluruh data tersimpan dalam 1 file `catatin.db`, mempermudah pencadangan data (*zero-maintenance*).
4. **Non-Goals:** Tidak mendukung pendaftaran multi-user publik dan tidak terhubung ke mutasi rekening bank otomatis.

---

## 3. Catatan Keputusan (Decision Log)

| ID | Keputusan | Alternatif Dipertimbangkan | Rationale / Alasan Pemilihan |
|---|---|---|---|
| **DEC-01** | Monolith 1 Proses Node.js | Multi-proses terpisah / Microservices | Sangat hemat RAM VPS, zero network overhead untuk notifikasi bot, 1 port web. |
| **DEC-02** | Google Gemini Flash + Fallback Provider | Local LLM (Ollama) / Cloud LLM berbayar mahal | Gemini Flash sangat murah & akurat; fallback menjamin bot tidak pernah mogok saat kuota habis. |
| **DEC-03** | Telegram Web App + PIN Sederhana | OAuth2 / Login Google / Tanpa Password | Pengalaman buka 1 klik dari Telegram tanpa ketik password; tetap aman saat dibuka di browser eksternal. |
| **DEC-04** | Vite + Vanilla TS / CSS (Anti-Slop) | Next.js / Nuxt / Tailwind bloat | Ukuran bundle super kecil (< 40KB gzipped), instan dibuka di koneksi HP, bebas boilerplate berat. |
| **DEC-05** | SQLite (WAL mode) | PostgreSQL / MySQL | Zero maintenance daemon, tidak memakan RAM tambahan di VPS, backup mudah via file copy. |

---

## 4. Arsitektur Teknis Sistem

```
+-----------------------------------------------------------------------+
|                              VPS HOST                                 |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |                 Catatin Unified Node.js Server                  |  |
|  |                                                                 |  |
|  |  +--------------------+   +----------------------------------+  |  |
|  |  | Telegram Bot Engine|   |   Hono Web Server & REST API     |  |  |
|  |  | (grammY Polling)   |   |   - Port 7878 (Configurable)      |  |  |
|  |  |                    |   |   - Serve Vite Static Assets     |  |  |
|  |  +---------+----------+   |   - Auth & Analytics Endpoint    |  |  |
|  |            |              +----------------+-----------------+  |  |
|  |            v                               |                    |  |
|  |     +--------------+                       |                    |  |
|  |     | AI Parser    |                       |                    |  |
|  |     | (Gemini /    |                       |                    |  |
|  |     |  OpenRouter) |                       |                    |  |
|  |     +------+-------+                       |                    |  |
|  |            |                               |                    |  |
|  |            +--------------+   +------------+                    |  |
|  |                           |   |                                 |  |
|  |                           v   v                                 |  |
|  |            +------------------------------------+               |  |
|  |            |         SQLite (WAL Mode)          |               |  |
|  |            |     transactions, budgets, logs    |               |  |
|  |            +------------------+-----------------+               |  |
|  |                               ^                                 |  |
|  |  +----------------------------+----+                            |  |
|  |  | Node-Cron Scheduler             |                            |  |
|  |  | - Setiap Minggu 21:00 WIB       |                            |  |
|  |  | - Evaluasi alert budget         |                            |  |
|  |  +---------------------------------+                            |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

---

## 5. Skema Database (SQLite)

```sql
-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  amount INTEGER NOT NULL,            -- Dalam Rupiah
  category TEXT NOT NULL,            -- makan, bensin, kopi, jajan, belanja, lainnya
  description TEXT NOT NULL,         -- Catatan pengeluaran
  raw_message TEXT,                  -- Teks asli dari chat Telegram
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indeks performa query analitik mingguan
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Tabel Pengaturan & Budget
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Contoh inisialisasi settings:
-- weekly_budget: 500000
-- warning_threshold_pct: 80
-- pin_hash: bcrypt / sha256 hash
-- last_alert_week: 2026-W39 (mencegah spam alert)
```

---

## 6. Alur Pemrosesan AI & Fallback

1. **Input Telegram:** Pengguna mengirim chat ke bot.
2. **Otentikasi:** Server memastikan `msg.from.id === ADMIN_TELEGRAM_ID`.
3. **Ekstraksi Terstruktur (Prompting):**
   * Input: Chat pengguna + tanggal referensi saat ini.
   * Model mengembalikan format JSON строго:
   ```json
   {
     "items": [
       {
         "date": "2026-09-29",
         "amount": 25000,
         "category": "makan",
         "description": "Nasi Padang"
       }
     ]
   }
   ```
4. **Fallback Handler:**
   ```typescript
   async function parseExpense(text: string) {
     try {
       return await callGeminiFlash(text);
     } catch (err) {
       console.warn("Gemini limit/error, falling back to OpenAI/OpenRouter:", err);
       return await callFallbackProvider(text);
     }
   }
   ```
5. **Evaluasi Budget & Balasan:**
   * Simpan data ke database SQLite.
   * Hitung total pengeluaran minggu ini:
     * Jika total ≥ 100% budget: Kirim notifikasi **🚨 OVERBUDGET**.
     * Jika total ≥ 80% budget dan belum pernah dikirim minggu ini: Kirim notifikasi **⚠️ WASPADA**.
     * Balas pesan transaksi tersimpan dengan ringkasan rapi dan tombol batalkan.

---

## 7. Desain Antarmuka Web Dashboard (Standar Anti-Slop UI)

Mengacu pada aturan ketat `antislop-ui`:
1. **Warna & Permukaan:**
   * Latar Belakang: `#0B0F19` (Slate Dalam).
   * Permukaan Kartu: `#151E2E` dengan garis tepi tipis `1px solid rgba(255,255,255,0.08)`.
   * Aksen Tunggal: `#0D9488` (Teal Finansial).
   * Status Warna Semantik:
     * Hijau `#10B981` (Lebih Hemat / Sisa Budget Aman).
     * Merah `#EF4444` (Lebih Boros / Overbudget).
     * Kuning `#F59E0B` (Waspada 80%).
2. **Tipografi:** Sans-serif bersih dengan angka bergaya tabular (`tabular-nums`) agar nilai nominal rupiah rata sejajar.
3. **Bebas Slop:**
   * Tanpa gradien biru-ungu default AI.
   * Tanpa emoji dekoratif berlebihan (hanya ikon monokromatik fungsional SVG).
   * Tanpa metrik dummy atau grafik kosong tanpa pertanyaan.
4. **Visualisasi Data:**
   * **Grafik 1 (Bar Chart):** *"Perbandingan Harian: Minggu Ini vs Minggu Lalu"*.
   * **Grafik 2 (Donut Chart):** *"Distribusi Kategori Minggu Ini"*.
   * **Kartu Status Utama:** Menjawab satu pertanyaan penting: *"Berapa pengeluaranku minggu ini dan apakah lebih hemat dari minggu lalu?"*.

---

## 8. Panduan Deployment VPS Sederhana

* Dapat dijalankan menggunakan **PM2** atau **Docker**.
* Menggunakan reverse proxy (Nginx atau Cloudflare Tunnel) mengarah ke port internal `:7878`.
* Variabel Lingkungan (`.env`):
  * `TELEGRAM_BOT_TOKEN`
  * `ADMIN_TELEGRAM_ID`
  * `GEMINI_API_KEY`
  * `FALLBACK_AI_API_KEY`
  * `FALLBACK_AI_BASE_URL` (misal OpenRouter atau OpenAI)
  * `FALLBACK_AI_MODEL`
  * `DASHBOARD_PIN` (default PIN akses)
  * `PORT=7878` (Port unik default, bebas diubah sesuai kebutuhan VPS)
