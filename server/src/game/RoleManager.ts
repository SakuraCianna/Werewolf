import type {
  Player,
  Role,
  Camp,
  Language,
  AgentPersona,
} from 'voice-werewolf-shared';
import { DEFAULT_VOICES } from 'voice-werewolf-shared';

export const AI_PERSONAS: AgentPersona[] = [
  {
    id: 'persona_arthur',
    nameZh: '亚瑟',
    nameEn: 'Arthur',
    gender: 'MALE',
    toneStyleZh: '沉稳严谨，讲究逻辑证据与票型分析',
    toneStyleEn: 'Calm and analytical, focuses strictly on logic and voting patterns',
    memoryTrait: 1.3,
    voiceIdZh: DEFAULT_VOICES.zh.agent1,
    voiceIdEn: DEFAULT_VOICES.en.agent1,
  },
  {
    id: 'persona_luna',
    nameZh: '卢娜',
    nameEn: 'Luna',
    gender: 'FEMALE',
    toneStyleZh: '敏锐直觉，擅长洞察他人发言中的微表情和自相矛盾',
    toneStyleEn: 'Sharp and intuitive, spots inconsistencies and psychological slips',
    memoryTrait: 1.4,
    voiceIdZh: DEFAULT_VOICES.zh.agent2,
    voiceIdEn: DEFAULT_VOICES.en.agent2,
  },
  {
    id: 'persona_leo',
    nameZh: '雷欧',
    nameEn: 'Leo',
    gender: 'MALE',
    toneStyleZh: '直率激进，言辞犀利，对划水玩家极度不容忍',
    toneStyleEn: 'Aggressive and direct, fiercely confronts inactive or evasive players',
    memoryTrait: 0.9,
    voiceIdZh: DEFAULT_VOICES.zh.agent3,
    voiceIdEn: DEFAULT_VOICES.en.agent3,
  },
  {
    id: 'persona_sophia',
    nameZh: '索菲亚',
    nameEn: 'Sophia',
    gender: 'FEMALE',
    toneStyleZh: '温和谨慎，倾向于防守自辩，不轻易下结论',
    toneStyleEn: 'Gentle and cautious, defensive, reluctant to condemn without hard proof',
    memoryTrait: 1.0,
    voiceIdZh: DEFAULT_VOICES.zh.agent4,
    voiceIdEn: DEFAULT_VOICES.en.agent4,
  },
  {
    id: 'persona_viktor',
    nameZh: '维克托',
    nameEn: 'Viktor',
    gender: 'MALE',
    toneStyleZh: '冷峻怀疑，对所有跳身份者抱有警惕，喜欢反向思考',
    toneStyleEn: 'Cold and skeptical, questions claimed roles and looks for hidden traps',
    memoryTrait: 0.85,
    voiceIdZh: DEFAULT_VOICES.zh.agent5,
    voiceIdEn: DEFAULT_VOICES.en.agent5,
  },
];

export class RoleManager {
  public static getCamp(role: Role): Camp {
    return role === 'WEREWOLF' ? 'WOLF' : 'GOOD';
  }

  /**
   * 初始化 6 人局玩家阵列 (支持 1 ~ 6 位真人联机，其余空闲席位自动由 AI 补齐)
   */
  public static initializePlayers(
    language: Language = 'zh-CN',
    customRoles?: Role[],
    preferredUserRole?: Role,
    lastUserRole?: Role,
    humanPlayers?: Array<{ id: number; name?: string }>,
  ): Player[] {
    const defaultRoles: Role[] = [
      'WEREWOLF',
      'WEREWOLF',
      'SEER',
      'WITCH',
      'VILLAGER',
      'VILLAGER',
    ];

    const roles = customRoles ? [...customRoles] : [...defaultRoles];
    if (!customRoles) {
      if (preferredUserRole && roles.includes(preferredUserRole)) {
        // 用户指定身份：将该身份置于 1 号位 (roles[0])，其余 5 张牌随机洗牌分配
        const targetIdx = roles.indexOf(preferredUserRole);
        [roles[0], roles[targetIdx]] = [roles[targetIdx], roles[0]];
        for (let i = roles.length - 1; i > 1; i--) {
          const j = 1 + Math.floor(Math.random() * i);
          [roles[i], roles[j]] = [roles[j], roles[i]];
        }
      } else {
        // 随机发牌：洗牌并在有历史记录时避免连续两局同一身份
        for (let i = roles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [roles[i], roles[j]] = [roles[j], roles[i]];
        }
        if (lastUserRole && roles[0] === lastUserRole) {
          const diffIdx = roles.findIndex((r, idx) => idx > 0 && r !== lastUserRole);
          if (diffIdx !== -1) {
            [roles[0], roles[diffIdx]] = [roles[diffIdx], roles[0]];
          }
        }
      }
    }

    const isZh = language === 'zh-CN';
    const effectiveHumans = humanPlayers && humanPlayers.length > 0 ? humanPlayers : [{ id: 1 }];
    const humanMap = new Map(effectiveHumans.map((h) => [h.id, h.name]));
    const players: Player[] = [];

    let aiPersonaIdx = 0;
    for (let id = 1; id <= 6; id++) {
      const role = roles[id - 1];
      const isHuman = humanMap.has(id);
      const customName = humanMap.get(id);

      if (isHuman) {
        let displayName = customName;
        if (!displayName) {
          if (id === 1) {
            displayName = isZh ? '房主 · 你 (1号)' : 'Host · You (#1)';
          } else {
            displayName = isZh ? `好友 (${id}号)` : `Friend (#${id})`;
          }
        }
        players.push({
          id,
          name: displayName,
          role,
          camp: this.getCamp(role),
          isAI: false,
          isAlive: true,
          avatar: '/avatars/human.png',
        });
      } else {
        const persona = AI_PERSONAS[aiPersonaIdx % AI_PERSONAS.length];
        aiPersonaIdx++;
        players.push({
          id,
          name: isZh ? `${persona.nameZh} (${id}号)` : `${persona.nameEn} (#${id})`,
          role,
          camp: this.getCamp(role),
          isAI: true,
          isAlive: true,
          avatar: `/avatars/ai_${id - 1}.png`,
          persona,
        });
      }
    }

    return players;
  }

  /**
   * 胜负裁决:
   * 狼人全灭 -> 好人获胜
   * 狼人存活数 >= 存活好人数 -> 狼人获胜
   */
  public static evaluateWinner(players: Player[]): Camp | null {
    const alivePlayers = players.filter((p) => p.isAlive);
    const aliveWolves = alivePlayers.filter((p) => p.camp === 'WOLF');
    const aliveGood = alivePlayers.filter((p) => p.camp === 'GOOD');

    if (aliveWolves.length === 0) {
      return 'GOOD';
    }
    if (aliveWolves.length >= aliveGood.length) {
      return 'WOLF';
    }
    return null;
  }
}
