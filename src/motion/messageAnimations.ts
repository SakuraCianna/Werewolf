import type { GameEvent } from '../game/types';
import { gsap } from './gsapSetup';

type MessageColorToken = GameEvent['colorToken'];

const MESSAGE_GLOW_COLORS: Partial<Record<MessageColorToken, string>> = {
  kill: 'rgba(219, 52, 68, 0.5)',
  revive: 'rgba(69, 219, 52, 0.42)',
  protect: 'rgba(246, 233, 77, 0.42)',
};

export function animateMessageIn(message: HTMLElement | null, colorToken: MessageColorToken): ReturnType<typeof gsap.timeline> | undefined {
  if (!message) {
    return undefined;
  }

  const timeline = gsap.timeline();
  timeline.fromTo(
    message,
    { autoAlpha: 0, y: 12, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' },
  );

  const glowColor = MESSAGE_GLOW_COLORS[colorToken];
  if (glowColor) {
    timeline.fromTo(
      message,
      { boxShadow: '0 0 0 rgba(255, 255, 255, 0)' },
      {
        boxShadow: `0 0 22px ${glowColor}`,
        duration: 0.34,
        ease: 'sine.inOut',
        repeat: 1,
        yoyo: true,
        clearProps: 'boxShadow',
      },
      '<0.04',
    );
  }

  return timeline;
}
