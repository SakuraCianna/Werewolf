export type ActionTag =
  | 'CLAIM_ROLE'     // 起跳身份
  | 'ACCUSE'         // 攻击质疑
  | 'DEFEND'         // 表水自辩
  | 'VOTE_INTENT'    // 归票/投票意向
  | 'CHECK_RESULT'   // 报查验
  | 'GENERAL';       // 闲聊/划水

export interface MemoryEntry {
  id: string;
  round: number;
  speakerId: number;
  speakerName: string;
  content: string;
  actionTag: ActionTag;
  baseImportance: number;   // I_base: 0.5 ~ 3.0
  mentionedPlayerIds: number[];
  targetPlayerId?: number;
  timestamp: number;
}

export interface DecayCalculationParams {
  currentRound: number;
  entryRound: number;
  baseImportance: number;
  isSelfMentioned: boolean;
  agentTrait: number;       // P_trait
  tau?: number;             // 半衰期参数 (默认 2.0)
}

export interface AgentMemorySlice {
  agentId: number;
  // 高强度记忆 (M >= 0.7): 原文及细节
  highClarity: string[];
  // 中强度记忆 (0.35 <= M < 0.7): 模糊化印象
  mediumFuzzy: string[];
  // 低强度记忆 (M < 0.35): 沉淀的好恶信任分 (目标玩家 ID -> -5 到 +5)
  trustScores: Record<number, number>;
}
