import type { SettlementReport } from '../../game/settlement/settlement';

interface SettlementViewProps {
  report: SettlementReport;
  timelineText: string;
  onReturnLobby: () => void;
}

export function SettlementView({ report, timelineText, onReturnLobby }: SettlementViewProps) {
  const exportTimeline = () => {
    const blob = new Blob([timelineText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-werewolf-timeline-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <main className="settlement-page">
      <header className="settlement-header">
        <div>
          <span>本局结束</span>
          <h1>赛后复盘</h1>
        </div>
        <div className="settlement-actions">
          <button type="button" onClick={exportTimeline} disabled={!timelineText}>
            导出完整时间线
          </button>
          <button type="button" onClick={onReturnLobby}>
            返回大厅
          </button>
        </div>
      </header>

      <p className="settlement-summary">{report.summary}</p>

      <section className="settlement-grid" aria-label="玩家赛后评分">
        {report.players.map((player) => (
          <article className="settlement-card" key={player.playerName}>
            <h2>{player.playerName}</h2>
            <div className="score-list">
              <p>表演评分：{player.scores.performance}/10</p>
              <p>逻辑评分：{player.scores.logic}/10</p>
              <p>游戏操作评分：{player.scores.operation}/10</p>
            </div>
            <p className="settlement-comment">{player.comment}</p>
            {player.tags.length > 0 ? <p className="settlement-tags">{player.tags.join('、')}</p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
