export interface LlmGenerateRequest {
  system: string;
  user: string;
  temperature: number;
}

export interface LlmClient {
  generate(request: LlmGenerateRequest): Promise<Record<string, unknown>>;
}

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AnthropicClaudeConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  anthropicVersion: string;
}
