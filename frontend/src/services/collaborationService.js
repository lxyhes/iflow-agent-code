/**
 * 协作服务 - 实时协作功能
 * 使用 WebSocket 实现多用户实时同步
 */

class CollaborationService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.currentProject = null;
    this.currentUser = null;
    this.collaborators = new Map();
    this.pendingOperations = [];
    this.isProcessingOperations = false;
  }

  /**
   * 连接到协作服务器
   */
  connect(projectId, user) {
    if (this.ws) {
      this.disconnect();
    }

    this.currentProject = projectId;
    this.currentUser = user;

    const wsUrl = `ws://localhost:8000/ws/collaboration/${projectId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('协作服务连接成功');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._emit('connected', { projectId, user });
      
      // 发送用户加入消息
      this._send({
        type: 'user_join',
        project: projectId,
        user: user
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this._handleMessage(message);
      } catch (error) {
        console.error('解析协作消息失败:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('协作服务错误:', error);
      this._emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('协作服务连接关闭');
      this.isConnected = false;
      this._emit('disconnected');
      
      // 自动重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect(projectId, user);
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      // 发送用户离开消息
      this._send({
        type: 'user_leave',
        project: this.currentProject,
        user: this.currentUser
      });
      
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.collaborators.clear();
    }
  }

  /**
   * 发送消息
   */
  _send(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('协作服务未连接，消息未发送:', message);
    }
  }

  /**
   * 处理接收到的消息
   */
  _handleMessage(message) {
    switch (message.type) {
      case 'user_join':
        this._handleUserJoin(message);
        break;
      case 'user_leave':
        this._handleUserLeave(message);
        break;
      case 'cursor_update':
        this._handleCursorUpdate(message);
        break;
      case 'operation':
        this._handleOperation(message);
        break;
      case 'operation_ack':
        this._handleOperationAck(message);
        break;
      case 'chat_message':
        this._handleChatMessage(message);
        break;
      case 'sync_request':
        this._handleSyncRequest(message);
        break;
      case 'sync_response':
        this._handleSyncResponse(message);
        break;
      default:
        console.warn('未知消息类型:', message.type);
    }
  }

  /**
   * 处理用户加入
   */
  _handleUserJoin(message) {
    const { user } = message;
    this.collaborators.set(user.id, {
      ...user,
      joinedAt: new Date()
    });
    this._emit('user_join', user);
  }

  /**
   * 处理用户离开
   */
  _handleUserLeave(message) {
    const { userId } = message;
    this.collaborators.delete(userId);
    this._emit('user_leave', userId);
  }

  /**
   * 处理光标更新
   */
  _handleCursorUpdate(message) {
    const { userId, position } = message;
    const collaborator = this.collaborators.get(userId);
    if (collaborator) {
      collaborator.cursor = position;
      this._emit('cursor_update', { userId, position });
    }
  }

  /**
   * 处理操作（文本编辑等）
   */
  _handleOperation(message) {
    const { operation } = message;
    this.pendingOperations.push(operation);
    this._processPendingOperations();
    this._emit('operation', operation);
  }

  /**
   * 处理操作确认
   */
  _handleOperationAck(message) {
    const { operationId } = message;
    this._emit('operation_ack', { operationId });
  }

  /**
   * 处理聊天消息
   */
  _handleChatMessage(message) {
    const { user, content } = message;
    this._emit('chat_message', { user, content, timestamp: new Date() });
  }

  /**
   * 处理同步请求
   */
  _handleSyncRequest(message) {
    this._emit('sync_request', message);
  }

  /**
   * 处理同步响应
   */
  _handleSyncResponse(message) {
    const { state } = message;
    this._emit('sync_response', state);
  }

  /**
   * 处理待处理操作
   */
  async _processPendingOperations() {
    if (this.isProcessingOperations || this.pendingOperations.length === 0) {
      return;
    }

    this.isProcessingOperations = true;

    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      try {
        await this._applyOperation(operation);
      } catch (error) {
        console.error('应用操作失败:', error);
      }
    }

    this.isProcessingOperations = false;
  }

  /**
   * 应用操作
   */
  async _applyOperation(operation) {
    // 根据操作类型应用不同的逻辑
    switch (operation.type) {
      case 'text_insert':
        // 处理文本插入
        break;
      case 'text_delete':
        // 处理文本删除
        break;
      case 'cursor_move':
        // 处理光标移动
        break;
      default:
        console.warn('未知操作类型:', operation.type);
    }
  }

  /**
   * 更新光标位置
   */
  updateCursor(position) {
    if (!this.isConnected) return;

    this._send({
      type: 'cursor_update',
      project: this.currentProject,
      user: this.currentUser,
      position
    });
  }

  /**
   * 发送操作
   */
  sendOperation(operation) {
    if (!this.isConnected) return;

    this._send({
      type: 'operation',
      project: this.currentProject,
      user: this.currentUser,
      operation
    });
  }

  /**
   * 发送聊天消息
   */
  sendChatMessage(content) {
    if (!this.isConnected) return;

    this._send({
      type: 'chat_message',
      project: this.currentProject,
      user: this.currentUser,
      content
    });
  }

  /**
   * 请求同步
   */
  requestSync() {
    if (!this.isConnected) return;

    this._send({
      type: 'sync_request',
      project: this.currentProject,
      user: this.currentUser
    });
  }

  /**
   * 发送同步响应
   */
  sendSyncResponse(state) {
    if (!this.isConnected) return;

    this._send({
      type: 'sync_response',
      project: this.currentProject,
      user: this.currentUser,
      state
    });
  }

  /**
   * 添加事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 获取协作者列表
   */
  getCollaborators() {
    return Array.from(this.collaborators.values());
  }

  /**
   * 检查是否连接
   */
  getStatus() {
    return {
      connected: this.isConnected,
      project: this.currentProject,
      user: this.currentUser,
      collaborators: this.getCollaborators(),
      pendingOperations: this.pendingOperations.length
    };
  }
}

// 创建单例
const collaborationService = new CollaborationService();

export default collaborationService;