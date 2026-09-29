import { serve } from '@hono/node-server';
import { app } from './server/app.js';
import { initDatabase } from './db/database.js';
import { initBot } from './bot/bot.js';
import { initCronJobs } from './services/cron.js';
import { config } from './config.js';

async function bootstrap() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🐱 CATATIN: Personal Finance Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Inisialisasi Database SQLite
  initDatabase();
  console.log('[DB] Database SQLite siap (WAL mode diaktifkan).');

  // 2. Jalankan HTTP Web Server
  const server = serve(
    {
      fetch: app.fetch,
      port: config.port
    },
    (info) => {
      console.log(`[Web] Server analitik berjalan di: http://localhost:${info.port}`);
    }
  );

  // 3. Inisialisasi & Jalankan Bot Telegram
  const bot = initBot();
  if (bot) {
    bot.start({
      onStart: (botInfo) => {
        console.log(`[Bot] Bot Telegram aktif sebagai @${botInfo.username}`);
      }
    }).catch((err) => {
      console.error('[Bot Error] Gagal menjalankan polling bot:', err);
    });
  } else {
    console.log('[Bot] Bot tidak aktif karena TELEGRAM_BOT_TOKEN kosong di .env.');
  }

  // 4. Inisialisasi Penjadwal Cron
  initCronJobs();

  // Graceful Shutdown
  const shutdown = () => {
    console.log('\n[System] Mematikan server secara aman...');
    if (bot) bot.stop();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Fatal Error] Gagal memulai aplikasi Catatin:', err);
  process.exit(1);
});
