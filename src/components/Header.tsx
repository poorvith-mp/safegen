interface HeaderProps { currentPath: string }

export function Header({ currentPath }: HeaderProps) {
  return <header className="instrument-header">
    <a className="instrument-brand" href="/" aria-label="SafeGen home"><img src="/logo-mark.svg" alt="" width="36" height="36" /><strong>SafeGen</strong></a>
    <nav aria-label="Main navigation">{[
      { href: '/', label: 'Home' }, { href: '/generator', label: 'Generator' },
      { href: '/setup', label: 'Agent setup' }, { href: '/docs', label: 'Docs' }, { href: '/about', label: 'About' },
    ].map(({ href, label }) => <a key={href} href={href} aria-current={(href === '/generator' ? currentPath.startsWith(href) : currentPath === href) ? 'page' : undefined}>{label}</a>)}</nav>
    <a className="instrument-source" href="https://github.com/poorvith-mp/safegen">Source <span aria-hidden="true">↗</span></a>
  </header>;
}
