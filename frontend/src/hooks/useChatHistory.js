import { useState, useEffect, useCallback, useRef } from 'react';
import { chatStorage } from '../utils/indexedDBStorage';

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
 * Hook to manage chat history loading and persistence
 * mimicking the exact behavior of the original ChatInterface
 */
export function useChatHistory(selectedProject, selectedSession, currentSessionId, initialMessages = []) {
  // 使用 ref 跟踪已加载的 key，避免重复加载
  const loadedKeyRef = useRef(null);
  const saveRef = useRef(null);

  // Initialize state from localStorage (Legacy behavior)
  const [chatMessages, setChatMessages] = useState(() => {
    if (initialMessages && initialMessages.length > 0) return initialMessages;
    
    if (selectedProject?.name) {
      const legacyKey = `chat_messages_${selectedProject.name}`;
      const saved = safeLocalStorage.getItem(legacyKey);
      loadedKeyRef.current = legacyKey;
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // 更新 saveRef
  useEffect(() => {
    saveRef.current = async (messages) => {
      if (!selectedProject || messages.length === 0) return;

      const legacyKey = selectedProject.name;
      const primaryKey = selectedSession?.id || currentSessionId;
      
      try {
        if (legacyKey) {
          await chatStorage.saveMessages(legacyKey, messages);
        }
        
        if (primaryKey && primaryKey !== legacyKey) {
          await chatStorage.saveMessages(primaryKey, messages);
        }
      } catch (e) {
        console.error('Error saving messages:', e);
      }
    };
  }, [selectedProject, selectedSession, currentSessionId]);

  // Sync with initialMessages prop when it changes
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setChatMessages(initialMessages);
    }
  }, [initialMessages]);

  // Load from IndexedDB on session/project change
  useEffect(() => {
    if (!selectedProject) return;

    const primaryKey = selectedSession?.id || currentSessionId;
    const legacyKey = selectedProject.name;
    const currentKey = primaryKey || legacyKey;

    // 避免重复加载同一个 key
    if (loadedKeyRef.current === currentKey) return;

    console.log('[useChatHistory] Loading messages for project:', selectedProject.name, 'session:', selectedSession?.id || currentSessionId);

    const loadMessages = async () => {
      let loaded = false;
      
      if (primaryKey && primaryKey !== legacyKey) {
        try {
          const msgs = await chatStorage.getMessages(primaryKey);
          if (msgs && msgs.length > 0) {
            console.log('[useChatHistory] Loaded from primary key:', primaryKey, 'messages:', msgs.length);
            setChatMessages(msgs);
            loaded = true;
          }
        } catch (e) {
          console.error('Error loading from primary key:', e);
        }
      }

      if (!loaded && legacyKey) {
        try {
          const msgs = await chatStorage.getMessages(legacyKey);
          if (msgs && msgs.length > 0) {
            console.log('[useChatHistory] Loaded from legacy key:', legacyKey, 'messages:', msgs.length);
            setChatMessages(msgs);
            loaded = true;
          }
        } catch (e) {
          console.error('Error loading from legacy key:', e);
        }
      }

      if (!loaded && legacyKey) {
         const saved = safeLocalStorage.getItem(`chat_messages_${legacyKey}`);
         if (saved) {
           try {
             const msgs = JSON.parse(saved);
             console.log('[useChatHistory] Loaded from localStorage:', legacyKey, 'messages:', msgs.length);
             setChatMessages(msgs);
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
