import { describe, expect, it } from 'vitest';
import { createGame } from '../setup/createGame';
import type { Persona } from '../types';
import type { LlmClient } from '../../llm/types';
import { runOneSpeech } from './gameEngine';

const fakeLlm: LlmClient = {
  async generate() {
    return { speech: '我先听完大家的发言，再判断谁在转移焦点。' };
  },
};

const personas: Persona[] = Array.from({ length: 6 }, (_, index) => ({
  id: `p${index}`,
  name: `玩家${index + 1}`,
  markdown: `# 玩家${index + 1}`,
}));

describe('gameEngine', () => {
  it('adds first-person speech event for a player', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const next = await runOneSpeech(game, game.players[0].id, fakeLlm);

    expect(next.events.at(-1)).toMatchObject({
      kind: 'speech',
      title: '第一天 · 玩家1发言',
      content: '我先听完大家的发言，再判断谁在转移焦点。',
      colorToken: 'speech',
    });
  });
});
