import crypto from 'crypto';
import { config } from '../config.js';

export interface TelegramAuthResult {
  isValid: boolean;
  userId?: number;
  username?: string;
  error?: string;
}

/**
 * Verifikasi Cryptographic Signature Telegram WebApp initData (HMAC-SHA256).
 * Memastikan data benar-benar ditandatangani oleh Telegram dan berasal dari ADMIN_TELEGRAM_ID pemilik.
 */
export function verifyTelegramWebAppData(initDataString: string): TelegramAuthResult {
  if (!initDataString || !config.telegramBotToken) {
    return { isValid: false, error: 'Data otentikasi Telegram tidak ditemukan.' };
  }

  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get('hash');
    if (!hash) {
      return { isValid: false, error: 'Tanda tangan hash tidak ditemukan.' };
    }

    // 1. Cek batas kedaluwarsa auth_date (Maksimal 24 jam untuk mencegah Replay Attack)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (!authDate || nowInSeconds - authDate > 86400) {
      return { isValid: false, error: 'Sesi Telegram WebApp telah kedaluwarsa. Buka ulang dari bot.' };
    }

    params.delete('hash');

    // 2. Susun string verifikasi: urutkan key secara alfabetis
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckArr: string[] = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // 3. Hitung HMAC secret key dari bot token: HMAC-SHA256("WebAppData", bot_token)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegramBotToken)
      .digest();

    // 4. Hitung hash dari dataCheckString
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { isValid: false, error: 'Tanda tangan kriptografis Telegram tidak valid (Data dimanipulasi).' };
    }

    // 5. Cek kepemilikan akun Telegram (Hanya boleh ADMIN_TELEGRAM_ID)
    const userJson = params.get('user');
    if (!userJson) {
      return { isValid: false, error: 'Informasi pengguna Telegram tidak ditemukan.' };
    }

    const user = JSON.parse(userJson);
    if (config.adminTelegramId && user.id !== config.adminTelegramId) {
      console.warn(`[Security Alert] Upaya akses web dari ID Telegram tidak dikenal: ${user.id}`);
      return { isValid: false, error: 'Akses ditolak. Anda bukan pemilik bot ini.' };
    }

    return {
      isValid: true,
      userId: user.id,
      username: user.username
    };
  } catch (err: any) {
    console.error('[Auth Error] Gagal memvalidasi Telegram WebApp data:', err.message);
    return { isValid: false, error: 'Kesalahan internal saat memvalidasi sesi.' };
  }
}

/**
 * Membuat Token Sesi Terenkripsi yang terikat pada Telegram User ID pemilik
 */
export function createTelegramSessionToken(userId: number): string {
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;
  const secret = config.telegramBotToken || 'catatin-secret-key';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

/**
 * Memvalidasi Token Sesi Terenkripsi
 */
export function verifyTelegramSessionToken(token: string): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [userIdStr, timestampStr, sig] = parts;
    const userId = parseInt(userIdStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    // Pastikan user ID cocok dengan ADMIN_TELEGRAM_ID
    if (config.adminTelegramId && userId !== config.adminTelegramId) {
      return false;
    }

    // Token valid selama 7 hari
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    const secret = config.telegramBotToken || 'catatin-secret-key';
    const expectedSig = crypto.createHmac('sha256', secret).update(`${userIdStr}:${timestampStr}`).digest('hex');

    return sig === expectedSig;
  } catch {
    return false;
  }
}
