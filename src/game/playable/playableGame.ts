import type { LlmClient, LlmGenerateRequest } from '../../llm/types';
import { buildJudgePrompt } from '../../llm/prompts/buildJudgePrompt';
import { buildPlayerSpeechPrompt } from '../../llm/prompts/buildPlayerPrompt';
import { normalizeSettlementReport, type SettlementReport } from '../settlement/settlement';
import { appendEvent, createCheckpoint } from '../timeline/timeline';
import type { GameEvent, GamePhase, GameRuntime, GameState, NightRuntime, Player, Role, WinnerCamp } from '../types';

export interface AdvanceResult {
  state: GameState;
  settlementReport?: SettlementReport;
  notice?: string;
}

const DAY_NAMES = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function dayLabel(day: number) {
  return `第${DAY_NAMES[day] ?? day}天`;
}

function nightLabel(day: number) {
  return `第${DAY_NAMES[day] ?? day}夜`;
}

function livingPlayers(state: GameState) {
  return state.players.filter((player) => player.status === 'alive');
}

function livingByRole(state: GameState, role: Role) {
  return livingPlayers(state).filter((player) => player.role === role);
}

function playerName(state: GameState, playerId?: string) {
  return state.players.find((player) => player.id === playerId)?.name ?? '未知玩家';
}

function isAlive(state: GameState, playerId: string) {
  return state.players.some((player) => player.id === playerId && player.status === 'alive');
}

function randomDecisionNonce(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeTargetId(value: unknown, candidates: Player[]): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return candidates.find((player) => player.id === trimmed || player.name === trimmed)?.id;
}

function withPlayerMemory(state: GameState, playerId: string, memory: string): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, privateMemory: [...player.privateMemory, memory] } : player,
    ),
  };
}

type RuntimePatch = Partial<Omit<GameRuntime, 'night'>> & { night?: Partial<NightRuntime> };

function withRuntime(state: GameState, runtime: RuntimePatch): GameState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      ...runtime,
      night: runtime.night ? { ...state.runtime.night, ...runtime.night } : state.runtime.night,
    },
  };
}

function addEvent(
  state: GameState,
  input: {
    phase?: GamePhase;
    kind: GameEvent['kind'];
    title: string;
    content: string;
    colorToken: GameEvent['colorToken'];
    playerId?: string;
    targetId?: string;
    visibility?: GameEvent['visibility'];
  },
) {
  return appendEvent(input.phase ? { ...state, phase: input.phase } : state, input);
}

function visibleTimeline(state: GameState, actor?: Player) {
  return state.events
    .filter((event) => {
      if (event.visibility !== 'god' && event.visibility !== 'audience') {
        return true;
      }
      if (!actor) {
        return false;
      }
      if (event.playerId === actor.id) {
        return true;
      }
      return actor.role === 'werewolf' && event.title.includes('狼人袭击');
    })
    .slice(-18)
    .map((event) => `${event.title}：${event.content}`)
    .join('\n');
}

function publicAliveSummary(state: GameState) {
  return livingPlayers(state)
    .map((player) => player.name)
    .join('、');
}

function targetSummary(candidates: Player[]) {
  return candidates.map((player) => `${player.id}=${player.name}(${player.status})`).join('、');
}

function roleStrategyGuide(state: GameState, actor: Player, actionName: string, candidates: Player[]) {
  const visible = visibleTimeline(state, actor) || '暂无';
  const common = [
    '像真人玩家一样决策：不要机械按座位、列表顺序或固定偏好选人。',
    '先判断当前信息量、风险和收益，再给出一个短理由。',
    '如果没有强信息，可以选择一个符合你角色目标的试探性目标，但要让理由自然。',
    `存活玩家：${publicAliveSummary(state) || '暂无'}`,
    `可选目标：${targetSummary(candidates) || '暂无'}`,
    `你当前可见事件：\n${visible}`,
  ];

  if (actor.role === 'werewolf') {
    return [
      ...common,
      '狼人策略：优先考虑谁最像神职、谁最可能带队、谁死亡后最能制造混乱。',
      '不要暴露狼人视角，不要总是刀发言最强或最弱的人；要考虑嫁祸和隐藏狼队意图。',
    ].join('\n');
  }

  if (actor.role === 'seer') {
    return [
      ...common,
      '预言家策略：优先查验发言矛盾、站边摇摆、可能带节奏、或能决定白天票型的人。',
      '不要重复查验已有高可信信息的人；如果首夜信息少，可以查验影响力较大的玩家。',
    ].join('\n');
  }

  if (actor.role === 'witch' && actionName.includes('解药')) {
    return [
      ...common,
      '女巫解药策略：首夜可以偏向救人，但如果局势允许，也可以保留解药。',
      '判断被刀目标的价值、是否像神职、是否可能被狼人故意刀来骗药。',
    ].join('\n');
  }

  if (actor.role === 'witch' && actionName.includes('毒药')) {
    return [
      ...common,
      '女巫毒药策略：毒药是高风险资源，不要随意毒；只有在怀疑强、局势紧或能打开局面时使用。',
      '如果信息不足，可以选择不用毒药，等待白天发言积累更多信息。',
    ].join('\n');
  }

  if (actor.role === 'guard') {
    return [
      ...common,
      '守卫策略：保护可能被狼人袭击的关键玩家，避免只守自己觉得安全的人。',
      '结合上一夜守护限制，考虑预言家嫌疑位、强发言位、或被狼人可能针对的玩家。',
    ].join('\n');
  }

  if (actor.role === 'hunter') {
    return [
      ...common,
      '猎人策略：开枪要考虑收益和误伤风险。只有当你有明确怀疑或必须改变局面时才开枪。',
    ].join('\n');
  }

  return common.join('\n');
}

function decisionTemperature(actor: Player) {
  if (actor.role === 'werewolf') {
    return 0.65;
  }
  if (actor.role === 'seer' || actor.role === 'guard') {
    return 0.58;
  }
  if (actor.role === 'witch') {
    return 0.52;
  }
  return 0.6;
}

async function askJson(llm: LlmClient, request: LlmGenerateRequest): Promise<Record<string, unknown>> {
  return llm.generate(request);
}

async function askTarget(
  state: GameState,
  llm: LlmClient | undefined,
  actor: Player,
  actionName: string,
  candidates: Player[],
  extra: string,
) {
  if (!llm || candidates.length === 0) {
    if (candidates.length === 0) {
      return { targetId: undefined };
    }
    throw new Error(`${actionName}需要可用的 LLM，但当前模型不可用。`);
  }

  try {
    const decisionNonce = randomDecisionNonce();
    const response = await askJson(llm, {
      system: [
        '你正在进行一局狼人杀。',
        '你必须严格遵守当前身份、规则和可见信息。',
        '只输出 JSON 对象，不要 Markdown，不要解释。',
      ].join('\n'),
      user: [
        `规则总纲：\n${state.rulesMarkdown}`,
        `你的名字：${actor.name}`,
        `你的身份：${actor.role}`,
        `你的私有记忆：${actor.privateMemory.join('\n') || '暂无'}`,
        `动作：${actionName}`,
        extra,
        `本次行动扰动值：${decisionNonce}`,
        `策略要求：\n${roleStrategyGuide(state, actor, actionName, candidates)}`,
        '输出格式：{"targetId":"目标 id","reason":"一句简短理由"}',
      ].join('\n\n'),
      temperature: decisionTemperature(actor),
    });
    const normalizedTargetId = normalizeTargetId(response.targetId, candidates);
    if (!normalizedTargetId) {
      throw new Error(`模型没有返回合法目标：${String(response.targetId ?? '空')}`);
    }
    return {
      targetId: normalizedTargetId,
      reason: typeof response.reason === 'string' ? response.reason : undefined,
    };
  } catch (error) {
    throw new Error(`${actionName}失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

async function askBoolean(
  state: GameState,
  llm: LlmClient | undefined,
  actor: Player,
  actionName: string,
  extra: string,
  _defaultValue: boolean,
) {
  if (!llm) {
    throw new Error(`${actionName}需要可用的 LLM，但当前模型不可用。`);
  }

  try {
    const decisionNonce = randomDecisionNonce();
    const response = await askJson(llm, {
      system: '你正在进行一局狼人杀。只输出 JSON 对象。',
      user: [
        `规则总纲：\n${state.rulesMarkdown}`,
        `你的名字：${actor.name}`,
        `你的身份：${actor.role}`,
        `你的私有记忆：${actor.privateMemory.join('\n') || '暂无'}`,
        `动作：${actionName}`,
        extra,
        `本次行动扰动值：${decisionNonce}`,
        `策略要求：\n${roleStrategyGuide(state, actor, actionName, livingPlayers(state))}`,
        '输出格式：{"use":true,"reason":"一句简短理由"}',
      ].join('\n\n'),
      temperature: decisionTemperature(actor),
    });
    if (typeof response.use !== 'boolean') {
      throw new Error(`模型没有返回合法 use 布尔值：${String(response.use ?? '空')}`);
    }
    return {
      yes: response.use,
      reason: typeof response.reason === 'string' ? response.reason : undefined,
    };
  } catch (error) {
    throw new Error(`${actionName}失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkWinner(state: GameState): { winner?: WinnerCamp; reason?: string } {
  const alive = livingPlayers(state);
  const wolves = alive.filter((player) => player.role === 'werewolf').length;
  const good = alive.length - wolves;

  if (wolves === 0) {
    return { winner: 'good', reason: '所有狼人均已出局，好人阵营获胜。' };
  }
  if (wolves >= good) {
    return { winner: 'werewolf', reason: '狼人数量已不少于好人数量，狼人阵营获胜。' };
  }
  return {};
}

function markDead(state: GameState, playerIds: string[]): GameState {
  const dead = new Set(playerIds);
  return {
    ...state,
    players: state.players.map((player) => (dead.has(player.id) ? { ...player, status: 'dead' as const } : player)),
  };
}

function startNight(state: GameState): GameState {
  const base = createCheckpoint(
    {
      ...state,
      phase: 'night',
      runtime: {
        ...state.runtime,
        step: 'werewolf',
        votedThisDay: false,
        speakerQueue: [],
        pendingHunterId: undefined,
        night: { witchSaved: false },
      },
    },
    `${nightLabel(state.day)}开始`,
  );

  return addEvent(base, {
    kind: 'phase',
    title: `${nightLabel(state.day)} · 夜幕降临`,
    content: '所有玩家闭眼，夜间行动依次开始。',
    colorToken: 'neutral',
  });
}

async function runWerewolf(state: GameState, llm?: LlmClient): Promise<GameState> {
  const wolves = livingByRole(state, 'werewolf');
  const candidates = livingPlayers(state).filter((player) => player.role !== 'werewolf');
  const actor = wolves[0];

  if (!actor || candidates.length === 0) {
    return withRuntime(state, { step: 'seer' });
  }

  const decision = await askTarget(state, llm, actor, '狼人夜间袭击', candidates, '你代表狼人阵营选择今晚袭击目标。');
  const targetId = decision.targetId;
  let next = withRuntime(state, { step: 'seer', night: { victimId: targetId } });

  if (targetId) {
    next = addEvent(next, {
      kind: 'kill',
      title: `${nightLabel(state.day)} · 狼人袭击`,
      content: `狼人选择杀死${playerName(state, targetId)}。`,
      colorToken: 'kill',
      visibility: 'god',
      playerId: actor.id,
      targetId,
    });
    next = addEvent(next, {
      kind: 'kill',
      title: `${nightLabel(state.day)} · 狼人`,
      content: `狼人选择杀死${playerName(state, targetId)}。`,
      colorToken: 'kill',
      visibility: 'audience',
      targetId,
    });
  }

  return next;
}

async function runSeer(state: GameState, llm?: LlmClient): Promise<GameState> {
  const seer = livingByRole(state, 'seer')[0];
  if (!seer) {
    return withRuntime(state, { step: 'witch' });
  }

  const candidates = livingPlayers(state).filter((player) => player.id !== seer.id);
  const decision = await askTarget(state, llm, seer, '预言家查验', candidates, '选择一名玩家查验阵营。');
  const targetId = decision.targetId;
  let next = withRuntime(state, { step: 'witch', night: { seerId: seer.id, seerTargetId: targetId } });

  if (targetId) {
    const target = state.players.find((player) => player.id === targetId);
    const result = target?.camp === 'werewolf' ? '狼人阵营' : '好人阵营';
    next = withPlayerMemory(next, seer.id, `${nightLabel(state.day)}查验${playerName(state, targetId)}：${result}`);
    next = addEvent(next, {
      kind: 'inspect',
      title: `${nightLabel(state.day)} · 预言家查验`,
      content: `${seer.name}查验了${playerName(state, targetId)}，结果为${result}。`,
      colorToken: 'inspect',
      visibility: 'god',
      playerId: seer.id,
      targetId,
    });
    next = addEvent(next, {
      kind: 'inspect',
      title: `${nightLabel(state.day)} · 预言家`,
      content: `预言家查验了${playerName(state, targetId)}。`,
      colorToken: 'inspect',
      visibility: 'audience',
      targetId,
    });
  }

  return next;
}

async function runWitch(state: GameState, llm?: LlmClient): Promise<GameState> {
  const witch = livingByRole(state, 'witch')[0];
  let next = withRuntime(state, { step: 'guard' });
  if (!witch) {
    return next;
  }

  const victimId = state.runtime.night.victimId;
  if (victimId && state.runtime.witchSaveAvailable) {
    const save = await askBoolean(
      state,
      llm,
      witch,
      '女巫是否使用解药',
      `今晚狼人袭击目标是${playerName(state, victimId)}。决定是否使用唯一一次解药。`,
      true,
    );
    if (save.yes) {
      next = withRuntime(next, { witchSaveAvailable: false, night: { witchSaved: true } });
      next = addEvent(next, {
        kind: 'revive',
        title: `${nightLabel(state.day)} · 女巫救人`,
        content: `女巫使用解药，${playerName(state, victimId)}起死回生。`,
        colorToken: 'revive',
        visibility: 'god',
        playerId: witch.id,
        targetId: victimId,
      });
      next = addEvent(next, {
        kind: 'revive',
        title: `${nightLabel(state.day)} · 女巫`,
        content: `女巫使用解药，${playerName(state, victimId)}起死回生。`,
        colorToken: 'revive',
        visibility: 'audience',
        targetId: victimId,
      });
    }
  }

  if (next.runtime.witchPoisonAvailable) {
    const candidates = livingPlayers(next).filter((player) => player.id !== witch.id && player.id !== victimId);
    const poisonIntent = await askBoolean(
      next,
      llm,
      witch,
      '女巫是否使用毒药',
      '决定今晚是否使用唯一一次毒药。若使用，还需要选择目标。',
      false,
    );
    if (poisonIntent.yes && candidates.length > 0) {
      const poison = await askTarget(next, llm, witch, '女巫毒药目标', candidates, '选择今晚毒药目标。');
      if (poison.targetId) {
        next = withRuntime(next, { witchPoisonAvailable: false, night: { poisonTargetId: poison.targetId } });
        next = addEvent(next, {
          kind: 'kill',
          title: `${nightLabel(state.day)} · 女巫毒药`,
          content: `女巫使用毒药，${playerName(state, poison.targetId)}中毒死亡。`,
          colorToken: 'kill',
          visibility: 'god',
          playerId: witch.id,
          targetId: poison.targetId,
        });
        next = addEvent(next, {
          kind: 'kill',
          title: `${nightLabel(state.day)} · 女巫`,
          content: `女巫使用毒药，${playerName(state, poison.targetId)}中毒死亡。`,
          colorToken: 'kill',
          visibility: 'audience',
          targetId: poison.targetId,
        });
      }
    }
  }

  return next;
}

async function runGuard(state: GameState, llm?: LlmClient): Promise<GameState> {
  const guard = livingByRole(state, 'guard')[0];
  if (!guard) {
    return withRuntime(state, { step: 'night-result' });
  }

  const candidates = livingPlayers(state).filter((player) => player.id !== state.runtime.lastGuardTargetId);
  const decision = await askTarget(state, llm, guard, '守卫保护', candidates, '选择今晚保护目标，不能连续两晚保护同一人。');
  let next = withRuntime(state, {
    step: 'night-result',
    lastGuardTargetId: decision.targetId,
    night: { guardTargetId: decision.targetId },
  });

  if (decision.targetId) {
    next = addEvent(next, {
      kind: 'protect',
      title: `${nightLabel(state.day)} · 守卫保护`,
      content: `守卫保护了${playerName(state, decision.targetId)}。`,
      colorToken: 'protect',
      visibility: 'god',
      playerId: guard.id,
      targetId: decision.targetId,
    });
    next = addEvent(next, {
      kind: 'protect',
      title: `${nightLabel(state.day)} · 守卫`,
      content: `守卫保护了${playerName(state, decision.targetId)}。`,
      colorToken: 'protect',
      visibility: 'audience',
      targetId: decision.targetId,
    });
  }

  return next;
}

function settleNight(state: GameState): GameState {
  const deadIds = new Set<string>();
  const victimId = state.runtime.night.victimId;
  if (victimId && !state.runtime.night.witchSaved && state.runtime.night.guardTargetId !== victimId) {
    deadIds.add(victimId);
  }
  if (state.runtime.night.poisonTargetId) {
    deadIds.add(state.runtime.night.poisonTargetId);
  }

  let next = markDead(state, [...deadIds]);
  if (deadIds.size === 0) {
    next = addEvent(next, {
      phase: 'night-result',
      kind: 'phase',
      title: `${dayLabel(state.day)} · 平安夜`,
      content: '昨夜无人死亡。',
      colorToken: 'neutral',
    });
  } else {
    next = addEvent(next, {
      phase: 'night-result',
      kind: 'kill',
      title: `${dayLabel(state.day)} · 昨夜死讯`,
      content: `${[...deadIds].map((id) => playerName(state, id)).join('、')}死亡。`,
      colorToken: 'kill',
    });
  }

  const hunter = [...deadIds].map((id) => state.players.find((player) => player.id === id)).find((player) => player?.role === 'hunter');
  const winner = checkWinner(next);
  if (hunter && !state.runtime.hunterShotPlayerIds.includes(hunter.id)) {
    return withRuntime({ ...next, phase: 'hunter-shot' }, { step: 'hunter', pendingHunterId: hunter.id });
  }
  if (winner.winner) {
    return withRuntime({ ...next, phase: 'settlement' }, { step: 'settlement', winner: winner.winner, winnerReason: winner.reason });
  }

  return withRuntime(
    {
      ...next,
      phase: 'day-discussion',
    },
    {
      step: 'discussion',
      speakerQueue: livingPlayers(next).map((player) => player.id),
      night: { witchSaved: false, victimId: undefined, poisonTargetId: undefined, guardTargetId: undefined },
    },
  );
}

async function runHunter(state: GameState, llm?: LlmClient): Promise<GameState> {
  const hunterId = state.runtime.pendingHunterId;
  const hunter = state.players.find((player) => player.id === hunterId);
  if (!hunter) {
    return withRuntime(state, { step: 'discussion', pendingHunterId: undefined });
  }

  const candidates = livingPlayers(state).filter((player) => player.id !== hunter.id);
  const shootIntent = await askBoolean(state, llm, hunter, '猎人是否开枪', '你死亡后可以选择是否开枪带走一名玩家。', candidates.length > 0);
  let next = withRuntime(state, {
    hunterShotPlayerIds: [...state.runtime.hunterShotPlayerIds, hunter.id],
    pendingHunterId: undefined,
  });
  if (shootIntent.yes && candidates.length > 0) {
    const shot = await askTarget(next, llm, hunter, '猎人开枪目标', candidates, '选择你死亡后开枪带走的目标。');
    if (shot.targetId) {
      next = markDead(next, [shot.targetId]);
      next = addEvent(next, {
        kind: 'kill',
        title: `${dayLabel(state.day)} · 猎人开枪`,
        content: `${hunter.name}发动技能，带走了${playerName(state, shot.targetId)}。`,
        colorToken: 'kill',
        playerId: hunter.id,
        targetId: shot.targetId,
      });
    }
  } else {
    next = addEvent(next, {
      kind: 'phase',
      title: `${dayLabel(state.day)} · 猎人未开枪`,
      content: `${hunter.name}没有发动技能。`,
      colorToken: 'neutral',
      playerId: hunter.id,
    });
  }

  const winner = checkWinner(next);
  if (winner.winner) {
    return withRuntime({ ...next, phase: 'settlement' }, { step: 'settlement', winner: winner.winner, winnerReason: winner.reason });
  }

  return withRuntime({ ...next, phase: 'day-discussion' }, { step: 'discussion', speakerQueue: livingPlayers(next).map((player) => player.id) });
}

async function runSpeech(state: GameState, llm?: LlmClient): Promise<GameState> {
  const [playerId, ...rest] = state.runtime.speakerQueue;
  if (!playerId) {
    return withRuntime({ ...state, phase: 'vote' }, { step: 'vote', speakerQueue: [] });
  }

  const player = state.players.find((item) => item.id === playerId);
  if (!player || player.status !== 'alive') {
    return withRuntime(state, { speakerQueue: rest });
  }

  if (!llm) {
    throw new Error(`${player.name}发言需要可用的 LLM，但当前模型不可用。`);
  }

  const response = await llm.generate(buildPlayerSpeechPrompt(state, player));
  const speech = typeof response.speech === 'string' ? response.speech.trim() : '';
  if (!speech) {
    throw new Error(`${player.name}发言失败：模型没有返回合法 speech。`);
  }

  const next = addEvent(withRuntime(state, { speakerQueue: rest }), {
    phase: 'day-discussion',
    kind: 'speech',
    title: `${dayLabel(state.day)} · ${player.name}发言`,
    content: speech,
    colorToken: 'speech',
    playerId,
  });

  return rest.length === 0 ? withRuntime({ ...next, phase: 'vote' }, { step: 'vote' }) : next;
}

async function runVote(state: GameState, llm?: LlmClient): Promise<GameState> {
  const alive = livingPlayers(state);
  const votes = new Map<string, number>();
  let next = createCheckpoint({ ...state, phase: 'vote' }, `${dayLabel(state.day)}投票前`);

  for (const voter of alive) {
    const candidates = alive.filter((player) => player.id !== voter.id);
    const decision = await askTarget(next, llm, voter, '白天投票', candidates, '选择你要投票放逐的玩家。');
    if (!decision.targetId) {
      continue;
    }
    votes.set(decision.targetId, (votes.get(decision.targetId) ?? 0) + 1);
    next = addEvent(next, {
      kind: 'vote',
      title: `${dayLabel(state.day)} · ${voter.name}投票`,
      content: `${voter.name}投给${playerName(state, decision.targetId)}。${decision.reason ? `理由：${decision.reason}` : ''}`,
      colorToken: 'neutral',
      playerId: voter.id,
      targetId: decision.targetId,
    });
  }

  let exiledId: string | undefined;
  let highVotes = -1;
  for (const [targetId, count] of votes) {
    if (count > highVotes) {
      exiledId = targetId;
      highVotes = count;
    }
  }

  if (!exiledId) {
    return withRuntime({ ...next, phase: 'night', day: state.day + 1 }, { step: 'night-start', votedThisDay: true });
  }

  next = markDead(next, [exiledId]);
  next = addEvent(next, {
    phase: 'exile-result',
    kind: 'exile',
    title: `${dayLabel(state.day)} · 放逐结果`,
    content: `${playerName(state, exiledId)}被投票放逐。`,
    colorToken: 'kill',
    targetId: exiledId,
  });

  const exiled = state.players.find((player) => player.id === exiledId);
  if (exiled?.role === 'hunter' && !state.runtime.hunterShotPlayerIds.includes(exiled.id)) {
    return withRuntime({ ...next, phase: 'hunter-shot' }, { step: 'hunter', pendingHunterId: exiled.id, votedThisDay: true });
  }

  const winner = checkWinner(next);
  if (winner.winner) {
    return withRuntime({ ...next, phase: 'settlement' }, { step: 'settlement', winner: winner.winner, winnerReason: winner.reason });
  }

  return withRuntime({ ...next, phase: 'night', day: state.day + 1 }, { step: 'night-start', votedThisDay: true });
}

function roleName(role: Role) {
  return {
    werewolf: '狼人',
    villager: '村民',
    seer: '预言家',
    witch: '女巫',
    hunter: '猎人',
    guard: '守卫',
  }[role];
}

async function runSettlement(state: GameState, llm?: LlmClient): Promise<AdvanceResult> {
  let finalState = state;
  if (!state.events.some((event) => event.phase === 'settlement')) {
    finalState = addEvent(state, {
      phase: 'settlement',
      kind: 'phase',
      title: '游戏结束',
      content: state.runtime.winnerReason ?? '本局游戏结束。',
      colorToken: 'neutral',
    });
  }

  if (!llm) {
    throw new Error('赛后评分需要可用的 LLM，但当前模型不可用。');
  }

  const report = normalizeSettlementReport(await llm.generate(buildJudgePrompt(finalState)));
  return { state: finalState, settlementReport: report };
}

export async function advanceGame(state: GameState, llm?: LlmClient): Promise<AdvanceResult> {
  switch (state.runtime.step) {
    case 'night-start':
      return { state: startNight(state) };
    case 'werewolf':
      return { state: await runWerewolf(state, llm) };
    case 'seer':
      return { state: await runSeer(state, llm) };
    case 'witch':
      return { state: await runWitch(state, llm) };
    case 'guard':
      return { state: await runGuard(state, llm) };
    case 'night-result':
      return { state: settleNight(state) };
    case 'hunter':
      return { state: await runHunter(state, llm) };
    case 'discussion':
      return { state: await runSpeech(state, llm) };
    case 'vote':
      return { state: await runVote(state, llm) };
    case 'settlement':
      return runSettlement(state, llm);
    case 'exile':
    default:
      return { state };
  }
}

export function roleSummary(state: GameState) {
  return state.players.map((player) => `${player.name}：${roleName(player.role)} / ${player.status === 'alive' ? '存活' : '死亡'}`);
}
