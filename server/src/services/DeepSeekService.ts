import OpenAI from 'openai';
import { config } from '../config.js';

export class DeepSeekService {
  private client: OpenAI | null = null;
  private forceMock: boolean = false;

  constructor(options: { forceMock?: boolean } = {}) {
    this.forceMock = options.forceMock ?? config.mockLLM;
    if (config.deepseekApiKey && !this.forceMock) {
      this.client = new OpenAI({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
        timeout: 15000,
      });
    }
  }

  public async generateCompletion(prompt: string, maxTokens: number = 300): Promise<string> {
    if (!this.client || this.forceMock) {
      throw new Error('DeepSeek client not configured or mock mode enabled');
    }

    const response = await this.client.chat.completions.create({
      model: config.deepseekModel,
      messages: [
        {
          role: 'system',
          content:
            '你是一名正在参与狼人杀游戏的硬核博弈玩家。请严格遵循角色人设，切勿跳出角色，不要暴露上帝视角，回复精炼有力度。',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }
}
