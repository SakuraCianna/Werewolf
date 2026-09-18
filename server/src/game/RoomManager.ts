import type { WebSocket } from 'ws';
import type {
  GameState,
  Language,
  ServerToClientEvents,
  WSMessage,
  Player,
} from 'voice-werewolf-shared';
import { GameEngine } from './GameEngine.js';
import { AssemblyAIService } from '../services/AssemblyAIService.js';

export interface ClientMeta {
  playerId: number;
  name: string;
  isHost: boolean;
}

export interface JoinRoomResult {
  success: boolean;
  reason?: 'ROOM_FULL' | 'GAME_ALREADY_STARTED' | 'INVALID_ROOM';
  message?: string;
  session?: RoomSession;
  playerId?: number;
  isHost?: boolean;
}

export class RoomSession {
  public readonly roomId: string;
  public engine: GameEngine;
  public clients: Map<WebSocket, ClientMeta> = new Map();
  public isProcessingAiSpeech: boolean = false;
  public assemblyAi: AssemblyAIService;

  constructor(roomId: string, engineEvents: ConstructorParameters<typeof GameEngine>[0] = {}) {
    this.roomId = roomId;
    this.assemblyAi = new AssemblyAIService();
    this.engine = new GameEngine(engineEvents);
    this.engine.setRoomId(roomId);
  }

  public getHumanPlayers(): Array<{ id: number; name: string }> {
    const list: Array<{ id: number; name: string }> = [];
    for (const meta of this.clients.values()) {
      list.push({ id: meta.playerId, name: meta.name });
    }
    return list.sort((a, b) => a.id - b.id);
  }

  public getClientByPlayerId(playerId: number): WebSocket | undefined {
    for (const [ws, meta] of this.clients.entries()) {
      if (meta.playerId === playerId) return ws;
    }
    return undefined;
  }

  public getMeta(ws: WebSocket): ClientMeta | undefined {
    return this.clients.get(ws);
  }

  public broadcast<K extends keyof ServerToClientEvents>(
    type: K,
    payload: ServerToClientEvents[K],
  ): void {
    const data = JSON.stringify({ type, payload } as WSMessage<ServerToClientEvents[K]>);
    for (const ws of this.clients.keys()) {
      if (ws.readyState === 1 /* WebSocket.OPEN */) {
        ws.send(data);
      }
    }
  }

  public send<K extends keyof ServerToClientEvents>(
    ws: WebSocket,
    type: K,
    payload: ServerToClientEvents[K],
  ): void {
    if (ws.readyState === 1 /* WebSocket.OPEN */) {
      ws.send(JSON.stringify({ type, payload } as WSMessage<ServerToClientEvents[K]>));
    }
  }
}

export class RoomManager {
  private static instance: RoomManager | null = null;
  private rooms: Map<string, RoomSession> = new Map();
  private clientRoomMap: Map<WebSocket, string> = new Map();
  private roomCleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  public getRoom(roomId: string): RoomSession | undefined {
    return this.rooms.get(roomId);
  }

  public createRoom(
    roomId: string,
    engineEvents: ConstructorParameters<typeof GameEngine>[0] = {},
  ): RoomSession {
    let session = this.rooms.get(roomId);
    if (!session) {
      session = new RoomSession(roomId, engineEvents);
      this.rooms.set(roomId, session);
    }
    return session;
  }

  /**
   * 加入房间 (含满员拦截与对局中拦截)
   */
  public joinRoom(
    ws: WebSocket,
    roomId: string,
    playerName?: string,
    engineEvents: ConstructorParameters<typeof GameEngine>[0] = {},
  ): JoinRoomResult {
    const session = this.createRoom(roomId, engineEvents);

    // 1. 如果该连接已经在该房间，直接返回现有席位
    const existingMeta = session.getMeta(ws);
    if (existingMeta) {
      return {
        success: true,
        session,
        playerId: existingMeta.playerId,
        isHost: existingMeta.isHost,
      };
    }

    // 2. 检查对局状态拦截：如果游戏已经开始且非等待阶段，禁止外部加入
    const currentPhase = session.engine.getState().phase;
    if (currentPhase !== 'IDLE' && currentPhase !== 'GAME_OVER') {
      return {
        success: false,
        reason: 'GAME_ALREADY_STARTED',
        message: '该房间命运之局已在进行中，已开启结界，暂不允许中途加入。',
      };
    }

    // 3. 检查席位满员拦截 (最多 6 名真人玩家)
    if (session.clients.size >= 6) {
      return {
        success: false,
        reason: 'ROOM_FULL',
        message: '该房间席位已全满 (6/6 位玩家)，无法继续加入。',
      };
    }

    // 4. 分配席位：寻找 1 ~ 6 中未被占用的最小席位号
    const occupiedSeats = new Set<number>();
    for (const meta of session.clients.values()) {
      occupiedSeats.add(meta.playerId);
    }

    let assignedId = 1;
    for (let id = 1; id <= 6; id++) {
      if (!occupiedSeats.has(id)) {
        assignedId = id;
        break;
      }
    }

    const hasHost = Array.from(session.clients.values()).some((m) => m.isHost);
    const isHost = !hasHost;
    const defaultName = isHost ? '你 (房主)' : `好友 (${assignedId}号)`;
    const meta: ClientMeta = {
      playerId: assignedId,
      name: playerName?.trim() || defaultName,
      isHost,
    };

    session.clients.set(ws, meta);
    this.clientRoomMap.set(ws, roomId);

    // 取消该房间可能处于挂起状态的空闲清理定时器
    const cleanupTimer = this.roomCleanupTimers.get(roomId);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      this.roomCleanupTimers.delete(roomId);
    }

    // 同步更新 GameEngine 的 hostPlayerId
    if (isHost) {
      session.engine.setHostPlayerId(assignedId);
    }

    return {
      success: true,
      session,
      playerId: assignedId,
      isHost,
    };
  }

  public leaveRoom(ws: WebSocket): { roomId: string; session: RoomSession } | null {
    const roomId = this.clientRoomMap.get(ws);
    if (!roomId) return null;

    this.clientRoomMap.delete(ws);
    const session = this.rooms.get(roomId);
    if (!session) return null;

    const meta = session.clients.get(ws);
    session.clients.delete(ws);

    // 若房主断开且尚有其他好友在线，自动将剩余最早席位的玩家升为新房主
    if (meta?.isHost && session.clients.size > 0) {
      const remainingMetas = Array.from(session.clients.values()).sort((a, b) => a.playerId - b.playerId);
      if (remainingMetas[0]) {
        remainingMetas[0].isHost = true;
        session.engine.setHostPlayerId(remainingMetas[0].playerId);
      }
    }

    // 若房间内已无任何客户端，且非默认常驻房间，启动 5 分钟闲置清理定时器
    if (session.clients.size === 0 && roomId !== 'werewolf-default') {
      const existingTimer = this.roomCleanupTimers.get(roomId);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        const s = this.rooms.get(roomId);
        if (s && s.clients.size === 0) {
          this.rooms.delete(roomId);
          this.roomCleanupTimers.delete(roomId);
        }
      }, 5 * 60 * 1000);
      this.roomCleanupTimers.set(roomId, timer);
    }

    return { roomId, session };
  }

  public getSessionByClient(ws: WebSocket): { session: RoomSession; meta: ClientMeta } | null {
    const roomId = this.clientRoomMap.get(ws);
    if (!roomId) return null;
    const session = this.rooms.get(roomId);
    if (!session) return null;
    const meta = session.clients.get(ws);
    if (!meta) return null;
    return { session, meta };
  }
}
