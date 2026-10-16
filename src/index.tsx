import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { App } from './App';

/*
    Nach einem Deploy gibt es die alten Chunk-Dateinamen nicht mehr. Der
    Browser bekommt stattdessen index.html zurueck (die SPA-Weiche) und
    scheitert beim Auswerten — ein Fehler, den niemand deuten kann. Ein
    vollstaendiges Neuladen holt das frische Buendel.

    Aber genau EINMAL. Laedt die Seite danach wieder dasselbe kaputte Buendel,
    waere eine Schleife die Folge: weisse Seite, Nachladen, weisse Seite, und
    kein Weg heraus. Beim zweiten Mal faellt der Fehler deshalb durch — zum
    Auffangnetz, das eine Meldung zeigt.
*/
const RELOAD_FLAG = 'expose_chunk_reload';
const reloadOnce = (): boolean => {
    try {
        if (sessionStorage.getItem(RELOAD_FLAG)) return false;
        sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch (_) { /* privater Modus: dann lieber einmal zu viel laden */ }
    window.location.reload();
    return true;
};
// Ein Aufbau, der durchlaeuft, hebt den Merker wieder auf.
window.addEventListener('load', () => {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch (_) { /* egal */ }
});

window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce()) e.preventDefault();
});
// Fallback for browsers that don't fire vite:preloadError
const originalError = window.onerror;
window.onerror = (msg, src, _line, _col, err) => {
    if (typeof msg === 'string' && msg.includes('dynamically imported module')) {
        if (reloadOnce()) return true;
    }
    return originalError ? originalError(msg, src, _line, _col, err) : false;
};
import { ToastProvider } from './components/ui/Toast';
import { DialogProvider } from './components/ui/Dialog';
import { ModalStackProvider } from './components/ui/ModalStack';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
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
    </AppErrorBoundary>
  </React.StrictMode>
);