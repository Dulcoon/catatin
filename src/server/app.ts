import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import fs from 'fs';
import path from 'path';
import {
  getWeeklyComparison,
  getCategoryBreakdown,
  getDailyComparison,
  getRecentTransactions,
  insertTransactions,
  deleteTransaction,
  getSetting,
  setSetting
} from '../db/database.js';
import { verifyPin, verifySessionToken, verifyTelegramWebAppData, createSessionToken } from './auth.js';
import { runWeeklyRecapJob } from '../services/cron.js';

export const app = new Hono();

// Enable CORS
app.use('*', cors());

// Auth Middleware untuk API
const requireAuth = async (c: any, next: any) => {
  // 1. Cek header initData Telegram WebApp
  const tgInitData = c.req.header('x-telegram-init-data');
  if (tgInitData) {
    const { isValid } = verifyTelegramWebAppData(tgInitData);
    if (isValid) {
      return await next();
    }
  }

  // 2. Cek Bearer Session Token
  const authHeader = c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (verifySessionToken(token)) {
      return await next();
    }
  }

  return c.json({ error: 'Unauthorized. Harap masukkan PIN atau buka melalui bot Telegram.' }, 401);
};

// -------------------------------------------------------------
// Endpoint Publik / Otentikasi
// -------------------------------------------------------------

// Verifikasi PIN
app.post('/api/auth/pin', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { pin } = body;

  if (!pin || !verifyPin(pin)) {
    return c.json({ success: false, error: 'PIN tidak sesuai.' }, 401);
  }

  const token = createSessionToken();
  return c.json({ success: true, token });
});

// Verifikasi Telegram WebApp
app.post('/api/auth/telegram', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { initData } = body;

  const { isValid, userId } = verifyTelegramWebAppData(initData);
  if (!isValid) {
    return c.json({ success: false, error: 'Verifikasi Telegram WebApp gagal.' }, 401);
  }

  const token = createSessionToken();
  return c.json({ success: true, token, userId });
});

// Cek status sesi
app.get('/api/auth/me', requireAuth, (c) => {
  return c.json({ authenticated: true });
});

// -------------------------------------------------------------
// Endpoint Analitik Keuangan (Protected)
// -------------------------------------------------------------

// Statistik Mingguan Lengkap
app.get('/api/analytics/weekly', requireAuth, (c) => {
  const dateParam = c.req.query('date');
  const refDate = dateParam ? new Date(dateParam) : new Date();

  const comparison = getWeeklyComparison(refDate);
  const categories = getCategoryBreakdown(comparison.currentWeekStart, comparison.currentWeekEnd);
  const daily = getDailyComparison(comparison.currentWeekStart, comparison.lastWeekStart);

  return c.json({
    comparison,
    categories,
    daily: daily.days
  });
});

// Daftar Transaksi
app.get('/api/transactions', requireAuth, (c) => {
  const limit = parseInt(c.req.query('limit') || '30', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const transactions = getRecentTransactions(limit, offset);
  return c.json({ transactions });
});

// Tambah Transaksi Manual via Web
app.post('/api/transactions', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { date, amount, category, description } = body;

  if (!date || !amount || !category || !description) {
    return c.json({ error: 'Field date, amount, category, dan description wajib diisi.' }, 400);
  }

  const inserted = insertTransactions([
    {
      date,
      amount: parseInt(amount, 10),
      category,
      description,
      raw_message: 'Input via Web Dashboard'
    }
  ]);

  return c.json({ success: true, transaction: inserted[0] });
});

// Hapus Transaksi
app.delete('/api/transactions/:id', requireAuth, (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const success = deleteTransaction(id);
  if (!success) {
    return c.json({ error: 'Transaksi tidak ditemukan.' }, 404);
  }
  return c.json({ success: true });
});

// Pengaturan
app.get('/api/settings', requireAuth, (c) => {
  return c.json({
    weeklyBudget: parseInt(getSetting('weekly_budget', '500000'), 10),
    warningThresholdPercent: parseInt(getSetting('warning_threshold_pct', '80'), 10)
  });
});

app.post('/api/settings', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (body.weeklyBudget) {
    setSetting('weekly_budget', body.weeklyBudget.toString());
  }
  if (body.warningThresholdPercent) {
    setSetting('warning_threshold_pct', body.warningThresholdPercent.toString());
  }
  if (body.newPin) {
    setSetting('dashboard_pin', body.newPin.toString());
  }
  return c.json({ success: true });
});

// Trigger Manual Rekap Mingguan ke Telegram (untuk testing & verifikasi)
app.post('/api/cron/trigger-recap', requireAuth, async (c) => {
  const sent = await runWeeklyRecapJob();
  return c.json({ success: sent });
});

// -------------------------------------------------------------
// Static Asset Serving (Frontend Web Dashboard)
// -------------------------------------------------------------
const distWebPath = path.resolve(process.cwd(), 'dist-web');

if (fs.existsSync(distWebPath)) {
  app.use('/*', serveStatic({ root: './dist-web' }));
  // Fallback untuk SPA router
  app.get('*', (c) => {
    const indexPath = path.join(distWebPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf-8'));
    }
    return c.text('Frontend belum dibuild. Jalankan npm run build:web terlebih dahulu.');
  });
} else {
  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Catatin Server Aktif</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0B0F19; color: #F1F5F9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .card { background: #151E2E; border: 1px solid rgba(255,255,255,0.08); padding: 32px; border-radius: 12px; max-width: 440px; }
          h1 { font-size: 20px; color: #0D9488; margin-top: 0; }
          p { color: #94A3B8; font-size: 14px; line-height: 1.6; }
          code { background: #0B0F19; padding: 4px 8px; border-radius: 6px; font-size: 13px; color: #38BDF8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Catatin Server Berjalan</h1>
          <p>API & Bot Telegram aktif pada port <code>${process.env.PORT || 7878}</code>.</p>
          <p>Frontend web dashboard sedang disiapkan atau jalankan <code>npm run build:web</code>.</p>
        </div>
      </body>
      </html>
    `);
  });
}
