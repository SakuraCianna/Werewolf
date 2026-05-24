export async function buildProviderErrorMessage(
  provider: 'OpenAI-compatible' | 'Anthropic',
  response: Response,
): Promise<string> {
  const bodySnippet = await readBodySnippet(response, 200);
  const statusText = response.statusText.trim();
  const statusDetails = statusText ? `${response.status} ${statusText}` : `${response.status}`;
  return bodySnippet
    ? `${provider} request failed: ${statusDetails} ${bodySnippet}`
    : `${provider} request failed: ${statusDetails}`;
}

async function readBodySnippet(response: Response, maxLength: number): Promise<string> {
  try {
    const body = await response.text();
    return body.replace(/\r?\n/g, ' ').trim().slice(0, maxLength);
  } catch {
    return '';
  }
}
