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
import { GameEngine } from '../game/GameEngine.js';
import { AgentBrain } from '../game/AgentBrain.js';
import { DeepSeekService } from '../services/DeepSeekService.js';
import { AssemblyAIService } from '../services/AssemblyAIService.js';
import { TTSService } from '../services/TTSService.js';
import { DEFAULT_VOICES } from 'voice-werewolf-shared';

export class GameSocketServer {
  private wss: WebSocketServer;
  private engine: GameEngine;
  private deepseek: DeepSeekService;
  private assemblyAi: AssemblyAIService;
  private activeClient: WebSocket | null = null;
  private isProcessingAiSpeech: boolean = false;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.deepseek = new DeepSeekService();
    this.assemblyAi = new AssemblyAIService();

    this.engine = new GameEngine({
      onPhaseChange: (phase, round, announcement) => {
        this.broadcast('PHASE_CHANGE', { phase, round, announcement });
        this.handlePhaseAutomation(phase, announcement);
      },
      onSpeakerChange: (speakerId, maxSeconds) => {
        if (speakerId !== null) {
          this.broadcast('SPEECH_START', { speakerId, maxSeconds });
          this.handleSpeakerTurn(speakerId);
        }
      },
      onTranscript: (speakerId, text, isFinal) => {
        this.broadcast('TRANSCRIPT_STREAM', { speakerId, text, isFinal });
      },
      onGameOver: (winner, message) => {
        this.broadcast('GAME_FINISHED', {
          winner,
          message,
          players: this.engine.getState().players,
        });
      },
      onStateUpdate: (state) => {
        this.broadcast('GAME_STATE_SYNC', { state });
      },
    });

    this.initWebSocket();
  }

  private initWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.activeClient = ws;
      // 客户端连接立即同步当前状态
      this.send(ws, 'GAME_STATE_SYNC', { state: this.engine.getState() });

      ws.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleClientMessage(message);
        } catch {
          // ignore invalid json
        }
      });

      ws.on('close', () => {
        if (this.activeClient === ws) {
          this.activeClient = null;
        }
      });
    });
  }

  private async handleClientMessage(msg: WSMessage): Promise<void> {
    const payload = msg.payload as Record<string, unknown>;

    switch (msg.type) {
      case 'START_GAME': {
        this.isProcessingAiSpeech = false;
        const language = (payload.language as Language) || 'zh-CN';
        const userRole = payload.userRole as Role | undefined;
        this.engine.start(language, undefined, userRole);
        break;
      }

      case 'USER_AUDIO_CHUNK': {
        if (this.engine.getState().currentSpeakerId !== 1) break;
        const base64 = payload.pcmBase64 as string;
        if (base64) {
          const buffer = Buffer.from(base64, 'base64');
          this.assemblyAi.sendAudioChunk(buffer);
        }
        break;
      }

      case 'USER_END_SPEECH': {
        if (this.engine.getState().currentSpeakerId === 1) {
          await this.finalizeUserSpeech();
        }
        break;
      }

      case 'USER_NIGHT_ACTION': {
        const currentPhase = this.engine.getState().phase;
        const human = this.engine.getPlayer(1);
        if (!human?.isAlive) break;

        const action = payload.action as string;
        const targetId = payload.targetId as number | undefined;

        if (action === 'KILL' && targetId && currentPhase === 'NIGHT_WOLF' && human.role === 'WEREWOLF') {
          this.engine.executeWolfKill(targetId);
          this.advanceNightPhase();
        } else if (action === 'CHECK' && targetId && currentPhase === 'NIGHT_SEER' && human.role === 'SEER') {
          this.engine.executeSeerCheck(targetId);
          this.advanceNightPhase();
        } else if (action === 'SAVE' && currentPhase === 'NIGHT_WITCH' && human.role === 'WITCH') {
          this.engine.executeWitchSave();
          this.advanceNightPhase();
        } else if (action === 'POISON' && targetId && currentPhase === 'NIGHT_WITCH' && human.role === 'WITCH') {
          this.engine.executeWitchPoison(targetId);
          this.advanceNightPhase();
        } else if (action === 'PASS' && currentPhase === 'NIGHT_WITCH' && human.role === 'WITCH') {
          this.advanceNightPhase();
        }
        break;
      }

      case 'USER_VOTE': {
        const state = this.engine.getState();
        const human = this.engine.getPlayer(1);
        if (state.phase !== 'DAY_VOTE' || !human?.isAlive) break;

        const targetId = payload.targetId as number;
        if (targetId) {
          this.engine.registerVote(1, targetId);
          // AI 玩家自动投票
          await this.executeAiVotes();
          this.engine.transitionTo('DAY_VOTE_RESULT');
        }
        break;
      }

      case 'DEV_SKIP_TURN': {
        if (this.engine.getState().currentSpeakerId === 1) {
          await this.finalizeUserSpeech();
        } else {
          this.engine.advanceToNextSpeaker();
        }
        break;
      }

      case 'DEV_SIMULATE_SPEECH': {
        const text = payload.text as string;
        if (text) {
          this.engine.recordSpeech(1, text, 'DEFEND', [], undefined);
          this.engine.advanceToNextSpeaker();
        }
        break;
      }
    }
  }

  private async handleSpeakerTurn(speakerId: number): Promise<void> {
    if (speakerId === 1) {
      // 轮到真人玩家发言: 开启 AssemblyAI 实时流式转写会话
      await this.assemblyAi.startSession((text, isFinal) => {
        this.broadcast('TRANSCRIPT_STREAM', { speakerId: 1, text, isFinal });
      });
    } else {
      // 轮到 AI 玩家发言
      this.isProcessingAiSpeech = true;
      const player = this.engine.getPlayer(speakerId);
      if (!player) return;

      const language = this.engine.getState().language;
      const isZh = language === 'zh-CN';

      // 1. 调用 DeepSeek 或高质量 Mock 生成发言
      const decision = await AgentBrain.generateDaySpeech(
        speakerId,
        this.engine,
        (prompt) => this.deepseek.generateCompletion(prompt),
      );

      // 2. 存入记忆衰退引擎并广播字幕
      this.engine.recordSpeech(
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
        this.broadcast('AUDIO_CHUNK', {
          speakerId,
          audioBase64,
          isEnd: true,
        });
      }

      // 4. 等待真实完整发言时长后自动切换下一位 (中文每字约 280ms，外加 2 秒停顿留白，不设上限硬截断)
      const charCount = decision.speech.length;
      const isEnglish = language === 'en-US';
      const speechDurationMs = isEnglish
        ? Math.max(4500, Math.round(decision.speech.split(/\s+/).length * 420) + 2000)
        : Math.max(4500, Math.round(charCount * 280) + 2200);

      setTimeout(() => {
        this.broadcast('SPEECH_END', { speakerId });
        this.isProcessingAiSpeech = false;
        this.engine.advanceToNextSpeaker();
      }, speechDurationMs);
    }
  }

  private async finalizeUserSpeech(): Promise<void> {
    const finalTranscript = await this.assemblyAi.endSession();
    const content =
      finalTranscript ||
      (this.engine.getState().language === 'zh-CN'
        ? '我是一张好人牌，过麦。'
        : 'I am a villager. Passing my turn.');

    this.engine.recordSpeech(1, content, 'DEFEND', [], undefined);
    this.broadcast('SPEECH_END', { speakerId: 1 });
    this.engine.advanceToNextSpeaker();
  }

  private async handlePhaseAutomation(phase: GamePhase, announcement?: string): Promise<void> {
    const state = this.engine.getState();
    const human = this.engine.getPlayer(1);

    // 计算法官神谕公告的充足朗读时间，确保法官语音完全播报完毕再流转
    const announceWaitMs = Math.max(
      4500,
      Math.round((announcement ? announcement.length : 15) * 270) + 1600,
    );

    // 夜间阶段自动推进或等待真人操作
    if (phase === 'NIGHT_START') {
      setTimeout(() => this.engine.transitionTo('NIGHT_WOLF'), announceWaitMs);
    } else if (phase === 'NIGHT_WOLF') {
      if (human?.isAlive && human.role === 'WEREWOLF') {
        // 真人是狼人，等待真人夜间选择
      } else {
        // 全 AI 狼人，等待法官提示语播报完毕后决策刀人并流转
        setTimeout(() => {
          const aliveNonWolves = state.players.filter((p) => p.isAlive && p.camp !== 'WOLF');
          if (aliveNonWolves.length > 0) {
            const target = aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
            this.engine.executeWolfKill(target.id);
          }
          this.engine.transitionTo('NIGHT_SEER');
        }, announceWaitMs);
      }
    } else if (phase === 'NIGHT_SEER') {
      if (human?.isAlive && human.role === 'SEER') {
        // 等待真人预言家查验
      } else {
        // 全 AI 预言家，等待法官提示语播报完毕后查验并流转
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
              this.engine.executeSeerCheck(unchecked[0].id);
            }
          }
          this.engine.transitionTo('NIGHT_WITCH');
        }, announceWaitMs);
      }
    } else if (phase === 'NIGHT_WITCH') {
      if (human?.isAlive && human.role === 'WITCH') {
        // 等待真人女巫选择
      } else {
        // 全 AI 女巫，等待法官提示语播报完毕后救人/用药并流转
        setTimeout(() => {
          const aliveAiWitch = state.players.find((p) => p.isAlive && p.role === 'WITCH' && p.isAI);
          if (aliveAiWitch && state.witchInventory.hasAntidote && state.nightVictimId) {
            this.engine.executeWitchSave();
          }
          this.engine.transitionTo('DAY_START');
        }, announceWaitMs);
      }
    } else if (phase === 'DAY_START') {
      setTimeout(() => this.engine.transitionTo('DAY_DISCUSS'), announceWaitMs);
    } else if (phase === 'DAY_VOTE') {
      // 若真人玩家已死亡，自动推进 AI 投票与放逐结算
      if (!human?.isAlive) {
        setTimeout(async () => {
          await this.executeAiVotes();
          this.engine.transitionTo('DAY_VOTE_RESULT');
        }, 3000);
      }
    } else if (phase === 'DAY_VOTE_RESULT') {
      setTimeout(() => {
        if (this.engine.getState().winner === null) {
          this.engine.transitionTo('NIGHT_START');
        }
      }, announceWaitMs + 1000);
    }
  }

  private advanceNightPhase(): void {
    const phase = this.engine.getState().phase;
    if (phase === 'NIGHT_WOLF') {
      this.engine.transitionTo('NIGHT_SEER');
    } else if (phase === 'NIGHT_SEER') {
      this.engine.transitionTo('NIGHT_WITCH');
    } else if (phase === 'NIGHT_WITCH') {
      this.engine.transitionTo('DAY_START');
    }
  }

  private async executeAiVotes(): Promise<void> {
    const aliveAi = this.engine.getState().players.filter((p) => p.isAlive && p.isAI);
    for (const ai of aliveAi) {
      const voteTargetId = await AgentBrain.decideDayVote(ai.id, this.engine);
      this.engine.registerVote(ai.id, voteTargetId);
    }
  }

  private broadcast<T extends keyof ServerToClientEvents>(
    type: T,
    payload: ServerToClientEvents[T],
  ): void {
    const msg: WSMessage<ServerToClientEvents[T]> = { type, payload };
    const serialized = JSON.stringify(msg);

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
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
