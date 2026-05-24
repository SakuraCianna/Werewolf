export async function buildProviderErrorMessage(
  provider: 'OpenAI-compatible' | 'Anthropic',
  response: Response,
): Promise<string> {
  const bodySnippet = await readBodySnippet(response, 200);
  return bodySnippet
    ? `${provider} request failed: ${response.status} ${bodySnippet}`
    : `${provider} request failed: ${response.status}`;
}

async function readBodySnippet(response: Response, maxLength: number): Promise<string> {
  try {
    const body = await response.text();
    return body.replace(/\r?\n/g, ' ').trim().slice(0, maxLength);
  } catch {
    return '';
  }
}
