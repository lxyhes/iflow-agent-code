/**
 * 工具调用消息组件
 */

import React from 'react';

export default function ToolMessage({ message, isExpanded, onToggleExpand }) {
  const { tool_name, status, label, metadata } = message;

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return '⏳';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '•';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center space-x-2">
          <span className={getStatusColor(status)}>{getStatusIcon(status)}</span>
          <span className="text-sm font-medium text-gray-300">{label || tool_name}</span>
        </div>
        <span className="text-xs text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            <div><span className="font-medium">工具:</span> {tool_name}</div>
            <div><span className="font-medium">状态:</span> {status}</div>
            {metadata && Object.entries(metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {JSON.stringify(value)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}