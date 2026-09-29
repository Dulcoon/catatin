import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../config.js';
import { NewTransaction } from '../db/database.js';

// Briefing Ultra-Ramping (~75 kata). 
// Karena kita memakai responseSchema, kita tidak perlu membuang token untuk menulis contoh JSON atau larangan format.
const SYSTEM_PROMPT = `Ekstrak data pengeluaran dari teks percakapan santai.
Kategori wajib salah satu dari: makan, kopi, jajan, bensin, belanja, tagihan, transport, hiburan, lainnya.
Aturan:
- Konversi nominal: "25k"/"25rb" -> 25000, "0.5jt" -> 500000.
- Tanggal gunakan YYYY-MM-DD. Hitung tanggal relatif terhadap tanggal referensi (misal "kemarin" = H-1).
- Deskripsi singkat nama barang/keperluan.`;

// Skema output ketat (Constrained Decoding) - Gemini dikunci di level token
// sehingga mustahil memproduksi teks basa-basi atau format lain di luar JSON ini.
const GEMINI_RESPONSE_SCHEMA: any = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      description: 'Daftar pengeluaran yang terdeteksi',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING, description: 'Format YYYY-MM-DD' },
          amount: { type: SchemaType.INTEGER, description: 'Nominal bulat Rupiah' },
          category: {
            type: SchemaType.STRING,
            enum: ['makan', 'kopi', 'jajan', 'bensin', 'belanja', 'tagihan', 'transport', 'hiburan', 'lainnya']
          },
          description: { type: SchemaType.STRING, description: 'Nama item atau keterangan' }
        },
        required: ['date', 'amount', 'category', 'description']
      }
    }
  },
  required: ['items']
};

// Ekstraksi via Google Gemini Flash
async function parseWithGemini(userText: string, todayStr: string): Promise<NewTransaction[]> {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  
  // Model di-briefing melalui systemInstruction resmi & generationConfig terikat ketat
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      maxOutputTokens: 300, // Batas keras (Hard Limit) token output: hemat dan anti-berlebihan
      temperature: 0.1      // Sangat fokus dan deterministik (zero-creativity/rambling)
    }
  });

  // Prompt input hanya berbobot ~20 token!
  const prompt = `Tanggal referensi: ${todayStr}\nTeks: "${userText}"`;
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
      max_tokens: 300, // Hard limit token output pada fallback
      response_format: { type: 'json_object' },
      messages: [
        { 
          role: 'system', 
          content: `${SYSTEM_PROMPT}\nKembalikan HANYA format JSON: {"items":[{"date":"YYYY-MM-DD","amount":0,"category":"...","description":"..."}]}` 
        },
        {
          role: 'user',
          content: `Tanggal referensi: ${todayStr}\nTeks: "${userText}"`
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
