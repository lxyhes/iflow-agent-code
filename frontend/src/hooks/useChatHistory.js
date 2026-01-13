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
  // Initialize state from localStorage (Legacy behavior)
  const [chatMessages, setChatMessages] = useState(() => {
    if (initialMessages && initialMessages.length > 0) return initialMessages;
    
    if (selectedProject?.name) {
      // ChatInterface uses project name as the session key for the legacy storage
      const legacyKey = `chat_messages_${selectedProject.name}`;
      const saved = safeLocalStorage.getItem(legacyKey);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // 使用 ref 来保存保存函数，避免依赖项变化
  const saveRef = useRef(null);

  // 更新 saveRef
  useEffect(() => {
    saveRef.current = async (messages) => {
      if (!selectedProject || messages.length === 0) return;

      const legacyKey = selectedProject.name;
      const primaryKey = selectedSession?.id || currentSessionId;
      
      try {
        // Always save to legacy key for compatibility with ChatInterface
        if (legacyKey) {
          await chatStorage.saveMessages(legacyKey, messages);
        }
        
        // If we have a specific UUID, save there too (Future proofing)
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

  // 保存消息（防抖）
  useEffect(() => {
    if (!saveRef.current) return;

    const timeoutId = setTimeout(() => {
      saveRef.current(chatMessages);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [chatMessages]);

  // Load from IndexedDB on session/project change
  useEffect(() => {
    if (!selectedProject) return;

    console.log('[useChatHistory] Loading messages for project:', selectedProject.name, 'session:', selectedSession?.id || currentSessionId);

    // Determine which key to use
    // 1. Try specific session ID if available (New way)
    // 2. Fallback to Project Name (Old ChatInterface way)
    const primaryKey = selectedSession?.id || currentSessionId;
    const legacyKey = selectedProject.name;

    const loadMessages = async () => {
      let loaded = false;
      
      // 1. Try Primary Key (UUID) if it exists and is different from legacy
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

      // 2. If not loaded, try Legacy Key (Project Name)
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

      // 3. If still not loaded (and not initialized from localStorage), 
      // check localStorage again? (Already done in useState, but maybe for switching sessions)
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
    };

    loadMessages();
  }, [selectedProject, selectedSession, currentSessionId]);

  // Persist changes to IndexedDB (debounced)
  useEffect(() => {
    if (!selectedProject || chatMessages.length === 0) return;

    const timeoutId = setTimeout(() => {
      // Determine where to save
      const legacyKey = selectedProject.name;
      const primaryKey = selectedSession?.id || currentSessionId;
      
      // Always save to legacy key for compatibility with ChatInterface
      if (legacyKey) {
        chatStorage.saveMessages(legacyKey, chatMessages).catch(e => {
          console.error('Error saving to legacy key:', e);
        });
      }
      
      // If we have a specific UUID, save there too (Future proofing)
      if (primaryKey && primaryKey !== legacyKey) {
        chatStorage.saveMessages(primaryKey, chatMessages).catch(e => {
          console.error('Error saving to primary key:', e);
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [chatMessages, selectedProject, selectedSession, currentSessionId]);

  return [chatMessages, setChatMessages];
}
