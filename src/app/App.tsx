import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameControls } from '../components/controls/GameControls';
import { RoomView } from '../components/room/RoomView';
import { SettlementView } from '../components/settlement/SettlementView';
import { StatusFeed } from '../components/status-feed/StatusFeed';
import { loadPersonas, loadRulesMarkdown } from '../content/loadMarkdownAssets';
import { advanceGame, roleSummary } from '../game/playable/playableGame';
import { createGame } from '../game/setup/createGame';
import type { SettlementReport } from '../game/settlement/settlement';
import { createCheckpoint, rollbackToCheckpoint } from '../game/timeline/timeline';
import type { GamePhase, GameSpeed, GameState, Role, ViewMode } from '../game/types';
import { createLlmClientFromEnv } from '../llm/createLlmClient';
import type { LlmClient } from '../llm/types';

const PHASE_TEXT: Record<GamePhase, string> = {
  lobby: '大厅',
  setup: '开局',
  night: '夜晚行动',
  'night-result': '夜晚结算',
  'day-discussion': '白天发言',
  vote: '投票放逐',
  'exile-result': '放逐结算',
  'hunter-shot': '猎人技能',
  settlement: '赛后复盘',
};

const AUTO_ADVANCE_DELAY: Record<GameSpeed, number> = {
  slow: 2400,
  normal: 1200,
  fast: 520,
};

const ROLE_TEXT: Record<Role, string> = {
  werewolf: '狼人',
  villager: '村民',
  seer: '预言家',
  witch: '女巫',
  hunter: '猎人',
  guard: '守卫',
};

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('button,input,textarea,select')) || target.isContentEditable;
}

function checkpointLabel(state: GameState) {
  return `第${state.day}天 · ${PHASE_TEXT[state.phase]} · ${state.events.at(-1)?.title ?? '推进前'}`;
}

function centerText(state: GameState) {
  switch (state.runtime.step) {
    case 'night-start':
      return '夜幕即将降临';
    case 'werewolf':
      return '狼人正在选择目标';
    case 'seer':
      return '预言家正在查验';
    case 'witch':
      return '女巫正在判断药剂';
    case 'guard':
      return '守卫正在保护';
    case 'night-result':
      return '夜晚结果结算中';
    case 'discussion':
      return state.runtime.speakerQueue.length > 0 ? '玩家依次发言中' : '准备进入投票';
    case 'vote':
      return '玩家正在投票';
    case 'hunter':
      return '猎人正在决定是否开枪';
    case 'settlement':
      return '游戏结束';
    default:
      return '等待推进';
  }
}

function audienceCenterText(state: GameState) {
  if (state.phase === 'night' || state.phase === 'night-result') {
    return '夜晚行动进行中';
  }
  if (state.phase === 'day-discussion') {
    return state.runtime.speakerQueue.length > 0 ? '玩家依次发言中' : '准备进入投票';
  }
  if (state.phase === 'vote') {
    return '玩家正在投票';
  }
  if (state.phase === 'hunter-shot') {
    return '技能结算中';
  }
  if (state.phase === 'settlement') {
    return '游戏结束';
  }
  return '等待推进';
}

function currentSpeakerId(state: GameState) {
  return state.runtime.step === 'discussion' ? state.runtime.speakerQueue[0] : undefined;
}

function fallbackMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function timelineVisibilityText(visibility: GameState['events'][number]['visibility']) {
  if (visibility === 'god') {
    return '上帝视角';
  }
  if (visibility === 'audience') {
    return '观众补充';
  }
  return '公开';
}

function buildTimelineExport(state: GameState, report: SettlementReport) {
  const players = state.players
    .map((player) => `- ${player.name}：${ROLE_TEXT[player.role]} / ${player.status === 'alive' ? '存活' : '死亡'}`)
    .join('\n');
  const events = state.events
    .map((event, index) => {
      const actor = state.players.find((player) => player.id === event.playerId)?.name;
      const target = state.players.find((player) => player.id === event.targetId)?.name;
      return [
        `### ${index + 1}. ${event.title}`,
        `- 类型：${event.kind}`,
        `- 阶段：${PHASE_TEXT[event.phase]}`,
        `- 天数：第 ${event.day} 天`,
        `- 可见性：${timelineVisibilityText(event.visibility)}`,
        actor ? `- 行动者：${actor}` : '',
        target ? `- 目标：${target}` : '',
        `- 内容：${event.content}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
  const scores = report.players
    .map(
      (player) =>
        `- ${player.playerName}：表演 ${player.scores.performance}/10，逻辑 ${player.scores.logic}/10，操作 ${player.scores.operation}/10。${player.comment}`,
    )
    .join('\n');

  return [
    '# AI 狼人杀完整时间线',
    '',
    `导出时间：${new Date().toLocaleString()}`,
    `本局人数：${state.playerCount}`,
    `胜利阵营：${state.runtime.winner ?? '未知'}`,
    '',
    '## 玩家身份',
    players,
    '',
    '## 赛后总结',
    report.summary,
    '',
    '## 玩家评分',
    scores,
    '',
    '## 完整事件',
    events,
    '',
  ].join('\n');
}

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('audience');
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>('normal');
  const [playerCount, setPlayerCount] = useState(9);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const llmRef = useRef<LlmClient | undefined>(undefined);

  const toggleView = useCallback(() => {
    setViewMode((current) => (current === 'audience' ? 'god' : 'audience'));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isEditableShortcutTarget(event.target)) {
        return;
      }

      event.preventDefault();
      toggleView();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleView]);

  const resetToLobby = useCallback(() => {
    setViewMode('audience');
    setGameState(null);
    setSettlementReport(null);
    setIsAutoPlaying(false);
    setNotice('');
  }, []);

  const startGame = useCallback(async () => {
    setIsLoading(true);
    setNotice('');
    setSettlementReport(null);
    setIsAutoPlaying(false);
    try {
      const [personas, rulesMarkdown] = await Promise.all([loadPersonas(), loadRulesMarkdown()]);
      try {
        llmRef.current = createLlmClientFromEnv();
      } catch (error) {
        llmRef.current = undefined;
        throw new Error(`模型未就绪：${fallbackMessage(error)}`);
      }

      const created = createGame({
        playerCount,
        personas,
        rulesMarkdown,
        seed: Date.now(),
      });
      setGameState(created);
    } catch (error) {
      setNotice(`开局失败：${fallbackMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [playerCount]);

  const advance = useCallback(async () => {
    if (!gameState || isAdvancing || settlementReport) {
      return;
    }

    setIsAdvancing(true);
    setNotice('');
    try {
      const checkpointed = createCheckpoint(gameState, checkpointLabel(gameState));
      let result = await advanceGame({ ...checkpointed, viewMode }, llmRef.current);
      if (result.state.runtime.step === 'settlement' && !result.settlementReport) {
        result = await advanceGame(result.state, llmRef.current);
      }
      setGameState({ ...result.state, viewMode });
      if (result.notice) {
        setNotice(result.notice);
      }
      if (result.settlementReport) {
        setSettlementReport(result.settlementReport);
        setIsAutoPlaying(false);
      }
    } catch (error) {
      setNotice(`推进失败：${fallbackMessage(error)}`);
      setIsAutoPlaying(false);
    } finally {
      setIsAdvancing(false);
    }
  }, [gameState, isAdvancing, settlementReport, viewMode]);

  useEffect(() => {
    if (!isAutoPlaying || isAdvancing || !gameState || settlementReport) {
      return;
    }

    const timer = window.setTimeout(() => {
      void advance();
    }, AUTO_ADVANCE_DELAY[gameSpeed]);

    return () => window.clearTimeout(timer);
  }, [advance, gameSpeed, gameState, isAdvancing, isAutoPlaying, settlementReport]);

  const rollbackStep = useCallback(() => {
    if (!gameState || gameState.checkpoints.length === 0) {
      return;
    }

    setIsAutoPlaying(false);
    const checkpoint = gameState.checkpoints.at(-1);
    if (checkpoint) {
      setGameState({ ...rollbackToCheckpoint(gameState, checkpoint.id), viewMode });
      setSettlementReport(null);
    }
  }, [gameState, viewMode]);

  const rollbackPhase = useCallback(() => {
    if (!gameState || gameState.checkpoints.length === 0) {
      return;
    }

    setIsAutoPlaying(false);
    const checkpoint =
      [...gameState.checkpoints].reverse().find((item) => item.phase !== gameState.phase) ?? gameState.checkpoints.at(-1);
    if (checkpoint) {
      setGameState({ ...rollbackToCheckpoint(gameState, checkpoint.id), viewMode });
      setSettlementReport(null);
    }
  }, [gameState, viewMode]);

  const rollbackCheckpoint = useCallback(
    (checkpointId: string) => {
      if (!gameState) {
        return;
      }

      setIsAutoPlaying(false);
      setGameState({ ...rollbackToCheckpoint(gameState, checkpointId), viewMode });
      setSettlementReport(null);
    },
    [gameState, viewMode],
  );

  const godSummary = useMemo(() => (gameState ? roleSummary(gameState) : []), [gameState]);

  if (settlementReport) {
    return <SettlementView report={settlementReport} timelineText={gameState ? buildTimelineExport(gameState, settlementReport) : ''} onReturnLobby={resetToLobby} />;
  }

  if (!gameState) {
    return (
      <main className="lobby-page">
        <section className="lobby-panel">
          <div className="lobby-copy">
            <span>LOCAL AI WEREWOLF</span>
            <h1>AI 狼人杀</h1>
            <p>选择人数后开始完整对局。系统会随机抽取人物设定、分配身份，并让 AI 玩家按规则进行夜晚行动、白天发言、投票和赛后复盘。</p>
          </div>

          <div className="lobby-controls">
            <label htmlFor="player-count">本局人数</label>
            <select id="player-count" value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))}>
              {[6, 7, 8, 9, 10, 11, 12].map((count) => (
                <option key={count} value={count}>
                  {count} 人局
                </option>
              ))}
            </select>
            <button type="button" onClick={startGame} disabled={isLoading}>
              {isLoading ? '开局中' : '开始本局'}
            </button>
            {notice ? <p className="notice">{notice}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-layout" data-view-mode={viewMode}>
      <section className="game-main">
        <header className="top-bar">
          <div className="game-title">
            <strong>AI 狼人杀</strong>
            <span>
              第 {gameState.day} 天 · {PHASE_TEXT[gameState.phase]} · {gameState.playerCount} 人局
            </span>
          </div>
          <GameControls
            viewMode={viewMode}
            gameSpeed={gameSpeed}
            isAutoPlaying={isAutoPlaying}
            canRollback={gameState.checkpoints.length > 0}
            isAdvancing={isAdvancing}
            checkpoints={gameState.checkpoints}
            onToggleView={toggleView}
            onAdvance={advance}
            onToggleAutoPlay={() => setIsAutoPlaying((current) => !current)}
            onSpeedChange={setGameSpeed}
            onRollbackStep={rollbackStep}
            onRollbackPhase={rollbackPhase}
            onRollbackCheckpoint={rollbackCheckpoint}
            onNewGame={resetToLobby}
          />
        </header>
        <RoomView
          players={gameState.players}
          speakingPlayerId={currentSpeakerId(gameState)}
          day={gameState.day}
          phaseText={PHASE_TEXT[gameState.phase]}
          centerText={viewMode === 'god' ? centerText(gameState) : audienceCenterText(gameState)}
          revealRoles={viewMode === 'god'}
        />
        {viewMode === 'god' ? (
          <aside className="god-panel">
            <h2>身份总览</h2>
            {godSummary.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </aside>
        ) : null}
        {notice ? <div className="floating-notice">{notice}</div> : null}
      </section>
      <StatusFeed events={gameState.events} viewMode={viewMode} />
    </main>
  );
}
