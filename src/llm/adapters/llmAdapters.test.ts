import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicClaudeAdapter } from './anthropicClaude';
import { OpenAICompatibleAdapter } from './openaiCompatible';

const request = {
  system: '规则',
  user: '请发言',
  temperature: 0.7,
};

describe('LLM adapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls OpenAI-compatible chat completions', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"speech":"我先发言。"}' } }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenAICompatibleAdapter({
      apiKey: 'key',
      baseUrl: 'https://example.test',
      model: 'model-a',
    });

    await expect(adapter.generate(request)).resolves.toEqual({ speech: '我先发言。' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls Anthropic Messages API style endpoint', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"speech":"我会继续听。"}' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new AnthropicClaudeAdapter({
      apiKey: 'key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
      anthropicVersion: '2023-06-01',
    });

    await expect(adapter.generate(request)).resolves.toEqual({ speech: '我会继续听。' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://anthropic.test/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
