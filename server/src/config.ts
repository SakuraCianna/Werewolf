import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 优先从 server 目录或根目录加载 .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT || 3001),
  assemblyAiApiKey: process.env.ASSEMBLYAI_API_KEY || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  mockVoice: process.env.MOCK_VOICE === 'true' || !process.env.ASSEMBLYAI_API_KEY,
  mockLLM: process.env.MOCK_LLM === 'true' || !process.env.DEEPSEEK_API_KEY,
};
