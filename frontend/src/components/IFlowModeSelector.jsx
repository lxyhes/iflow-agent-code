import React, { useState, useEffect } from 'react';

const modes = [
  { id: 'default', label: 'Default', icon: '🛡️', desc: 'Secure: Asks for permission' },
  { id: 'auto_edit', label: 'Auto Edit', icon: '⚡', desc: 'Fast: Edits without asking' },
  { id: 'yolo', label: 'YOLO', icon: '🚀', desc: 'Expert: Auto execute + rollback' },
  { id: 'plan', label: 'Plan Only', icon: '📋', desc: 'Read-only: Analysis only' }
];

const IFlowModeSelector = () => {
  const [currentMode, setCurrentMode] = useState('yolo');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch current config from backend
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setCurrentMode(data.mode))
      .catch(err => console.error('Failed to fetch config', err));
  }, []);

  const handleModeChange = (modeId) => {
    setCurrentMode(modeId);
    setShowDropdown(false);
    
    // Sync with backend
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: modeId })
    })
    .then(res => res.json())
    .then(data => console.log('Mode updated:', data.mode))
    .catch(err => console.error('Failed to update mode', err));
  };

  return (
    <div className="relative mr-4">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
      >
        <span>{modes.find(m => m.id === currentMode)?.icon}</span>
        <span>{modes.find(m => m.id === currentMode)?.label}</span>
        <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`w-full flex flex-col items-start p-2 rounded-md transition-colors ${
                  currentMode === mode.id 
                    ? 'bg-blue-50 dark:bg-blue-900/40' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{mode.icon}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{mode.label}</span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IFlowModeSelector;
