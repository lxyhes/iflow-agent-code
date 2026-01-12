/**
 * 执行计划消息组件
 */

import React, { useState } from 'react';

export default function PlanMessage({ message, isExpanded, onToggleExpand }) {
  const entries = message.metadata?.entries || [];

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center space-x-2">
          <span className="text-purple-400">📋</span>
          <span className="text-sm font-medium text-gray-300">执行计划</span>
        </div>
        <span className="text-xs text-gray-500">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="px-4 py-2 border-t border-gray-700">
          <ol className="space-y-2">
            {entries.map((entry, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm">
                <span className="text-purple-400 mt-0.5">{index + 1}.</span>
                <span className="text-gray-300">{entry.description || entry}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}