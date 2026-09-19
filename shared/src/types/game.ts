export type Language = 'zh-CN' | 'en-US';

export type Role = 'WEREWOLF' | 'SEER' | 'WITCH' | 'VILLAGER' | 'HUNTER' | 'GUARD';

export type Camp = 'WOLF' | 'GOOD';

export type DeathReason = 'KILLED_BY_WOLF' | 'POISONED_BY_WITCH' | 'VOTED_OUT';

export type PlayerSentiment = 'CALM' | 'NERVOUS' | 'AGGRESSIVE' | 'DEFENSIVE';

export interface SentimentAnalysisResult {
  speakerId: number;
  sentiment: PlayerSentiment;
  score: number; // 0 ~ 100
  labelZh: string;
  labelEn: string;
  quote?: string;
}

export interface PostGameReport {
  mvpPlayerId: number;
  mvpReason: string;
  turningPoint: string;
  tacticalReview: string;
  deceptionAnalysis: string;
}

export interface AgentPersona {
  id: string;
  nameZh: string;
  nameEn: string;
  gender: 'MALE' | 'FEMALE';
  toneStyleZh: string;
  toneStyleEn: string;
  memoryTrait: number; // 记忆持久度系数 P_trait (0.8 ~ 1.5)
  voiceIdZh: string;   // Edge-TTS 音色 ID
  voiceIdEn: string;
}

export interface Player {
  id: number;              // 1 ~ 6
  name: string;
  role: Role;
  camp: Camp;
  isAI: boolean;
  isAlive: boolean;
  deathRound?: number;
  deathReason?: DeathReason;
  avatar: string;
  persona?: AgentPersona;
  sentiment?: PlayerSentiment;
}

export type GamePhase =
  | 'IDLE'
  | 'ROLE_REVEAL'
  | 'NIGHT_START'
  | 'NIGHT_WOLF'
  | 'NIGHT_SEER'
  | 'NIGHT_WITCH'
  | 'DAY_START'
  | 'DAY_DISCUSS'
  | 'DAY_VOTE'
  | 'DAY_VOTE_RESULT'
  | 'GAME_OVER';

export interface BoardConfig {
  playerCount: number;
  roles: Role[];
}

export interface WitchInventory {
  hasAntidote: boolean;
  hasPoison: boolean;
}

export interface GameState {
  roomId: string;
  hostPlayerId: number;
  language: Language;
  round: number;
  phase: GamePhase;
  players: Player[];
  currentSpeakerId: number | null;
  speakingOrder: number[];
  speakingTimerSeconds: number;
  witchInventory: WitchInventory;
  nightVictimId: number | null;
  seerCheckedHistory: Array<{ round: number; targetId: number; isWolf: boolean }>;
  votes: Record<number, number>; // voterId -> targetId
  lastVotedOutId: number | null;
  winner: Camp | null;
  latestSentiment?: SentimentAnalysisResult;
  postGameReport?: PostGameReport;
}

/**
 * 生成全网唯一的狼人杀风格随机房间号 (例如: WOLF-7492)
 */
export function generateRandomRoomId(): string {
  return 'WOLF-' + Math.floor(1000 + Math.random() * 9000);
}
