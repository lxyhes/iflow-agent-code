/**
 * EmptyState Component
 * 空状态组件（无消息时显示）
 */

import React from 'react';
import IFlowLogo from '../IFlowLogo.jsx';
import CursorLogo from '../CursorLogo.jsx';

const EmptyState = ({ provider }) => {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div>
        <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-6">
          {provider === 'cursor' ? (
            <CursorLogo className="h-12 w-12 text-blue-600" />
          ) : (
            <IFlowLogo className="h-12 w-12 text-blue-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {provider === 'cursor' ? 'Cursor Agent' : 'IFlow Agent'}
        </h2>
        <p className="text-gray-500">Ready to build something amazing?</p>
      </div>
    </div>
  );
};

export default EmptyState;