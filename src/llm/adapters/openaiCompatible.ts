import { parseLlmJson } from '../parseLlmJson';
import type { LlmClient, LlmGenerateRequest, OpenAICompatibleConfig } from '../types';

export class OpenAICompatibleAdapter implements LlmClient {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generate(request: LlmGenerateRequest): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: request.temperature,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible request failed: ${response.status}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI-compatible response did not include message content');
    }
    return parseLlmJson(content);
  }
}
