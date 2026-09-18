import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import type { Role } from 'voice-werewolf-shared';

describe('GameEngine 进阶边界与极端场景测试 (gameEngineAdvanced)', () => {
  // 基础标准角色表：1号平民、2号狼人、3号狼人、4号预言家、5号女巫、6号平民
  const standardRoles: Role[] = [
    'VILLAGER', // 1号
    'WEREWOLF', // 2号
    'WEREWOLF', // 3号
    'SEER',     // 4号
    'WITCH',    // 5号
    'VILLAGER', // 6号
  ];

  it('白天公投平票时，应正确判定为无人出局（平票流局），全员安全进入下一夜晚', () => {
    let latestAnnouncement = '';
    const engine = new GameEngine({
      onPhaseChange: (_phase, _round, announcement) => {
        if (announcement) latestAnnouncement = announcement;
      },
    });
    engine.start('zh-CN', standardRoles);

    // 推进至白天放逐公投阶段
    engine.transitionTo('DAY_VOTE');

    // 1号、2号投 3号 (共2票)；4号、5号投 6号 (共2票)；其他玩家投其他或未投票
    engine.registerVote(1, 3);
    engine.registerVote(2, 3);
    engine.registerVote(4, 6);
    engine.registerVote(5, 6);

    // 结算投票
    engine.transitionTo('DAY_VOTE_RESULT');

    // 平票应无人出局
    expect(engine.getPlayer(3)?.isAlive).toBe(true);
    expect(engine.getPlayer(6)?.isAlive).toBe(true);
    expect(latestAnnouncement).toContain('平票');

    // 成功流转回夜间且回合数增加
    engine.transitionTo('NIGHT_START');
    expect(engine.getState().round).toBe(2);
  });

  it('女巫毒杀与狼人刀人同夜结算：天亮时应宣布双死', () => {
    let latestAnnouncement = '';
    const engine = new GameEngine({
      onPhaseChange: (_phase, _round, announcement) => {
        if (announcement) latestAnnouncement = announcement;
      },
    });
    engine.start('zh-CN', standardRoles);

    // 狼人杀 1号
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(1);

    // 女巫不救 1号，反手对 2号使用毒药
    engine.transitionTo('NIGHT_WITCH');
    const poisoned = engine.executeWitchPoison(2);
    expect(poisoned).toBe(true);
    expect(engine.getState().witchInventory.hasPoison).toBe(false);

    // 天亮结算
    engine.transitionTo('DAY_START');

    expect(engine.getPlayer(1)?.isAlive).toBe(false);
    expect(engine.getPlayer(2)?.isAlive).toBe(false);
    expect(latestAnnouncement).toContain('1号');
    expect(latestAnnouncement).toContain('2号');
  });

  it('女巫药剂消耗约束：解药使用后次夜不可再使用，毒药同理', () => {
    const engine = new GameEngine();
    engine.start('zh-CN', standardRoles);

    // 第1夜使用解药
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(1);
    engine.transitionTo('NIGHT_WITCH');
    engine.executeWitchSave();
    expect(engine.getState().witchInventory.hasAntidote).toBe(false);

    // 推进至第2夜
    engine.transitionTo('DAY_START');
    engine.transitionTo('DAY_VOTE');
    engine.transitionTo('DAY_VOTE_RESULT');
    engine.transitionTo('NIGHT_START');

    // 第2夜狼人刀 4号
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(4);

    // 女巫尝试再次使用解药 -> 应当失败
    engine.transitionTo('NIGHT_WITCH');
    const saveAgain = engine.executeWitchSave();
    expect(saveAgain).toBe(false);

    // 天亮 4号阵亡
    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(4)?.isAlive).toBe(false);
  });

  it('胜负判定：所有狼人死亡时，好人阵营立即宣告胜利 (GOOD)', () => {
    const engine = new GameEngine();
    engine.start('zh-CN', standardRoles);

    // 白天放逐 2号狼人
    engine.transitionTo('DAY_VOTE');
    engine.registerVote(1, 2);
    engine.registerVote(4, 2);
    engine.registerVote(5, 2);
    engine.transitionTo('DAY_VOTE_RESULT');
    expect(engine.getPlayer(2)?.isAlive).toBe(false);
    expect(engine.getState().winner).toBeNull(); // 还有 3号狼人存活

    // 第2夜女巫毒死 3号狼人
    engine.transitionTo('NIGHT_START');
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(1); // 狼人刀1号
    engine.transitionTo('NIGHT_WITCH');
    engine.executeWitchPoison(3); // 女巫毒3号

    // 天亮结算
    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(3)?.isAlive).toBe(false);

    // 狼人全灭 -> 好人胜利
    expect(engine.getState().winner).toBe('GOOD');
  });

  it('胜负判定：屠民规则生效（所有平民阵亡时，狼人阵营胜利 WOLF）', () => {
    const engine = new GameEngine();
    engine.start('zh-CN', standardRoles);

    // 第1夜杀 1号平民
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(1);
    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(1)?.isAlive).toBe(false);

    // 第1天白天公投放逐 6号平民
    engine.transitionTo('DAY_VOTE');
    engine.registerVote(2, 6);
    engine.registerVote(3, 6);
    engine.registerVote(4, 6);
    engine.transitionTo('DAY_VOTE_RESULT');
    expect(engine.getPlayer(6)?.isAlive).toBe(false);

    // 1号与6号平民全灭 -> 狼人达成屠民胜利
    expect(engine.getState().winner).toBe('WOLF');
  });

  it('胜负判定：屠神规则生效（预言家与女巫全灭时，狼人阵营胜利 WOLF）', () => {
    const engine = new GameEngine();
    engine.start('zh-CN', standardRoles);

    // 第1夜杀 4号预言家
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(4);
    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(4)?.isAlive).toBe(false);

    // 白天放逐 5号女巫
    engine.transitionTo('DAY_VOTE');
    engine.registerVote(1, 5);
    engine.registerVote(2, 5);
    engine.registerVote(3, 5);
    engine.transitionTo('DAY_VOTE_RESULT');
    expect(engine.getPlayer(5)?.isAlive).toBe(false);

    // 神职全灭 -> 狼人达成屠神胜利
    expect(engine.getState().winner).toBe('WOLF');
  });

  it('死者约束：阵亡玩家不应出现在存活列表中，且其投票与发言动作被有效隔离', () => {
    const engine = new GameEngine();
    engine.start('zh-CN', standardRoles);

    // 杀死 1号
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(1);
    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(1)?.isAlive).toBe(false);

    // 验证存活列表
    const alivePlayers = engine.getAlivePlayers();
    expect(alivePlayers.some((p) => p.id === 1)).toBe(false);
    expect(alivePlayers).toHaveLength(5);

    // 1号尝试投票 -> 必须被 registerVote 忽略
    engine.transitionTo('DAY_VOTE');
    engine.registerVote(1, 2);
    expect(engine.getState().votes[1]).toBeUndefined();

    // 存活玩家投票给已死玩家 1号 -> 也应被忽略
    engine.registerVote(2, 1);
    expect(engine.getState().votes[2]).toBeUndefined();

    // 尝试推进发言者，已死玩家 1号绝对不能被选为发言者
    engine.transitionTo('DAY_DISCUSS');
    const speakerId = engine.getState().currentSpeakerId;
    expect(speakerId).not.toBe(1);
  });
});
