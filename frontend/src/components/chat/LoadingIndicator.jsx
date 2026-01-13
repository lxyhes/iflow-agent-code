/**
 * LoadingIndicator Component
 * 加载指示器组件 - 带动效版本
 */

import React from 'react';
import TypingIndicator from '../TypingIndicator';

const LoadingIndicator = ({ isLoading, provider = 'iflow' }) => {
  if (!isLoading) {
    return <div className="h-4" />;
  }

  return (
    <div className="py-4 flex items-center justify-center">
      <TypingIndicator 
        agent={provider === 'cursor' ? 'Cursor' : 'IFlow'}
      />
    </div>
  );
};

export default LoadingIndicator;