import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { HistoryProvider } from './context/HistoryContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <HistoryProvider>
          <App />
          <ToastContainer />
        </HistoryProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
