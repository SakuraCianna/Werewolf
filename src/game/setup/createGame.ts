import { getRoleConfig } from '../roles/roleConfig';
import type { Camp, GameState, Persona, Player, Role } from '../types';

interface CreateGameInput {
  playerCount: number;
  personas: Persona[];
  rulesMarkdown: string;
  seed: number;
  createdAt?: number;
}

function campForRole(role: Role): Camp {
  return role === 'werewolf' ? 'werewolf' : 'good';
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function expandRoles(playerCount: number): Role[] {
  const config = getRoleConfig(playerCount);
  return Object.entries(config.roles).flatMap(([role, count]) =>
    Array.from({ length: count ?? 0 }, () => role as Role),
  );
}

export function createGame(input: CreateGameInput): GameState {
  if (input.personas.length < input.playerCount) {
    throw new Error(`Need at least ${input.playerCount} personas`);
  }

  const selectedPersonas = shuffle(input.personas, input.seed).slice(0, input.playerCount);
  const roles = shuffle(expandRoles(input.playerCount), input.seed + 1);
  if (roles.length !== input.playerCount) {
    throw new Error(`Role config for ${input.playerCount} players produced ${roles.length} roles`);
  }

  const players: Player[] = selectedPersonas.map((persona, index) => {
    const role = roles[index];
    return {
      id: persona.id,
      name: persona.name,
      personaId: persona.id,
      role,
      camp: campForRole(role),
      status: 'alive',
      privateMemory: [],
    };
  });

  return {
    playerCount: input.playerCount,
    viewMode: 'audience',
    phase: 'night',
    day: 1,
    players,
    checkpoints: [],
    rulesMarkdown: input.rulesMarkdown,
    runtime: {
      step: 'night-start',
      speakerQueue: [],
      votedThisDay: false,
      witchSaveAvailable: true,
      witchPoisonAvailable: true,
      hunterShotPlayerIds: [],
      night: {
        witchSaved: false,
      },
      llmEnabled: true,
    },
    events: [
      {
        id: 'event-start',
        kind: 'system',
        phase: 'night',
        day: 1,
        title: '游戏开始',
        content: `${input.playerCount} 人局已经创建。`,
        colorToken: 'neutral',
        createdAt: input.createdAt ?? input.seed,
      },
    ],
  };
}
