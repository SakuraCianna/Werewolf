import type { GameState, Player } from '../../game/types';

export function buildPlayerSpeechPrompt(state: GameState, player: Player) {
  return {
    system: [
      '你正在扮演一名狼人杀 AI 玩家。',
      '你必须遵守规则总纲和你的角色信息。',
      '你必须用第一人称发言。',
      '你不能泄露自己按当前视角不该知道的信息。',
      '你必须只输出 JSON 对象，格式为 {"speech":"你的第一人称发言"}。',
    ].join('\n'),
    user: [
      `规则总纲：\n${state.rulesMarkdown}`,
      `你的名字：${player.name}`,
      `你的身份：${player.role}`,
      `你的私有记忆：${player.privateMemory.join('\n') || '暂无'}`,
      `当前阶段：第 ${state.day} 天发言阶段`,
      `公开事件：${state.events.map((event) => `${event.title}：${event.content}`).join('\n')}`,
    ].join('\n\n'),
    temperature: 0.7,
  };
}
