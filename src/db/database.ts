import Database from 'better-sqlite3';
import { config } from '../config.js';

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  raw_message?: string;
  created_at: string;
}

export interface NewTransaction {
  date: string;
  amount: number;
  category: string;
  description: string;
  raw_message?: string;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailySummary {
  date: string;
  dayName: string; // Senin, Selasa, dst
  total: number;
}

export interface WeeklyComparison {
  currentWeekTotal: number;
  lastWeekTotal: number;
  diffAmount: number;
  diffPercentage: number;
  isMoreThrifty: boolean;
  budget: number;
  remainingBudget: number;
  budgetPercentage: number;
  currentWeekStart: string;
  currentWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
}

// Inisialisasi Database dengan WAL mode
export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Inisialisasi Skema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      raw_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Default settings jika belum ada
  const setIfMissing = (key: string, value: string) => {
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  };

  setIfMissing('weekly_budget', config.weeklyBudget.toString());
  setIfMissing('warning_threshold_pct', config.warningThresholdPercent.toString());
  setIfMissing('dashboard_pin', config.dashboardPin);
}

// Helper Tanggal: Dapatkan rentang Senin - Minggu
export function getWeekDateRange(date = new Date()): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  // Normalisasi agar Senin = 0, Minggu = 6
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (dt: Date) => dt.toISOString().split('T')[0];
  return {
    start: format(monday),
    end: format(sunday)
  };
}

export function getLastWeekDateRange(date = new Date()): { start: string; end: string } {
  const thisWeek = getWeekDateRange(date);
  const lastMonday = new Date(thisWeek.start);
  lastMonday.setDate(lastMonday.getDate() - 7);
  return getWeekDateRange(lastMonday);
}

// CRUD Transaksi
export function insertTransactions(items: NewTransaction[]): Transaction[] {
  const insertStmt = db.prepare(`
    INSERT INTO transactions (date, amount, category, description, raw_message)
    VALUES (?, ?, ?, ?, ?)
  `);

  const inserted: Transaction[] = [];
  const insertMany = db.transaction((records: NewTransaction[]) => {
    for (const record of records) {
      const result = insertStmt.run(
        record.date,
        record.amount,
        record.category.toLowerCase().trim(),
        record.description.trim(),
        record.raw_message || ''
      );
      const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as Transaction;
      inserted.push(row);
    }
  });

  insertMany(items);
  return inserted;
}

export function deleteTransaction(id: number): boolean {
  const info = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return info.changes > 0;
}

export function getRecentTransactions(limit = 20, offset = 0): Transaction[] {
  return db.prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ? OFFSET ?').all(limit, offset) as Transaction[];
}

export function getTransactionsBetween(startDate: string, endDate: string): Transaction[] {
  return db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC').all(startDate, endDate) as Transaction[];
}

// Statistik Mingguan & Komparasi
export function getWeeklyComparison(refDate = new Date()): WeeklyComparison {
  const currentRange = getWeekDateRange(refDate);
  const lastRange = getLastWeekDateRange(refDate);

  const sumStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM transactions 
    WHERE date >= ? AND date <= ?
  `);

  const currentTotal = (sumStmt.get(currentRange.start, currentRange.end) as { total: number }).total;
  const lastTotal = (sumStmt.get(lastRange.start, lastRange.end) as { total: number }).total;

  const budgetStr = getSetting('weekly_budget', config.weeklyBudget.toString());
  const budget = parseInt(budgetStr, 10);

  const diffAmount = Math.abs(currentTotal - lastTotal);
  let diffPercentage = 0;
  if (lastTotal > 0) {
    diffPercentage = Math.round((diffAmount / lastTotal) * 100);
  } else if (currentTotal > 0) {
    diffPercentage = 100;
  }

  const isMoreThrifty = currentTotal <= lastTotal;
  const remainingBudget = budget - currentTotal;
  const budgetPercentage = budget > 0 ? Math.round((currentTotal / budget) * 100) : 0;

  return {
    currentWeekTotal: currentTotal,
    lastWeekTotal: lastTotal,
    diffAmount,
    diffPercentage,
    isMoreThrifty,
    budget,
    remainingBudget,
    budgetPercentage,
    currentWeekStart: currentRange.start,
    currentWeekEnd: currentRange.end,
    lastWeekStart: lastRange.start,
    lastWeekEnd: lastRange.end
  };
}

export function getCategoryBreakdown(startDate: string, endDate: string): CategorySummary[] {
  const totalRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as grand_total 
    FROM transactions 
    WHERE date >= ? AND date <= ?
  `).get(startDate, endDate) as { grand_total: number };

  const grandTotal = totalRow.grand_total;

  const rows = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE date >= ? AND date <= ?
    GROUP BY category
    ORDER BY total DESC
  `).all(startDate, endDate) as { category: string; total: number; count: number }[];

  return rows.map(r => ({
    category: r.category,
    total: r.total,
    count: r.count,
    percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0
  }));
}

export function getDailyComparison(currentWeekStart: string, lastWeekStart: string): {
  days: {
    dayName: string;
    dateThisWeek: string;
    amountThisWeek: number;
    dateLastWeek: string;
    amountLastWeek: number;
  }[];
} {
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const dailyStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ?');

  const curStart = new Date(currentWeekStart);
  const prevStart = new Date(lastWeekStart);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const dCur = new Date(curStart);
    dCur.setDate(curStart.getDate() + i);
    const curStr = dCur.toISOString().split('T')[0];

    const dPrev = new Date(prevStart);
    dPrev.setDate(prevStart.getDate() + i);
    const prevStr = dPrev.toISOString().split('T')[0];

    const curAmount = (dailyStmt.get(curStr) as { total: number }).total;
    const prevAmount = (dailyStmt.get(prevStr) as { total: number }).total;

    days.push({
      dayName: dayNames[i],
      dateThisWeek: curStr,
      amountThisWeek: curAmount,
      dateLastWeek: prevStr,
      amountLastWeek: prevAmount
    });
  }

  return { days };
}

// Settings KV
export function getSetting(key: string, defaultValue = ''): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function setSetting(key: string, value: string): void {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}
