import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Player } from '../types';
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

const player: Player = {
  id: 'player-1',
  name: 'Lin',
  personaId: 'persona-1',
  role: 'villager',
  camp: 'good',
  status: 'alive',
  privateMemory: ['original memory'],
};

const event: GameEvent = {
  id: 'event-1',
  kind: 'phase',
  phase: 'night',
  day: 1,
  title: 'Night starts',
  content: 'The game begins.',
  colorToken: 'neutral',
  createdAt: 1,
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

  it('throws readable error when checkpoint is missing', () => {
    expect(() => rollbackToCheckpoint(baseState, 'missing-checkpoint')).toThrow(
      'Checkpoint not found: missing-checkpoint',
    );
  });

  it('keeps checkpoint snapshot isolated from later player and event mutation', () => {
    const sourceState: GameState = {
      ...baseState,
      players: [structuredClone(player)],
      events: [structuredClone(event)],
    };
    const checkpointed = createCheckpoint(sourceState, 'baseline');

    checkpointed.players[0].name = 'Mutated';
    checkpointed.players[0].privateMemory.push('leaked memory');
    checkpointed.events[0].title = 'Mutated event';

    const snapshot = checkpointed.checkpoints[0].state;
    expect(snapshot.players[0].name).toBe('Lin');
    expect(snapshot.players[0].privateMemory).toEqual(['original memory']);
    expect(snapshot.events[0].title).toBe('Night starts');
  });

  it('removes checkpoints after target when checkpoints share eventIndex', () => {
    const firstCheckpoint = createCheckpoint(baseState, 'first');
    const secondCheckpoint = createCheckpoint(firstCheckpoint, 'second');

    const restored = rollbackToCheckpoint(
      secondCheckpoint,
      firstCheckpoint.checkpoints[0].id,
    );

    expect(restored.checkpoints).toHaveLength(1);
    expect(restored.checkpoints[0].id).toBe(firstCheckpoint.checkpoints[0].id);
  });

  it('clones retained checkpoint snapshots during rollback', () => {
    const checkpointed = createCheckpoint(
      {
        ...baseState,
        players: [structuredClone(player)],
        events: [structuredClone(event)],
      },
      'baseline',
    );

    const restored = rollbackToCheckpoint(checkpointed, checkpointed.checkpoints[0].id);

    expect(restored.checkpoints[0]).not.toBe(checkpointed.checkpoints[0]);
    expect(restored.checkpoints[0].state).not.toBe(checkpointed.checkpoints[0].state);
    expect(restored.checkpoints[0].state.players).not.toBe(
      checkpointed.checkpoints[0].state.players,
    );
    expect(restored.checkpoints[0].state.events).not.toBe(
      checkpointed.checkpoints[0].state.events,
    );
    expect(restored.checkpoints[0].state).toEqual(checkpointed.checkpoints[0].state);
  });
});
