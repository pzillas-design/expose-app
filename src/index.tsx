import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { App } from './App';

// After a new deploy, old lazy-loaded chunk filenames no longer exist on the
// server. The browser gets back index.html (the SPA fallback) with MIME type
// "text/html", which causes a hard-to-understand error. Catch it globally and
// force a full reload so the user automatically gets the fresh bundle.
window.addEventListener('vite:preloadError', () => { window.location.reload(); });
// Fallback for browsers that don't fire vite:preloadError
const originalError = window.onerror;
window.onerror = (msg, src, _line, _col, err) => {
    if (typeof msg === 'string' && msg.includes('dynamically imported module')) {
        window.location.reload();
        return true;
    }
    return originalError ? originalError(msg, src, _line, _col, err) : false;
};
import { ToastProvider } from './components/ui/Toast';
import { DialogProvider } from './components/ui/Dialog';
import { ModalStackProvider } from './components/ui/ModalStack';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
    <BrowserRouter>
      <ToastProvider>
        <ModalStackProvider>
        <DialogProvider>
          <App />
          <Analytics />
          <SpeedInsights />
        </DialogProvider>
        </ModalStackProvider>
      </ToastProvider>
    </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);