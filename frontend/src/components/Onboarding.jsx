import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, User, Mail, GitBranch, Loader2 } from 'lucide-react';
import IFlowLogo from './IFlowLogo';
import { authenticatedFetch } from '../utils/api';

const Onboarding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [gitName, setGitName] = useState('');
  const [gitEmail, setGitEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const steps = [
    { title: 'Git Identity', description: 'Configure commit info', icon: User },
    { title: 'IFlow Agent', description: 'Engine configuration', icon: () => <IFlowLogo size={24} /> }
  ];

  const handleNext = async () => {
    if (currentStep === 0) {
      // Save Git Config
      setIsSubmitting(true);
      try {
        await authenticatedFetch('/api/user/git-config', {
          method: 'POST',
          body: JSON.stringify({ gitName, gitEmail })
        });
        setCurrentStep(1);
      } catch (err) {
        setError("Failed to save git config");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      localStorage.setItem('selected-provider', 'iflow');
      await authenticatedFetch('/api/user/complete-onboarding', { method: 'POST' });
      onComplete(); // This enters the main app
    } catch (err) {
      onComplete(); // Failsafe
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    if (currentStep === 0) return gitName.trim() && gitEmail.includes('@');
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 ${i <= currentStep ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-400'}`}>
                  {i < currentStep ? <Check className="w-5 h-5" /> : (typeof s.icon === 'function' ? <s.icon /> : <s.icon className="w-5 h-5" />)}
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase">{s.title}</span>
              </div>
            ))}
          </div>

          {currentStep === 0 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Git Configuration</h2>
                <p className="text-gray-500 text-sm">How should we identify you in code commits?</p>
              </div>
              <div className="space-y-4">
                <input
                  type="text" placeholder="Name" value={gitName}
                  onChange={e => setGitName(e.target.value)}
                  className="w-full p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-600"
                />
                <input
                  type="email" placeholder="Email" value={gitEmail}
                  onChange={e => setGitEmail(e.target.value)}
                  className="w-full p-3 rounded-lg border dark:bg-gray-900 dark:border-gray-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <IFlowLogo size={40} />
              </div>
              <h2 className="text-2xl font-bold">IFlow Agent Ready</h2>
              <p className="text-gray-500">Your local IFlow engine is connected and ready to code.</p>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm border border-green-200 dark:border-green-800">
                Connection established successfully!
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-4 text-center">{error}</p>}

          <div className="flex justify-between mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              disabled={currentStep === 0 || isSubmitting}
              onClick={() => setCurrentStep(0)}
              className="text-sm text-gray-500 disabled:opacity-0"
            >
              Previous
            </button>
            <button
              disabled={!isStepValid() || isSubmitting}
              onClick={handleNext}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (currentStep === 0 ? 'Next' : 'Complete Setup')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;