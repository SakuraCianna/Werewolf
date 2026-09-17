import type {
  MemoryEntry,
  DecayCalculationParams,
  AgentMemorySlice,
  Language,
} from 'voice-werewolf-shared';

export class MemoryDecayEngine {
  /**
   * 仿生遗忘衰退公式:
   * M = (I_base * R_relevance) * exp( - deltaRound / (tau * P_trait) )
   */
  public static calculateScore(params: DecayCalculationParams): number {
    const {
      currentRound,
      entryRound,
      baseImportance,
      isSelfMentioned,
      agentTrait,
      tau = 2.0,
    } = params;

    const deltaRound = Math.max(0, currentRound - entryRound);
    const relevance = isSelfMentioned ? 2.0 : 1.0;
    const denominator = Math.max(0.1, tau * agentTrait);
    const decayFactor = Math.exp(-deltaRound / denominator);

    return Number((baseImportance * relevance * decayFactor).toFixed(3));
  }

  /**
   * 为指定 AI Agent 生成当前时刻的三层记忆切片
   */
  public static generateSlice(
    agentId: number,
    agentTrait: number,
    entries: MemoryEntry[],
    currentRound: number,
    language: Language = 'zh-CN',
  ): AgentMemorySlice {
    const highClarity: string[] = [];
    const mediumFuzzy: string[] = [];
    const trustScores: Record<number, number> = {};

    for (const entry of entries) {
      const isSelfMentioned =
        entry.mentionedPlayerIds.includes(agentId) ||
        entry.targetPlayerId === agentId;

      const score = this.calculateScore({
        currentRound,
        entryRound: entry.round,
        baseImportance: entry.baseImportance,
        isSelfMentioned,
        agentTrait,
      });

      const isZh = language === 'zh-CN';

      if (score >= 0.7) {
        // 高强度清晰记忆: 保留说话人、轮次与原句逻辑
        const label = isZh
          ? `[第${entry.round}轮·清晰记忆] ${entry.speakerName} (${entry.speakerId}号): "${entry.content}"`
          : `[Round ${entry.round}·Clear Memory] ${entry.speakerName} (#${entry.speakerId}): "${entry.content}"`;
        highClarity.push(label);
      } else if (score >= 0.35) {
        // 中强度模糊记忆: 细节淡化为抽象情绪或行为印象
        const fuzzyAction = this.getFuzzyActionSummary(entry, isZh);
        const label = isZh
          ? `[第${entry.round}轮·模糊印象] 隐约记得 ${entry.speakerName} (#${entry.speakerId}) ${fuzzyAction}`
          : `[Round ${entry.round}·Vague Impression] Vaguely recall ${entry.speakerName} (#${entry.speakerId}) ${fuzzyAction}`;
        mediumFuzzy.push(label);
      } else {
        // 低强度记忆: 遗忘具体言论细节, 沉淀为好恶/怀疑度分值 (-5 ~ +5)
        if (entry.actionTag === 'ACCUSE') {
          if (isSelfMentioned) {
            // 他人攻击自己时，对发起攻击的发言人产生高度怀疑 (-2)
            if (entry.speakerId !== agentId) {
              const currentScore = trustScores[entry.speakerId] || 0;
              trustScores[entry.speakerId] = Math.max(-5, Math.min(5, currentScore - 2));
            }
          } else {
            // 他人攻击第三方时，对嫌疑目标产生怀疑 (-1)
            const suspect = entry.targetPlayerId || entry.speakerId;
            if (suspect !== agentId) {
              const currentScore = trustScores[suspect] || 0;
              trustScores[suspect] = Math.max(-5, Math.min(5, currentScore - 1));
            }
          }
        } else if (entry.actionTag === 'DEFEND' || entry.actionTag === 'CHECK_RESULT') {
          const ally = entry.targetPlayerId || entry.speakerId;
          if (ally !== agentId) {
            const currentScore = trustScores[ally] || 0;
            trustScores[ally] = Math.max(-5, Math.min(5, currentScore + 1));
          }
        }
      }
    }

    return {
      agentId,
      highClarity,
      mediumFuzzy,
      trustScores,
    };
  }

  private static getFuzzyActionSummary(entry: MemoryEntry, isZh: boolean): string {
    switch (entry.actionTag) {
      case 'CLAIM_ROLE':
        return isZh ? '自称过某个身份，但具体逻辑模糊' : 'claimed a special role, but details are blurry';
      case 'ACCUSE':
        return isZh ? `曾严厉质疑过某人，态度较具攻击性` : `strongly accused someone with an aggressive tone`;
      case 'DEFEND':
        return isZh ? '做过自辩表水，似乎想洗清嫌疑' : 'defended themselves to clear suspicion';
      case 'CHECK_RESULT':
        return isZh ? '报过某种查验信息' : 'reported some investigation result';
      case 'VOTE_INTENT':
        return isZh ? '提议过投票方向' : 'suggested a voting direction';
      default:
        return isZh ? '发表了言论，具体内容记不清了' : 'said something, but exact points are forgotten';
    }
  }
}
