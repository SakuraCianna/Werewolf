import { describe, expect, it } from 'vitest';
import { getRoleConfig } from './roleConfig';

const expected = {
  6: { werewolf: 2, villager: 3, seer: 1 },
  7: { werewolf: 2, villager: 3, seer: 1, witch: 1 },
  8: { werewolf: 2, villager: 4, seer: 1, witch: 1 },
  9: { werewolf: 3, villager: 3, seer: 1, witch: 1, hunter: 1 },
  10: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1 },
  11: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 },
  12: { werewolf: 4, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 },
} as const;

describe('getRoleConfig', () => {
  it.each(Object.entries(expected))('returns exact role counts for %s players', (count, roles) => {
    const config = getRoleConfig(Number(count));
    expect(config.roles).toEqual(roles);
    expect(Object.values(config.roles).reduce((sum, value) => sum + value, 0)).toBe(Number(count));
  });

  it('rejects player counts below 6', () => {
    expect(() => getRoleConfig(5)).toThrow('Player count must be between 6 and 12');
  });

  it('rejects player counts above 12', () => {
    expect(() => getRoleConfig(13)).toThrow('Player count must be between 6 and 12');
  });
});
