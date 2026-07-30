import { gsap } from 'gsap';

// Initialize GSAP defaults for consistent performance
gsap.defaults({
  duration: 0.4,
  ease: 'power2.out'
});

/**
 * Animate view entrance transition with subtle fade & slide up
 */
export function animateViewTransition(target: HTMLElement | null) {
  if (!target) return;

  const mm = gsap.matchMedia();
  mm.add(
    {
      reduceMotion: '(prefers-reduced-motion: reduce)',
      defaultMotion: '(prefers-reduced-motion: no-preference)'
    },
    (context) => {
      const { reduceMotion } = context.conditions!;

      gsap.fromTo(
        target,
        {
          autoAlpha: 0,
          y: reduceMotion ? 0 : 12
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0.1 : 0.45,
          ease: 'power2.out',
          clearProps: 'transform'
        }
      );
    }
  );
}

/**
 * Animate entropy strength meter bar with spring physics
 */
export function animateEntropyGauge(target: HTMLElement | null, targetWidthPercent: number) {
  if (!target) return;

  gsap.to(target, {
    width: `${Math.min(100, Math.max(0, targetWidthPercent))}%`,
    duration: 0.5,
    ease: 'power2.out'
  });
}

/**
 * Scale micro-burst effect when copying password
 */
export function animateCopyBurst(target: HTMLElement | null) {
  if (!target) return;

  gsap.fromTo(
    target,
    { scale: 0.94 },
    {
      scale: 1,
      duration: 0.35,
      ease: 'back.out(1.8)',
      clearProps: 'transform'
    }
  );
}

/**
 * Staggered entrance animation for bento box grid cards
 */
export function animateBentoStagger(targets: HTMLElement[] | NodeListOf<Element> | string) {
  if (!targets) return;

  const mm = gsap.matchMedia();
  mm.add(
    {
      reduceMotion: '(prefers-reduced-motion: reduce)',
      defaultMotion: '(prefers-reduced-motion: no-preference)'
    },
    (context) => {
      const { reduceMotion } = context.conditions!;

      gsap.fromTo(
        targets,
        {
          autoAlpha: 0,
          y: reduceMotion ? 0 : 18
        },
        {
          autoAlpha: 1,
          y: 0,
          stagger: reduceMotion ? 0 : 0.08,
          duration: reduceMotion ? 0.1 : 0.5,
          ease: 'power2.out',
          clearProps: 'transform'
        }
      );
    }
  );
}

/**
 * Animate pulse character change on password refresh
 */
export function animatePasswordRefresh(target: HTMLElement | null) {
  if (!target) return;

  gsap.fromTo(
    target,
    { autoAlpha: 0.4, scale: 0.99 },
    {
      autoAlpha: 1,
      scale: 1,
      duration: 0.25,
      ease: 'power1.out',
      clearProps: 'transform'
    }
  );
}
