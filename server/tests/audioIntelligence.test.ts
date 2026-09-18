import { describe, it, expect } from 'vitest';
import { AudioIntelligenceService } from '../src/services/AudioIntelligenceService.js';
import { GameEngine } from '../src/game/GameEngine.js';

describe('AudioIntelligenceService 语音智能与终局复盘测试', () => {
  it('空发言时返回默认平缓情绪指标', async () => {
    const res = await AudioIntelligenceService.analyzeSpeechSentiment(1, '   ');
    expect(res.speakerId).toBe(1);
    expect(res.sentiment).toBe('CALM');
    expect(res.score).toBe(70);
  });

  it('启发式规则能精准识别心虚/自辩/激进/沉稳四类情绪倾向', async () => {
    const nervous = await AudioIntelligenceService.analyzeSpeechSentiment(
      1,
      '我真的不是狼人，你们别投我，求求大家相信我发誓！',
    );
    expect(nervous.sentiment).toBe('NERVOUS');
    expect(nervous.score).toBeGreaterThanOrEqual(80);

    const aggressive = await AudioIntelligenceService.analyzeSpeechSentiment(
      2,
      '3号是铁狼，这把必须全票打死他，跟我走！',
    );
    expect(aggressive.sentiment).toBe('AGGRESSIVE');
    expect(aggressive.score).toBeGreaterThanOrEqual(80);

    const defensive = await AudioIntelligenceService.analyzeSpeechSentiment(
      3,
      '我认真表水自辩一下，不要乱踩我，我是个好人。',
    );
    expect(defensive.sentiment).toBe('DEFENSIVE');

    const calm = await AudioIntelligenceService.analyzeSpeechSentiment(
      4,
      '从第一轮票型和发言位置来看，逻辑链条非常清晰。',
    );
    expect(calm.sentiment).toBe('CALM');
  });

  it('支持大语言模型分析并解析结构化 JSON 心理侧写', async () => {
    const mockLLM = async () =>
      JSON.stringify({
        sentiment: 'NERVOUS',
        score: 92,
        labelZh: '语速局促·心虚辩解',
        labelEn: 'Nervous & Anxious',
      });

    const res = await AudioIntelligenceService.analyzeSpeechSentiment(
      1,
      '我其实真的只是一张平民牌啊...',
      'zh-CN',
      mockLLM,
    );

    expect(res.sentiment).toBe('NERVOUS');
    expect(res.score).toBe(92);
    expect(res.labelZh).toBe('语速局促·心虚辩解');
  });

  it('终局能自动生成全景战术复盘简报 (MVP、胜负转折点与欺骗指数)', async () => {
    const engine = new GameEngine();
    engine.start('zh-CN');
    const state = engine.getState();
    state.winner = 'GOOD';

    const report = await AudioIntelligenceService.generatePostGameReport(
      state,
      engine.getMemoryEntries(),
    );

    expect(report).toBeDefined();
    expect(report.mvpPlayerId).toBeGreaterThanOrEqual(1);
    expect(report.mvpReason.length).toBeGreaterThan(5);
    expect(report.turningPoint.length).toBeGreaterThan(5);
    expect(report.tacticalReview.length).toBeGreaterThan(5);
    expect(report.deceptionAnalysis.length).toBeGreaterThan(5);
  });
});
