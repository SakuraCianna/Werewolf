import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/GameEngine.js';
import type { Role } from 'voice-werewolf-shared';

describe('GameEngine 游戏状态机与裁判逻辑测试', () => {
  it('正确初始化 6 人标准板子并包含 1 真人 + 5 AI', () => {
    const engine = new GameEngine();
    engine.start('zh-CN');

    const state = engine.getState();
    expect(state.players).toHaveLength(6);
    expect(state.players[0].isAI).toBe(false);
    expect(state.players.slice(1).every((p) => p.isAI)).toBe(true);

    const wolfCount = state.players.filter((p) => p.role === 'WEREWOLF').length;
    const seerCount = state.players.filter((p) => p.role === 'SEER').length;
    const witchCount = state.players.filter((p) => p.role === 'WITCH').length;
    const villagerCount = state.players.filter((p) => p.role === 'VILLAGER').length;

    expect(wolfCount).toBe(2);
    expect(seerCount).toBe(1);
    expect(witchCount).toBe(1);
    expect(villagerCount).toBe(2);
  });

  it('夜间行动与平安夜/击杀结算', () => {
    const engine = new GameEngine();
    // 固定角色配置方便断言
    const customRoles: Role[] = [
      'VILLAGER', // 1号 真人 平民
      'WEREWOLF', // 2号 AI 狼人
      'WEREWOLF', // 3号 AI 狼人
      'SEER',     // 4号 AI 预言家
      'WITCH',    // 5号 AI 女巫
      'VILLAGER', // 6号 AI 平民
    ];

    engine.start('zh-CN', customRoles);
    expect(engine.getState().phase).toBe('NIGHT_START');

    // 狼人刀 1 号
    engine.transitionTo('NIGHT_WOLF');
    engine.executeWolfKill(1);

    // 预言家查 2 号
    engine.transitionTo('NIGHT_SEER');
    const seerCheck = engine.executeSeerCheck(2);
    expect(seerCheck?.isWolf).toBe(true);

    // 女巫使用解药救 1 号
    engine.transitionTo('NIGHT_WITCH');
    const saved = engine.executeWitchSave();
    expect(saved).toBe(true);
    expect(engine.getState().witchInventory.hasAntidote).toBe(false);

    // 天亮结算 -> 平安夜
    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(1)?.isAlive).toBe(true);
  });

  it('女巫毒人与天亮双亡结算', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = [
      'VILLAGER', // 1号
      'WEREWOLF', // 2号
      'WEREWOLF', // 3号
      'SEER',     // 4号
      'WITCH',    // 5号
      'VILLAGER', // 6号
    ];
    engine.start('zh-CN', customRoles);

    // 狼人刀 6 号，女巫不救并毒死 2 号
    engine.executeWolfKill(6);
    engine.executeWitchPoison(2);

    engine.transitionTo('DAY_START');
    expect(engine.getPlayer(6)?.isAlive).toBe(false);
    expect(engine.getPlayer(2)?.isAlive).toBe(false);
  });

  it('投票放逐与胜负判定', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = [
      'VILLAGER', // 1号
      'WEREWOLF', // 2号
      'WEREWOLF', // 3号
      'SEER',     // 4号
      'WITCH',    // 5号
      'VILLAGER', // 6号
    ];
    engine.start('zh-CN', customRoles);

    // 假设 3 号狼人先在夜里被毒死
    engine.getPlayer(3)!.isAlive = false;

    // 白天公投，全员投 2 号狼人
    engine.transitionTo('DAY_VOTE');
    engine.registerVote(1, 2);
    engine.registerVote(4, 2);
    engine.registerVote(5, 2);
    engine.registerVote(6, 2);

    // 结算投票 -> 2号出局，狼人全灭，好人获胜
    engine.transitionTo('DAY_VOTE_RESULT');
    expect(engine.getPlayer(2)?.isAlive).toBe(false);
    expect(engine.getState().winner).toBe('GOOD');
    expect(engine.getState().phase).toBe('GAME_OVER');
  });

  it('女巫同一夜不可同时使用解药和毒药 (双药互斥)', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    engine.executeWolfKill(1);
    // 先救人
    const saveSuccess = engine.executeWitchSave();
    expect(saveSuccess).toBe(true);

    // 同夜尝试下毒 -> 应被阻止
    const poisonSuccess = engine.executeWitchPoison(2);
    expect(poisonSuccess).toBe(false);
    expect(engine.getState().witchInventory.hasPoison).toBe(true);
  });

  it('白天投票平票时无人出局', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);

    engine.transitionTo('DAY_VOTE');
    engine.registerVote(1, 2);
    engine.registerVote(3, 2);
    engine.registerVote(4, 5);
    engine.registerVote(6, 5);

    engine.transitionTo('DAY_VOTE_RESULT');
    expect(engine.getState().lastVotedOutId).toBeNull();
    expect(engine.getPlayer(2)?.isAlive).toBe(true);
    expect(engine.getPlayer(5)?.isAlive).toBe(true);
  });

  it('进入下一轮夜间时 round 正确递增', () => {
    const engine = new GameEngine();
    const customRoles: Role[] = ['VILLAGER', 'WEREWOLF', 'WEREWOLF', 'SEER', 'WITCH', 'VILLAGER'];
    engine.start('zh-CN', customRoles);
    expect(engine.getState().round).toBe(1);

    // 平安夜
    engine.executeWolfKill(1);
    engine.executeWitchSave();
    engine.transitionTo('DAY_START');

    // 平票无出局
    engine.transitionTo('DAY_VOTE');
    engine.registerVote(1, 2);
    engine.registerVote(3, 1);
    engine.transitionTo('DAY_VOTE_RESULT');
    expect(engine.getState().winner).toBeNull();

    // 进入第 2 晚
    engine.transitionTo('NIGHT_START');
    expect(engine.getState().round).toBe(2);
    expect(engine.getState().phase).toBe('NIGHT_START');
  });

  it('支持玩家指定自选身份 (preferredUserRole)，并将该身份精准分配给 1 号真人', () => {
    const engine = new GameEngine();
    // 玩家自选预言家
    engine.start('zh-CN', undefined, 'SEER');
    expect(engine.getPlayer(1)?.role).toBe('SEER');

    // 重新开启自选狼人
    engine.start('zh-CN', undefined, 'WEREWOLF');
    expect(engine.getPlayer(1)?.role).toBe('WEREWOLF');

    // 重新开启自选女巫
    engine.start('zh-CN', undefined, 'WITCH');
    expect(engine.getPlayer(1)?.role).toBe('WITCH');
  });

  it('随机分配模式下避免玩家连续两局拿到完全相同身份', () => {
    const engine = new GameEngine();
    engine.start('zh-CN');
    const firstRole = engine.getPlayer(1)?.role;

    // 连续开局 10 次随机模式，每次发牌均与上一局不同
    let previousRole = firstRole;
    for (let i = 0; i < 10; i++) {
      engine.start('zh-CN');
      const currentRole = engine.getPlayer(1)?.role;
      expect(currentRole).not.toBe(previousRole);
      previousRole = currentRole;
    }
  });
});
