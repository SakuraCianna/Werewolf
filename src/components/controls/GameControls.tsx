import type { GameCheckpoint, GameSpeed, ViewMode } from '../../game/types';

interface GameControlsProps {
  viewMode: ViewMode;
  gameSpeed: GameSpeed;
  isAutoPlaying: boolean;
  canRollback: boolean;
  isAdvancing: boolean;
  checkpoints: GameCheckpoint[];
  onToggleView: () => void;
  onAdvance: () => void;
  onToggleAutoPlay: () => void;
  onSpeedChange: (speed: GameSpeed) => void;
  onRollbackStep: () => void;
  onRollbackPhase: () => void;
  onRollbackCheckpoint: (checkpointId: string) => void;
  onNewGame: () => void;
}

export function GameControls({
  viewMode,
  gameSpeed,
  isAutoPlaying,
  canRollback,
  isAdvancing,
  checkpoints,
  onToggleView,
  onAdvance,
  onToggleAutoPlay,
  onSpeedChange,
  onRollbackStep,
  onRollbackPhase,
  onRollbackCheckpoint,
  onNewGame,
}: GameControlsProps) {
  const latestCheckpointId = checkpoints.at(-1)?.id ?? '';

  return (
    <div className="control-strip">
      <button className="view-button primary" type="button" onClick={onAdvance} disabled={isAdvancing || isAutoPlaying}>
        {isAdvancing ? '思考中' : '下一步'}
      </button>
      <button className="view-button" type="button" onClick={onToggleAutoPlay} disabled={isAdvancing}>
        {isAutoPlaying ? '暂停自动' : '自动推进'}
      </button>
      <label className="control-select-label" htmlFor="game-speed">
        速度
      </label>
      <select
        className="control-select"
        id="game-speed"
        value={gameSpeed}
        onChange={(event) => onSpeedChange(event.target.value as GameSpeed)}
        disabled={isAdvancing}
      >
        <option value="slow">慢速</option>
        <option value="normal">标准</option>
        <option value="fast">快速</option>
      </select>
      <button className="view-button" type="button" onClick={onRollbackStep} disabled={!canRollback || isAdvancing}>
        回退一步
      </button>
      <button className="view-button" type="button" onClick={onRollbackPhase} disabled={!canRollback || isAdvancing}>
        回到上阶段
      </button>
      <select
        className="control-select checkpoint-select"
        aria-label="回溯节点"
        value={latestCheckpointId}
        disabled={!canRollback || isAdvancing}
        onChange={(event) => {
          if (event.target.value) {
            onRollbackCheckpoint(event.target.value);
          }
        }}
      >
        {checkpoints.length === 0 ? <option value="">暂无回溯节点</option> : null}
        {checkpoints
          .slice()
          .reverse()
          .map((checkpoint) => (
            <option key={checkpoint.id} value={checkpoint.id}>
              {checkpoint.label}
            </option>
          ))}
      </select>
      <button className="view-button" type="button" onClick={onToggleView}>
        {viewMode === 'audience' ? '切换到上帝视角' : '切换到观众视角'}
      </button>
      <button className="view-button danger" type="button" onClick={onNewGame}>
        新局
      </button>
    </div>
  );
}
