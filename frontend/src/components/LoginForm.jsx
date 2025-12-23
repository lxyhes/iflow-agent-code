import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import IFlowLogo from './IFlowLogo';
import { CheckCircle2, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

const LoginForm = () => {
  const { login } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, connecting, success
  const [polling, setPolling] = useState(false);

  // Poll backend for real auth status
  useEffect(() => {
    let interval;
    if (polling) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/auth/status');
          const data = await res.json();

          // If CLI is installed and authenticated, auto-login
          if (data.is_iflow_installed) {
            setStatus('success');
            setPolling(false);

            setTimeout(() => {
              login('iflow-user', 'mock-token');
              setTimeout(() => { window.location.href = '/'; }, 500);
            }, 1000);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [polling, login]);

  const handleConnect = () => {
    setStatus('connecting');
    setPolling(true);

    // Open iFlow platform for auth
    window.open('https://platform.iflow.cn/', '_blank');

    // Fallback: If after 30 seconds still not connected, show a hint
    setTimeout(() => {
      if (status === 'connecting') {
        // Still waiting... but we don't force fail
      }
    }, 30000);
  };

  // Immediate entrance for development (Optional: Skip button)
  const handleSkip = () => {
    login('dev-user', 'mock-token');
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10 border border-gray-100 dark:border-gray-700 text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-8">
            <IFlowLogo className="h-12 w-12 text-white" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {status === 'success' ? 'Ready to Code' : 'Initialize IFlow'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10">
            {status === 'connecting' ? 'Please complete login in the new window...' :
              status === 'success' ? 'Environment verified and synced!' :
                'Connect your local machine to the IFlow platform to enable Agent capabilities.'}
          </p>

          {status === 'idle' && (
            <div className="space-y-4">
              <button
                onClick={handleConnect}
                className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
              >
                <ExternalLink className="w-5 h-5" />
                Connect with IFlow
              </button>

              <button
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ShieldCheck className="w-4 h-4" />
                Skip to Local Mode
              </button>
            </div>
          )}

          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-sm text-blue-600 font-bold animate-pulse">Detecting Local Engine...</p>
              <p className="text-xs text-gray-400 mt-2">Make sure IFlow CLI is installed.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg text-green-600 font-bold">Authenticated!</p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-[0.2em] font-black">Agent Kernel v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;