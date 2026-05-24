export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'guard';

export type Camp = 'werewolf' | 'good';

export type GamePhase =
  | 'lobby'
  | 'setup'
  | 'night'
  | 'night-result'
  | 'day-discussion'
  | 'vote'
  | 'exile-result'
  | 'settlement';

export type ViewMode = 'audience' | 'god';

export type PlayerStatus = 'alive' | 'dead';

export type EventKind =
  | 'speech'
  | 'kill'
  | 'revive'
  | 'protect'
  | 'inspect'
  | 'vote'
  | 'exile'
  | 'phase'
  | 'system';

export interface RoleConfig {
  playerCount: number;
  roles: Partial<Record<Role, number>>;
}

export interface Persona {
  id: string;
  name: string;
  markdown: string;
}

export interface Player {
  id: string;
  name: string;
  personaId: string;
  role: Role;
  camp: Camp;
  status: PlayerStatus;
  privateMemory: string[];
}

export interface GameEvent {
  id: string;
  kind: EventKind;
  phase: GamePhase;
  day: number;
  title: string;
  content: string;
  playerId?: string;
  targetId?: string;
  colorToken: 'speech' | 'kill' | 'revive' | 'protect' | 'neutral';
  createdAt: number;
}

export interface GameCheckpoint {
  id: string;
  label: string;
  phase: GamePhase;
  day: number;
  eventIndex: number;
  state: GameStateSnapshot;
}

export interface GameStateSnapshot {
  phase: GamePhase;
  day: number;
  players: Player[];
  events: GameEvent[];
}

export interface GameState extends GameStateSnapshot {
  playerCount: number;
  viewMode: ViewMode;
  checkpoints: GameCheckpoint[];
  rulesMarkdown: string;
}
