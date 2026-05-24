import { useRef } from 'react';
import type { GameEvent } from '../../game/types';
import { animateMessageIn } from '../../motion/messageAnimations';
import { useGSAP } from '../../motion/gsapSetup';

interface StatusFeedProps {
  events: GameEvent[];
}

export function StatusFeed({ events }: StatusFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const latestEvent = events.at(-1);

  useGSAP(
    () => {
      const latestMessage = listRef.current?.lastElementChild;
      animateMessageIn(latestMessage instanceof HTMLElement ? latestMessage : null, latestEvent?.colorToken ?? 'neutral');
    },
    { scope: listRef, dependencies: [latestEvent?.id], revertOnUpdate: true },
  );

  return (
    <aside className="status-area" aria-label="游戏消息状态区">
      <header className="status-header">
        <h2>游戏消息</h2>
        <p>右侧记录公开发言和局内状态变化，消息列表在面板内部滚动。</p>
      </header>
      <div className="message-list" ref={listRef}>
        {events.map((event) => (
          <article className={`message ${event.colorToken}`} key={event.id}>
            <span className="time">{event.title}</span>
            {event.content}
          </article>
        ))}
      </div>
    </aside>
  );
}
