import { gsap } from './gsapSetup';

export function animateSeatsIn(seatCards: HTMLElement[]): ReturnType<typeof gsap.timeline> | undefined {
  if (seatCards.length === 0) {
    return undefined;
  }

  return gsap.timeline().fromTo(
    seatCards,
    { autoAlpha: 0, scale: 0.78, y: 14 },
    {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      duration: 0.54,
      ease: 'back.out(1.45)',
      stagger: {
        amount: 0.34,
        from: 'start',
      },
    },
  );
}

export function animateSpeakingSeat(seatCard: HTMLElement | null): ReturnType<typeof gsap.to> | undefined {
  if (!seatCard) {
    return undefined;
  }

  return gsap.to(seatCard, {
    scale: 1.055,
    duration: 0.86,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  });
}

export function animateTableFocus(tableCenter: HTMLElement | null): ReturnType<typeof gsap.timeline> | undefined {
  if (!tableCenter) {
    return undefined;
  }

  return gsap
    .timeline()
    .fromTo(tableCenter, { autoAlpha: 0.72, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.34, ease: 'power2.out' })
    .to(tableCenter, {
      boxShadow: '0 0 30px rgba(240, 217, 174, 0.2)',
      duration: 0.52,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
      clearProps: 'boxShadow',
    });
}
