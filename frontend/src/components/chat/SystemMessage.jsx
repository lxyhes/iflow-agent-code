/**
 * 系统消息组件
 */

import React from 'react';

export default function SystemMessage({ message }) {
  return (
    <div className="flex justify-center">
      <div className="bg-gray-800 text-gray-400 text-sm px-4 py-2 rounded-full">
        {message.content}
      </div>
    </div>
  );
}