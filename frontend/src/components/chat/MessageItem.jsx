/**
 * 单个消息项组件
 * 处理不同类型消息的渲染
 */

import React, { useState } from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';
import SystemMessage from './SystemMessage';
import ToolMessage from './ToolMessage';
import PlanMessage from './PlanMessage';

export default function MessageItem({ message, onCopyCode, onRetry }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const messageTypes = {
    user: UserMessage,
    assistant: AssistantMessage,
    system: SystemMessage,
    tool: ToolMessage,
    plan: PlanMessage,
  };

  const MessageComponent = messageTypes[message.type] || AssistantMessage;

  return (
    <div className={`message-item ${message.type}`}>
      <MessageComponent
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        onCopyCode={onCopyCode}
        onRetry={onRetry}
      />
    </div>
  );
}