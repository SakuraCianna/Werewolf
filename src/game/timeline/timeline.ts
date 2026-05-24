import type { EventKind, GameEvent, GameState } from '../types';

interface AppendEventInput {
  kind: EventKind;
  title: string;
  content: string;
  colorToken: GameEvent['colorToken'];
  playerId?: string;
  targetId?: string;
}

function cloneStateForCheckpoint(state: GameState) {
  return {
    phase: state.phase,
    day: state.day,
    players: structuredClone(state.players),
    events: structuredClone(state.events),
  };
}

export function appendEvent(state: GameState, input: AppendEventInput): GameState {
  const event: GameEvent = {
    id: crypto.randomUUID(),
    phase: state.phase,
    day: state.day,
    createdAt: Date.now(),
    ...input,
  };

  return {
    ...state,
    events: [...state.events, event],
  };
}

export function createCheckpoint(state: GameState, label: string): GameState {
  return {
    ...state,
    checkpoints: [
      ...state.checkpoints,
      {
        id: crypto.randomUUID(),
        label,
        phase: state.phase,
        day: state.day,
        eventIndex: state.events.length,
        state: cloneStateForCheckpoint(state),
      },
    ],
  };
}

export function rollbackToCheckpoint(state: GameState, checkpointId: string): GameState {
  const checkpoint = state.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  return {
    ...state,
    phase: checkpoint.state.phase,
    day: checkpoint.state.day,
    players: structuredClone(checkpoint.state.players),
    events: structuredClone(checkpoint.state.events),
    checkpoints: state.checkpoints.filter((item) => item.eventIndex <= checkpoint.eventIndex),
  };
}
