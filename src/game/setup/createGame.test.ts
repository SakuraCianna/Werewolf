import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Persona } from '../types';
import { createGame } from './createGame';

function personas(count: number): Persona[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `persona-${index + 1}`,
    name: `玩家${index + 1}`,
    markdown: `# 玩家${index + 1}`,
  }));
}

describe('createGame', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates players with names, roles, camps, and alive status', () => {
    const game = createGame({
      playerCount: 6,
      personas: personas(12),
      rulesMarkdown: '# rules',
      seed: 7,
    });

    expect(game.players).toHaveLength(6);
    expect(game.players.every((player) => player.status === 'alive')).toBe(true);
    expect(game.players.filter((player) => player.role === 'werewolf')).toHaveLength(2);
    expect(game.players.filter((player) => player.camp === 'good')).toHaveLength(4);
    expect(game.viewMode).toBe('audience');
    expect(game.events[0].title).toBe('游戏开始');
  });

  it('creates deterministic players and initial event time from the same seed', () => {
    const input = {
      playerCount: 6,
      personas: personas(12),
      rulesMarkdown: '# rules',
      seed: 42,
    };

    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const firstGame = createGame(input);
    vi.setSystemTime(2000);
    const secondGame = createGame(input);

    const playerSummary = (game: ReturnType<typeof createGame>) =>
      game.players.map((player) => ({ id: player.id, role: player.role }));

    expect(playerSummary(secondGame)).toEqual(playerSummary(firstGame));
    expect(secondGame.events[0].createdAt).toBe(firstGame.events[0].createdAt);
  });

  it('uses an explicit createdAt value for the initial event', () => {
    const game = createGame({
      playerCount: 6,
      personas: personas(12),
      rulesMarkdown: '# rules',
      seed: 7,
      createdAt: 123456,
    });

    expect(game.events[0].createdAt).toBe(123456);
  });

  it('does not mutate input personas', () => {
    const inputPersonas = personas(12);
    const snapshot = JSON.stringify(inputPersonas);

    createGame({
      playerCount: 6,
      personas: inputPersonas,
      rulesMarkdown: '# rules',
      seed: 7,
    });

    expect(JSON.stringify(inputPersonas)).toBe(snapshot);
  });

  it('assigns the exact 6-player role multiset', () => {
    const game = createGame({
      playerCount: 6,
      personas: personas(12),
      rulesMarkdown: '# rules',
      seed: 7,
    });

    expect(game.players.filter((player) => player.role === 'werewolf')).toHaveLength(2);
    expect(game.players.filter((player) => player.role === 'villager')).toHaveLength(3);
    expect(game.players.filter((player) => player.role === 'seer')).toHaveLength(1);
  });

  it('requires enough personas for the selected player count', () => {
    expect(() =>
      createGame({
        playerCount: 12,
        personas: personas(6),
        rulesMarkdown: '# rules',
        seed: 1,
      }),
    ).toThrow('Need at least 12 personas');
  });
});
