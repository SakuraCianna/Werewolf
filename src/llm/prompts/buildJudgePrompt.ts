import type { GameState } from '../../game/types';

export function buildJudgePrompt(state: GameState) {
  return {
    system: [
      '你是 AI 狼人杀赛后评审。',
      '你需要按表演评分、逻辑评分、游戏操作评分评价每位玩家。',
      '你必须只输出 JSON 对象。',
    ].join('\n'),
    user: [
      `完整事件：${state.events.map((event) => `${event.title}：${event.content}`).join('\n')}`,
      `玩家：${state.players.map((player) => `${player.name} ${player.role} ${player.status}`).join('\n')}`,
      '输出格式：{"players":[{"playerName":"林澈","performance":8,"logic":7,"operation":8,"comment":"评价","tags":["标签"]}],"summary":"总评"}',
    ].join('\n\n'),
    temperature: 0.4,
  };
}
