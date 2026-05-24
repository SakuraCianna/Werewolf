import type { EventKind, GameCheckpoint, GameEvent, GameState } from '../types';

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
    runtime: structuredClone(state.runtime),
  };
}

function cloneCheckpoint(checkpoint: GameCheckpoint): GameCheckpoint {
  return {
    ...checkpoint,
    state: structuredClone(checkpoint.state),
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
  const checkpointIndex = state.checkpoints.findIndex((item) => item.id === checkpointId);
  if (checkpointIndex === -1) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  const checkpoint = state.checkpoints[checkpointIndex];

  // GameStateSnapshot is the rollbackable gameplay state. Session/config state
  // such as playerCount, viewMode, and rulesMarkdown intentionally stays current.
  return {
    ...state,
    phase: checkpoint.state.phase,
    day: checkpoint.state.day,
    players: structuredClone(checkpoint.state.players),
    events: structuredClone(checkpoint.state.events),
    runtime: structuredClone(checkpoint.state.runtime),
    checkpoints: state.checkpoints.slice(0, checkpointIndex + 1).map(cloneCheckpoint),
  };
}
