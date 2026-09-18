import type {
  GameState,
  GamePhase,
  Language,
  Role,
  Camp,
  Player,
  MemoryEntry,
  ActionTag,
} from 'voice-werewolf-shared';
import { RoleManager } from './RoleManager.js';
import { MemoryDecayEngine } from './MemoryDecay.js';

export interface GameEngineEvents {
  onPhaseChange?: (phase: GamePhase, round: number, announcement: string) => void;
  onSpeakerChange?: (speakerId: number | null, maxSeconds: number) => void;
  onTranscript?: (speakerId: number, text: string, isFinal: boolean) => void;
  onGameOver?: (winner: Camp, message: string) => void;
  onStateUpdate?: (state: GameState) => void;
}

export class GameEngine {
  private state: GameState;
  private memoryEntries: MemoryEntry[] = [];
  private events: GameEngineEvents;

  // 夜间私密动作记录
  private pendingWolfKill: number | null = null;
  private pendingSeerCheck: number | null = null;
  private pendingWitchSave: boolean = false;
  private pendingWitchPoison: number | null = null;

  constructor(events: GameEngineEvents = {}) {
    this.events = events;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      roomId: 'werewolf-default',
      language: 'zh-CN',
      round: 0,
      phase: 'IDLE',
      players: [],
      currentSpeakerId: null,
      speakingOrder: [],
      speakingTimerSeconds: 45,
      witchInventory: {
        hasAntidote: true,
        hasPoison: true,
      },
      nightVictimId: null,
      seerCheckedHistory: [],
      votes: {},
      lastVotedOutId: null,
      winner: null,
    };
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getPlayer(id: number): Player | undefined {
    return this.state.players.find((p) => p.id === id);
  }

  public getMemoryEntries(): MemoryEntry[] {
    return [...this.memoryEntries];
  }

  public getAgentMemorySlice(agentId: number) {
    const player = this.getPlayer(agentId);
    const trait = player?.persona?.memoryTrait ?? 1.0;
    return MemoryDecayEngine.generateSlice(
      agentId,
      trait,
      this.memoryEntries,
      this.state.round,
      this.state.language,
    );
  }

  private lastUserRole?: Role;

  /**
   * 启动游戏
   */
  public start(
    language: Language = 'zh-CN',
    customRoles?: Role[],
    preferredUserRole?: Role,
  ): void {
    this.state.language = language;
    this.state.players = RoleManager.initializePlayers(
      language,
      customRoles,
      preferredUserRole,
      this.lastUserRole,
    );
    const human = this.state.players.find((p) => p.id === 1);
    if (human) {
      this.lastUserRole = human.role;
    }
    this.state.round = 1;
    this.state.winner = null;
    this.memoryEntries = [];

    this.transitionTo('NIGHT_START');
  }

  /**
   * 核心阶段转移器
   */
  public transitionTo(phase: GamePhase): void {
    const prevPhase = this.state.phase;
    this.state.phase = phase;
    const isZh = this.state.language === 'zh-CN';
    let announcement = '';

    switch (phase) {
      case 'NIGHT_START':
        if (prevPhase === 'DAY_VOTE_RESULT') {
          this.state.round += 1;
        }
        this.pendingWolfKill = null;
        this.pendingSeerCheck = null;
        this.pendingWitchSave = false;
        this.pendingWitchPoison = null;
        this.state.nightVictimId = null;
        announcement = isZh
          ? `【第 ${this.state.round} 晚】天黑请闭眼，黑夜笼罩了村庄……`
          : `[Night ${this.state.round}] Night falls. Please close your eyes...`;
        break;

      case 'NIGHT_WOLF':
        announcement = isZh
          ? `狼人请睁眼，请选择今晚要袭击的目标。`
          : `Werewolves, open your eyes and choose your victim.`;
        break;

      case 'NIGHT_SEER':
        announcement = isZh
          ? `预言家请睁眼，请选择今晚要查验的玩家。`
          : `Seer, open your eyes and choose a player to inspect.`;
        break;

      case 'NIGHT_WITCH':
        announcement = isZh
          ? `女巫请睁眼，今晚有一名玩家有危险，你是否使用解药或毒药？`
          : `Witch, open your eyes. A player is in danger tonight. Will you use a potion?`;
        break;

      case 'DAY_START': {
        const { deadIds, text } = this.resolveNightResults();
        announcement = text;
        // 判定胜负
        const winner = RoleManager.evaluateWinner(this.state.players);
        if (winner) {
          this.state.winner = winner;
          this.transitionTo('GAME_OVER');
          return;
        }
        break;
      }

      case 'DAY_DISCUSS': {
        // 构建白天发言顺序: 存活玩家顺时针发言
        const aliveIds = this.state.players.filter((p) => p.isAlive).map((p) => p.id);
        this.state.speakingOrder = aliveIds;
        this.advanceToNextSpeaker();
        return;
      }

      case 'DAY_VOTE':
        this.state.currentSpeakerId = null;
        this.state.votes = {};
        announcement = isZh
          ? `发言阶段结束，请所有存活玩家行使神圣的投票权进行放逐投票！`
          : `Discussion ends. All living players, please cast your vote for exile!`;
        break;

      case 'DAY_VOTE_RESULT': {
        const { eliminatedId, text } = this.resolveVotes();
        announcement = text;
        const winner = RoleManager.evaluateWinner(this.state.players);
        if (winner) {
          this.state.winner = winner;
          this.transitionTo('GAME_OVER');
          return;
        }
        break;
      }

      case 'GAME_OVER': {
        const winnerName =
          this.state.winner === 'GOOD'
            ? isZh
              ? '好人阵营 (村庄平民与神职)'
              : 'Good Camp (Villagers & Gods)'
            : isZh
              ? '狼人阵营 (潜伏者)'
              : 'Werewolf Camp';
        announcement = isZh
          ? `【游戏结束】获胜方为：${winnerName}！感谢各位的精妙博弈！`
          : `[Game Over] The winner is: ${winnerName}! Thank you for playing!`;
        this.events.onGameOver?.(this.state.winner || 'GOOD', announcement);
        break;
      }
    }

    this.events.onPhaseChange?.(phase, this.state.round, announcement);
    this.events.onStateUpdate?.(this.state);
  }

  // ================= 夜间行动 =================

  public executeWolfKill(targetId: number): void {
    const target = this.getPlayer(targetId);
    if (target && target.isAlive) {
      this.pendingWolfKill = targetId;
      this.state.nightVictimId = targetId;
    }
  }

  public executeSeerCheck(targetId: number): { targetId: number; isWolf: boolean } | null {
    const target = this.getPlayer(targetId);
    if (!target) return null;
    const isWolf = target.role === 'WEREWOLF';
    const result = { round: this.state.round, targetId, isWolf };
    this.state.seerCheckedHistory.push(result);
    this.pendingSeerCheck = targetId;
    return result;
  }

  public executeWitchSave(): boolean {
    if (this.pendingWitchPoison !== null) return false;
    if (this.state.witchInventory.hasAntidote && this.pendingWolfKill !== null) {
      this.pendingWitchSave = true;
      this.state.witchInventory.hasAntidote = false;
      return true;
    }
    return false;
  }

  public executeWitchPoison(targetId: number): boolean {
    if (this.pendingWitchSave) return false;
    const target = this.getPlayer(targetId);
    if (this.state.witchInventory.hasPoison && target && target.isAlive) {
      this.pendingWitchPoison = targetId;
      this.state.witchInventory.hasPoison = false;
      return true;
    }
    return false;
  }

  private resolveNightResults(): { deadIds: number[]; text: string } {
    const isZh = this.state.language === 'zh-CN';
    const deadIds: number[] = [];

    // 狼人袭击结算
    if (this.pendingWolfKill !== null && !this.pendingWitchSave) {
      deadIds.push(this.pendingWolfKill);
      const victim = this.getPlayer(this.pendingWolfKill);
      if (victim) {
        victim.isAlive = false;
        victim.deathRound = this.state.round;
        victim.deathReason = 'KILLED_BY_WOLF';
      }
    }

    // 女巫毒药结算
    if (this.pendingWitchPoison !== null) {
      if (!deadIds.includes(this.pendingWitchPoison)) {
        deadIds.push(this.pendingWitchPoison);
        const poisoned = this.getPlayer(this.pendingWitchPoison);
        if (poisoned) {
          poisoned.isAlive = false;
          poisoned.deathRound = this.state.round;
          poisoned.deathReason = 'POISONED_BY_WITCH';
        }
      }
    }

    let text = '';
    if (deadIds.length === 0) {
      text = isZh
        ? `【天亮了】昨夜是平安夜，没有任何人出局！`
        : `[Daybreak] Last night was a peaceful night. No one died!`;
    } else {
      const deadStr = deadIds.map((id) => `${id}号`).join('、');
      text = isZh
        ? `【天亮了】昨夜出局的玩家是：${deadStr}。`
        : `[Daybreak] Players eliminated last night: ${deadIds.map((id) => `#${id}`).join(', ')}.`;
    }

    return { deadIds, text };
  }

  // ================= 白天发言轮次 =================

  public advanceToNextSpeaker(): void {
    if (this.state.speakingOrder.length === 0) {
      // 发言完毕，转入公投
      this.transitionTo('DAY_VOTE');
      return;
    }

    const nextId = this.state.speakingOrder.shift()!;
    this.state.currentSpeakerId = nextId;
    this.events.onSpeakerChange?.(nextId, this.state.speakingTimerSeconds);
    this.events.onStateUpdate?.(this.state);
  }

  public recordSpeech(
    speakerId: number,
    content: string,
    actionTag: ActionTag = 'GENERAL',
    mentionedIds: number[] = [],
    targetPlayerId?: number,
  ): void {
    const speaker = this.getPlayer(speakerId);
    if (!speaker) return;

    // 基础重要度评定
    let baseImportance = 1.0;
    if (actionTag === 'CLAIM_ROLE' || actionTag === 'CHECK_RESULT') {
      baseImportance = 3.0;
    } else if (actionTag === 'ACCUSE') {
      baseImportance = 2.0;
    } else if (actionTag === 'DEFEND') {
      baseImportance = 1.5;
    }

    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      round: this.state.round,
      speakerId,
      speakerName: speaker.name,
      content,
      actionTag,
      baseImportance,
      mentionedPlayerIds: mentionedIds,
      targetPlayerId,
      timestamp: Date.now(),
    };

    this.memoryEntries.push(entry);
    this.events.onTranscript?.(speakerId, content, true);
  }

  // ================= 投票与放逐 =================

  public registerVote(voterId: number, targetId: number): void {
    const voter = this.getPlayer(voterId);
    const target = this.getPlayer(targetId);
    if (voter && voter.isAlive && target && target.isAlive) {
      this.state.votes[voterId] = targetId;
    }
  }

  private resolveVotes(): { eliminatedId: number | null; text: string } {
    const isZh = this.state.language === 'zh-CN';
    const voteCounts: Record<number, number> = {};

    for (const targetId of Object.values(this.state.votes)) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }

    let maxVotes = 0;
    let candidates: number[] = [];

    for (const [targetStr, count] of Object.entries(voteCounts)) {
      const targetId = Number(targetStr);
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [targetId];
      } else if (count === maxVotes) {
        candidates.push(targetId);
      }
    }

    // 平票或者无人得票则无人出局
    if (candidates.length === 1 && maxVotes > 0) {
      const eliminatedId = candidates[0];
      const player = this.getPlayer(eliminatedId);
      if (player) {
        player.isAlive = false;
        player.deathRound = this.state.round;
        player.deathReason = 'VOTED_OUT';
        this.state.lastVotedOutId = eliminatedId;
      }
      const text = isZh
        ? `投票结果揭晓：${eliminatedId}号玩家以 ${maxVotes} 票被最高票放逐出局！`
        : `Vote results: Player #${eliminatedId} is exiled with ${maxVotes} votes!`;
      return { eliminatedId, text };
    }

    const text = isZh
      ? `投票结果揭晓：出现平票或弃权，本轮无人被放逐！`
      : `Vote results: Tie or no decisive votes. No one is exiled this round!`;
    return { eliminatedId: null, text };
  }
}
