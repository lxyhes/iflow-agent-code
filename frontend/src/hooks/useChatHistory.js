import { useState, useEffect, useCallback, useRef } from 'react';
import { chatStorage } from '../utils/indexedDBStorage';
import { scopedKey, scopedSessionId } from '../utils/projectScope';

// Helper to access localStorage safely
const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return null;
    }
  }
};

/**
 * 清理格式错误的消息
 * 移除 content 为 undefined、null、"undefined" 字符串或包含错误消息的消息
 */
const cleanupMalformedMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  
  return messages.filter(msg => {
    if (!msg) return false;
    
    // 检查 content
    const content = msg.content;
    if (content == null) return false;
    
    const contentStr = String(content).trim();
    
    // 排除内容为 "undefined" 字符串或包含错误消息的消息
    if (contentStr === 'undefined' || 
        contentStr.startsWith('undefined:') ||
        contentStr.includes('Error:') ||
        contentStr.includes('HTTP')) {
      console.warn('[cleanupMalformedMessages] Filtering out malformed message:', contentStr.substring(0, 100));
      return false;
    }
    
    return true;
  });
};

/**
 * Hook to manage chat history loading and persistence
 * mimicking the exact behavior of the original ChatInterface
 */
export function useChatHistory(selectedProject, selectedSession, currentSessionId, initialMessages = []) {
  // 使用 ref 跟踪已加载的 key，避免重复加载
  const loadedKeyRef = useRef(null);
  const saveRef = useRef(null);

  // Initialize state from localStorage (Legacy behavior)
  const [chatMessages, setChatMessages] = useState(() => {
    if (initialMessages && initialMessages.length > 0) return cleanupMalformedMessages(initialMessages);
    
    if (selectedProject?.name) {
      const legacyKey = `chat_messages_${selectedProject.name}`;
      const saved = safeLocalStorage.getItem(legacyKey);
      loadedKeyRef.current = legacyKey;
      return saved ? cleanupMalformedMessages(JSON.parse(saved)) : [];
    }
    return [];
  });

  // 更新 saveRef
  useEffect(() => {
    saveRef.current = async (messages) => {
      if (!selectedProject || messages.length === 0) return;

      const projectLegacyKey = scopedKey(selectedProject, `project:${selectedProject.name}`);
      const sessionKey = selectedSession?.id || currentSessionId;
      const projectSessionKey = sessionKey ? scopedSessionId(selectedProject, sessionKey) : null;
      
      try {
        await chatStorage.saveMessages(projectLegacyKey, messages);
        if (projectSessionKey && projectSessionKey !== projectLegacyKey) {
          await chatStorage.saveMessages(projectSessionKey, messages);
        }
      } catch (e) {
        console.error('Error saving messages:', e);
      }
    };
  }, [selectedProject, selectedSession, currentSessionId]);

  // Sync with initialMessages prop when it changes
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setChatMessages(cleanupMalformedMessages(initialMessages));
    }
  }, [initialMessages]);

  // Load from IndexedDB on session/project change
  useEffect(() => {
    if (!selectedProject) return;

    const sessionKey = selectedSession?.id || currentSessionId;
    const projectLegacyKey = scopedKey(selectedProject, `project:${selectedProject.name}`);
    const projectSessionKey = sessionKey ? scopedSessionId(selectedProject, sessionKey) : null;
    const currentKey = projectSessionKey || projectLegacyKey;

    // 避免重复加载同一个 key
    if (loadedKeyRef.current === currentKey) return;

    console.log('[useChatHistory] Loading messages for project:', selectedProject.name, 'session:', selectedSession?.id || currentSessionId);

    const loadMessages = async () => {
      let loaded = false;
      
      // Check if this is a temporary new session
      const isNewSession = sessionKey && typeof sessionKey === 'string' && sessionKey.startsWith('new-session-');
      
      if (projectSessionKey && projectSessionKey !== projectLegacyKey) {
        try {
          const msgs = await chatStorage.getMessages(projectSessionKey);
          console.log('[useChatHistory] Loaded from primary key:', projectSessionKey, 'messages:', msgs?.length || 0);
          
          if (msgs && msgs.length > 0) {
            const cleanedMsgs = cleanupMalformedMessages(msgs);
            if (cleanedMsgs.length !== msgs.length) {
              console.log('[useChatHistory] Cleaned', msgs.length - cleanedMsgs.length, 'malformed messages');
            }
            setChatMessages(cleanedMsgs);
            loaded = true;
          } else if (isNewSession) {
            // Only force empty state for explicit new sessions
            // For existing sessions with no data, we want to fall back to legacy key
            setChatMessages([]);
            loaded = true;
          }
        } catch (e) {
          console.error('Error loading from primary key:', e);
        }
      }

      if (!loaded && projectLegacyKey) {
        try {
          const msgs = await chatStorage.getMessages(projectLegacyKey);
          if (msgs && msgs.length > 0) {
            const cleanedMsgs = cleanupMalformedMessages(msgs);
            if (cleanedMsgs.length !== msgs.length) {
              console.log('[useChatHistory] Cleaned', msgs.length - cleanedMsgs.length, 'malformed messages');
            }
            console.log('[useChatHistory] Loaded from legacy key:', projectLegacyKey, 'messages:', cleanedMsgs.length);
            setChatMessages(cleanedMsgs);
            loaded = true;
          }
        } catch (e) {
          console.error('Error loading from legacy key:', e);
        }
      }

      if (!loaded && selectedProject?.name) {
         const saved = safeLocalStorage.getItem(`chat_messages_${selectedProject.name}`);
         if (saved) {
           try {
             const msgs = JSON.parse(saved);
             const cleanedMsgs = cleanupMalformedMessages(msgs);
             if (cleanedMsgs.length !== msgs.length) {
               console.log('[useChatHistory] Cleaned', msgs.length - cleanedMsgs.length, 'malformed messages from localStorage');
             }
             console.log('[useChatHistory] Loaded from localStorage:', selectedProject.name, 'messages:', cleanedMsgs.length);
             setChatMessages(cleanedMsgs);
             try {
               await chatStorage.saveMessages(projectLegacyKey, cleanedMsgs);
             } catch (e) {}
           } catch(e) {}
         }
      }

      loadedKeyRef.current = currentKey;
    };

    loadMessages();
  }, [selectedProject, selectedSession, currentSessionId]);

  // 保存消息（防抖）
  useEffect(() => {
    if (!saveRef.current) return;

    const timeoutId = setTimeout(() => {
      saveRef.current(chatMessages);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [chatMessages]);

  return [chatMessages, setChatMessages];
}
