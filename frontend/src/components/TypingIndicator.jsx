import React, { memo } from 'react';

const TypingIndicator = memo(({ agent = "IFlow", agentInfo }) => {
  const agentColors = {
    'IFlow': { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', glow: 'bg-blue-400', text: 'text-blue-600' },
    'Cursor': { bg: 'bg-gradient-to-br from-gray-600 to-gray-800', glow: 'bg-gray-500', text: 'text-gray-700' },
    'TaskMaster': { bg: 'bg-gradient-to-br from-green-500 to-emerald-600', glow: 'bg-green-400', text: 'text-green-600' },
    'CodeReviewer': { bg: 'bg-gradient-to-br from-purple-500 to-violet-600', glow: 'bg-purple-400', text: 'text-purple-600' },
    'default': { bg: 'bg-gradient-to-br from-indigo-500 to-purple-600', glow: 'bg-indigo-400', text: 'text-indigo-600' }
  };

  const colors = agentColors[agent] || agentColors.default;

  return (
    <div className="flex items-start gap-3 p-4 my-2 bg-gradient-to-r from-gray-50/80 to-gray-100/50 dark:from-gray-800/60 dark:to-gray-800/40 rounded-xl border border-gray-200/60 dark:border-gray-700/50 shadow-sm glass backdrop-blur-sm">
      {/* AI Avatar with breathing animation */}
      <div className="relative ai-thinking-container">
        <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center text-white shadow-lg ai-thinking`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${colors.glow} rounded-full animate-ping`}></div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-semibold gradient-text`}>
            {agent}
          </span>
          {agentInfo && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 backdrop-blur-sm">
              {agentInfo}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                className={`w-2.5 h-2.5 ${colors.bg} rounded-full animate-bounce shadow-sm`}
                style={{
                  animationDelay: `${dot * 0.15}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            正在思考中...
          </span>
        </div>

        <div className="mt-3 h-0.5 bg-gradient-to-r from-transparent via-blue-300/50 to-transparent dark:via-blue-500/30 animate-pulse rounded-full" />
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono tabular-nums">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

const CompactTypingIndicator = memo(({ agent = "IFlow" }) => {
  const colors = {
    'IFlow': 'bg-blue-500',
    'Cursor': 'bg-gray-700',
    'TaskMaster': 'bg-green-500',
    'default': 'bg-indigo-500'
  };
  const color = colors[agent] || colors.default;

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-gray-100 dark:bg-gray-800 rounded-full">
      <div className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <div
            key={dot}
            className={`w-2 h-2 ${color} rounded-full animate-bounce`}
            style={{
              animationDelay: `${dot * 0.15}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {agent} 正在思考
      </span>
    </div>
  );
});

CompactTypingIndicator.displayName = 'CompactTypingIndicator';

const TypingDots = memo(({ count = 3, color = "bg-gray-400", size = "w-2 h-2" }) => {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${size} ${color} rounded-full animate-bounce`}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
});

TypingDots.displayName = 'TypingDots';

const LoadingBar = memo(({ progress = 0, color = "bg-blue-500", height = "h-1" }) => {
  return (
    <div className={`w-full ${height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
      <div
        className={`${height} ${color} rounded-full transition-all duration-300 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
});

LoadingBar.displayName = 'LoadingBar';

export { TypingIndicator, CompactTypingIndicator, TypingDots, LoadingBar };

export default TypingIndicator;
