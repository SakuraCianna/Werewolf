import { describe, it, expect } from 'vitest';
import { MemoryDecayEngine } from '../src/game/MemoryDecay.js';
import type { MemoryEntry } from 'voice-werewolf-shared';

describe('MemoryDecayEngine 遗忘衰退引擎测试', () => {
  it('当前轮次发生的重要事件得分应最高 (近因效应)', () => {
    const scoreNow = MemoryDecayEngine.calculateScore({
      currentRound: 1,
      entryRound: 1,
      baseImportance: 3.0,
      isSelfMentioned: false,
      agentTrait: 1.0,
      tau: 2.0,
    });

    const scoreLater = MemoryDecayEngine.calculateScore({
      currentRound: 4,
      entryRound: 1,
      baseImportance: 3.0,
      isSelfMentioned: false,
      agentTrait: 1.0,
      tau: 2.0,
    });

    expect(scoreNow).toBe(3.0);
    expect(scoreLater).toBeLessThan(scoreNow);
    expect(scoreLater).toBeLessThan(1.0);
  });

  it('被点名或自我相关时，记忆得分翻倍', () => {
    const scoreGeneral = MemoryDecayEngine.calculateScore({
      currentRound: 2,
      entryRound: 1,
      baseImportance: 1.5,
      isSelfMentioned: false,
      agentTrait: 1.0,
    });

    const scoreMentioned = MemoryDecayEngine.calculateScore({
      currentRound: 2,
      entryRound: 1,
      baseImportance: 1.5,
      isSelfMentioned: true,
      agentTrait: 1.0,
    });

    expect(scoreMentioned).toBeCloseTo(scoreGeneral * 2, 2);
  });

  it('生成三层记忆切片 (高清晰/中模糊/低沉淀)', () => {
    const entries: MemoryEntry[] = [
      {
        id: 'mem_1',
        round: 3,
        speakerId: 2,
        speakerName: '卢娜',
        content: '我起跳预言家，昨晚验了3号是金水！',
        actionTag: 'CLAIM_ROLE',
        baseImportance: 3.0,
        mentionedPlayerIds: [3],
        targetPlayerId: 3,
        timestamp: Date.now(),
      },
      {
        id: 'mem_2',
        round: 1,
        speakerId: 4,
        speakerName: '雷欧',
        content: '我强烈怀疑5号是狼人！',
        actionTag: 'ACCUSE',
        baseImportance: 1.5,
        mentionedPlayerIds: [5],
        targetPlayerId: 5,
        timestamp: Date.now(),
      },
      {
        id: 'mem_3',
        round: 1,
        speakerId: 6,
        speakerName: '维克托',
        content: '划水过麦。',
        actionTag: 'GENERAL',
        baseImportance: 0.5,
        mentionedPlayerIds: [],
        timestamp: Date.now(),
      },
    ];

    const slice = MemoryDecayEngine.generateSlice(
      5,      // agentId: 5号索菲亚 (被雷欧指控)
      1.0,    // agentTrait
      entries,
      3,      // 当前为第3轮
      'zh-CN',
    );

    expect(slice.highClarity.length).toBeGreaterThanOrEqual(1);
    expect(slice.highClarity[0]).toContain('卢娜');
    expect(slice.highClarity[0]).toContain('清晰记忆');
  });

  it('低强度记忆沉淀: 被指控的受害者对指控者产生负信任分', () => {
    // 雷欧 (4号) 猛烈指控 5号索菲亚，经过多轮衰退后进入低强度记忆
    const entries: MemoryEntry[] = [
      {
        id: 'mem_old_accuse',
        round: 1,
        speakerId: 4,
        speakerName: '雷欧',
        content: '5号绝对是铁狼，必须先出5！',
        actionTag: 'ACCUSE',
        baseImportance: 1.0,
        mentionedPlayerIds: [5],
        targetPlayerId: 5,
        timestamp: Date.now(),
      },
    ];

    // 5号索菲亚 (agentId: 5) 查看记忆切片 (当前为第 6 轮，记忆衰退至低强度)
    const sliceVictim = MemoryDecayEngine.generateSlice(5, 0.9, entries, 6, 'zh-CN');
    expect(sliceVictim.highClarity).toHaveLength(0);
    // 5号应当对 4号 (指控者) 产生怀疑扣分 (-2)
    expect(sliceVictim.trustScores[4]).toBe(-2);

    // 2号卢娜 (旁观者) 查看记忆切片
    const sliceWitness = MemoryDecayEngine.generateSlice(2, 1.4, entries, 6, 'zh-CN');
    // 旁观者对被指控目标 (5号) 产生 -1 的怀疑分
    expect(sliceWitness.trustScores[5]).toBe(-1);
  });
});
