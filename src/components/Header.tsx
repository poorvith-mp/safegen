import type { ViewType } from '../types';

interface HeaderProps { currentView: ViewType; onNavigate: (view: ViewType) => void }

export function Header({ currentView, onNavigate }: HeaderProps) {
  return <header className="instrument-header">
    <button className="instrument-brand" onClick={() => onNavigate('generator')}><img src="/logo-mark.svg" alt="" /><strong>SafeGen</strong></button>
    <nav aria-label="SafeGen views">{([{ id: 'generator', label: 'Generator' }, { id: 'vault', label: 'History' }, { id: 'audit', label: 'Estimate' }] as const).map((item) => <button key={item.id} aria-current={currentView === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>)}</nav>
    <div className="instrument-links"><a href="https://github.com/poorvith-mp/safegen">GitHub</a><a href="https://poorvithmp.com">Poorvith</a></div>
  </header>;
}
