import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { HistoryProvider } from './context/HistoryContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <HistoryProvider>
        <App />
        <ToastContainer />
      </HistoryProvider>
    </ToastProvider>
  </StrictMode>
);

const isProduction = Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD);
if (isProduction && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => { /* Offline support is optional; generation remains local. */ });
  });
}
