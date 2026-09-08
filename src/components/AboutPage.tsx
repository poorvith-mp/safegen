import { ArrowUpRight } from 'lucide-react';

export function AboutPage() {
  return <article className="about-page">
    <header className="about-intro"><p className="eyebrow">About SafeGen</p><h1>Catch the small problem<br /><em>before it becomes expensive.</em></h1><p>SafeGen began as a browser password generator. It now also gives agents a way to request supported actions while the owner controls credentials and approval.</p></header>
    <div className="about-author"><img src="/poorvith-mark.svg" alt="Poorvith M P aperture mark" width="86" height="86" /><div><p className="eyebrow">Built by Poorvith M P</p><h2>Tools architect.<br />Local-first & privacy engineering.</h2><p>I notice the friction people learn to tolerate and turn it into a focused tool. A credential pasted into an AI prompt is one of those small decisions that can become an expensive problem.</p><p>SafeGen puts the permission decision in front of the action, with source code and limits you can inspect.</p><a className="text-link" href="https://www.poorvithmp.com">Meet the builder <ArrowUpRight size={16} /></a></div></div>
    <section className="about-principles"><p className="eyebrow">The decisions behind the tool</p><h2>Useful before impressive.</h2><dl><div><dt>Work locally</dt><dd>Browser generation uses Web Crypto. The encrypted vault and broker run on the owner’s machine.</dd></div><div><dt>Keep the scope small</dt><dd>The agent asks for a named, supported action. The owner sees the target and parameters before approving.</dd></div><div><dt>Make the limits visible</dt><dd>Isolation requirements, generation assumptions, and source code are part of the product.</dd></div></dl></section>
    <div className="about-links"><a className="button-primary" href="https://github.com/poorvith-mp/safegen">Explore the source <ArrowUpRight size={16} /></a><a className="text-link" href="/docs">Read the documentation <ArrowUpRight size={16} /></a></div>
  </article>;
}
