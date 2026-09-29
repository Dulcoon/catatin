// Modul visualisasi grafik ringan berbasis SVG murni (Zero-Dependency & Super Cepat)

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export interface DailyDataPoint {
  dayName: string;
  dateThisWeek: string;
  amountThisWeek: number;
  dateLastWeek: string;
  amountLastWeek: number;
}

export function renderDailyComparisonChart(container: HTMLElement, days: DailyDataPoint[]) {
  if (!days || days.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada data pengeluaran harian.</div>';
    return;
  }

  // Cari nilai maksimum untuk skala tinggi bar
  let maxAmount = 0;
  for (const d of days) {
    if (d.amountThisWeek > maxAmount) maxAmount = d.amountThisWeek;
    if (d.amountLastWeek > maxAmount) maxAmount = d.amountLastWeek;
  }
  if (maxAmount === 0) maxAmount = 100000; // default baseline

  const width = 360;
  const height = 150;
  const paddingBottom = 26;
  const chartHeight = height - paddingBottom;
  const colWidth = width / 7;
  const barWidth = 14;

  let svgContent = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
      <!-- Garis Grid Tipis -->
      <line x1="0" y1="${chartHeight}" x2="${width}" y2="${chartHeight}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
      <line x1="0" y1="${chartHeight / 2}" x2="${width}" y2="${chartHeight / 2}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="3,3" />
  `;

  days.forEach((day, i) => {
    const xCenter = i * colWidth + colWidth / 2;
    const hThisWeek = Math.max(Math.round((day.amountThisWeek / maxAmount) * (chartHeight - 10)), 0);
    const hLastWeek = Math.max(Math.round((day.amountLastWeek / maxAmount) * (chartHeight - 10)), 0);

    const xLast = xCenter - barWidth - 1;
    const xThis = xCenter + 1;
    const yLast = chartHeight - hLastWeek;
    const yThis = chartHeight - hThisWeek;

    // Bar Minggu Lalu (Abu-abu Slate)
    svgContent += `
      <rect x="${xLast}" y="${yLast}" width="${barWidth}" height="${hLastWeek}" rx="2" fill="#475569" opacity="0.6">
        <title>Minggu Lalu (${day.dateLastWeek}): ${formatRupiah(day.amountLastWeek)}</title>
      </rect>
    `;

    // Bar Minggu Ini (Teal Finansial)
    svgContent += `
      <rect x="${xThis}" y="${yThis}" width="${barWidth}" height="${hThisWeek}" rx="2" fill="#0D9488">
        <title>Minggu Ini (${day.dateThisWeek}): ${formatRupiah(day.amountThisWeek)}</title>
      </rect>
    `;

    // Label Hari
    const shortDay = day.dayName.slice(0, 3);
    svgContent += `
      <text x="${xCenter}" y="${height - 6}" font-size="11" fill="#94A3B8" text-anchor="middle" font-family="inherit">
        ${shortDay}
      </text>
    `;
  });

  svgContent += '</svg>';
  container.innerHTML = svgContent;
}

export function renderCategoryBreakdown(container: HTMLElement, categories: { category: string; total: number; percentage: number }[]) {
  if (!categories || categories.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada kategori yang tercatat minggu ini.</div>';
    return;
  }

  // Palet warna kategori yang harmonis & profesional (bukan warna neon acak)
  const categoryColors: Record<string, string> = {
    makan: '#0D9488',
    bensin: '#F59E0B',
    kopi: '#8B5CF6',
    jajan: '#EC4899',
    belanja: '#3B82F6',
    tagihan: '#EF4444',
    transport: '#10B981',
    hiburan: '#6366F1',
    lainnya: '#64748B'
  };

  let html = '';
  for (const cat of categories) {
    const color = categoryColors[cat.category.toLowerCase()] || '#64748B';
    html += `
      <div class="category-row">
        <div class="category-row-meta">
          <div class="category-name-group">
            <span style="display:inline-block; width:8px; height:8px; border-radius:2px; background:${color};"></span>
            <span class="category-tag">${cat.category}</span>
          </div>
          <span class="category-amt tabular-nums">${formatRupiah(cat.total)} <small style="color:#94A3B8; font-weight:normal;">(${cat.percentage}%)</small></span>
        </div>
        <div class="category-track">
          <div class="category-bar" style="width: ${cat.percentage}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}
