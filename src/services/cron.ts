import cron from 'node-cron';
import { InlineKeyboard } from 'grammy';
import { getWeeklyComparison, getCategoryBreakdown } from '../db/database.js';
import { formatWeeklyRecap } from '../bot/formatters.js';
import { sendNotificationToAdmin } from '../bot/bot.js';
import { config } from '../config.js';

export async function runWeeklyRecapJob(serverPublicUrl = ''): Promise<boolean> {
  console.log('[Cron] Menjalankan rekap mingguan otomatis...');
  const comparison = getWeeklyComparison();
  const topCategories = getCategoryBreakdown(comparison.currentWeekStart, comparison.currentWeekEnd);
  const message = formatWeeklyRecap(comparison, topCategories);

  const webUrl = serverPublicUrl || `http://localhost:${config.port}`;
  const keyboard = new InlineKeyboard().webApp('📊 Buka Dashboard Analitik', webUrl);

  const sent = await sendNotificationToAdmin(message, keyboard);
  if (sent) {
    console.log('[Cron] Notifikasi rekap mingguan berhasil dikirim ke Telegram.');
  } else {
    console.warn('[Cron] Notifikasi rekap mingguan gagal dikirim (mungkin bot belum terkonfigurasi).');
  }
  return sent;
}

export function initCronJobs(serverPublicUrl = '') {
  // Setiap hari Minggu pukul 21:00 WIB (Asia/Jakarta)
  // Format cron: menit jam tgl bln hari (0 = Minggu)
  const task = cron.schedule(
    '0 21 * * 0',
    async () => {
      await runWeeklyRecapJob(serverPublicUrl);
    },
    {
      timezone: 'Asia/Jakarta'
    }
  );

  console.log('[Cron] Jadwal rekap mingguan diaktifkan: Setiap Minggu pukul 21:00 WIB');
  return task;
}
