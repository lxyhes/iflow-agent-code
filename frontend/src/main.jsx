import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import 'katex/dist/katex.min.css'
import { queryClient } from './lib/queryClient'

// 本地开发模式：自动设置 mock token
if (import.meta.env.VITE_IS_PLATFORM !== 'true') {
  if (!localStorage.getItem('auth-token')) {
    localStorage.setItem('auth-token', 'mock-token');
  }
}

// Clean up stale service workers on app load to prevent caching issues after builds
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  }).catch(err => {
    console.warn('Failed to unregister service workers:', err);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
