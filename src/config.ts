import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '7878', 10),
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID ? parseInt(process.env.ADMIN_TELEGRAM_ID, 10) : 0,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  publicUrl: (process.env.PUBLIC_URL || process.env.WEB_APP_URL || '').replace(/\/+$/, ''),
  weeklyBudget: parseInt(process.env.WEEKLY_BUDGET || '500000', 10),
  warningThresholdPercent: parseInt(process.env.WARNING_THRESHOLD_PERCENT || '80', 10),
  
  // AI Config
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  
  fallbackAiApiKey: process.env.FALLBACK_AI_API_KEY || '',
  fallbackAiBaseUrl: process.env.FALLBACK_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  fallbackAiModel: process.env.FALLBACK_AI_MODEL || 'deepseek/deepseek-chat',
  
  databasePath: process.env.DATABASE_PATH || 'catatin.db',
  nodeEnv: process.env.NODE_ENV || 'development'
};
