import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Bot, Check, KeyRound, LockKeyhole, Pause, Play } from 'lucide-react';

export function ActionFlow() {
  const scene = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = scene.current;
    if (!element || paused) return;
    const media = gsap.matchMedia(element);
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.3 });
      timeline.fromTo('.flow-request', { y: 0 }, { y: -6, duration: 1.1, ease: 'sine.inOut' })
        .to('.flow-request', { y: 0, duration: 1.1, ease: 'sine.inOut' })
        .to('.vault-seal', { rotation: 90, duration: .7, ease: 'power2.inOut' }, .8)
        .fromTo('.flow-approval', { opacity: .45 }, { opacity: 1, duration: .7 }, 1)
        .fromTo('.flow-result', { y: 0 }, { y: -6, duration: 1.1, ease: 'sine.inOut' }, 1.8)
        .to('.flow-result', { y: 0, duration: 1.1, ease: 'sine.inOut' });
      const observer = new IntersectionObserver(([entry]) => timeline.paused(!entry.isIntersecting || document.hidden));
      observer.observe(element);
      const onVisibility = () => timeline.paused(document.hidden);
      document.addEventListener('visibilitychange', onVisibility);
      return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
    });
    media.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
      const board = element.querySelector('.flow-board');
      const rotateX = gsap.quickTo(board, 'rotationX', { duration: .65, ease: 'power2.out' });
      const rotateY = gsap.quickTo(board, 'rotationY', { duration: .65, ease: 'power2.out' });
      const onMove = (event: PointerEvent) => {
        const bounds = element.getBoundingClientRect();
        rotateX(-((event.clientY - bounds.top) / bounds.height - .5) * 7);
        rotateY(((event.clientX - bounds.left) / bounds.width - .5) * 9);
      };
      const onLeave = () => { rotateX(0); rotateY(0); };
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      return () => { element.removeEventListener('pointermove', onMove); element.removeEventListener('pointerleave', onLeave); };
    });
    return () => media.revert();
  }, [paused]);

  return <figure className="action-flow">
    <div ref={scene} className="flow-scene" aria-hidden="true"><div className="flow-board">
      <div className="flow-request flow-tile"><Bot size={25} strokeWidth={1.5} /><span>Agent requests</span><strong>Rerun workflow</strong><span className="flow-code">repository / run-id</span></div>
      <div className="vault-body"><div className="vault-top" /><div className="vault-side" /><div className="vault-front"><div className="vault-name"><img src="/logo-mark.svg" alt="" />SafeGen</div><div className="vault-seal"><KeyRound size={35} strokeWidth={1.4} /></div><span><LockKeyhole size={12} /> Owner’s local vault</span></div></div>
      <div className="flow-approval"><Check size={14} /> You approve the exact action</div>
      <div className="flow-result flow-tile"><ArrowRight size={25} strokeWidth={1.5} /><span>Provider executes</span><strong>GitHub · Cloudflare</strong><span className="flow-code">Agent receives status</span></div>
    </div></div>
    <figcaption><span>Agent request → owner approval → provider action.<br />A status result returns to the agent.</span><button className="motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play illustration motion' : 'Pause illustration motion'}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></figcaption>
  </figure>;
}
