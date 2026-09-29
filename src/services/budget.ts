import { getWeeklyComparison, getCategoryBreakdown, getSetting, setSetting } from '../db/database.js';

export interface BudgetAlertCheck {
  shouldAlert: boolean;
  alertType: 'warning_80' | 'danger_overbudget' | 'none';
  currentTotal: number;
  budget: number;
  percentage: number;
  remaining: number;
  topCategory?: { category: string; total: number; percentage: number };
  message: string;
}

export function checkBudgetAlert(refDate = new Date()): BudgetAlertCheck {
  const comparison = getWeeklyComparison(refDate);
  const { currentWeekTotal: currentTotal, budget, remainingBudget, budgetPercentage, currentWeekStart } = comparison;

  if (budget <= 0) {
    return {
      shouldAlert: false,
      alertType: 'none',
      currentTotal,
      budget,
      percentage: 0,
      remaining: 0,
      message: ''
    };
  }

  // Cek kategori dengan pengeluaran terbesar minggu ini
  const categories = getCategoryBreakdown(comparison.currentWeekStart, comparison.currentWeekEnd);
  const topCategory = categories[0];

  const currentWeekKey = `alert_${currentWeekStart}`;
  const lastAlertLevel = getSetting(currentWeekKey, '0'); // '0': none, '1': 80%, '2': overbudget

  // Format Rupiah
  const fmt = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  // 1. Cek Kondisi Bahaya (Overbudget >= 100%)
  if (budgetPercentage >= 100 && lastAlertLevel !== '2') {
    setSetting(currentWeekKey, '2');
    const overAmount = currentTotal - budget;
    let categoryNote = '';
    if (topCategory) {
      categoryNote = `\nPengeluaran terbesarmu saat ini ada di **${topCategory.category.toUpperCase()}** (${fmt(topCategory.total)} / ${topCategory.percentage}%).`;
    }

    return {
      shouldAlert: true,
      alertType: 'danger_overbudget',
      currentTotal,
      budget,
      percentage: budgetPercentage,
      remaining: remainingBudget,
      topCategory,
      message: `🚨 **PERINGATAN BOROS: BUDGET JEBOL!**\n\nPengeluaran minggu ini sudah mencapai **${fmt(currentTotal)}** dari target **${fmt(budget)}** (${budgetPercentage}%).\nKamu sudah overbudget sebesar **${fmt(overAmount)}**!${categoryNote}\n\nYuk rem dulu pengeluaran non-primer sampai akhir minggu.`
    };
  }

  // 2. Cek Kondisi Waspada (>= 80% dan < 100%)
  const warningPct = parseInt(getSetting('warning_threshold_pct', '80'), 10);
  if (budgetPercentage >= warningPct && budgetPercentage < 100 && lastAlertLevel === '0') {
    setSetting(currentWeekKey, '1');
    return {
      shouldAlert: true,
      alertType: 'warning_80',
      currentTotal,
      budget,
      percentage: budgetPercentage,
      remaining: remainingBudget,
      topCategory,
      message: `⚠️ **PERINGATAN WASPADA PENGELUARAN**\n\nKamu sudah memakai **${budgetPercentage}%** dari budget mingguanmu (${fmt(currentTotal)} dari ${fmt(budget)}).\nSisa budget aman untuk minggu ini: **${fmt(remainingBudget)}**.\n\nJaga ritme pengeluaranmu ya!`
    };
  }

  return {
    shouldAlert: false,
    alertType: 'none',
    currentTotal,
    budget,
    percentage: budgetPercentage,
    remaining: remainingBudget,
    topCategory,
    message: ''
  };
}
