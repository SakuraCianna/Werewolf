import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import type {
  WSMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  GamePhase,
  Language,
  Camp,
  Role,
} from 'voice-werewolf-shared';
import { generateRandomRoomId } from 'voice-werewolf-shared';
import { GameEngine, GameEngineEvents } from '../game/GameEngine.js';
import { AgentBrain } from '../game/AgentBrain.js';
import { RoomManager, RoomSession } from '../game/RoomManager.js';
import { DeepSeekService } from '../services/DeepSeekService.js';
import { AudioIntelligenceService } from '../services/AudioIntelligenceService.js';
import { TTSService } from '../services/TTSService.js';
import { DEFAULT_VOICES } from 'voice-werewolf-shared';

export class GameSocketServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private deepseek: DeepSeekService;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.roomManager = RoomManager.getInstance();
    this.deepseek = new DeepSeekService();

    this.initWebSocket();
  }

  private createEngineEvents(roomId: string): GameEngineEvents {
    return {
      onPhaseChange: (phase, round, announcement) => {
        const session = this.roomManager.getRoom(roomId);
        if (!session) return;
        session.broadcast('PHASE_CHANGE', { phase, round, announcement });
        this.handlePhaseAutomation(session, phase, announcement);
      },
      onSpeakerChange: (speakerId, maxSeconds) => {
        const session = this.roomManager.getRoom(roomId);
        if (!session || speakerId === null) return;
        session.broadcast('SPEECH_START', { speakerId, maxSeconds });
        this.handleSpeakerTurn(session, speakerId);
      },
      onTranscript: (speakerId, text, isFinal) => {
        const session = this.roomManager.getRoom(roomId);
        if (!session) return;
        session.broadcast('TRANSCRIPT_STREAM', { speakerId, text, isFinal });
      },
      onGameOver: async (winner, message) => {
        const session = this.roomManager.getRoom(roomId);
        if (!session) return;
        session.broadcast('GAME_FINISHED', {
          winner,
          message,
          players: session.engine.getState().players,
        });

        // 终局触发 LeMUR / DeepSeek 战局全景深度复盘简报生成
        try {
          const report = await AudioIntelligenceService.generatePostGameReport(
            session.engine.getState(),
            session.engine.getMemoryEntries(),
            (prompt) => this.deepseek.generateCompletion(prompt, 600),
          );
          session.engine.setPostGameReport(report);
          session.broadcast('POST_GAME_REPORT', report);
        } catch {
          // 容错降级
        }
      },
      onStateUpdate: () => {
        const session = this.roomManager.getRoom(roomId);
        if (!session) return;
        this.broadcastGameState(session);
      },
    };
  }

  private initWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      // 优先从连接 URL 参数中解析 ?room=xxx，若无则自动随机生成专属房间 (如 WOLF-8392)
      let initialRoomId: string | null = null;
      if (req?.url) {
        try {
          const parsedUrl = new URL(req.url, 'http://localhost');
          const roomParam = parsedUrl.searchParams.get('room');
          if (roomParam && roomParam.trim()) {
            initialRoomId = roomParam.trim();
          }
        } catch {
          // ignore
        }
      }
      if (!initialRoomId) {
        initialRoomId = generateRandomRoomId();
      }

      const defaultJoin = this.roomManager.joinRoom(
        ws,
        initialRoomId,
        undefined,
        this.createEngineEvents(initialRoomId),
      );

      if (defaultJoin.success && defaultJoin.session) {
        const fullState = defaultJoin.session.engine.getState();
        const maskedState = this.getMaskedState(fullState, defaultJoin.playerId!);
        this.send(ws, 'GAME_STATE_SYNC', { state: maskedState });
        this.send(ws, 'ROOM_INFO_SYNC', {
          roomId: initialRoomId,
          myPlayerId: defaultJoin.playerId!,
          isHost: defaultJoin.isHost!,
          humanCount: defaultJoin.session.clients.size,
          maxCapacity: 6,
        });
      }

      ws.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch {
          // ignore invalid json
        }
      });

      ws.on('close', () => {
        const left = this.roomManager.leaveRoom(ws);
        if (left && left.session.clients.size > 0) {
          // 广播房间人员变动
          for (const [clientWs, meta] of left.session.clients.entries()) {
            left.session.send(clientWs, 'ROOM_INFO_SYNC', {
              roomId: left.roomId,
              myPlayerId: meta.playerId,
              isHost: meta.isHost,
              humanCount: left.session.clients.size,
              maxCapacity: 6,
            });
          }
          left.session.broadcast('GAME_STATE_SYNC', { state: left.session.engine.getState() });
        }
      });
    });
  }

  private async handleClientMessage(ws: WebSocket, msg: WSMessage): Promise<void> {
    const payload = (msg.payload || {}) as Record<string, unknown>;

    switch (msg.type) {
      case 'JOIN_ROOM': {
        const targetRoomId = (payload.roomId as string)?.trim() || generateRandomRoomId();
        const playerName = payload.playerName as string | undefined;

        // 如果已经在其他房间且不是目标房间，先离开原房间
        const currentRoom = this.roomManager.getSessionByClient(ws);
        if (currentRoom && currentRoom.session.roomId !== targetRoomId) {
          this.roomManager.leaveRoom(ws);
        }

        const result = this.roomManager.joinRoom(
          ws,
          targetRoomId,
          playerName,
          this.createEngineEvents(targetRoomId),
        );

        if (!result.success) {
          this.send(ws, 'JOIN_REJECTED', {
            reason: result.reason || 'INVALID_ROOM',
            message: result.message || '无法加入房间',
          });
          return;
        }

        const session = result.session!;
        // 同步房间信息给当前连入的客户端
        session.send(ws, 'ROOM_INFO_SYNC', {
          roomId: session.roomId,
          myPlayerId: result.playerId!,
          isHost: result.isHost!,
          humanCount: session.clients.size,
          maxCapacity: 6,
        });

        // 广播给房间所有连接最新的状态与席位变动
        for (const [clientWs, meta] of session.clients.entries()) {
          session.send(clientWs, 'ROOM_INFO_SYNC', {
            roomId: session.roomId,
            myPlayerId: meta.playerId,
            isHost: meta.isHost,
            humanCount: session.clients.size,
            maxCapacity: 6,
          });
        }
        this.broadcastGameState(session);
        break;
      }

      case 'START_GAME': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;

        if (!meta.isHost) {
          session.send(ws, 'SYSTEM_ERROR', {
            code: 'FORBIDDEN',
            message: '只有房主能够启动游戏',
          });
          return;
        }

        session.isProcessingAiSpeech = false;
        const language = (payload.language as Language) || 'zh-CN';
        const userRole = payload.userRole as Role | undefined;
        const humanPlayers = session.getHumanPlayers();

        session.engine.start(language, undefined, userRole, humanPlayers);
        break;
      }

      case 'USER_AUDIO_CHUNK': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;

        if (session.engine.getState().currentSpeakerId !== meta.playerId) break;
        const base64 = payload.pcmBase64 as string;
        if (base64) {
          const buffer = Buffer.from(base64, 'base64');
          session.assemblyAi.sendAudioChunk(buffer);
        }
        break;
      }

      case 'USER_END_SPEECH': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;

        if (session.engine.getState().currentSpeakerId === meta.playerId) {
          await this.finalizeUserSpeech(session, meta.playerId);
        }
        break;
      }

      case 'USER_NIGHT_ACTION': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;

        const currentPhase = session.engine.getState().phase;
        const human = session.engine.getPlayer(meta.playerId);
        if (!human?.isAlive) break;

        const action = payload.action as string;
        const targetId = payload.targetId as number | undefined;

        if (action === 'KILL' && targetId && currentPhase === 'NIGHT_WOLF' && human.role === 'WEREWOLF') {
          session.engine.executeWolfKill(targetId);
          this.broadcastGameState(session);
          setTimeout(() => this.advanceNightPhase(session, 'NIGHT_WOLF'), 1500);
        } else if (action === 'CHECK' && targetId && currentPhase === 'NIGHT_SEER' && human.role === 'SEER') {
          session.engine.executeSeerCheck(targetId);
          this.broadcastGameState(session);
          setTimeout(() => this.advanceNightPhase(session, 'NIGHT_SEER'), 3200);
        } else if (action === 'SAVE' && currentPhase === 'NIGHT_WITCH' && human.role === 'WITCH') {
          session.engine.executeWitchSave();
          this.broadcastGameState(session);
          setTimeout(() => this.advanceNightPhase(session, 'NIGHT_WITCH'), 1600);
        } else if (action === 'POISON' && targetId && currentPhase === 'NIGHT_WITCH' && human.role === 'WITCH') {
          session.engine.executeWitchPoison(targetId);
          this.broadcastGameState(session);
          setTimeout(() => this.advanceNightPhase(session, 'NIGHT_WITCH'), 1600);
        } else if (action === 'PASS' && currentPhase === 'NIGHT_WITCH' && human.role === 'WITCH') {
          this.advanceNightPhase(session, 'NIGHT_WITCH');
        }
        break;
      }

      case 'USER_VOTE': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;

        const state = session.engine.getState();
        const human = session.engine.getPlayer(meta.playerId);
        if (state.phase !== 'DAY_VOTE' || !human?.isAlive) break;

        const targetId = payload.targetId as number;
        if (targetId) {
          session.engine.registerVote(meta.playerId, targetId);

          // 检查是否所有存活的真人玩家均已完成投票
          const aliveHumans = state.players.filter((p) => !p.isAI && p.isAlive);
          const allHumansVoted = aliveHumans.every(
            (h) => session.engine.getState().votes[h.id] !== undefined,
          );

          if (allHumansVoted) {
            // AI 玩家自动跟投并流转至放逐公布阶段
            await this.executeAiVotes(session);
            session.engine.transitionTo('DAY_VOTE_RESULT');
          } else {
            this.broadcastGameState(session);
          }
        }
        break;
      }

      case 'DEV_SKIP_TURN': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;
        const currentSpeakerId = session.engine.getState().currentSpeakerId;
        if (currentSpeakerId !== null) {
          const speaker = session.engine.getPlayer(currentSpeakerId);
          if (speaker && !speaker.isAI) {
            await this.finalizeUserSpeech(session, currentSpeakerId);
          } else {
            session.engine.advanceToNextSpeaker();
          }
        }
        break;
      }

      case 'DEV_SIMULATE_SPEECH': {
        const info = this.roomManager.getSessionByClient(ws);
        if (!info) return;
        const { session, meta } = info;
        const text = payload.text as string;
        if (text) {
          session.engine.recordSpeech(meta.playerId, text, 'DEFEND', [], undefined);
          session.engine.advanceToNextSpeaker();
        }
        break;
      }
    }
  }

  private async handleSpeakerTurn(session: RoomSession, speakerId: number): Promise<void> {
    const player = session.engine.getPlayer(speakerId);
    if (!player) return;

    if (!player.isAI) {
      // 轮到真人玩家发言: 开启 AssemblyAI 实时流式转写会话
      await session.assemblyAi.startSession((text, isFinal) => {
        session.broadcast('TRANSCRIPT_STREAM', { speakerId, text, isFinal });
      });
    } else {
      // 轮到 AI 玩家发言
      session.isProcessingAiSpeech = true;
      const language = session.engine.getState().language;
      const isZh = language === 'zh-CN';

      // 1. 调用 DeepSeek 或高质量 Mock 生成发言
      const decision = await AgentBrain.generateDaySpeech(
        speakerId,
        session.engine,
        (prompt) => this.deepseek.generateCompletion(prompt),
      );

      // 2. 存入记忆衰退引擎并广播字幕
      session.engine.recordSpeech(
        speakerId,
        decision.speech,
        decision.actionTag,
        decision.mentionedIds,
        decision.targetId,
      );

      // 3. 语音合成 (TTS)
      const voiceId = isZh
        ? player.persona?.voiceIdZh || DEFAULT_VOICES.zh.agent1
        : player.persona?.voiceIdEn || DEFAULT_VOICES.en.agent1;

      const audioBase64 = await TTSService.synthesizeToBase64(decision.speech, voiceId);

      if (audioBase64) {
        session.broadcast('AUDIO_CHUNK', {
          speakerId,
          audioBase64,
          isEnd: true,
        });
      }

      // 4. 等待真实完整发言时长后自动切换下一位
      const charCount = decision.speech.length;
      const isEnglish = language === 'en-US';
      const speechDurationMs = isEnglish
        ? Math.max(4500, Math.round(decision.speech.split(/\s+/).length * 420) + 2000)
        : Math.max(4500, Math.round(charCount * 280) + 2200);

      setTimeout(() => {
        session.broadcast('SPEECH_END', { speakerId });
        session.isProcessingAiSpeech = false;
        session.engine.advanceToNextSpeaker();
      }, speechDurationMs);
    }
  }

  private async finalizeUserSpeech(session: RoomSession, speakerId: number): Promise<void> {
    const finalTranscript = await session.assemblyAi.endSession();
    const language = session.engine.getState().language;
    const content =
      finalTranscript ||
      (language === 'zh-CN' ? '我是一张好人牌，过麦。' : 'I am a villager. Passing my turn.');

    session.engine.recordSpeech(speakerId, content, 'DEFEND', [], undefined);

    // 触发语音智能分析 (心虚/情绪测谎)
    try {
      const sentimentResult = await AudioIntelligenceService.analyzeSpeechSentiment(
        speakerId,
        content,
        language,
        (prompt) => this.deepseek.generateCompletion(prompt, 150),
      );
      session.engine.setLatestSentiment(sentimentResult);
      session.broadcast('SENTIMENT_DETECTED', sentimentResult);
    } catch {
      // 容错降级
    }

    session.broadcast('SPEECH_END', { speakerId });
    session.engine.advanceToNextSpeaker();
  }

  private async handlePhaseAutomation(
    session: RoomSession,
    phase: GamePhase,
    announcement?: string,
  ): Promise<void> {
    const state = session.engine.getState();
    const livingHumanWolves = state.players.filter(
      (p) => !p.isAI && p.isAlive && p.role === 'WEREWOLF',
    );
    const livingHumanSeer = state.players.find((p) => !p.isAI && p.isAlive && p.role === 'SEER');
    const livingHumanWitch = state.players.find((p) => !p.isAI && p.isAlive && p.role === 'WITCH');

    const announceWaitMs = Math.max(
      4500,
      Math.round((announcement ? announcement.length : 15) * 270) + 1600,
    );

    if (phase === 'NIGHT_START') {
      setTimeout(() => session.engine.transitionTo('NIGHT_WOLF'), announceWaitMs);
    } else if (phase === 'NIGHT_WOLF') {
      if (livingHumanWolves.length > 0) {
        // 存在活着的真人狼人，等待操作
      } else {
        // 全 AI 狼人，等待播报完毕后决策
        setTimeout(() => {
          const aliveNonWolves = state.players.filter((p) => p.isAlive && p.camp !== 'WOLF');
          if (aliveNonWolves.length > 0) {
            const target = aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
            session.engine.executeWolfKill(target.id);
          }
          session.engine.transitionTo('NIGHT_SEER');
        }, announceWaitMs);
      }
    } else if (phase === 'NIGHT_SEER') {
      if (livingHumanSeer) {
        // 存在活着的真人预言家，等待查验
      } else {
        // 全 AI 预言家，自动查验
        setTimeout(() => {
          const aliveAiSeer = state.players.find((p) => p.isAlive && p.role === 'SEER' && p.isAI);
          if (aliveAiSeer) {
            const unchecked = state.players.filter(
              (p) =>
                p.isAlive &&
                p.id !== aliveAiSeer.id &&
                !state.seerCheckedHistory.some((h) => h.targetId === p.id),
            );
            if (unchecked.length > 0) {
              session.engine.executeSeerCheck(unchecked[0].id);
            }
          }
          session.engine.transitionTo('NIGHT_WITCH');
        }, announceWaitMs);
      }
    } else if (phase === 'NIGHT_WITCH') {
      if (livingHumanWitch) {
        // 存在活着的真人女巫，等待操作
      } else {
        // 全 AI 女巫，自动用药
        setTimeout(() => {
          const aliveAiWitch = state.players.find((p) => p.isAlive && p.role === 'WITCH' && p.isAI);
          if (aliveAiWitch && state.witchInventory.hasAntidote && state.nightVictimId) {
            session.engine.executeWitchSave();
          }
          session.engine.transitionTo('DAY_START');
        }, announceWaitMs);
      }
    } else if (phase === 'DAY_START') {
      setTimeout(() => session.engine.transitionTo('DAY_DISCUSS'), announceWaitMs);
    } else if (phase === 'DAY_VOTE') {
      const livingHumans = state.players.filter((p) => !p.isAI && p.isAlive);
      if (livingHumans.length === 0) {
        // 全场无活着的真人，自动推进 AI 投票
        setTimeout(async () => {
          await this.executeAiVotes(session);
          session.engine.transitionTo('DAY_VOTE_RESULT');
        }, 3000);
      }
    } else if (phase === 'DAY_VOTE_RESULT') {
      setTimeout(() => {
        if (session.engine.getState().winner === null) {
          session.engine.transitionTo('NIGHT_START');
        }
      }, announceWaitMs + 1000);
    }
  }

  private advanceNightPhase(session: RoomSession, expectedPhase: GamePhase): void {
    const current = session.engine.getState().phase;
    if (current !== expectedPhase) return; // 阶段已被推进，丢弃过期竞态回调
    if (current === 'NIGHT_WOLF') {
      session.engine.transitionTo('NIGHT_SEER');
    } else if (current === 'NIGHT_SEER') {
      session.engine.transitionTo('NIGHT_WITCH');
    } else if (current === 'NIGHT_WITCH') {
      session.engine.transitionTo('DAY_START');
    }
  }

  private async executeAiVotes(session: RoomSession): Promise<void> {
    const aliveAi = session.engine.getState().players.filter((p) => p.isAlive && p.isAI);
    for (const ai of aliveAi) {
      const voteTargetId = await AgentBrain.decideDayVote(ai.id, session.engine);
      session.engine.registerVote(ai.id, voteTargetId);
    }
  }

  /**
   * 基于玩家视野的安全状态脱敏过滤器
   * 游戏进行中，仅本人及狼人阵营同伴可见底牌角色，其余玩家底牌在网络传输层进行脱敏占位处理，杜绝 F12 抓包作弊
   */
  private getMaskedState(state: GameState, targetPlayerId: number): GameState {
    if (state.phase === 'GAME_OVER' || state.phase === 'IDLE') {
      return state;
    }

    const targetPlayer = state.players.find((p) => p.id === targetPlayerId);
    const isTargetWolf = targetPlayer?.role === 'WEREWOLF';

    const maskedPlayers = state.players.map((p) => {
      // 自己的底牌完全可见
      if (p.id === targetPlayerId) {
        return p;
      }
      // 狼人阵营能看到同伴底牌
      if (isTargetWolf && p.role === 'WEREWOLF') {
        return p;
      }
      // 其余玩家底牌进行脱敏占位处理
      return {
        ...p,
        role: 'VILLAGER' as Role,
        camp: 'GOOD' as Camp,
      };
    });

    return {
      ...state,
      players: maskedPlayers,
    };
  }

  /**
   * 多真人房间个性化状态广播：对每位真人连接分别发送经过安全脱敏的状态
   */
  private broadcastGameState(session: RoomSession): void {
    const fullState = session.engine.getState();
    for (const [ws, meta] of session.clients.entries()) {
      const maskedState = this.getMaskedState(fullState, meta.playerId);
      session.send(ws, 'GAME_STATE_SYNC', { state: maskedState });
    }
  }

  private send<T extends keyof ServerToClientEvents>(
    ws: WebSocket,
    type: T,
    payload: ServerToClientEvents[T],
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }
}
