/**
 * useMessageStream.js - 消息流处理 Hook
 *
 * 处理 WebSocket 消息流
 */

import { useEffect, useRef, useCallback } from 'react';

export const useMessageStream = ({
  ws,
  onTextChunk,
  onToolStart,
  onToolEnd,
  onPlan,
  onError,
  onComplete
}) => {
  const streamBufferRef = useRef('');

  useEffect(() => {
    if (!ws || !ws.current) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'content':
            // 文本内容
            if (onTextChunk) {
              onTextChunk(data.content);
            }
            break;

          case 'tool_start':
            // 工具开始
            if (onToolStart) {
              onToolStart({
                id: data.tool_id || Date.now(),
                tool_type: data.tool_type,
                tool_name: data.tool_name,
                label: data.label,
                status: 'running',
                parameters: data.parameters || {}
              });
            }
            break;

          case 'tool_end':
            // 工具结束
            if (onToolEnd) {
              onToolEnd({
                id: data.tool_id,
                tool_type: data.tool_type,
                tool_name: data.tool_name,
                status: data.status,
                result: data.result
              });
            }
            break;

          case 'plan':
            // 任务计划
            if (onPlan) {
              onPlan(data.entries || []);
            }
            break;

          case 'error':
            // 错误
            if (onError) {
              onError(data.content);
            }
            break;

          case 'done':
            // 完成
            if (onComplete) {
              onComplete();
            }
            break;

          default:
            console.log('未知消息类型:', data.type);
        }
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    };

    ws.current.addEventListener('message', handleMessage);

    return () => {
      if (ws.current) {
        ws.current.removeEventListener('message', handleMessage);
      }
    };
  }, [ws, onTextChunk, onToolStart, onToolEnd, onPlan, onError, onComplete]);

  return null;
};

export default useMessageStream;