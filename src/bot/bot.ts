import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import {
  insertTransactions,
  deleteTransaction,
  getWeeklyComparison,
  getCategoryBreakdown,
  getSalaryCycleSummary,
  setSetting,
  getSetting
} from '../db/database.js';
import { parseExpenseInput } from '../services/ai.js';
import { checkBudgetAlert } from '../services/budget.js';
import { formatTransactionSaved, formatWeeklyRecap, formatMonthlyRecap, formatRupiah } from './formatters.js';

export let bot: Bot | null = null;

export function initBot(serverPublicUrl = ''): Bot | null {
  if (!config.telegramBotToken) {
    console.warn('[Bot] TELEGRAM_BOT_TOKEN tidak ditemukan di konfigurasi. Bot Telegram dilewati.');
    return null;
  }

  bot = new Bot(config.telegramBotToken);

  // Middleware Auth: Hanya melayani ADMIN_TELEGRAM_ID
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;

    // Jika ADMIN_TELEGRAM_ID belum diset (masih 0), beri panduan
    if (!config.adminTelegramId || config.adminTelegramId === 0) {
      if (ctx.message?.text === '/start') {
        await ctx.reply(
          `👋 **Halo! Selamat datang di Catatin.**\n\n` +
          `ID Telegram Anda adalah:\n\`${userId}\`\n\n` +
          `Silakan salin ID di atas dan masukkan ke file \`.env\` pada variabel:\n` +
          `\`ADMIN_TELEGRAM_ID=${userId}\`\n\n` +
          `Setelah itu restart server untuk mengaktifkan proteksi bot khusus untuk Anda.`
        );
        return;
      }
      await ctx.reply(`⚠️ Konfigurasi keamanan belum lengkap. Set \`ADMIN_TELEGRAM_ID=${userId}\` di file .env.`);
      return;
    }

    if (userId !== config.adminTelegramId) {
      console.warn(`[Bot Security] Akses ditolak dari Telegram ID yang tidak terdaftar: ${userId}`);
      return; // Abaikan pesan dari orang asing secara senyap
    }

    await next();
  });

  // Helper Web URL yang aman (Hanya gunakan WebApp jika HTTPS)
  const getWebUrl = () => {
    return config.publicUrl || serverPublicUrl || `http://localhost:${config.port}`;
  };

  const addWebButton = (keyboard: InlineKeyboard, label = '📊 Buka Dashboard') => {
    const url = getWebUrl();
    if (url.startsWith('https://')) {
      return keyboard.webApp(label, url);
    } else if (url.startsWith('http://') && !url.includes('localhost')) {
      return keyboard.url(label, url);
    }
    return keyboard;
  };

  // Command /start
  bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard();
    addWebButton(keyboard, '📊 Buka Dashboard');
    keyboard.row()
      .text('📋 Rekap Minggu Ini', 'btn_rekap')
      .text('🗓️ Rekap Bulan Ini', 'btn_rekap_bulan');

    await ctx.reply(
      `👋 **Catatin Siap Digunakan!**\n\n` +
      `Kamu bisa mencatat pengeluaran secara santai kapan saja dengan mengirim chat biasa, contohnya:\n` +
      `• _"tadi siang makan padang 25rb"_\n` +
      `• _"isi bensin 30k, sama ngopi 18rb"_\n` +
      `• _"kemarin belanja indomaret 65.000"_\n\n` +
      `Perintah singkat:\n` +
      `• /rekap - Lihat ringkasan pengeluaran minggu ini (Senin - Minggu)\n` +
      `• /bulan - Lihat rekapan pengeluaran bulan ini (Siklus gajian tgl 25)\n` +
      `• /budget <angka> - Atur target budget mingguan (misal: /budget 500000)\n` +
      `• /web - Buka web dashboard analitik`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  });

  // Command /rekap
  bot.command('rekap', async (ctx) => {
    const comparison = getWeeklyComparison();
    const topCategories = getCategoryBreakdown(comparison.currentWeekStart, comparison.currentWeekEnd);
    const message = formatWeeklyRecap(comparison, topCategories);

    const keyboard = new InlineKeyboard();
    addWebButton(keyboard, '📊 Buka Dashboard Lengkap');
    keyboard.row().text('🗓️ Rekap Bulan Ini (Siklus Gajian)', 'btn_rekap_bulan');
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
  });

  // Command /bulan & /bulanan
  bot.command(['bulan', 'bulanan'], async (ctx) => {
    const summary = getSalaryCycleSummary();
    const message = formatMonthlyRecap(summary);

    const keyboard = new InlineKeyboard();
    addWebButton(keyboard, '📊 Buka Dashboard');
    keyboard.row().text('📋 Rekap Minggu Ini', 'btn_rekap');
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
  });

  // Command /budget
  bot.command('budget', async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1).join(' ').trim();
    if (!args) {
      const cur = getSetting('weekly_budget', config.weeklyBudget.toString());
      await ctx.reply(`🎯 Budget mingguan saat ini: **${formatRupiah(parseInt(cur, 10))}**.\n\nUntuk mengubah, ketik misal: \`/budget 600000\``, {
        parse_mode: 'Markdown'
      });
      return;
    }

    const cleanNum = parseInt(args.replace(/\D/g, ''), 10);
    if (isNaN(cleanNum) || cleanNum <= 0) {
      await ctx.reply('⚠️ Format nominal tidak valid. Contoh penggunaan: `/budget 500000`');
      return;
    }

    setSetting('weekly_budget', cleanNum.toString());
    await ctx.reply(`✅ Target budget mingguan berhasil diubah menjadi: **${formatRupiah(cleanNum)}**`, {
      parse_mode: 'Markdown'
    });
  });

  // Command /web
  bot.command('web', async (ctx) => {
    const keyboard = new InlineKeyboard();
    addWebButton(keyboard, '📊 Buka Web Dashboard');

    await ctx.reply(
      `🌐 **Web Dashboard Analitik (Akses Privat)**\n\n` +
      `Dashboard ini diproteksi secara privat dan hanya dapat dibuka langsung melalui aplikasi Telegram Anda.\n\n` +
      `Klik tombol di bawah untuk membuka dashboard seketika tanpa perlu login!`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  });

  // Callback Query (Handler tombol inline)
  bot.callbackQuery('btn_rekap', async (ctx) => {
    await ctx.answerCallbackQuery();
    const comparison = getWeeklyComparison();
    const topCategories = getCategoryBreakdown(comparison.currentWeekStart, comparison.currentWeekEnd);
    const message = formatWeeklyRecap(comparison, topCategories);
    const keyboard = new InlineKeyboard();
    addWebButton(keyboard, '📊 Buka Dashboard Lengkap');
    keyboard.row().text('🗓️ Rekap Bulan Ini (Siklus Gajian)', 'btn_rekap_bulan');
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
  });

  bot.callbackQuery('btn_rekap_bulan', async (ctx) => {
    await ctx.answerCallbackQuery();
    const summary = getSalaryCycleSummary();
    const message = formatMonthlyRecap(summary);
    const keyboard = new InlineKeyboard();
    addWebButton(keyboard, '📊 Buka Dashboard');
    keyboard.row().text('📋 Rekap Minggu Ini', 'btn_rekap');
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
  });

  bot.callbackQuery(/^delete_(\d+)$/, async (ctx) => {
    const id = parseInt(ctx.match[1], 10);
    const success = deleteTransaction(id);
    await ctx.answerCallbackQuery({
      text: success ? 'Transaksi berhasil dihapus' : 'Transaksi tidak ditemukan'
    });
    if (success) {
      await ctx.editMessageText('🗑️ Transaksi telah dibatalkan/dihapus.');
    }
  });

  // Listener Pesan Teks Bebas (Smart AI Parsing)
  bot.on('message:text', async (ctx) => {
    const userText = ctx.message.text.trim();
    if (userText.startsWith('/')) return; // Abaikan command yang tak dikenal

    // Indikator typing agar terasa responsif
    await ctx.replyWithChatAction('typing');

    try {
      const { items, engineUsed } = await parseExpenseInput(userText, new Date());

      if (items.length === 0) {
        await ctx.reply(
          `🤔 Aku belum bisa mengenali nominal atau pengeluaran di pesan itu.\n` +
          `Coba tulis seperti: _"makan siang 25rb"_ atau _"bensin 30k, kopi 15rb"_`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Simpan ke database
      const savedItems = insertTransactions(items);
      const comparison = getWeeklyComparison();

      // Format balasan transaksi
      const replyText = formatTransactionSaved(savedItems, comparison, engineUsed);

      // Keyboard: tombol hapus jika ada 1 item, atau tombol buka dashboard
      const keyboard = new InlineKeyboard();
      if (savedItems.length === 1) {
        keyboard.text('❌ Batalkan', `delete_${savedItems[0].id}`);
      }
      addWebButton(keyboard, '📊 Buka Dashboard');

      await ctx.reply(replyText, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      // Evaluasi apakah memicu peringatan boros
      const alert = checkBudgetAlert();
      if (alert.shouldAlert && alert.message) {
        await ctx.reply(alert.message, { parse_mode: 'Markdown' });
      }
    } catch (err: any) {
      console.error('[Bot Error] Gagal memproses pesan:', err);
      await ctx.reply(`⚠️ Terjadi kesalahan saat mencatat: ${err.message}`);
    }
  });

  return bot;
}

// Helper untuk mengirim notifikasi proaktif dari cron/background
export async function sendNotificationToAdmin(message: string, replyMarkup?: any): Promise<boolean> {
  if (!bot || !config.adminTelegramId) return false;
  try {
    await bot.api.sendMessage(config.adminTelegramId, message, {
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    });
    return true;
  } catch (err) {
    console.error('[Notification Error] Gagal mengirim pesan ke Telegram admin:', err);
    return false;
  }
}
