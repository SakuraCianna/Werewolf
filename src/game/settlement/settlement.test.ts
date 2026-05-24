import { describe, expect, it } from 'vitest';
import { normalizeSettlementReport } from './settlement';

describe('normalizeSettlementReport', () => {
  it('normalizes judge JSON into stable report shape', () => {
    const report = normalizeSettlementReport({
      players: [
        {
          playerName: '叶岚',
          performance: 8,
          logic: 7,
          operation: 6,
          comment: '进攻性强，但投票略急。',
          tags: ['最佳表演'],
        },
      ],
      summary: '好人阵营获胜。',
    });

    expect(report.players[0]).toEqual({
      playerName: '叶岚',
      scores: { performance: 8, logic: 7, operation: 6 },
      comment: '进攻性强，但投票略急。',
      tags: ['最佳表演'],
    });
    expect(report.summary).toBe('好人阵营获胜。');
  });

  it('clamps score values to the 0-10 judge scale', () => {
    const report = normalizeSettlementReport({
      players: [
        {
          playerName: '夏眠',
          performance: 12,
          logic: -1,
          operation: 8.5,
        },
      ],
    });

    expect(report.players[0].scores).toEqual({ performance: 10, logic: 0, operation: 8.5 });
    expect(report.summary).toBe('本局暂无总评。');
  });

  it('rejects missing player reviews', () => {
    expect(() => normalizeSettlementReport({ summary: 'empty' })).toThrow(
      'Settlement report must include players',
    );
  });

  it('rejects non-numeric scores', () => {
    expect(() =>
      normalizeSettlementReport({
        players: [
          {
            playerName: '顾衡',
            performance: 'high',
            logic: 7,
            operation: 6,
          },
        ],
      }),
    ).toThrow('Settlement scores must be numbers');
  });
});
