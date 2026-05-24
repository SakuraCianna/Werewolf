import { useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../../game/types';
import { animateSeatsIn, animateSpeakingSeat, animateTableFocus } from '../../motion/roomAnimations';
import { gsap, useGSAP } from '../../motion/gsapSetup';

interface RoomViewProps {
  players: Player[];
  speakingPlayerId?: string;
}

export function RoomView({ players, speakingPlayerId }: RoomViewProps) {
  const rootRef = useRef<HTMLElement>(null);
  const step = 360 / Math.max(players.length, 1);
  const speakingPlayer = players.find((player) => player.id === speakingPlayerId);
  const playerSignature = useMemo(() => players.map((player) => player.id).join('|'), [players]);

  useGSAP(
    () => {
      const seatCards = gsap.utils.toArray<HTMLElement>('.seat-card');
      animateSeatsIn(seatCards);
    },
    { scope: rootRef, dependencies: [playerSignature], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const speakingSeat = rootRef.current?.querySelector<HTMLElement>('.seat.speaking .seat-card') ?? null;
      const tableCenter = rootRef.current?.querySelector<HTMLElement>('.table-center') ?? null;

      animateSpeakingSeat(speakingSeat);
      animateTableFocus(tableCenter);
    },
    { scope: rootRef, dependencies: [speakingPlayerId], revertOnUpdate: true },
  );

  return (
    <section className="table-area" aria-label="圆桌座位区" ref={rootRef}>
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
          <div className="seat-card">
            <div className="seat-name">{player.name}</div>
            <div className="seat-status">{player.status === 'alive' ? '存活' : '死亡'}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
