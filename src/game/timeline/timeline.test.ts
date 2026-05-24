import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { appendEvent, createCheckpoint, rollbackToCheckpoint } from './timeline';

const baseState: GameState = {
  playerCount: 6,
  viewMode: 'audience',
  phase: 'night',
  day: 1,
  players: [],
  checkpoints: [],
  rulesMarkdown: '# rules',
  events: [],
};

describe('timeline', () => {
  it('appends event immutably', () => {
    const next = appendEvent(baseState, {
      kind: 'speech',
      title: '第一天 · 林澈发言',
      content: '我先听大家发言。',
      colorToken: 'speech',
    });

    expect(baseState.events).toHaveLength(0);
    expect(next.events).toHaveLength(1);
    expect(next.events[0].title).toBe('第一天 · 林澈发言');
  });

  it('creates checkpoint and rollback restores prior state', () => {
    const withEvent = appendEvent(baseState, {
      kind: 'phase',
      title: '第一夜开始',
      content: '夜幕降临。',
      colorToken: 'neutral',
    });
    const withCheckpoint = createCheckpoint(withEvent, '第一夜开始');
    const afterSpeech = appendEvent(withCheckpoint, {
      kind: 'speech',
      title: '第一天 · 夏眠发言',
      content: '我怀疑林澈。',
      colorToken: 'speech',
    });

    const restored = rollbackToCheckpoint(afterSpeech, withCheckpoint.checkpoints[0].id);
    expect(restored.events).toHaveLength(1);
    expect(restored.phase).toBe('night');
    expect(restored.checkpoints).toHaveLength(1);
  });
});
