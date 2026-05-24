import { AnthropicClaudeAdapter } from './adapters/anthropicClaude';
import { OpenAICompatibleAdapter } from './adapters/openaiCompatible';
import type { LlmClient } from './types';

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new Error(`缺少环境变量 ${name}`);
  }

  return value.trim();
}

export function createLlmClientFromEnv(): LlmClient {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'openai-compatible';

  if (provider === 'anthropic') {
    return new AnthropicClaudeAdapter({
      apiKey: required(import.meta.env.VITE_ANTHROPIC_API_KEY, 'VITE_ANTHROPIC_API_KEY'),
      baseUrl: required(import.meta.env.VITE_ANTHROPIC_BASE_URL, 'VITE_ANTHROPIC_BASE_URL'),
      model: required(import.meta.env.VITE_ANTHROPIC_MODEL, 'VITE_ANTHROPIC_MODEL'),
      anthropicVersion: import.meta.env.VITE_ANTHROPIC_VERSION || '2023-06-01',
    });
  }

  return new OpenAICompatibleAdapter({
    apiKey: required(import.meta.env.VITE_OPENAI_API_KEY, 'VITE_OPENAI_API_KEY'),
    baseUrl: required(import.meta.env.VITE_OPENAI_BASE_URL, 'VITE_OPENAI_BASE_URL'),
    model: required(import.meta.env.VITE_OPENAI_MODEL, 'VITE_OPENAI_MODEL'),
  });
}
