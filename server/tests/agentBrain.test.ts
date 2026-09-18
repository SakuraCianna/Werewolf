import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import { AgentBrain } from '../src/game/AgentBrain.js';
import type { Role } from 'voice-werewolf-shared';

describe('AgentBrain 智能体大脑与沙盒防作弊测试', () => {
  it('防透视沙盒: 平民 Prompt 中不包含狼人或神职底牌信息', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    // 6号为平民
    const prompt = AgentBrain.buildPrompt(6, engine, 'SPEECH');

    expect(prompt).toContain('平民');
    expect(prompt).not.toContain('你的狼队友是');
    expect(prompt).not.toContain('过往查验记录');
    // 确保没有把其他人的 role 透露给平民
    expect(prompt).not.toContain('2号是WEREWOLF');
    expect(prompt).not.toContain('2号是狼人');
    expect(prompt).not.toContain('4号是SEER');
    expect(prompt).not.toContain('4号是预言家');
  });

  it('狼人仅能获取狼队友信息，无法透视神职', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    // 2号为狼人，队友是 3号
    const prompt = AgentBrain.buildPrompt(2, engine, 'SPEECH');
    expect(prompt).toContain('【狼人】');
    expect(prompt).toContain('你的狼队友是：3号');
    // 无法透视女巫与预言家
    expect(prompt).not.toContain('4号是预言家');
    expect(prompt).not.toContain('5号是女巫');
  });

  it('女巫在夜间阶段且有解药时可获取受害目标', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    // 狼人刀 1 号
    engine.executeWolfKill(1);

    // 5号为女巫
    const prompt = AgentBrain.buildPrompt(5, engine, 'NIGHT_WITCH');
    expect(prompt).toContain('【女巫】');
    expect(prompt).toContain('今晚倒牌的玩家是：1号');
  });

  it('白天发言与投票策略决策', async () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    // 4号预言家生成发言
    const seerDecision = await AgentBrain.generateDaySpeech(4, engine);
    expect(seerDecision.speech).toBeTruthy();
    expect(seerDecision.actionTag).toBe('CLAIM_ROLE');

    // 记录一条 4号被 2号猛烈指控的记忆
    engine.recordSpeech(2, '4号是悍跳狼，大家跟我出4号！', 'ACCUSE', [4], 4);

    // 4号投票决策：应当投信任分最低者 (攻击者 2号)
    const voteTarget = await AgentBrain.decideDayVote(4, engine);
    expect(voteTarget).toBe(2);
  });

  it('LLM 返回空字符或纯空白时优雅回退至预置拟真表水', async () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    // 模拟 LLM 返回纯空白字符串
    const emptySpeechDecision = await AgentBrain.generateDaySpeech(
      2,
      engine,
      async () => '    \n\t   ',
    );
    expect(emptySpeechDecision.speech).toBeTruthy();
    expect(emptySpeechDecision.speech.length).toBeGreaterThan(10);
    expect(emptySpeechDecision.speech).toContain('好人牌');

    // 模拟 LLM 抛出异常报错
    const errorSpeechDecision = await AgentBrain.generateDaySpeech(
      4,
      engine,
      async () => {
        throw new Error('LLM rate limit');
      },
    );
    expect(errorSpeechDecision.speech).toBeTruthy();
    expect(errorSpeechDecision.actionTag).toBe('CLAIM_ROLE');
  });

  it('夜间 AI 决策助手', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    // 2号狼人夜间决策: 必定选择非狼目标 (1, 4, 5, 6 之一)
    const wolfKillTarget = AgentBrain.decideWolfKill(2, engine);
    expect([1, 4, 5, 6]).toContain(wolfKillTarget);

    // 4号预言家夜间决策: 必定选择非自身的存活目标
    const seerCheckTarget = AgentBrain.decideSeerCheck(4, engine);
    expect(seerCheckTarget).not.toBe(4);
    expect([1, 2, 3, 5, 6]).toContain(seerCheckTarget);

    // 女巫夜间决策: 在有人倒牌且有药时优先救人
    engine.executeWolfKill(1);
    const witchDecision = AgentBrain.decideWitchAction(5, engine);
    expect(witchDecision.action).toBe('SAVE');
    expect(witchDecision.targetId).toBe(1);
  });
});
