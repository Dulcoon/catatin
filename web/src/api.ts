// API Client untuk Catatin Web Dashboard

const TOKEN_KEY = 'catatin_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Helper fetch dengan header otentikasi (Bearer token atau Telegram WebApp)
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  // 1. Cek Telegram WebApp initData
  const tgWebApp = (window as any).Telegram?.WebApp;
  if (tgWebApp?.initData) {
    headers.set('x-telegram-init-data', tgWebApp.initData);
  }
  
  // 2. Cek token lokal
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  return response;
}

export const api = {
  // Login Telegram WebApp (Satu-satunya metode otentikasi)
  async loginWithTelegram(initData: string): Promise<{ success: boolean; token?: string }> {
    const res = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  // Cek apakah user sudah terautentikasi
  async checkAuth(): Promise<boolean> {
    try {
      const res = await authFetch('/api/auth/me');
      return res.ok;
    } catch {
      return false;
    }
  },

  // Ambil Data Analitik Mingguan
  async getWeeklyAnalytics(date?: string) {
    const url = date ? `/api/analytics/weekly?date=${date}` : '/api/analytics/weekly';
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Gagal mengambil data analitik mingguan');
    return await res.json();
  },

  // Ambil Data Analitik Bulanan (Siklus Gajian)
  async getMonthlyAnalytics(date?: string) {
    const url = date ? `/api/analytics/monthly?date=${date}` : '/api/analytics/monthly';
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Gagal mengambil data analitik bulanan');
    return await res.json();
  },

  // Ambil Riwayat Transaksi dengan Pagination
  async getTransactions(page = 1, limit = 10) {
    const res = await authFetch(`/api/transactions?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Gagal mengambil daftar transaksi');
    return await res.json();
  },

  // Tambah Transaksi Manual
  async addTransaction(tx: { date: string; amount: number; category: string; description: string }) {
    const res = await authFetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan transaksi');
    }
    return await res.json();
  },

  // Hapus Transaksi
  async deleteTransaction(id: number) {
    const res = await authFetch(`/api/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Gagal menghapus transaksi');
    return await res.json();
  },

  // Ambil Pengaturan
  async getSettings() {
    const res = await authFetch('/api/settings');
    if (!res.ok) throw new Error('Gagal mengambil pengaturan');
    return await res.json();
  },

  // Simpan Pengaturan
  async updateSettings(settings: { weeklyBudget?: number; warningThresholdPercent?: number; paydayDate?: number }) {
    const res = await authFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Gagal menyimpan pengaturan');
    return await res.json();
  },

  // Trigger Uji Coba Rekap ke Telegram
  async triggerTestRecap() {
    const res = await authFetch('/api/cron/trigger-recap', {
      method: 'POST'
    });
    return await res.json();
  }
};
