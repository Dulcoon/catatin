import { Transaction, WeeklyComparison, CategorySummary, SalaryCycleSummary } from '../db/database.js';

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

// Progress bar sederhana teks: [██████░░░░] 60%
export function generateProgressBar(percentage: number, length = 10): string {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const filledCount = Math.round((clamped / 100) * length);
  const emptyCount = length - filledCount;
  return `[${'■'.repeat(filledCount)}${'□'.repeat(emptyCount)}] ${clamped}%`;
}

// Format balasan transaksi berhasil disimpan
export function formatTransactionSaved(
  items: Transaction[],
  comparison: WeeklyComparison,
  engine: 'gemini' | 'fallback_ai' | 'regex'
): string {
  let text = `✅ **Tercatat ${items.length} Transaksi**\n\n`;

  for (const item of items) {
    text += `• **${item.description}**\n  Nominal: **${formatRupiah(item.amount)}**\n  Kategori: \`#${item.category}\` | Tanggal: ${item.date}\n\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 **Status Budget Minggu Ini:**\n`;
  text += `Total Terpakai: ${formatRupiah(comparison.currentWeekTotal)} / ${formatRupiah(comparison.budget)}\n`;
  text += `${generateProgressBar(comparison.budgetPercentage)}\n`;

  if (comparison.remainingBudget >= 0) {
    text += `Sisa Budget: **${formatRupiah(comparison.remainingBudget)}**\n`;
  } else {
    text += `⚠️ Overbudget: **${formatRupiah(Math.abs(comparison.remainingBudget))}**\n`;
  }

  if (engine !== 'gemini') {
    text += `\n_(Diproses via: ${engine === 'fallback_ai' ? 'Backup AI' : 'Regex Smart Parser'})_`;
  }

  return text;
}

// Format Rekap Mingguan Hari Minggu
export function formatWeeklyRecap(
  comparison: WeeklyComparison,
  topCategories: CategorySummary[]
): string {
  const { currentWeekTotal, lastWeekTotal, diffPercentage, isMoreThrifty, budget } = comparison;

  let text = `📋 **REKAP KEUANGAN MINGGUAN**\n`;
  text += `Periode: ${comparison.currentWeekStart} s/d ${comparison.currentWeekEnd}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Status Perbandingan vs Minggu Lalu
  if (lastWeekTotal === 0 && currentWeekTotal === 0) {
    text += `Belum ada pengeluaran tercatat dalam 2 minggu terakhir.\n\n`;
  } else if (lastWeekTotal === 0) {
    text += `Total Pengeluaran: **${formatRupiah(currentWeekTotal)}**\n_(Minggu lalu tidak ada data pengeluaran)_\n\n`;
  } else if (isMoreThrifty) {
    text += `🟢 **LEBIH HEMAT ${diffPercentage}%** dibanding minggu lalu!\n`;
    text += `Minggu Ini: **${formatRupiah(currentWeekTotal)}**\nMinggu Lalu: ${formatRupiah(lastWeekTotal)}\n\n`;
  } else {
    text += `🔴 **LEBIH BOROS ${diffPercentage}%** dibanding minggu lalu!\n`;
    text += `Minggu Ini: **${formatRupiah(currentWeekTotal)}**\nMinggu Lalu: ${formatRupiah(lastWeekTotal)}\n\n`;
  }

  // Budget Status
  text += `🎯 **Pencapaian Target Budget:**\n`;
  text += `Target: ${formatRupiah(budget)}\n`;
  text += `Realisasi: ${generateProgressBar(comparison.budgetPercentage)}\n\n`;

  // Top 3 Pengeluaran
  if (topCategories.length > 0) {
    text += `🏷️ **Top Pengeluaran Terbesar:**\n`;
    const top3 = topCategories.slice(0, 3);
    top3.forEach((cat, index) => {
      text += `${index + 1}. **${cat.category.toUpperCase()}**: ${formatRupiah(cat.total)} (${cat.percentage}%)\n`;
    });
    text += `\n`;
  }

  text += `Buka dashboard web untuk melihat rincian grafik harian dan kategori lengkap.`;
  return text;
}

// Format Rekap Pengeluaran Siklus Gajian Bulanan
export function formatMonthlyRecap(summary: SalaryCycleSummary): string {
  const {
    label,
    total,
    transactionCount,
    daysPassed,
    totalDays,
    averagePerDay,
    lastCycleTotal,
    diffPercentage,
    isMoreThrifty,
    topCategories,
    payday
  } = summary;

  let text = `🗓️ **REKAP PENGELUARAN BULAN INI**\n`;
  text += `Siklus Gajian: **${label}**\n`;
  text += `_(Cut-off tgl ${payday} | Hari ke-${daysPassed} dari ${totalDays} hari)_\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `💰 Total Pengeluaran: **${formatRupiah(total)}**\n`;
  text += `📝 Frekuensi: **${transactionCount} transaksi**\n`;
  text += `⚡ Rata-rata Harian: **${formatRupiah(averagePerDay)} / hari**\n\n`;

  // Status Perbandingan vs Siklus Sebelumnya
  if (lastCycleTotal > 0) {
    if (isMoreThrifty) {
      text += `🟢 **${diffPercentage}% LEBIH HEMAT** dibanding siklus lalu (${formatRupiah(lastCycleTotal)})\n\n`;
    } else {
      text += `🔴 **${diffPercentage}% LEBIH BOROS** dibanding siklus lalu (${formatRupiah(lastCycleTotal)})\n\n`;
    }
  }

  // Top Kategori
  if (topCategories.length > 0) {
    text += `🏷️ **Kategori Pengeluaran Terbesar:**\n`;
    const top = topCategories.slice(0, 4);
    top.forEach((cat, index) => {
      text += `${index + 1}. **${cat.category.toUpperCase()}**: ${formatRupiah(cat.total)} (${cat.percentage}%)\n`;
    });
    text += `\n`;
  } else {
    text += `_Belum ada transaksi di siklus gajian ini._\n\n`;
  }

  text += `💡 _Transaksi setelah tgl ${payday} otomatis dihitung masuk ke siklus bulan berikutnya._`;
  return text;
}

// Format Notifikasi Hasil Scan Bukti Pembayaran / iOS Shortcut
export function formatReceiptScanNotification(
  items: Transaction[],
  comparison: WeeklyComparison,
  engine: 'gemini_vision' | 'fallback_vision' | 'none' = 'gemini_vision'
): string {
  let text = `📸 **Transaksi Berhasil Dicatat dari Bukti Pembayaran!**\n\n`;

  for (const item of items) {
    text += `• **${item.description}**\n  Nominal: **${formatRupiah(item.amount)}**\n  Kategori: \`#${item.category}\` | Tanggal: ${item.date}\n\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📊 **Status Budget Minggu Ini:**\n`;
  text += `Total Terpakai: ${formatRupiah(comparison.currentWeekTotal)} / ${formatRupiah(comparison.budget)}\n`;
  text += `${generateProgressBar(comparison.budgetPercentage)}\n`;

  if (comparison.remainingBudget >= 0) {
    text += `Sisa Budget: **${formatRupiah(comparison.remainingBudget)}**\n`;
  } else {
    text += `⚠️ Overbudget: **${formatRupiah(Math.abs(comparison.remainingBudget))}**\n`;
  }

  if (engine !== 'gemini_vision' && engine !== 'none') {
    text += `\n_(Diproses via: ${engine === 'fallback_vision' ? 'Backup Vision AI' : 'Vision Parser'})_`;
  }

  return text;
}

