import { Copy } from 'lucide-react';
import { copyText } from '../utils/clipboard';
import { useToast } from '../context/ToastContext';

export function CodeBlock({ children, label }: { children: string; label: string }) {
  const { showToast } = useToast();
  async function copy() {
    try { await copyText(children); showToast(`${label} copied`, 'success'); }
    catch { showToast('Clipboard permission was denied', 'error'); }
  }
  return <div className="guide-code"><div><span>{label}</span><button type="button" onClick={copy} aria-label={`Copy ${label}`}><Copy size={14} /> Copy</button></div><pre><code>{children}</code></pre></div>;
}
