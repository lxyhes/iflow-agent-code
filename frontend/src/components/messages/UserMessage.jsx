/**
 * User Message Component
 * 用户消息气泡组件
 */

import React from 'react';

const UserMessage = ({ message, isGrouped }) => {
  return (
    <div className="flex w-full justify-end gap-3 pl-12 pr-4 mb-6 group">
      <div className="flex flex-col items-end flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">You</span>
          </div>
        )}
        <div className="bg-blue-600 dark:bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4.5 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="text-[15px] whitespace-pre-wrap break-words leading-relaxed font-normal">
            {message.content}
          </div>
          {message.images && message.images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.data}
                  alt={img.name}
                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity border border-white/10"
                  onClick={() => window.open(img.data, '_blank')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* User Avatar - Fixed on the right */}
      <div className="flex-shrink-0 mt-0.5">
        {!isGrouped ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-blue-400/30">
            U
          </div>
        ) : (
          <div className="w-8" /> /* Spacer for grouped messages */
        )}
      </div>
    </div>
  );
};

export default UserMessage;