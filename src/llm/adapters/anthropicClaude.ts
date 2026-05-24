import { parseLlmJson } from '../parseLlmJson';
import type { AnthropicClaudeConfig, LlmClient, LlmGenerateRequest } from '../types';
import { buildProviderErrorMessage } from './providerErrors';

export class AnthropicClaudeAdapter implements LlmClient {
  constructor(private readonly config: AnthropicClaudeConfig) {}

  async generate(request: LlmGenerateRequest): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': this.config.anthropicVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 1024,
        temperature: request.temperature,
        system: request.system,
        messages: [{ role: 'user', content: request.user }],
      }),
    });

    if (!response.ok) {
      throw new Error(await buildProviderErrorMessage('Anthropic', response));
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((block) => block.type === 'text')?.text;
    if (!text) {
      throw new Error('Anthropic response did not include text content');
    }
    return parseLlmJson(text);
  }
}
