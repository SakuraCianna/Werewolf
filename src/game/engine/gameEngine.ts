import type { LlmClient } from '../../llm/types';
import { buildPlayerSpeechPrompt } from '../../llm/prompts/buildPlayerPrompt';
import { appendEvent } from '../timeline/timeline';
import type { GameState } from '../types';

function dayLabel(day: number): string {
  return `第${day === 1 ? '一' : day === 2 ? '二' : day}天`;
}

export async function runOneSpeech(
  state: GameState,
  playerId: string,
  llm: LlmClient,
): Promise<GameState> {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }
  if (player.status !== 'alive') {
    throw new Error(`Player cannot speak while dead: ${playerId}`);
  }

  const response = await llm.generate(buildPlayerSpeechPrompt(state, player));
  const speech = response.speech;
  if (typeof speech !== 'string' || speech.trim().length === 0) {
    throw new Error('LLM speech response must include a non-empty speech string');
  }

  return appendEvent(
    { ...state, phase: 'day-discussion' },
    {
      kind: 'speech',
      title: `${dayLabel(state.day)} · ${player.name}发言`,
      content: speech.trim(),
      colorToken: 'speech',
      playerId: player.id,
    },
  );
}
