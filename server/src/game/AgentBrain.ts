import type {
  Player,
  ActionTag,
  Language,
} from 'voice-werewolf-shared';
import type { GameEngine } from './GameEngine.js';

export interface AgentDecision {
  speech: string;
  actionTag: ActionTag;
  mentionedIds: number[];
  targetId?: number;
}

export class AgentBrain {
  /**
   * 构建该 AI 智能体的隔离沙盒 Prompt
   */
  public static buildPrompt(
    agentId: number,
    engine: GameEngine,
    taskType: 'SPEECH' | 'VOTE' | 'NIGHT_WOLF' | 'NIGHT_SEER' | 'NIGHT_WITCH',
  ): string {
    const state = engine.getState();
    const me = engine.getPlayer(agentId);
    if (!me) return '';

    const isZh = state.language === 'zh-CN';
    const persona = me.persona;
    const slice = engine.getAgentMemorySlice(agentId);

    const alivePlayers = state.players.filter((p) => p.isAlive).map((p) => `${p.id}号(${p.name})`);
    const deadPlayers = state.players.filter((p) => !p.isAlive).map((p) => `${p.id}号(${p.name})`);

    // 狼队友信息 (仅狼人可见)
    const wolfTeammates =
      me.role === 'WEREWOLF'
        ? state.players.filter((p) => p.role === 'WEREWOLF' && p.id !== agentId).map((p) => `${p.id}号`)
        : [];

    let roleHint = '';
    if (me.role === 'WEREWOLF') {
      roleHint = isZh
        ? `你的身份是【狼人】！你的狼队友是：${wolfTeammates.join(', ') || '无'}。你的目标是在白天隐藏身份，混淆视听或悍跳神职，夜间协同击杀好人。`
        : `You are a [WEREWOLF]! Your wolf teammate is: ${wolfTeammates.join(', ') || 'None'}. Hide your identity, deceive the village, or frame others.`;
    } else if (me.role === 'SEER') {
      const historyStr = state.seerCheckedHistory
        .map((h) => `${h.targetId}号是${h.isWolf ? '狼人' : '好人'}`)
        .join('; ');
      roleHint = isZh
        ? `你的身份是【预言家】！你过往查验记录：${historyStr || '暂无'}。你需要在合适时机起跳报查验带领好人，防范狼人对跳。`
        : `You are the [SEER]! Your past checks: ${historyStr || 'None'}. Share your checks strategically.`;
    } else if (me.role === 'WITCH') {
      const victimInfo =
        state.witchInventory.hasAntidote && state.nightVictimId !== null
          ? isZh
            ? `今晚倒牌的玩家是：${state.nightVictimId}号。`
            : `Player #${state.nightVictimId} was attacked tonight.`
          : isZh
            ? '今晚无倒牌信息或解药不可用。'
            : 'No victim info or antidote unavailable.';
      roleHint = isZh
        ? `你的身份是【女巫】！解药可用：${state.witchInventory.hasAntidote ? '是' : '否'}，毒药可用：${state.witchInventory.hasPoison ? '是' : '否'}。${victimInfo}`
        : `You are the [WITCH]! Antidote: ${state.witchInventory.hasAntidote}, Poison: ${state.witchInventory.hasPoison}. ${victimInfo}`;
    } else {
      roleHint = isZh
        ? `你的身份是【平民】！你没有夜间技能，依靠白天所有人的发言和投票逻辑辨别真伪。`
        : `You are a [VILLAGER]! You have no night abilities. Rely on daylight logic and voting to find werewolves.`;
    }

    const clearMemories = slice.highClarity.join('\n') || (isZh ? '(暂无清晰记忆)' : '(None)');
    const fuzzyMemories = slice.mediumFuzzy.join('\n') || (isZh ? '(暂无模糊印象)' : '(None)');
    const trustMap = Object.entries(slice.trustScores)
      .map(([id, score]) => `${id}号: ${score > 0 ? '+' : ''}${score}`)
      .join(', ') || (isZh ? '中立' : 'Neutral');

    return `
=== 角色人设 ===
姓名: ${persona?.nameZh || me.name} (${agentId}号玩家)
性格声线特征: ${persona?.toneStyleZh || '理性客观'}
${roleHint}

=== 场上公开状态 (第 ${state.round} 回合) ===
存活玩家: ${alivePlayers.join(', ')}
已出局玩家: ${deadPlayers.join(', ') || '无'}

=== 你的认知记忆库 (受遗忘曲线衰退) ===
[清晰细节记忆 (最近/重大事件)]:
${clearMemories}

[模糊印象 (远期或次要事件)]:
${fuzzyMemories}

[对其他玩家的潜意识信任/怀疑倾向分 (-5极度怀疑 ~ +5完全信任)]:
${trustMap}

=== 当前任务: ${taskType} ===
请严格符合你的性格说话，语言自然紧凑，控制在 50~90 字内，像真人打狼人杀一样充满博弈和推理。
`.trim();
  }

  /**
   * 生成白天发言 (带 Mock 回退兜底)
   */
  public static async generateDaySpeech(
    agentId: number,
    engine: GameEngine,
    callLLM?: (prompt: string) => Promise<string>,
  ): Promise<AgentDecision> {
    const me = engine.getPlayer(agentId);
    if (!me) throw new Error(`Player ${agentId} not found`);

    const isZh = engine.getState().language === 'zh-CN';
    const prompt = this.buildPrompt(agentId, engine, 'SPEECH');

    if (callLLM) {
      try {
        const text = await callLLM(prompt);
        return {
          speech: text.trim(),
          actionTag: 'GENERAL',
          mentionedIds: [],
        };
      } catch {
        // 出错回退到预置拟真表水
      }
    }

    // 默认高质感 Mock 拟真回复 (供测试与无网络离线运行)
    let mockSpeech = '';
    if (me.role === 'WEREWOLF') {
      mockSpeech = isZh
        ? `我是一张好人牌，听了一圈前面的发言，感觉场上的节奏有点乱。我比较怀疑刚才急于归票的玩家，希望大家多听听后置位。`
        : `I am definitely a villager. Looking at the discussion so far, some players are pushing too hard. Let's hear more before jumping to conclusions.`;
    } else if (me.role === 'SEER') {
      mockSpeech = isZh
        ? `我这里是预言家。昨晚我有查验信息，大家先别急着站边，听我把验人逻辑盘清楚。`
        : `I am the Seer. I investigated last night and got solid info. Don't rush into sides until you hear my deduction.`;
    } else {
      mockSpeech = isZh
        ? `我是好人，前置位没有太多信息，我会根据大家的投票和站边来判断，过。`
        : `Villager here. Not much info from previous speakers. I'll watch the votes closely to spot the wolves. Pass.`;
    }

    return {
      speech: mockSpeech,
      actionTag: me.role === 'SEER' ? 'CLAIM_ROLE' : 'DEFEND',
      mentionedIds: [],
    };
  }

  /**
   * 决定白天投票目标
   */
  public static async decideDayVote(
    agentId: number,
    engine: GameEngine,
    callLLM?: (prompt: string) => Promise<string>,
  ): Promise<number> {
    const state = engine.getState();
    const me = engine.getPlayer(agentId);
    const aliveOthers = state.players.filter((p) => p.isAlive && p.id !== agentId);
    if (aliveOthers.length === 0) return agentId;

    if (callLLM) {
      try {
        const prompt = this.buildPrompt(agentId, engine, 'VOTE') +
          `\n候选目标: ${aliveOthers.map((p) => p.id).join(', ')}。请只输出一个被投玩家的数字ID。`;
        const res = await callLLM(prompt);
        const match = res.match(/\d+/);
        if (match) {
          const targetId = parseInt(match[0], 10);
          if (aliveOthers.some((p) => p.id === targetId)) {
            return targetId;
          }
        }
      } catch {
        // fallback
      }
    }

    // 基于信任分或身份策略决策
    const slice = engine.getAgentMemorySlice(agentId);
    if (me?.role === 'WEREWOLF') {
      // 狼人投信任度最高的好人或者非狼同伴
      const nonWolves = aliveOthers.filter((p) => p.role !== 'WEREWOLF');
      if (nonWolves.length > 0) {
        return nonWolves[Math.floor(Math.random() * nonWolves.length)].id;
      }
    }

    // 好人寻找信任度最低 (最怀疑) 的玩家: 整合低强度沉淀信任分与本轮被指控记忆
    const recentAttackerIds = new Set<number>();
    for (const entry of engine.getMemoryEntries()) {
      if (
        entry.actionTag === 'ACCUSE' &&
        entry.speakerId !== agentId &&
        (entry.mentionedPlayerIds.includes(agentId) || entry.targetPlayerId === agentId)
      ) {
        recentAttackerIds.add(entry.speakerId);
      }
    }

    let lowestScore = 999;
    let chosenId = aliveOthers[0].id;
    for (const other of aliveOthers) {
      let score = slice.trustScores[other.id] ?? 0;
      if (recentAttackerIds.has(other.id)) {
        score -= 3;
      }
      if (score < lowestScore) {
        lowestScore = score;
        chosenId = other.id;
      }
    }
    return chosenId;
  }

  /**
   * 狼人夜间击杀决策 (选择一个存活好人)
   */
  public static decideWolfKill(agentId: number, engine: GameEngine): number | null {
    const state = engine.getState();
    const aliveTargets = state.players.filter((p) => p.isAlive && p.role !== 'WEREWOLF');
    if (aliveTargets.length === 0) return null;

    // 优先选择神职或随机好人
    const gods = aliveTargets.filter((p) => p.role === 'SEER' || p.role === 'WITCH');
    const pool = gods.length > 0 ? gods : aliveTargets;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  /**
   * 预言家夜间查验决策 (查验未查验过的存活玩家)
   */
  public static decideSeerCheck(agentId: number, engine: GameEngine): number | null {
    const state = engine.getState();
    const checkedIds = new Set(state.seerCheckedHistory.map((h) => h.targetId));
    checkedIds.add(agentId);

    const candidates = state.players.filter((p) => p.isAlive && !checkedIds.has(p.id));
    if (candidates.length === 0) return null;
    return candidates[0].id;
  }

  /**
   * 女巫夜间用药决策
   */
  public static decideWitchAction(
    agentId: number,
    engine: GameEngine,
  ): { action: 'SAVE' | 'POISON' | 'PASS'; targetId?: number } {
    const state = engine.getState();
    const inventory = state.witchInventory;

    // 若有倒牌且有解药，优先救人
    if (inventory.hasAntidote && state.nightVictimId !== null) {
      return { action: 'SAVE', targetId: state.nightVictimId };
    }

    // 后续轮次若有毒药，针对怀疑度极高的目标可考虑开毒
    if (inventory.hasPoison && state.round >= 2) {
      const slice = engine.getAgentMemorySlice(agentId);
      const aliveOthers = state.players.filter((p) => p.isAlive && p.id !== agentId);
      for (const other of aliveOthers) {
        if ((slice.trustScores[other.id] ?? 0) <= -4) {
          return { action: 'POISON', targetId: other.id };
        }
      }
    }

    return { action: 'PASS' };
  }
}
