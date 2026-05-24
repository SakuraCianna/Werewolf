import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPersonas, loadRulesMarkdown } from './loadMarkdownAssets';

describe('loadMarkdownAssets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads rules markdown from public rules path', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      text: async () => `rules from ${url}`,
    })));

    await expect(loadRulesMarkdown()).resolves.toBe('rules from /rules/werewolf-rules.md');
  });

  it('loads persona manifest and markdown files', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/personas/index.json') {
        return {
          ok: true,
          json: async () => ({ files: ['lin-che.md', 'xia-mian.md'] }),
        };
      }
      return {
        ok: true,
        text: async () => `# ${url.includes('lin') ? '林澈' : '夏眠'}\n\n说话风格：冷静。`,
      };
    }));

    const personas = await loadPersonas();
    expect(personas).toHaveLength(2);
    expect(personas[0]).toMatchObject({ id: 'lin-che', name: '林澈' });
    expect(personas[1]).toMatchObject({ id: 'xia-mian', name: '夏眠' });
  });

  it('throws a readable error when a file cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    await expect(loadRulesMarkdown()).rejects.toThrow('Failed to load /rules/werewolf-rules.md: 404');
  });
});
