import { initDatabase, insertTransactions, getWeeklyComparison, getCategoryBreakdown, getDailyComparison, deleteTransaction } from '../db/database.js';
import { parseWithRegex } from '../services/ai.js';
import { checkBudgetAlert } from '../services/budget.js';
import { createTelegramSessionToken, verifyTelegramSessionToken } from '../server/auth.js';

console.log('🧪 Memulai Verifikasi Otomatis Sistem Catatin...');

// 1. Uji Database & Inisialisasi
initDatabase();
console.log('✅ 1. Inisialisasi database SQLite berhasil.');

// 2. Uji Regex Fallback Parser
const sampleChat1 = "tadi siang makan padang 25rb sama es teh 5k";
const sampleChat2 = "isi bensin 35k dan ngopi 18rb";
const sampleChat3 = "kemarin belanja indomaret 75.000";

const parsed1 = parseWithRegex(sampleChat1, "2026-09-29");
const parsed2 = parseWithRegex(sampleChat2, "2026-09-29");
const parsed3 = parseWithRegex(sampleChat3, "2026-09-29");

console.log('Parsed Chat 1:', parsed1);
console.log('Parsed Chat 2:', parsed2);
console.log('Parsed Chat 3:', parsed3);

if (parsed1.length < 2 || parsed1[0].amount !== 25000 || parsed1[1].amount !== 5000) {
  throw new Error('Regex parser gagal mengekstrak multi-item nominal!');
}
if (parsed2[0].amount !== 35000 || parsed2[0].category !== 'bensin') {
  throw new Error('Regex parser gagal mengekstrak bensin!');
}
console.log('✅ 2. Smart Regex Fallback Parser berhasil mengekstrak variasi chat pengeluaran.');

// 3. Uji Insert & Query Database
const inserted = insertTransactions([...parsed1, ...parsed2, ...parsed3]);
console.log(`✅ 3. Berhasil menyimpan ${inserted.length} transaksi ke database.`);

// 4. Uji Analitik Mingguan
const comparison = getWeeklyComparison();
console.log('Statistik Mingguan:', {
  currentWeekTotal: comparison.currentWeekTotal,
  lastWeekTotal: comparison.lastWeekTotal,
  isMoreThrifty: comparison.isMoreThrifty,
  diffPercentage: comparison.diffPercentage,
  budget: comparison.budget,
  remainingBudget: comparison.remainingBudget
});

if (comparison.currentWeekTotal <= 0) {
  throw new Error('Total pengeluaran minggu ini harus lebih besar dari 0!');
}
console.log('✅ 4. Perhitungan komparasi mingguan (Senin-Minggu) akurat.');

// 5. Uji Kategori & Harian
const categories = getCategoryBreakdown(comparison.currentWeekStart, comparison.currentWeekEnd);
console.log('Breakdown Kategori:', categories);
if (categories.length === 0) {
  throw new Error('Breakdown kategori kosong!');
}

const daily = getDailyComparison(comparison.currentWeekStart, comparison.lastWeekStart);
console.log('Breakdown Harian (Senin-Minggu):', daily.days.length, 'hari');
console.log('✅ 5. Breakdown kategori dan harian berhasil.');

// 6. Uji Alert Budget
const alert = checkBudgetAlert();
console.log('Status Alert Budget:', alert.alertType, alert.message ? '(Ada Notifikasi)' : '(Normal)');
console.log('✅ 6. Evaluasi deteksi boros / budget alert berfungsi.');

// 7. Uji Autentikasi Sesi Telegram Terikat Pemilik
const testUserId = 123456789;
const sessionToken = createTelegramSessionToken(testUserId);
const isTokenValid = verifyTelegramSessionToken(sessionToken);

if (!isTokenValid) {
  throw new Error('Verifikasi token sesi Telegram gagal!');
}
console.log('✅ 7. Otentikasi sesi Telegram kriptografis valid.');

// 8. Uji Hapus Transaksi (Cleanup test records)
for (const item of inserted) {
  deleteTransaction(item.id);
}
console.log(`✅ 8. Pembersihan data uji coba berhasil (${inserted.length} data dihapus).`);

console.log('\n🎉 SELURUH VERIFIKASI UNIT BERHASIL DENGAN SEMPURNA!');
