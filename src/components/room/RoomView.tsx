import type { CSSProperties } from 'react';
import type { Player } from '../../game/types';

interface RoomViewProps {
  players: Player[];
  speakingPlayerId?: string;
}

export function RoomView({ players, speakingPlayerId }: RoomViewProps) {
  const step = 360 / Math.max(players.length, 1);
  const speakingPlayer = players.find((player) => player.id === speakingPlayerId);

  return (
    <section className="table-area" aria-label="圆桌座位区">
      <div className="round-table" aria-hidden="true">
        <div className="table-center">
          <div>
            <strong>第二天</strong>
            <span>{speakingPlayer ? `${speakingPlayer.name}发言中` : '等待发言'}</span>
          </div>
        </div>
      </div>

      {players.map((player, index) => (
        <div
          className={[
            'seat',
            player.id === speakingPlayerId ? 'speaking' : '',
            player.status === 'dead' ? 'dead' : '',
          ].join(' ')}
          key={player.id}
          style={{ '--angle': `${index * step}deg` } as CSSProperties}
        >
          <div className="seat-name">{player.name}</div>
          <div className="seat-status">{player.status === 'alive' ? '存活' : '死亡'}</div>
        </div>
      ))}
    </section>
  );
}
