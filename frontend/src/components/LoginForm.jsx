import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import IFlowLogo from './ClaudeLogo'; // We reused this component

const LoginForm = () => {
  const { login } = useAuth();

  const handleConnect = () => {
    // In a real app, this might trigger an OAuth flow or open the CLI auth
    // For now, we simulate a login which triggers the backend check
    window.open('https://platform.iflow.cn/cli/sdk', '_blank');
    
    // Simulate logging in after the user has purportedly authenticated externally
    // In a real flow, we would poll the backend until auth_status returns true
    login('iflow-user', 'token');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <IFlowLogo className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to IFlow Agent
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Connect your local agent to the IFlow Platform
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleConnect}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </span>
            Connect with IFlow
          </button>
          
          <div className="text-center">
             <a href="https://platform.iflow.cn" target="_blank" className="font-medium text-blue-600 hover:text-blue-500">
               Don't have an account? Sign up
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
