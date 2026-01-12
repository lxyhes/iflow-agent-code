/**
 * 用户消息组件
 */

import React from 'react';

export default function UserMessage({ message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-2">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}