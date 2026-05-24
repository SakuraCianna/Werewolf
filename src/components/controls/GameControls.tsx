import type { ViewMode } from '../../game/types';

interface GameControlsProps {
  viewMode: ViewMode;
  isAutoPlaying: boolean;
  canRollback: boolean;
  isAdvancing: boolean;
  onToggleView: () => void;
  onAdvance: () => void;
  onToggleAutoPlay: () => void;
  onRollbackStep: () => void;
  onRollbackPhase: () => void;
  onNewGame: () => void;
}

export function GameControls({
  viewMode,
  isAutoPlaying,
  canRollback,
  isAdvancing,
  onToggleView,
  onAdvance,
  onToggleAutoPlay,
  onRollbackStep,
  onRollbackPhase,
  onNewGame,
}: GameControlsProps) {
  return (
    <div className="control-strip">
      <button className="view-button primary" type="button" onClick={onAdvance} disabled={isAdvancing || isAutoPlaying}>
        {isAdvancing ? '思考中' : '下一步'}
      </button>
      <button className="view-button" type="button" onClick={onToggleAutoPlay} disabled={isAdvancing}>
        {isAutoPlaying ? '暂停自动' : '自动推进'}
      </button>
      <button className="view-button" type="button" onClick={onRollbackStep} disabled={!canRollback || isAdvancing}>
        回退一步
      </button>
      <button className="view-button" type="button" onClick={onRollbackPhase} disabled={!canRollback || isAdvancing}>
        回到上阶段
      </button>
      <button className="view-button" type="button" onClick={onToggleView}>
        {viewMode === 'audience' ? '切换到上帝视角' : '切换到观众视角'}
      </button>
      <button className="view-button danger" type="button" onClick={onNewGame}>
        新局
      </button>
    </div>
  );
}
