import type {
  GamePhase,
  GameState,
  Language,
  Camp,
  Player,
  Role,
  SentimentAnalysisResult,
  PostGameReport,
} from './game.js';

export interface ClientToServerEvents {
  START_GAME: { language: Language; userRole?: Role };
  JOIN_ROOM: { roomId: string; playerName?: string };
  LEAVE_ROOM: { roomId: string };
  USER_AUDIO_CHUNK: { pcmBase64: string };
  USER_END_SPEECH: Record<string, never>;
  USER_NIGHT_ACTION: {
    action: 'KILL' | 'CHECK' | 'SAVE' | 'POISON' | 'PASS';
    targetId?: number;
  };
  USER_VOTE: { targetId: number };
  DEV_SKIP_TURN: Record<string, never>;
  DEV_SIMULATE_SPEECH: { text: string };
}

export interface ServerToClientEvents {
  GAME_STATE_SYNC: { state: GameState };
  ROOM_INFO_SYNC: {
    roomId: string;
    myPlayerId: number;
    isHost: boolean;
    humanCount: number;
    maxCapacity: number;
    lanIp?: string;
  };
  JOIN_REJECTED: {
    reason: 'ROOM_FULL' | 'GAME_ALREADY_STARTED' | 'INVALID_ROOM';
    message: string;
  };
  SENTIMENT_DETECTED: SentimentAnalysisResult;
  POST_GAME_REPORT: PostGameReport;
  PHASE_CHANGE: {
    phase: GamePhase;
    round: number;
    announcement: string;
  };
  TRANSCRIPT_STREAM: {
    speakerId: number;
    text: string;
    isFinal: boolean;
  };
  SPEECH_START: {
    speakerId: number;
    maxSeconds: number;
  };
  SPEECH_END: {
    speakerId: number;
  };
  AUDIO_CHUNK: {
    speakerId: number;
    audioBase64: string;
    isEnd: boolean;
  };
  VOTE_REVEAL: {
    votes: Record<number, number>;
    eliminatedPlayerId: number | null;
  };
  GAME_FINISHED: {
    winner: Camp;
    message: string;
    players: Player[];
  };
  SYSTEM_ERROR: {
    code: string;
    message: string;
  };
}

export type WSMessage<T = unknown> = {
  type: keyof ClientToServerEvents | keyof ServerToClientEvents;
  payload: T;
};
