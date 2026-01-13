/**
 * ChatInterfaceMinimal - 最终优化版
 * 使用所有抽离的 hooks 和组件，保持极致简洁
 */

import React, { memo, useEffect, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import ChatMessage from './ChatMessage';
import ChatStatusBar from './ChatStatusBar';
import DeveloperTools from './DeveloperTools';
import ChatSearch from './ChatSearch';
import CommandMenu from './CommandMenu';
import NextTaskBanner from './NextTaskBanner.jsx';
import AutoFixPanel from './AutoFixPanel';
import ContextVisualizer from './ContextVisualizer';
import IFlowLogo from './IFlowLogo.jsx';
import CursorLogo from './CursorLogo.jsx';
import { api, authenticatedFetch } from '../utils/api';
import { retrieveRAG } from '../utils/rag';

// 导入自定义 hooks
import { useChatState } from '../hooks/useChatState';
import { useMessageActions } from '../hooks/useMessageActions';
import { useChatInput } from '../hooks/useChatInput';
import { useScrollManagement } from '../hooks/useScrollManagement';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// 导入 UI 组件
import ChatInput from './chat/ChatInput';
import ChatToolbar from './chat/ChatToolbar';
import EmptyState from './chat/EmptyState';
import MessageList from './chat/MessageList';

/**
 * 极简布局的 Chat 界面 - 最终优化版
 */
const ChatInterfaceMinimal = memo(({
  selectedProject,
  selectedSession,
  ws,
  sendMessage,
  messages,
  onFileOpen,
  onShowSettings,
  autoExpandTools,
  showRawParameters,
  showThinking,
  autoScrollToBottom,
  sendByCtrlEnter,
  // Session Protection Props
  onSessionActive,
  onSessionInactive,
  onSessionProcessing,
  onSessionNotProcessing,
  processingSessions,
  onReplaceTemporarySession,
  onNavigateToSession,
  externalMessageUpdate,
  aiPersona,
  onShowAllTasks
}) => {
  // 1. 状态管理
  const chatState = useChatState(selectedProject, selectedSession, messages);

  // 2. 消息操作
  const messageActions = useMessageActions(
    chatState.chatMessages,
    chatState.setChatMessages,
    selectedProject,
    selectedSession,
    chatState.currentSessionId,
    sendMessage,
    chatState.permissionMode
  );

  // 3. 滚动管理
  const scrollManagement = useScrollManagement(chatState.chatMessages, autoScrollToBottom);

  // 4. 输入框管理
  const inputState = useChatInput(
    selectedProject,
    selectedSession,
    chatState.currentSessionId,
    chatState.isLoading,
    sendByCtrlEnter,
    async (content, images) => {
      try {
        // 🔒 防止 selectedProject 为 null 时发送消息
        if (!selectedProject) {
          console.error('[ChatInterfaceMinimal] selectedProject is null, cannot send message');
          return;
        }

        if (content === '/clear') {
          if (window.confirm('Clear chat history?')) {
            chatState.clearChatHistory();
          }
          return;
        }

        // 捕获当前有效的项目信息（防止后续状态变化）
        const currentProjectName = selectedProject.name;
        const currentProjectPath = selectedProject.path || selectedProject.fullPath;

        // 1. 上传图片（如果有）
        let uploadedImages = [];
        if (images && images.length > 0) {
          const formData = new FormData();
          images.forEach(file => {
            formData.append('images', file);
          });

          try {
            const response = await authenticatedFetch(`/api/projects/${currentProjectName}/upload-images`, {
              method: 'POST',
              headers: {}, // Let browser set Content-Type for FormData
              body: formData
            });

            if (!response.ok) {
              throw new Error('Failed to upload images');
            }

            const result = await response.json();
            uploadedImages = result.images;
          } catch (error) {
            console.error('Image upload failed:', error);
            chatState.addErrorMessage(`Failed to upload images: ${error.message}`);
            return;
          }
        }

        // 2. 添加用户消息到列表
        chatState.addUserMessage(content, uploadedImages);

        // 3. RAG 检索（智能判断是否需要）
        let ragContext = '';
        const shouldUseRAG = (
          // 包含代码相关关键词
          /函数|类|方法|接口|实现|定义|import|from|require|export|module|component|service|api|endpoint|route/i.test(content) ||
          // 包含文件相关关键词
          /文件|文档|代码|项目|路径|目录/i.test(content) ||
          // 包含查找相关关键词
          /查找|搜索|哪里|如何|怎么|什么|哪个|哪个文件|在哪个|在哪里/i.test(content) ||
          // 包含问题相关关键词
          /为什么|怎么|如何|什么|哪个|哪里|何时|谁/i.test(content) ||
          // 输入较长（可能是复杂问题）
          content.length > 50
        );

        if (shouldUseRAG) {
          try {
            console.log('[ChatInterfaceMinimal] Starting RAG retrieval for:', content.substring(0, 50));
            const ragResultsData = await retrieveRAG(currentProjectName, content, 5, {
              alpha: 0.6, // 稍微偏向语义检索
            });

            if (ragResultsData && ragResultsData.results && ragResultsData.results.length > 0) {
              const ragResults = ragResultsData.results;

              // 过滤低相关性结果（相似度 < 0.3）
              const relevantResults = ragResults.filter(r => {
                const similarity = r.similarity !== undefined ? r.similarity : (1 - (r.distance || 1));
                return similarity > 0.3;
              });

              if (relevantResults.length > 0) {
                ragContext = '\n\n--- 相关项目文档（按相关性排序）---\n';
                relevantResults.forEach((result, index) => {
                  const similarity = result.similarity !== undefined 
                    ? result.similarity.toFixed(2) 
                    : (1 - (result.distance || 1)).toFixed(2);

                  ragContext += `\n[${index + 1}] ${result.metadata?.file_path || '未知文件'} (相关性: ${similarity})\n`;
                  ragContext += `${result.content}\n`;

                  // 添加代码结构信息
                  if (result.metadata?.structure) {
                    const structure = result.metadata.structure;
                    if (structure.functions && structure.functions.length > 0) {
                      ragContext += `  函数: ${structure.functions.join(', ')}\n`;
                    }
                    if (structure.classes && structure.classes.length > 0) {
                      ragContext += `  类: ${structure.classes.join(', ')}\n`;
                    }
                  }
                });
                ragContext += '--- 相关项目文档结束 ---\n';

                console.log(`[ChatInterfaceMinimal] RAG: Retrieved ${relevantResults.length} relevant documents`);
              } else {
                console.log('[ChatInterfaceMinimal] RAG: No relevant results found');
              }
            } else {
              console.log('[ChatInterfaceMinimal] RAG: No results returned');
            }
          } catch (error) {
            console.error('[ChatInterfaceMinimal] RAG retrieval failed:', error);
            // Don't fail the request if RAG fails - just log the error and continue
            // RAG 是可选功能，失败不应该阻止消息发送
          }
        }

        // 4. 设置加载状态
        chatState.setIsLoading(true);
        chatState.setCanAbortSession(true);

        // 5. 创建空的 AI 消息用于流式响应
        chatState.setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: '',
          isStreaming: true,
          timestamp: new Date()
        }]);

        // 6. 使用 SSE 流式响应（与 ChatInterface.jsx 一致）
        const sessionId = selectedSession?.id || `session-${Date.now()}`;
        const model = localStorage.getItem('iflow-model') || 'GLM-4.7';
        const streamUrl = `/stream?message=${encodeURIComponent(content + ragContext)}&cwd=${encodeURIComponent(currentProjectPath)}&sessionId=${encodeURIComponent(sessionId)}&project=${encodeURIComponent(currentProjectName)}&model=${encodeURIComponent(model)}`;

        const response = await fetch(streamUrl);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // 处理 SSE 格式: "data: {...}"
          for (const char of chunk) {
            partialData += char;
            if (partialData.endsWith('\n\n')) {
              const line = partialData.trim();
              partialData = '';

              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'content') {
                    // 追加内容到当前 AI 消息
                    chatState.setChatMessages(prev => {
                      const updated = [...prev];
                      const last = updated[updated.length - 1];
                      if (last && last.type === 'assistant' && last.isStreaming) {
                        last.content += data.content;
                      }
                      return updated;
                    });
                  } else if (data.type === 'tool_start') {
                    // 工具开始 - 添加工具卡片（使用 isToolUse 标记）
                    chatState.setChatMessages(prev => [...prev, {
                      id: `msg-${Date.now()}`,
                      type: 'assistant',
                      isToolUse: true,
                      toolName: data.tool_name,
                      toolType: data.tool_type,
                      toolLabel: data.label,
                      toolStatus: 'running',
                      agentInfo: data.agent_info,
                      timestamp: new Date()
                    }]);
                  } else if (data.type === 'tool_end') {
                    // 工具结束 - 更新工具卡片状态
                    chatState.setChatMessages(prev => {
                      const updated = [...prev];
                      // 找到最后一个匹配的工具卡片
                      for (let i = updated.length - 1; i >= 0; i--) {
                        if (updated[i].isToolUse && updated[i].toolName === data.tool_name && updated[i].toolStatus === 'running') {
                          updated[i] = { ...updated[i], toolStatus: data.status, agentInfo: data.agent_info };
                          break;
                        }
                      }
                      return updated;
                    });
                  } else if (data.type === 'plan') {
                    // 任务计划
                    chatState.setChatMessages(prev => [...prev, {
                      type: 'plan',
                      entries: data.entries || [],
                      timestamp: new Date()
                    }]);
                  } else if (data.type === 'error') {
                    // 错误
                    chatState.setChatMessages(prev => [...prev, {
                      type: 'error',
                      content: data.content,
                      timestamp: new Date()
                    }]);
                  } else if (data.type === 'done') {
                    // 任务完成
                    console.log(`Task finished with reason: ${data.stop_reason}`);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        }

        // 7. 结束流式响应
        chatState.setIsLoading(false);
        chatState.setCanAbortSession(false);
        chatState.setChatMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.isStreaming) {
            last.isStreaming = false;
          }
          return updated;
        });

      } catch (error) {
        console.error('Error sending message:', error);
        chatState.addErrorMessage(error);
        chatState.setIsLoading(false);
        chatState.setCanAbortSession(false);
      }
    }
  );

  // 5. 键盘快捷键
  useKeyboardShortcuts({
    isLoading: chatState.isLoading,
    canAbortSession: chatState.canAbortSession,
    onAbortSession: () => {
      // TODO: 实现 SSE 中断逻辑
      console.log('Abort session requested');
    },
    onOpenSearch: () => chatState.setShowSearch(true),
    onCloseSearch: () => chatState.setShowSearch(false),
    isSearchOpen: chatState.showSearch
  });

  // 同步 Session ID
  useEffect(() => {
    if (selectedSession?.id) {
      chatState.syncSessionId(selectedSession.id);
    }
  }, [selectedSession?.id, chatState.syncSessionId]);

  // 调试：追踪 selectedProject 变化
  useEffect(() => {
    console.log('[ChatInterfaceMinimal] selectedProject changed:', selectedProject?.name || 'null');
  }, [selectedProject]);

  // 搜索结果点击
  const handleSearchResultClick = useCallback((messageId) => {
    chatState.setShowSearch(false);
    scrollManagement.scrollToMessage(messageId);
  }, [chatState.setShowSearch, scrollManagement.scrollToMessage]);

  // 可用命令
  const availableCommands = [
    { name: '/clear', description: 'Clear chat history', namespace: 'builtin' },
    { name: '/reset', description: 'Reset session context', namespace: 'builtin' },
    { name: '/fix', description: 'Fix the last error', namespace: 'builtin' },
    { name: '/explain', description: 'Explain code', namespace: 'builtin' },
    { name: '/test', description: 'Generate unit tests', namespace: 'builtin' }
  ];

  const visibleMessages = chatState.getVisibleMessages();

  if (!selectedProject) {
    return <div className="flex items-center justify-center h-full text-gray-500">Select a project to start</div>;
  }

  return (
    <div className="h-full flex flex-col relative">
      <style>{`details[open] .details-chevron { transform: rotate(180deg); }`}</style>

      {/* 面板 */}
      {chatState.showAutoFix && (
        <AutoFixPanel
          error={chatState.autoFixError}
          onClose={() => chatState.setShowAutoFix(false)}
          onFix={inputState.setInput}
        />
      )}
      {chatState.showContextVisualizer && (
        <ContextVisualizer
          project={selectedProject}
          onClose={() => chatState.setShowContextVisualizer(false)}
        />
      )}

      {/* 任务进度 */}
      {chatState.taskStatus === 'running' && (
        <div className="px-4 pt-2">
          <NextTaskBanner
            taskName={chatState.currentTaskName}
            progress={chatState.taskProgress}
            status={chatState.taskStatus}
          />
        </div>
      )}

      {/* 消息列表或空状态 */}
      {visibleMessages.length === 0 ? (
        <EmptyState provider={chatState.provider} />
      ) : (
        <MessageList
          messages={visibleMessages}
          isLoading={chatState.isLoading}
          scrollContainerRef={scrollManagement.scrollContainerRef}
          autoExpandTools={autoExpandTools}
          showRawParameters={showRawParameters}
          showThinking={showThinking}
          selectedProject={selectedProject}
          onFileOpen={onFileOpen}
          onShowSettings={onShowSettings}
          messageActions={messageActions}
          provider={chatState.provider}
        />
      )}

      {/* 状态栏 */}
      <ChatStatusBar
        connectionState={chatState.connectionState}
        lastHeartbeat={chatState.lastHeartbeat}
        reconnectAttempts={chatState.reconnectAttempts}
        iflowStatus={chatState.iflowStatus}
        isLoading={chatState.isLoading}
        provider={chatState.provider}
        showThinking={showThinking}
        tokenBudget={chatState.tokenBudget}
        permissionMode={chatState.permissionMode}
        handleModeSwitch={chatState.handleModeSwitch}
        taskProgress={chatState.taskProgress}
        taskStatus={chatState.taskStatus}
        currentTaskName={chatState.currentTaskName}
        taskSteps={chatState.taskSteps}
        unreadMessages={chatState.unreadMessages}
        showNotifications={chatState.showNotifications}
        setShowNotifications={chatState.setShowNotifications}
        notifications={chatState.notifications}
        toggleNotifications={chatState.toggleNotifications}
        clearAllNotifications={chatState.clearAllNotifications}
        markNotificationAsRead={chatState.markNotificationAsRead}
        chatMessages={chatState.chatMessages}
        scrollContainerRef={scrollManagement.scrollContainerRef}
      />

      {/* 输入区域 */}
      <div className="flex items-center gap-3 w-full p-4">
        <ChatToolbar
          showMoreMenu={chatState.showMoreMenu}
          setShowMoreMenu={chatState.setShowMoreMenu}
        />
        <ChatInput
          input={inputState.input}
          isLoading={chatState.isLoading}
          textareaRef={inputState.textareaRef}
          getRootProps={inputState.getRootProps}
          getInputProps={inputState.getInputProps}
          handleInputChange={inputState.handleInputChange}
          handleKeyDown={inputState.handleKeyDown}
          handlePaste={inputState.handlePaste}
          handleSubmit={inputState.handleSubmit}
          isInputFocused={inputState.isInputFocused}
          setIsInputFocused={inputState.setIsInputFocused}
          provider={chatState.provider}
        />
      </div>

      {/* 弹出菜单 */}
      {chatState.showCommandMenu && (
        <div className="absolute bottom-24 left-4 z-50">
          <CommandMenu
            commands={availableCommands}
            searchTerm={chatState.commandSearchTerm}
            onClose={() => chatState.setShowCommandMenu(false)}
            onSelect={(cmd) => {
              inputState.setInput(cmd.value + ' ');
              chatState.setShowCommandMenu(false);
              inputState.textareaRef.current?.focus();
            }}
          />
        </div>
      )}
      {chatState.showMoreMenu && (
        <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 z-50">
          <DeveloperTools
            onInsertSnippet={(code) => inputState.setInput(prev => prev + code)}
            onInsertPrompt={(p) => inputState.setInput(prev => prev + p)}
          />
        </div>
      )}
      {chatState.showSearch && (
        <ChatSearch
          messages={chatState.chatMessages}
          allSessions={[]}
          favoritedMessages={messageActions.favoritedMessages}
          onResultClick={handleSearchResultClick}
          onClose={() => chatState.setShowSearch(false)}
        />
      )}
    </div>
  );
});

export default ChatInterfaceMinimal;