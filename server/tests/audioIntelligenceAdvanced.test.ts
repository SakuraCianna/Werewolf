import { describe, it, expect } from 'vitest';
import { AudioIntelligenceService } from '../src/services/AudioIntelligenceService.js';
import { GameEngine } from '../src/game/GameEngine.js';

describe('AudioIntelligence Advanced 深度容错与极端边界测试 (audioIntelligenceAdvanced)', () => {
  it('LLM 抛出网络超时或 500 异常时，测谎分析必须优雅回退至启发式规则，不抛出异常', async () => {
    const brokenLLM = async () => {
      throw new Error('DeepSeek API connection timed out (504 Gateway Timeout)');
    };

    const res = await AudioIntelligenceService.analyzeSpeechSentiment(
      1,
      '我真的发誓我是个好人，大家千万别投我！',
      'zh-CN',
      brokenLLM,
    );

    expect(res).toBeDefined();
    expect(res.speakerId).toBe(1);
    // 启发式识别为心虚
    expect(res.sentiment).toBe('NERVOUS');
    expect(res.score).toBeGreaterThanOrEqual(75);
  });

  it('LLM 返回 Markdown 代码块包裹的 JSON 或字段缺损时，能够自动清洗提取', async () => {
    const markdownLLM = async () => '```json\n{"sentiment":"AGGRESSIVE","score":88,"labelZh":"强势控场","labelEn":"Aggressive"}\n```';

    const res = await AudioIntelligenceService.analyzeSpeechSentiment(
      2,
      '今天全票出3号，不出的全标狼！',
      'zh-CN',
      markdownLLM,
    );

    expect(res.sentiment).toBe('AGGRESSIVE');
    expect(res.score).toBe(88);
    expect(res.labelZh).toBe('强势控场');
  });

  it('LLM 返回完全不相关的纯文本乱码时，安全降级至启发式分析', async () => {
    const gibberishLLM = async () => 'I am an AI and I cannot output JSON for this prompt.';

    const res = await AudioIntelligenceService.analyzeSpeechSentiment(
      3,
      '3号铁狼，必须推掉！',
      'zh-CN',
      gibberishLLM,
    );

    expect(res).toBeDefined();
    expect(res.sentiment).toBe('AGGRESSIVE');
  });

  it('英文环境 (en-US) 测谎能够准确识别英文心虚与激进发言', async () => {
    const nervousEn = await AudioIntelligenceService.analyzeSpeechSentiment(
      1,
      'Um, please believe me, I swear I am not a wolf, please do not vote me out!',
      'en-US',
    );
    expect(nervousEn.sentiment).toBe('NERVOUS');

    const aggressiveEn = await AudioIntelligenceService.analyzeSpeechSentiment(
      2,
      'Player 3 is definitely a werewolf! We must vote him out right now!',
      'en-US',
    );
    expect(aggressiveEn.sentiment).toBe('AGGRESSIVE');
  });

  it('超长发言文本（5000+ 字符）测谎处理不发生栈溢出与卡死', async () => {
    const longText = '这是一段非常非常长的发言内容。'.repeat(300);
    const start = Date.now();
    const res = await AudioIntelligenceService.analyzeSpeechSentiment(1, longText, 'zh-CN');
    const elapsed = Date.now() - start;

    expect(res).toBeDefined();
    expect(elapsed).toBeLessThan(1000); // 必须在1秒内迅速完成
  });

  it('终局全景战报在大模型报错时自动生成完整的降级战报，关键字段均有内容', async () => {
    const engine = new GameEngine();
    engine.start('zh-CN');
    const state = engine.getState();
    state.winner = 'WOLF';

    const failingLLM = async () => {
      throw new Error('LLM Service Unavailable');
    };

    const report = await AudioIntelligenceService.generatePostGameReport(
      state,
      engine.getMemoryEntries(),
      failingLLM,
    );

    expect(report).toBeDefined();
    expect(report.mvpPlayerId).toBeGreaterThanOrEqual(1);
    expect(report.mvpPlayerId).toBeLessThanOrEqual(6);
    expect(report.mvpReason.length).toBeGreaterThan(0);
    expect(report.turningPoint.length).toBeGreaterThan(0);
    expect(report.tacticalReview.length).toBeGreaterThan(0);
    expect(report.deceptionAnalysis.length).toBeGreaterThan(0);
  });
});
