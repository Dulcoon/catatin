import crypto from 'crypto';
import { config } from '../config.js';
import { getSetting } from '../db/database.js';

// Verifikasi cryptographic signature Telegram WebApp initData
export function verifyTelegramWebAppData(initDataString: string): { isValid: boolean; userId?: number } {
  if (!initDataString || !config.telegramBotToken) {
    return { isValid: false };
  }

  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get('hash');
    if (!hash) return { isValid: false };

    params.delete('hash');

    // Urutkan key alfabetis
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckArr: string[] = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // HMAC secret key dari bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegramBotToken)
      .digest();

    // Hitung hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { isValid: false };
    }

    // Ambil info user
    const userJson = params.get('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      const isOwner = !config.adminTelegramId || user.id === config.adminTelegramId;
      return { isValid: isOwner, userId: user.id };
    }

    return { isValid: true };
  } catch (err) {
    console.error('[Auth Error] Gagal memverifikasi Telegram WebApp data:', err);
    return { isValid: false };
  }
}

// Token Sesi Sederhana (HMAC-based token)
export function createSessionToken(): string {
  const payload = `admin:${Date.now()}`;
  const secret = config.telegramBotToken || 'catatin-secret-key';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

export function verifySessionToken(token: string): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [user, timestamp, sig] = parts;
    if (user !== 'admin') return false;

    const time = parseInt(timestamp, 10);
    // Sesi valid selama 30 hari
    if (Date.now() - time > 30 * 24 * 60 * 60 * 1000) return false;

    const secret = config.telegramBotToken || 'catatin-secret-key';
    const expectedSig = crypto.createHmac('sha256', secret).update(`${user}:${timestamp}`).digest('hex');

    return sig === expectedSig;
  } catch {
    return false;
  }
}

export function verifyPin(enteredPin: string): boolean {
  const currentPin = getSetting('dashboard_pin', config.dashboardPin);
  return enteredPin === currentPin;
}
