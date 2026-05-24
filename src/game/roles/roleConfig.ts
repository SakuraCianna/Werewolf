import type { RoleConfig } from '../types';

const ROLE_CONFIGS: Record<number, RoleConfig> = {
  6: { playerCount: 6, roles: { werewolf: 2, villager: 3, seer: 1 } },
  7: { playerCount: 7, roles: { werewolf: 2, villager: 3, seer: 1, witch: 1 } },
  8: { playerCount: 8, roles: { werewolf: 2, villager: 4, seer: 1, witch: 1 } },
  9: { playerCount: 9, roles: { werewolf: 3, villager: 3, seer: 1, witch: 1, hunter: 1 } },
  10: { playerCount: 10, roles: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1 } },
  11: { playerCount: 11, roles: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 } },
  12: { playerCount: 12, roles: { werewolf: 4, villager: 4, seer: 1, witch: 1, hunter: 1, guard: 1 } },
};

export function getRoleConfig(playerCount: number): RoleConfig {
  const config = ROLE_CONFIGS[playerCount];
  if (!config) {
    throw new Error('Player count must be between 6 and 12');
  }
  return {
    playerCount: config.playerCount,
    roles: { ...config.roles },
  };
}
