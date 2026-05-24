import { describe, expect, it } from 'vitest';
import { createGame } from '../setup/createGame';
import type { GameEvent, Persona } from '../types';
import type { LlmClient, LlmGenerateRequest } from '../../llm/types';
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

function makeEvent(kind: GameEvent['kind'], title: string, content: string): GameEvent {
  return {
    id: `event-${kind}-${title}`,
    kind,
    phase: 'day-discussion',
    day: 1,
    title,
    content,
    colorToken: kind === 'kill' ? 'kill' : kind === 'revive' ? 'revive' : 'neutral',
    createdAt: 1,
  };
}

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

  it('passes only public events to the speech prompt', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const state = {
      ...game,
      events: [
        makeEvent('speech', 'Public speech', 'visible speech content'),
        makeEvent('kill', 'Public kill', 'visible kill content'),
        makeEvent('revive', 'Public revive', 'visible revive content'),
        makeEvent('inspect', 'Private inspect', 'hidden inspect content'),
        makeEvent('protect', 'Private protect', 'hidden protect content'),
      ],
    };
    let capturedRequest: LlmGenerateRequest | undefined;
    const capturingLlm: LlmClient = {
      async generate(request) {
        capturedRequest = request;
        return { speech: 'public response' };
      },
    };

    await runOneSpeech(state, state.players[0].id, capturingLlm);

    expect(capturedRequest?.user).toContain('visible speech content');
    expect(capturedRequest?.user).toContain('visible kill content');
    expect(capturedRequest?.user).toContain('visible revive content');
    expect(capturedRequest?.user).not.toContain('hidden inspect content');
    expect(capturedRequest?.user).not.toContain('hidden protect content');
  });

  it('rejects unknown player id', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });

    await expect(runOneSpeech(game, 'missing', fakeLlm)).rejects.toThrow(
      'Player not found: missing',
    );
  });

  it('rejects missing speech response', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const missingSpeechLlm: LlmClient = {
      async generate() {
        return {};
      },
    };

    await expect(runOneSpeech(game, game.players[0].id, missingSpeechLlm)).rejects.toThrow(
      'LLM speech response must include a non-empty speech string',
    );
  });

  it('rejects non-string speech response', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const nonStringSpeechLlm: LlmClient = {
      async generate() {
        return { speech: 42 };
      },
    };

    await expect(runOneSpeech(game, game.players[0].id, nonStringSpeechLlm)).rejects.toThrow(
      'LLM speech response must include a non-empty speech string',
    );
  });

  it('rejects blank speech response', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const blankSpeechLlm: LlmClient = {
      async generate() {
        return { speech: '   ' };
      },
    };

    await expect(runOneSpeech(game, game.players[0].id, blankSpeechLlm)).rejects.toThrow(
      'LLM speech response must include a non-empty speech string',
    );
  });

  it('rejects dead player speech', async () => {
    const game = createGame({ playerCount: 6, personas, rulesMarkdown: '# rules', seed: 1 });
    const playerId = game.players[0].id;
    const state = {
      ...game,
      players: game.players.map((player) =>
        player.id === playerId ? { ...player, status: 'dead' as const } : player,
      ),
    };

    await expect(runOneSpeech(state, playerId, fakeLlm)).rejects.toThrow(
      `Player cannot speak while dead: ${playerId}`,
    );
  });
});
