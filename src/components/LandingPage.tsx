import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { ActionFlow } from './ActionFlow';

export function LandingPage() {
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia(page);
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-reveal', { y: 22, autoAlpha: 0, duration: .8, stagger: .11, ease: 'power3.out' });
    });
    return () => media.revert();
  }, []);
  return <div ref={page} className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-title"><div className="hero-copy">
      <p className="eyebrow hero-reveal">Local credentials. Explicit permission.</p>
      <h1 id="landing-title" className="hero-reveal">Your agent can act.<br /><em>You keep the keys.</em></h1>
      <p className="hero-description hero-reveal">Let an agent request a GitHub, Cloudflare, or npm action. You review it locally. SafeGen uses the credential and returns a limited result.</p>
      <div className="hero-actions hero-reveal"><a className="button-primary" href="/setup">Set up your agent <ArrowRight size={17} /></a><a className="button-secondary" href="/generator">Generate a password</a></div>
      <p className="hero-footnote hero-reveal">Free and open source. Your agent and owner broker need separate OS accounts.</p>
    </div><ActionFlow /></section>
    <section className="purpose-section" aria-labelledby="purpose-title"><p className="eyebrow">Why SafeGen exists</p><h2 id="purpose-title">A useful agent shouldn’t need<br className="desktop-break" /> a copy of your credentials.</h2><p>Once a token is pasted into a prompt, it becomes part of the conversation. SafeGen gives the agent a narrower way to work: request a supported action, wait for your decision, then receive its status.</p><a className="text-link" href="/docs#overview">Understand the boundary <ArrowRight size={16} /></a></section>
    <section className="purpose-section" aria-labelledby="comparison-title"><p className="eyebrow">Action-only vs token release</p><h2 id="comparison-title">Actions, not credentials.</h2><p>Token-release brokers like <a href="https://developer.1password.com/docs/service-accounts/credential-broker/" target="_blank" rel="noreferrer" className="text-link">1Password's Credential Broker</a> release approved secrets directly to requesting clients. SafeGen never releases tokens or credentials to the agent; the isolated owner broker executes the exact approved action and returns only a validated result.</p><a className="text-link" href="/docs#actions">Explore supported actions <ArrowRight size={16} /></a></section>
    <section className="entry-section" aria-labelledby="entry-title"><p className="eyebrow">Choose your starting point</p><h2 id="entry-title">One tool. Two ways to use it.</h2><div className="entry-grid">
      <a className="entry-card" href="/generator"><KeyRound size={28} strokeWidth={1.5} /><h3>I need a strong password.</h3><p>Generate passwords, passphrases, PINs, or custom patterns in your browser. No account or installation.</p><span>Open the generator <ArrowRight size={18} /></span></a>
      <a className="entry-card entry-card-agent" href="/setup"><ShieldCheck size={28} strokeWidth={1.5} /><h3>I’m connecting an agent.</h3><p>Set up the local action broker, keep owner steps private, and configure your CLI or MCP client.</p><span>Choose your agent <ArrowRight size={18} /></span></a>
    </div></section>
    <section className="scope-section" aria-labelledby="scope-title"><div><p className="eyebrow">Small permissions, on purpose</p><h2 id="scope-title">Know what you’re<br />saying yes to.</h2><p>Connections are pinned to a repository, Worker, or package. Each request names its target and parameters before you approve it.</p></div><dl className="scope-list"><div><dt>GitHub</dt><dd>Read workflow run status or rerun an existing workflow.</dd></div><div><dt>Cloudflare</dt><dd>List recent Worker deployments or deploy an existing version to 100%.</dd></div><div><dt>npm</dt><dd>Read package latest semver or publish approved tarballs with 2FA OTP.</dd></div><div><dt>Your decision</dt><dd>Requests expire after two minutes. Each approval is used once.</dd></div></dl></section>
    <aside className="boundary-note"><Fingerprint size={25} strokeWidth={1.5} /><div><h2>The setup is part of the protection.</h2><p>Use a separate standard owner OS account and a private browser session the agent can’t inspect. Admin access, shared screen control, and a compromised operating system are outside this boundary.</p><a className="text-link" href="/docs#owner">Read the isolation requirements <ArrowRight size={16} /></a></div></aside>
  </div>;
}
