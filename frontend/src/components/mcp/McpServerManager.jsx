import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Tool,
  Loader
} from 'lucide-react';

/**
 * MCP 服务器管理组件
 */
const McpServerManager = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers');
      if (!response.ok) throw new Error('获取服务器失败');
      const data = await response.json();
      setServers(data.servers || getMockServers());
    } catch (error) {
      console.error('获取服务器失败:', error);
      setServers(getMockServers());
    } finally {
      setLoading(false);
    }
  };

  const getMockServers = () => [
    { id: 1, name: 'GitHub MCP', type: 'github', status: 'active', toolsDiscovered: ['get_pr', 'get_issue', 'create_comment'] },
    { id: 2, name: 'Notion MCP', type: 'notion', status: 'inactive', toolsDiscovered: [] },
    { id: 3, name: 'FileSystem MCP', type: 'filesystem', status: 'active', toolsDiscovered: ['read_file', 'write_file'] },
  ];

  const handleAddServer = async (serverData) => {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      });
      if (!response.ok) throw new Error('添加失败');
      fetchServers();
      setShowAddModal(false);
    } catch (error) {
      alert('添加失败：' + error.message);
    }
  };

  const handleDeleteServer = async (id) => {
    if (!confirm('确定要删除此服务器吗？')) return;
    try {
      await fetch(`/api/mcp/servers/${id}`, { method: 'DELETE' });
      fetchServers();
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  };

  const handleDiscoverTools = async (id) => {
    try {
      await fetch(`/api/mcp/servers/${id}/discover`, { method: 'POST' });
      fetchServers();
    } catch (error) {
      alert('发现工具失败：' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            MCP 服务器管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理 Model Context Protocol 服务器
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加服务器
        </button>
      </div>

      <div className="space-y-4">
        {servers.map(server => (
          <div
            key={server.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  server.status === 'active' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Server className={`w-6 h-6 ${
                    server.status === 'active' ? 'text-green-600' : 'text-gray-500'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {server.name}
                    </h3>
                    {server.status === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    类型：{server.type}
                  </p>
                  {server.toolsDiscovered && server.toolsDiscovered.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {server.toolsDiscovered.map((tool, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs flex items-center gap-1"
                        >
                          <Tool className="w-3 h-3" />
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDiscoverTools(server.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  title="发现工具"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteServer(server.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddMcpServerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddServer}
        />
      )}
    </div>
  );
};

/**
 * 添加 MCP 服务器模态框
 */
const AddMcpServerModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'github',
    endpoint: '',
    authType: 'api_key',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onAdd(formData);
      setSubmitting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          添加 MCP 服务器
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="例如：GitHub MCP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="github">GitHub</option>
                <option value="notion">Notion</option>
                <option value="slack">Slack</option>
                <option value="filesystem">文件系统</option>
                <option value="postgresql">PostgreSQL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">端点 URL</label>
              <input
                type="url"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              取消
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default McpServerManager;
