import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { NewTransaction } from '../db/database.js';

const SYSTEM_PROMPT = `Kamu adalah asisten ekstraktor data keuangan pribadi yang sangat presisi.
Tugasmu adalah mengubah teks percakapan pengeluaran santai berbahasa Indonesia menjadi format JSON terstruktur.

Kategori yang diizinkan:
- makan (makanan pokok, nasi padang, warteg, sarapan, makan siang/malam, gofood/grabfood)
- kopi (kopi, cafe, nongkrong di warkop/starbucks)
- jajan (snack, boba, gorengan, es krim, camilan)
- bensin (pertalite, pertamax, spbu, bensin motor/mobil)
- belanja (belanja bulanan, minimarket, indomaret, alfamart, e-commerce, pakaian, barang)
- tagihan (listrik, air, wifi, pulsa, kuota, sewa, cicilan)
- transport (ojol, grab, gojek, parkir, tol, kereta)
- hiburan (nonton bioskop, game, langganan netflix/spotify)
- lainnya (jika tidak masuk ke kategori di atas)

Aturan Ekstraksi:
1. Kembalikan HANYA JSON murni berupa object dengan key "items" berisi array of transaksi. Tanpa format markdown tambahan jika memungkinkan, atau dalam block \`\`\`json.
2. Jika ada kata nominal seperti "25k", "25rb", "25.000", ubah menjadi angka numerik utuh (25000).
3. "0.5jt" atau "setengah juta" -> 500000.
4. Tanggal: gunakan format YYYY-MM-DD. Gunakan tanggal referensi hari ini jika pengguna tidak menyebutkan tanggal spesifik.
   Jika pengguna menyebut "kemarin", kurangi 1 hari dari tanggal referensi. "kemarin lusa" -> kurangi 2 hari.
5. Bisa mengekstrak lebih dari 1 transaksi jika pengguna menyebut beberapa pengeluaran sekaligus dalam 1 pesan.
6. Deskripsi harus ringkas dan jelas.

Format Output Wajib:
{
  "items": [
    {
      "date": "YYYY-MM-DD",
      "amount": 25000,
      "category": "makan",
      "description": "Nasi Padang + Es Teh"
    }
  ]
}`;

// Ekstraksi via Google Gemini Flash
async function parseWithGemini(userText: string, todayStr: string): Promise<NewTransaction[]> {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const prompt = `${SYSTEM_PROMPT}\n\nTanggal Referensi Hari Ini: ${todayStr}\nPesan Pengguna:\n"${userText}"`;
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  return parseJsonResponse(responseText, userText, todayStr);
}

// Ekstraksi via OpenAI-compatible Fallback (OpenRouter, DeepSeek, etc.)
async function parseWithFallback(userText: string, todayStr: string): Promise<NewTransaction[]> {
  if (!config.fallbackAiApiKey) {
    throw new Error('FALLBACK_AI_API_KEY is not configured');
  }

  const endpoint = `${config.fallbackAiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.fallbackAiApiKey}`
    },
    body: JSON.stringify({
      model: config.fallbackAiModel,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Tanggal Referensi Hari Ini: ${todayStr}\nPesan Pengguna:\n"${userText}"`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fallback AI failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content received from fallback AI');
  }

  return parseJsonResponse(content, userText, todayStr);
}

// Fallback Darurat: Smart Regex Parser (Jika AI offline / tidak ada API Key)
export function parseWithRegex(userText: string, todayStr: string): NewTransaction[] {
  const items: NewTransaction[] = [];
  const lines = userText.split(/,|\bdan\b|\bsama\b|\n/i);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Cari nominal uang: misal 25k, 25rb, 25.000, 25000, rp 50000
    const match = trimmed.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)?\b/i);
    if (match) {
      let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
      const unit = (match[2] || '').toLowerCase();
      if (unit === 'k' || unit === 'rb' || unit === 'ribu') {
        num *= 1000;
      } else if (unit === 'jt' || unit === 'juta') {
        num *= 1000000;
      }

      const amount = Math.round(num);
      if (amount <= 0) continue;

      // Tebak kategori dari keyword
      let category = 'lainnya';
      const lower = trimmed.toLowerCase();
      if (/makan|nasi|mie|ayam|bakso|soto|pecel|warteg|padang|sarapan|lunch|dinner/i.test(lower)) {
        category = 'makan';
      } else if (/kopi|ngopi|coffee|cafe|cappuccino|americano|latte/i.test(lower)) {
        category = 'kopi';
      } else if (/jajan|snack|boba|gorengan|camilan|eskrim|roti/i.test(lower)) {
        category = 'jajan';
      } else if (/bensin|pertalite|pertamax|spbu|solar/i.test(lower)) {
        category = 'bensin';
      } else if (/belanja|indomaret|alfamart|supermarket|shopee|tokped|baju/i.test(lower)) {
        category = 'belanja';
      } else if (/listrik|pln|wifi|pulsa|kuota|air|pdam|sewa|kontrakan|tagihan/i.test(lower)) {
        category = 'tagihan';
      } else if (/parkir|tol|ojol|grab|gojek|kereta|bus/i.test(lower)) {
        category = 'transport';
      }

      // Bersihkan deskripsi
      let desc = trimmed.replace(match[0], '').trim();
      if (!desc) desc = category.charAt(0).toUpperCase() + category.slice(1);

      items.push({
        date: todayStr,
        amount,
        category,
        description: desc,
        raw_message: userText
      });
    }
  }

  return items;
}

// Helper parsing JSON dari teks respons LLM
function parseJsonResponse(rawJson: string, rawMessage: string, todayStr: string): NewTransaction[] {
  let cleanJson = rawJson.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanJson);
  const items = Array.isArray(parsed) ? parsed : parsed.items || [];

  return items.map((item: any) => ({
    date: item.date || todayStr,
    amount: Math.round(Number(item.amount) || 0),
    category: (item.category || 'lainnya').toLowerCase().trim(),
    description: item.description || 'Pengeluaran',
    raw_message: rawMessage
  }));
}

// Ekstraktor Utama dengan Failover Berjenjang
export async function parseExpenseInput(userText: string, referenceDate = new Date()): Promise<{
  items: NewTransaction[];
  engineUsed: 'gemini' | 'fallback_ai' | 'regex';
}> {
  const todayStr = referenceDate.toISOString().split('T')[0];

  // 1. Coba Google Gemini Flash
  if (config.geminiApiKey) {
    try {
      const items = await parseWithGemini(userText, todayStr);
      if (items.length > 0) {
        return { items, engineUsed: 'gemini' };
      }
    } catch (err: any) {
      console.warn(`[AI] Gemini Flash error: ${err.message}. Mencoba fallback...`);
    }
  }

  // 2. Coba Fallback AI (OpenRouter / OpenAI-compatible)
  if (config.fallbackAiApiKey) {
    try {
      const items = await parseWithFallback(userText, todayStr);
      if (items.length > 0) {
        return { items, engineUsed: 'fallback_ai' };
      }
    } catch (err: any) {
      console.warn(`[AI] Fallback AI error: ${err.message}. Menggunakan regex parser...`);
    }
  }

  // 3. Fallback Cerdas Terakhir (Smart Regex)
  const regexItems = parseWithRegex(userText, todayStr);
  return { items: regexItems, engineUsed: 'regex' };
}
