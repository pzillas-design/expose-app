import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ToastProvider } from './components/ui/Toast';
import { DialogProvider } from './components/ui/Dialog';
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
    <BrowserRouter>
      <ToastProvider>
        <DialogProvider>
          <App />
          <Analytics />
          <SpeedInsights />
        </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);