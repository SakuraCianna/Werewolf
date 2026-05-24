import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseLlmJson } from '../parseLlmJson';
import { AnthropicClaudeAdapter } from './anthropicClaude';
import { OpenAICompatibleAdapter } from './openaiCompatible';

const request = {
  system: 'rules',
  user: 'please speak',
  temperature: 0.7,
};

describe('LLM adapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls OpenAI-compatible chat completions with expected headers and body', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"speech":"I speak first."}' } }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenAICompatibleAdapter({
      apiKey: 'key',
      baseUrl: 'https://example.test',
      model: 'model-a',
    });

    await expect(adapter.generate(request)).resolves.toEqual({ speech: 'I speak first.' });
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'model-a',
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'rules' },
          { role: 'user', content: 'please speak' },
        ],
      }),
    });
  });

  it('calls Anthropic Messages API style endpoint with expected headers and body', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"speech":"I will keep listening."}' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new AnthropicClaudeAdapter({
      apiKey: 'key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
      anthropicVersion: '2023-06-01',
    });

    await expect(adapter.generate(request)).resolves.toEqual({ speech: 'I will keep listening.' });
    expect(fetchMock).toHaveBeenCalledWith('https://anthropic.test/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': 'key',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-test',
        max_tokens: 1024,
        temperature: 0.7,
        system: 'rules',
        messages: [{ role: 'user', content: 'please speak' }],
      }),
    });
  });

  it('parses fenced JSON responses', () => {
    expect(parseLlmJson('```json\n{"speech":"ok"}\n```')).toEqual({ speech: 'ok' });
  });

  it('throws a readable error for malformed JSON responses', () => {
    expect(() => parseLlmJson('{"speech":\n}')).toThrow(
      'Failed to parse LLM JSON response: {"speech": }',
    );
  });

  it('requires parsed LLM responses to be JSON objects', () => {
    expect(() => parseLlmJson('["speech"]')).toThrow('LLM response must be a JSON object');
    expect(() => parseLlmJson('"speech"')).toThrow('LLM response must be a JSON object');
  });

  it('throws when OpenAI-compatible responses omit message content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: {} }] }),
      })),
    );

    const adapter = new OpenAICompatibleAdapter({
      apiKey: 'key',
      baseUrl: 'https://example.test',
      model: 'model-a',
    });

    await expect(adapter.generate(request)).rejects.toThrow(
      'OpenAI-compatible response did not include message content',
    );
  });

  it('throws when Anthropic responses omit text content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ content: [{ type: 'tool_use' }] }),
      })),
    );

    const adapter = new AnthropicClaudeAdapter({
      apiKey: 'key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
      anthropicVersion: '2023-06-01',
    });

    await expect(adapter.generate(request)).rejects.toThrow(
      'Anthropic response did not include text content',
    );
  });

  it('includes provider status text and body snippets in OpenAI-compatible non-ok errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '{"error":"rate\nlimit"}',
      })),
    );

    const adapter = new OpenAICompatibleAdapter({
      apiKey: 'secret-key',
      baseUrl: 'https://example.test',
      model: 'model-a',
    });

    await expect(adapter.generate(request)).rejects.toThrow(
      'OpenAI-compatible request failed: 429 Too Many Requests {"error":"rate limit"}',
    );
    await expect(adapter.generate(request)).rejects.not.toThrow('secret-key');
  });

  it('includes provider status text and body snippets in Anthropic non-ok errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'server\nfailed',
      })),
    );

    const adapter = new AnthropicClaudeAdapter({
      apiKey: 'secret-key',
      baseUrl: 'https://anthropic.test',
      model: 'claude-test',
      anthropicVersion: '2023-06-01',
    });

    await expect(adapter.generate(request)).rejects.toThrow(
      'Anthropic request failed: 500 Internal Server Error server failed',
    );
    await expect(adapter.generate(request)).rejects.not.toThrow('secret-key');
  });
});
