import { describe, expect, it } from 'vitest';
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
