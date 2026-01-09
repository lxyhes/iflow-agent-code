/**
 * IndexedDB Storage Service
 * 
 * Provides a robust storage solution for chat messages and other data
 * using IndexedDB instead of localStorage to avoid quota limitations.
 */

import { openDB } from 'idb';

const DB_NAME = 'IFlowChatDB';
const DB_VERSION = 2; // Increment version to force database recreation
const STORES = {
  MESSAGES: 'messages',
  DRAFTS: 'drafts',
  SETTINGS: 'settings'
};

// Database schema
const DB_SCHEMA = {
  [STORES.MESSAGES]: {
    keyPath: 'id',
    indexes: [
      { name: 'sessionId', keyPath: 'sessionId' },
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'sessionId_timestamp', keyPath: ['sessionId', 'timestamp'] }
    ]
  },
  [STORES.DRAFTS]: {
    keyPath: 'sessionId',
    indexes: []
  },
  [STORES.SETTINGS]: {
    keyPath: 'key',
    indexes: []
  }
};

let db = null;

/**
 * Initialize the IndexedDB database
 */
async function initDB() {
  if (db) return db;

  try {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Delete all existing stores to ensure clean state
        const storeNames = Array.from(db.objectStoreNames);
        storeNames.forEach(storeName => {
          console.log(`Deleting old store: ${storeName}`);
          db.deleteObjectStore(storeName);
        });
        
        // Create stores with new schema
        Object.entries(DB_SCHEMA).forEach(([storeName, schema]) => {
          console.log(`Creating store: ${storeName}`);
          const store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
          
          // Create indexes
          if (schema.indexes && schema.indexes.length > 0) {
            schema.indexes.forEach(index => {
              console.log(`Creating index: ${index.name} on ${storeName}`);
              store.createIndex(index.name, index.keyPath);
            });
          }
        });
      },
      blocked() {
        console.warn('IndexedDB is blocked by another tab');
      },
      blocking() {
        console.warn('This tab is blocking IndexedDB upgrades in other tabs');
      }
    });

    console.log('IndexedDB initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
}

/**
 * Chat Messages Storage
 */
export const chatStorage = {
  /**
   * Get all messages for a session
   */
  async getMessages(sessionId) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.MESSAGES, 'readonly');
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('sessionId');
      
      const messages = await index.getAll(sessionId);
      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  },

  /**
   * Save messages for a session (replaces all existing messages)
   */
  async saveMessages(sessionId, messages) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);
      
      // Clear existing messages for this session
      const index = store.index('sessionId');
      const existingMessages = await index.getAll(sessionId);
      
      await Promise.all(
        existingMessages.map(msg => store.delete(msg.id))
      );
      
      // Add new messages
      const messagesWithIds = messages.map((msg, idx) => ({
        id: msg.id || `${sessionId}_${msg.timestamp}_${idx}`,
        sessionId,
        ...msg
      }));
      
      await Promise.all(
        messagesWithIds.map(msg => store.put(msg))
      );
      
      await tx.done;
      console.log(`Saved ${messages.length} messages for session ${sessionId}`);
    } catch (error) {
      console.error('Failed to save messages:', error);
      throw error;
    }
  },

  /**
   * Append a single message to a session
   */
  async appendMessage(sessionId, message) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);
      
      const messageWithId = {
        id: message.id || `${sessionId}_${message.timestamp}_${Date.now()}`,
        sessionId,
        ...message
      };
      
      await store.put(messageWithId);
      await tx.done;
      
      return messageWithId;
    } catch (error) {
      console.error('Failed to append message:', error);
      throw error;
    }
  },

  /**
   * Delete all messages for a session
   */
  async deleteMessages(sessionId) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('sessionId');
      
      const messages = await index.getAll(sessionId);
      await Promise.all(
        messages.map(msg => store.delete(msg.id))
      );
      
      await tx.done;
      console.log(`Deleted messages for session ${sessionId}`);
    } catch (error) {
      console.error('Failed to delete messages:', error);
      throw error;
    }
  },

  /**
   * Get all session IDs
   */
  async getAllSessionIds() {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.MESSAGES, 'readonly');
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('sessionId');
      
      const messages = await index.getAll();
      const sessionIds = new Set(messages.map(msg => msg.sessionId));
      return Array.from(sessionIds);
    } catch (error) {
      console.error('Failed to get session IDs:', error);
      return [];
    }
  },

  /**
   * Get storage usage statistics
   */
  async getStorageInfo() {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.MESSAGES, 'readonly');
      const store = tx.objectStore(STORES.MESSAGES);
      
      const count = await store.count();
      const sessions = await this.getAllSessionIds();
      
      // Estimate size (rough approximation)
      const allMessages = await store.getAll();
      const estimatedSize = new Blob([JSON.stringify(allMessages)]).size;
      
      return {
        totalMessages: count,
        totalSessions: sessions.length,
        estimatedSizeBytes: estimatedSize,
        estimatedSizeMB: (estimatedSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
};

/**
 * Draft Storage
 */
export const draftStorage = {
  /**
   * Save draft for a session
   */
  async saveDraft(sessionId, draft) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.DRAFTS, 'readwrite');
      const store = tx.objectStore(STORES.DRAFTS);
      
      await store.put({
        sessionId,
        content: draft,
        timestamp: Date.now()
      });
      
      await tx.done;
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  },

  /**
   * Get draft for a session
   */
  async getDraft(sessionId) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.DRAFTS, 'readonly');
      const store = tx.objectStore(STORES.DRAFTS);
      
      const draft = await store.get(sessionId);
      return draft ? draft.content : '';
    } catch (error) {
      console.error('Failed to get draft:', error);
      return '';
    }
  },

  /**
   * Delete draft for a session
   */
  async deleteDraft(sessionId) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.DRAFTS, 'readwrite');
      const store = tx.objectStore(STORES.DRAFTS);
      
      await store.delete(sessionId);
      await tx.done;
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }
};

/**
 * Settings Storage
 */
export const settingsStorage = {
  /**
   * Save a setting
   */
  async setSetting(key, value) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      
      await store.put({
        key,
        value,
        timestamp: Date.now()
      });
      
      await tx.done;
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  },

  /**
   * Get a setting
   */
  async getSetting(key, defaultValue = null) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      
      const setting = await store.get(key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  },

  /**
   * Delete a setting
   */
  async deleteSetting(key) {
    try {
      const database = await initDB();
      const tx = database.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      
      await store.delete(key);
      await tx.done;
    } catch (error) {
      console.error('Failed to delete setting:', error);
    }
  }
};

/**
 * Clear all data (useful for testing or reset)
 */
export async function clearAllData() {
  try {
    const database = await initDB();
    const tx = database.transaction([STORES.MESSAGES, STORES.DRAFTS, STORES.SETTINGS], 'readwrite');
    
    await Promise.all([
      tx.objectStore(STORES.MESSAGES).clear(),
      tx.objectStore(STORES.DRAFTS).clear(),
      tx.objectStore(STORES.SETTINGS).clear()
    ]);
    
    await tx.done;
    console.log('All data cleared from IndexedDB');
  } catch (error) {
    console.error('Failed to clear data:', error);
    throw error;
  }
}

/**
 * Migration utility to migrate data from localStorage to IndexedDB
 */
export async function migrateFromLocalStorage() {
  try {
    console.log('Starting migration from localStorage to IndexedDB...');
    
    // Migrate chat messages
    const chatKeys = Object.keys(localStorage).filter(key => key.startsWith('chat_messages_'));
    
    for (const key of chatKeys) {
      try {
        const sessionId = key.replace('chat_messages_', '');
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (messages.length > 0) {
          await chatStorage.saveMessages(sessionId, messages);
          console.log(`Migrated ${messages.length} messages for session ${sessionId}`);
          
          // Remove from localStorage after successful migration
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`Failed to migrate ${key}:`, error);
      }
    }
    
    // Migrate drafts
    const draftKeys = Object.keys(localStorage).filter(key => key.startsWith('draft_input_'));
    
    for (const key of draftKeys) {
      try {
        const sessionId = key.replace('draft_input_', '');
        const draft = localStorage.getItem(key);
        
        if (draft) {
          await draftStorage.saveDraft(sessionId, draft);
          console.log(`Migrated draft for session ${sessionId}`);
          
          // Remove from localStorage after successful migration
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`Failed to migrate draft ${key}:`, error);
      }
    }
    
    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

export default {
  initDB,
  chatStorage,
  draftStorage,
  settingsStorage,
  clearAllData,
  migrateFromLocalStorage
};