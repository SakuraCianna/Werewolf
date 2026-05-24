import type { ViewMode } from '../../game/types';

interface GameControlsProps {
  viewMode: ViewMode;
  onToggleView: () => void;
}

export function GameControls({ viewMode, onToggleView }: GameControlsProps) {
  return (
    <button className="view-button" type="button" onClick={onToggleView}>
      {viewMode === 'audience' ? '切换到上帝视角' : '切换到观众视角'}
    </button>
  );
}
