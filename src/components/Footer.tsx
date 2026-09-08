export function Footer() {
  return <footer className="site-footer">
    <div className="footer-heading"><a href="/" className="instrument-brand"><img src="/logo-mark.svg" alt="" width="28" height="28" /><strong>SafeGen</strong></a><p>Keep credentials local. Make permission explicit.</p></div>
    <nav aria-label="Footer navigation"><a href="/docs">Documentation</a><a href="https://github.com/poorvith-mp/safegen">GitHub</a><a href="/about">Built by Poorvith M P</a></nav>
    <p className="footer-note">Open source · MIT. Browser generation runs locally. Agent actions require the separate owner setup.</p>
  </footer>;
}
