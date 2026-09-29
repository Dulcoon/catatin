import { api, setStoredToken } from './api.js';
import { renderDailyComparisonChart, renderCategoryBreakdown, formatRupiah } from './charts.js';

// DOM Elements
const authScreen = document.getElementById('auth-screen')!;
const pinForm = document.getElementById('pin-form') as HTMLFormElement;
const pinInput = document.getElementById('pin-input') as HTMLInputElement;
const pinError = document.getElementById('pin-error')!;

const btnRefresh = document.getElementById('btn-refresh')!;
const btnOpenSettings = document.getElementById('btn-open-settings')!;
const btnOpenAddModal = document.getElementById('btn-open-add-modal')!;

// Hero Decision Card
const currentWeekLabel = document.getElementById('current-week-label')!;
const thisWeekTotalEl = document.getElementById('this-week-total')!;
const comparisonBadgeEl = document.getElementById('comparison-badge')!;
const comparisonNarrativeEl = document.getElementById('comparison-narrative')!;
const budgetTargetEl = document.getElementById('budget-target')!;
const budgetPercentageEl = document.getElementById('budget-percentage')!;
const budgetProgressBarEl = document.getElementById('budget-progress-bar')!;
const budgetRemainingEl = document.getElementById('budget-remaining')!;

// Charts & Lists
const dailyChartContainer = document.getElementById('daily-chart-container')!;
const categoryContainer = document.getElementById('category-distribution-container')!;
const transactionsListEl = document.getElementById('transactions-list')!;

// Modals
const modalAddTx = document.getElementById('modal-add-tx')!;
const btnCloseTxModal = document.getElementById('btn-close-tx-modal')!;
const txForm = document.getElementById('tx-form') as HTMLFormElement;
const txDateInput = document.getElementById('tx-date') as HTMLInputElement;

const modalSettings = document.getElementById('modal-settings')!;
const btnCloseSettingsModal = document.getElementById('btn-close-settings-modal')!;
const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
const settingWeeklyBudgetInput = document.getElementById('setting-weekly-budget') as HTMLInputElement;
const settingThresholdInput = document.getElementById('setting-threshold') as HTMLInputElement;
const settingPinInput = document.getElementById('setting-pin') as HTMLInputElement;
const btnTestRecap = document.getElementById('btn-test-recap') as HTMLButtonElement;

// Inisialisasi Tanggal Hari Ini untuk Form
txDateInput.value = new Date().toISOString().split('T')[0];

// Inisialisasi Telegram WebApp jika ada
function setupTelegramWebApp() {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#0B0F19');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0B0F19');
  }
}

// Cek Otentikasi
async function authenticate(): Promise<boolean> {
  const tg = (window as any).Telegram?.WebApp;

  // 1. Coba login otomatis via data Telegram WebApp jika tersedia
  if (tg?.initData) {
    try {
      const res = await api.loginWithTelegram(tg.initData);
      if (res.success && res.token) {
        authScreen.classList.add('hidden');
        return true;
      }
    } catch (err) {
      console.warn('Auto-login Telegram WebApp gagal, beralih ke form PIN.');
    }
  }

  // 2. Cek apakah token tersimpan di browser masih valid
  const isValid = await api.checkAuth();
  if (isValid) {
    authScreen.classList.add('hidden');
    return true;
  }

  // 3. Tampilkan layar PIN
  authScreen.classList.remove('hidden');
  pinInput.focus();
  return false;
}

// Handler Submit PIN
pinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  pinError.classList.add('hidden');
  const pin = pinInput.value.trim();

  try {
    const res = await api.loginWithPin(pin);
    if (res.success) {
      authScreen.classList.add('hidden');
      pinInput.value = '';
      await loadDashboardData();
    } else {
      pinError.classList.remove('hidden');
    }
  } catch (err) {
    pinError.classList.remove('hidden');
  }
});

// Memuat dan Merender Seluruh Data Dashboard
async function loadDashboardData() {
  try {
    // Ambil analitik mingguan dan riwayat transaksi secara paralel
    const [analytics, txData] = await Promise.all([
      api.getWeeklyAnalytics(),
      api.getTransactions(30)
    ]);

    const { comparison, categories, daily } = analytics;

    // 1. Render Periode
    currentWeekLabel.textContent = `${comparison.currentWeekStart} s/d ${comparison.currentWeekEnd}`;

    // 2. Render Hero Decision Card (Pertanyaan: Lebih Hemat / Lebih Boros?)
    thisWeekTotalEl.textContent = formatRupiah(comparison.currentWeekTotal);

    if (comparison.lastWeekTotal === 0 && comparison.currentWeekTotal === 0) {
      comparisonBadgeEl.className = 'status-badge status-neutral';
      comparisonBadgeEl.textContent = 'Data Baru';
      comparisonNarrativeEl.textContent = 'Belum ada catatan pengeluaran di minggu ini.';
    } else if (comparison.lastWeekTotal === 0) {
      comparisonBadgeEl.className = 'status-badge status-neutral';
      comparisonBadgeEl.textContent = 'Minggu Pertama';
      comparisonNarrativeEl.textContent = 'Belum ada data pembanding dari minggu sebelumnya.';
    } else if (comparison.isMoreThrifty) {
      comparisonBadgeEl.className = 'status-badge status-emerald';
      comparisonBadgeEl.textContent = `🟢 ${comparison.diffPercentage}% Lebih Hemat`;
      comparisonNarrativeEl.textContent = `Kamu lebih irit ${formatRupiah(comparison.diffAmount)} dibanding minggu lalu (${formatRupiah(comparison.lastWeekTotal)}).`;
    } else {
      comparisonBadgeEl.className = 'status-badge status-crimson';
      comparisonBadgeEl.textContent = `🔴 ${comparison.diffPercentage}% Lebih Boros`;
      comparisonNarrativeEl.textContent = `Pengeluaran naik ${formatRupiah(comparison.diffAmount)} dibanding minggu lalu (${formatRupiah(comparison.lastWeekTotal)}).`;
    }

    // 3. Render Budget Status
    budgetTargetEl.textContent = formatRupiah(comparison.budget);
    budgetPercentageEl.textContent = `${comparison.budgetPercentage}%`;
    budgetProgressBarEl.style.width = `${Math.min(comparison.budgetPercentage, 100)}%`;

    if (comparison.budgetPercentage >= 100) {
      budgetProgressBarEl.className = 'progress-fill fill-danger';
      budgetRemainingEl.parentElement!.innerHTML = `⚠️ Overbudget: <strong id="budget-remaining" class="tabular-nums" style="color:var(--status-crimson);">${formatRupiah(Math.abs(comparison.remainingBudget))}</strong>`;
    } else if (comparison.budgetPercentage >= 80) {
      budgetProgressBarEl.className = 'progress-fill fill-warning';
      budgetRemainingEl.textContent = formatRupiah(comparison.remainingBudget);
    } else {
      budgetProgressBarEl.className = 'progress-fill';
      budgetRemainingEl.textContent = formatRupiah(comparison.remainingBudget);
    }

    // 4. Render Grafik Harian
    renderDailyComparisonChart(dailyChartContainer, daily);

    // 5. Render Daftar Kategori
    renderCategoryBreakdown(categoryContainer, categories);

    // 6. Render Riwayat Transaksi
    renderTransactions(txData.transactions || []);

  } catch (err: any) {
    console.error('Error memuat data dashboard:', err);
    if (err.message && err.message.includes('401')) {
      authScreen.classList.remove('hidden');
    }
  }
}

// Render Riwayat Transaksi
function renderTransactions(transactions: any[]) {
  if (transactions.length === 0) {
    transactionsListEl.innerHTML = '<div class="empty-state">Belum ada transaksi. Kirim chat ke Telegram atau klik "+ Catat Manual".</div>';
    return;
  }

  let html = '';
  for (const tx of transactions) {
    html += `
      <div class="tx-item" data-id="${tx.id}">
        <div class="tx-left">
          <span class="tx-desc">${escapeHtml(tx.description)}</span>
          <div class="tx-sub">
            <span style="text-transform: capitalize; color: var(--accent);">#${escapeHtml(tx.category)}</span>
            <span>${tx.date}</span>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount tabular-nums">${formatRupiah(tx.amount)}</span>
          <button class="btn-del" data-id="${tx.id}" title="Hapus transaksi" aria-label="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  transactionsListEl.innerHTML = html;

  // Pasang event listener tombol hapus
  transactionsListEl.querySelectorAll('.btn-del').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (!id) return;
      if (confirm('Hapus transaksi ini?')) {
        try {
          await api.deleteTransaction(parseInt(id, 10));
          await loadDashboardData();
        } catch (err) {
          alert('Gagal menghapus transaksi.');
        }
      }
    });
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Event Listeners: Modal Tambah Transaksi
btnOpenAddModal.addEventListener('click', () => {
  txDateInput.value = new Date().toISOString().split('T')[0];
  modalAddTx.classList.remove('hidden');
});

btnCloseTxModal.addEventListener('click', () => {
  modalAddTx.classList.add('hidden');
});

modalAddTx.addEventListener('click', (e) => {
  if (e.target === modalAddTx) modalAddTx.classList.add('hidden');
});

txForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseInt((document.getElementById('tx-amount') as HTMLInputElement).value, 10);
  const category = (document.getElementById('tx-category') as HTMLSelectElement).value;
  const description = (document.getElementById('tx-desc') as HTMLInputElement).value;
  const date = txDateInput.value;

  try {
    await api.addTransaction({ amount, category, description, date });
    modalAddTx.classList.add('hidden');
    txForm.reset();
    await loadDashboardData();
  } catch (err: any) {
    alert(err.message || 'Gagal menyimpan transaksi');
  }
});

// Event Listeners: Modal Pengaturan
btnOpenSettings.addEventListener('click', async () => {
  try {
    const settings = await api.getSettings();
    settingWeeklyBudgetInput.value = settings.weeklyBudget.toString();
    settingThresholdInput.value = settings.warningThresholdPercent.toString();
    settingPinInput.value = '';
    modalSettings.classList.remove('hidden');
  } catch (err) {
    alert('Gagal mengambil pengaturan.');
  }
});

btnCloseSettingsModal.addEventListener('click', () => {
  modalSettings.classList.add('hidden');
});

modalSettings.addEventListener('click', (e) => {
  if (e.target === modalSettings) modalSettings.classList.add('hidden');
});

settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const weeklyBudget = parseInt(settingWeeklyBudgetInput.value, 10);
  const warningThresholdPercent = parseInt(settingThresholdInput.value, 10);
  const newPin = settingPinInput.value.trim();

  const payload: any = { weeklyBudget, warningThresholdPercent };
  if (newPin) payload.newPin = newPin;

  try {
    await api.updateSettings(payload);
    modalSettings.classList.add('hidden');
    alert('Pengaturan berhasil disimpan.');
    await loadDashboardData();
  } catch (err) {
    alert('Gagal menyimpan pengaturan.');
  }
});

btnTestRecap.addEventListener('click', async () => {
  btnTestRecap.disabled = true;
  btnTestRecap.textContent = 'Mengirim notifikasi...';
  try {
    const res = await api.triggerTestRecap();
    if (res.success) {
      alert('Pesan rekap mingguan berhasil dikirim ke Telegram!');
    } else {
      alert('Pesan belum terkirim. Pastikan TELEGRAM_BOT_TOKEN dan ADMIN_TELEGRAM_ID di .env sudah benar.');
    }
  } catch (err) {
    alert('Terjadi kesalahan saat memicu rekap.');
  } finally {
    btnTestRecap.disabled = false;
    btnTestRecap.textContent = 'Kirim Uji Coba Rekap ke Telegram';
  }
});

// Refresh button
btnRefresh.addEventListener('click', () => {
  loadDashboardData();
});

// Inisialisasi awal saat load
async function init() {
  setupTelegramWebApp();
  const isAuthed = await authenticate();
  if (isAuthed) {
    await loadDashboardData();
  }
}

init();
