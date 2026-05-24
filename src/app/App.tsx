import { useCallback, useEffect, useState } from 'react';
import { GameControls } from '../components/controls/GameControls';
import { RoomView } from '../components/room/RoomView';
import { SettlementView } from '../components/settlement/SettlementView';
import { StatusFeed } from '../components/status-feed/StatusFeed';
import type { SettlementReport } from '../game/settlement/settlement';
import type { GameEvent, GameState, Player, ViewMode } from '../game/types';

const previewPlayers: Player[] = [
  { id: 'lin-che', name: '林澈', personaId: 'lin-che', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'xia-mian', name: '夏眠', personaId: 'xia-mian', role: 'werewolf', camp: 'werewolf', status: 'alive', privateMemory: [] },
  { id: 'gu-heng', name: '顾衡', personaId: 'gu-heng', role: 'seer', camp: 'good', status: 'dead', privateMemory: [] },
  { id: 'ye-lan', name: '叶岚', personaId: 'ye-lan', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'qi-ye', name: '祁野', personaId: 'qi-ye', role: 'werewolf', camp: 'werewolf', status: 'alive', privateMemory: [] },
  { id: 'wen-xu', name: '温序', personaId: 'wen-xu', role: 'witch', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'shen-heng', name: '沈珩', personaId: 'shen-heng', role: 'hunter', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'xu-zhao', name: '许照', personaId: 'xu-zhao', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
  { id: 'wen-xi', name: '闻溪', personaId: 'wen-xi', role: 'villager', camp: 'good', status: 'alive', privateMemory: [] },
];

const previewEvents: GameEvent[] = [
  {
    id: 'e1',
    kind: 'speech',
    phase: 'day-discussion',
    day: 2,
    title: '第二天 · 叶岚发言',
    content: '我不认同夏眠刚才的逻辑。他一直在把票型问题推给祁野，却没有解释自己为什么昨晚避开发言焦点。',
    colorToken: 'speech',
    playerId: 'ye-lan',
    createdAt: 1,
  },
  {
    id: 'e2',
    kind: 'kill',
    phase: 'night',
    day: 2,
    title: '第二天 · 狼人袭击',
    content: '狼人杀死了顾衡。',
    colorToken: 'kill',
    targetId: 'gu-heng',
    createdAt: 2,
  },
  {
    id: 'e3',
    kind: 'revive',
    phase: 'night',
    day: 2,
    title: '第二天 · 女巫救人',
    content: '女巫使用解药，顾衡起死回生。',
    colorToken: 'revive',
    targetId: 'gu-heng',
    createdAt: 3,
  },
  {
    id: 'e4',
    kind: 'protect',
    phase: 'night',
    day: 2,
    title: '第二天 · 守卫保护',
    content: '守卫保护了夏眠。',
    colorToken: 'protect',
    targetId: 'xia-mian',
    createdAt: 4,
  },
];

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('button,input,textarea,select')) || target.isContentEditable;
}

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('audience');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
  const toggleView = useCallback(() => {
    setViewMode((current) => (current === 'audience' ? 'god' : 'audience'));
  }, []);

  const resetToLobby = useCallback(() => {
    setViewMode('audience');
    setGameState(null);
    setSettlementReport(null);
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

  if (settlementReport) {
    return <SettlementView report={settlementReport} onReturnLobby={resetToLobby} />;
  }

  const activePlayers = gameState?.players ?? previewPlayers;
  const activeEvents = gameState?.events ?? previewEvents;

  return (
    <main className="game-layout" data-view-mode={viewMode}>
      <section className="game-main">
        <header className="top-bar">
          <div className="game-title">
            <strong>AI 狼人杀</strong>
            <span>第二天 · 发言阶段 · 9 人局</span>
          </div>
          <GameControls viewMode={viewMode} onToggleView={toggleView} />
        </header>
        <RoomView players={activePlayers} speakingPlayerId="ye-lan" />
      </section>
      <StatusFeed events={activeEvents} />
    </main>
  );
}
