import { describe, it, expect } from 'vitest';
import { MemoryDecayEngine } from '../src/game/MemoryDecay.js';
import type { MemoryEntry } from 'voice-werewolf-shared';

describe('MemoryDecayEngine 进阶边界与长周期压力测试 (memoryDecayAdvanced)', () => {
  it('10 轮超长周期跨度下，衰减系数单调递减且数学收敛于 > 0，不产生 NaN 或负数', () => {
    const scores: number[] = [];
    for (let round = 1; round <= 10; round++) {
      const s = MemoryDecayEngine.calculateScore({
        currentRound: round,
        entryRound: 1,
        baseImportance: 2.0,
        isSelfMentioned: false,
        agentTrait: 1.0,
        tau: 2.0,
      });
      scores.push(s);
    }

    // 验证严格单调递减
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i + 1]);
    }

    // 验证下界与非奇异性
    for (const s of scores) {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
    }
  });

  it('智能体个性特征 (agentTrait) 影响记忆深度：警惕型智能体比健忘型智能体保留更多记忆', () => {
    const sharpAgentScore = MemoryDecayEngine.calculateScore({
      currentRound: 4,
      entryRound: 1,
      baseImportance: 2.0,
      isSelfMentioned: false,
      agentTrait: 1.5, // 敏锐警惕型
      tau: 2.0,
    });

    const forgetfulAgentScore = MemoryDecayEngine.calculateScore({
      currentRound: 4,
      entryRound: 1,
      baseImportance: 2.0,
      isSelfMentioned: false,
      agentTrait: 0.7, // 健忘松弛型
      tau: 2.0,
    });

    expect(sharpAgentScore).toBeGreaterThan(forgetfulAgentScore);
  });

  it('英文语境 (en-US) 下生成记忆切片应包含符合英文规范的提示词', () => {
    const entries: MemoryEntry[] = [
      {
        id: 'mem_en_1',
        round: 2,
        speakerId: 2,
        speakerName: 'Luna',
        content: 'I am the Seer, Player 3 is a werewolf!',
        actionTag: 'CLAIM_ROLE',
        baseImportance: 3.0,
        mentionedPlayerIds: [3],
        targetPlayerId: 3,
        timestamp: Date.now(),
      },
    ];

    const slice = MemoryDecayEngine.generateSlice(
      1,
      1.0,
      entries,
      2, // 当轮，高清晰
      'en-US',
    );

    expect(slice.highClarity.length).toBe(1);
    expect(slice.highClarity[0]).toContain('Luna');
    expect(slice.highClarity[0]).toContain('Clear Memory');
  });

  it('海量发言条目 (50+ 条) 输入下，记忆切片应平稳分类且信任分计算稳定', () => {
    const entries: MemoryEntry[] = [];
    for (let i = 1; i <= 50; i++) {
      entries.push({
        id: `mem_bulk_${i}`,
        round: Math.floor(i / 10) + 1,
        speakerId: (i % 6) + 1,
        speakerName: `Player${(i % 6) + 1}`,
        content: `Statement number ${i} regarding werewolf suspicions.`,
        actionTag: i % 3 === 0 ? 'ACCUSE' : i % 3 === 1 ? 'DEFEND' : 'GENERAL',
        baseImportance: 1.0,
        mentionedPlayerIds: [((i + 1) % 6) + 1],
        targetPlayerId: ((i + 1) % 6) + 1,
        timestamp: Date.now() + i * 1000,
      });
    }

    const slice = MemoryDecayEngine.generateSlice(1, 1.0, entries, 5, 'zh-CN');

    // 必须有高清晰或中等模糊切片
    expect(slice.highClarity.length + slice.mediumFuzzy.length).toBeGreaterThan(0);
    // 信任分必须包含合法对象字典
    expect(slice.trustScores).toBeDefined();
    expect(typeof slice.trustScores).toBe('object');
    // 如果存在信任分变动，其分值必须是数值类型
    for (const score of Object.values(slice.trustScores)) {
      expect(typeof score).toBe('number');
    }
  });

  it('边界保护：空记忆列表传入时生成安全默认空切片', () => {
    const slice = MemoryDecayEngine.generateSlice(1, 1.0, [], 1, 'zh-CN');
    expect(slice.highClarity).toHaveLength(0);
    expect(slice.mediumFuzzy).toHaveLength(0);
    expect(slice.trustScores).toEqual({});
  });

  it('时序反常保护：当 currentRound < entryRound 时，返回基于距离 0 的安全得分', () => {
    const score = MemoryDecayEngine.calculateScore({
      currentRound: 1,
      entryRound: 3, // 异常时序：记忆轮次大于当前轮次
      baseImportance: 2.0,
      isSelfMentioned: false,
      agentTrait: 1.0,
      tau: 2.0,
    });

    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });
});
