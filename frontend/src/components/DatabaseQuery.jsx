/**
 * Database Query Component
 * 主数据库查询组件，整合所有子组件
 */

import React, { useState, useEffect } from 'react';
import { Database, Plus, Settings, X, AlertCircle } from 'lucide-react';
import SqlEditor from './database/SqlEditor';
import TableBrowser from './database/TableBrowser';
import QueryResult from './database/QueryResult';
import { authenticatedFetch } from '../utils/api';

const DatabaseQuery = ({ selectedProject: initialSelectedProject }) => {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [error, setError] = useState(null);
  
  // 新增：项目相关状态
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(initialSelectedProject?.name || null);
  const [projectDatabases, setProjectDatabases] = useState([]);
  const [isLoadingProjectDatabases, setIsLoadingProjectDatabases] = useState(false);
  
  // 新增：数据库类型相关状态
  const [dbType, setDbType] = useState('sqlite');
  const [dbConfig, setDbConfig] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  });
  
  // 新增：数据库配置相关状态
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [showSaveConfig, setShowSaveConfig] = useState(false);
  const [configName, setConfigName] = useState('');
  const [projectConfigs, setProjectConfigs] = useState([]); // 项目配置文件中的数据库连接
  
  // 数据库类型配置
  const databaseTypes = [
    { value: 'sqlite', label: 'SQLite', icon: '📄', description: '轻量级文件数据库' },
    { value: 'mysql', label: 'MySQL', icon: '🐬', description: '开源关系型数据库', defaultPort: 3306 },
    { value: 'postgresql', label: 'PostgreSQL', icon: '🐘', description: '高级开源关系型数据库', defaultPort: 5432 },
    { value: 'sqlserver', label: 'SQL Server', icon: '🔷', description: '微软企业级数据库', defaultPort: 1433 },
    { value: 'oracle', label: 'Oracle', icon: '🔴', description: '甲骨文企业级数据库', defaultPort: 1521 }
  ];

  useEffect(() => {
    loadConnections();
    loadTemplates();
    loadHistory();
    loadProjects();
  }, []);

  // 当选择项目时，加载保存的配置
  useEffect(() => {
    if (selectedProject) {
      loadSavedConfigs(selectedProject);
    }
  }, [selectedProject]);

  // 当 initialSelectedProject 变化时，自动加载该项目的数据库
  useEffect(() => {
    if (initialSelectedProject?.name && initialSelectedProject.name !== selectedProject) {
      setSelectedProject(initialSelectedProject.name);
      loadProjectDatabases(initialSelectedProject.name);
    }
  }, [initialSelectedProject?.name]);

  const loadConnections = async () => {
    try {
      const response = await authenticatedFetch('/api/database/connections');
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await authenticatedFetch('/api/database/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await authenticatedFetch('/api/database/history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await authenticatedFetch('/api/projects');
      const data = await response.json();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadProjectDatabases = async (projectName) => {
    if (!projectName) {
      setProjectDatabases([]);
      setProjectConfigs([]);
      return;
    }

    setIsLoadingProjectDatabases(true);
    try {
      const response = await authenticatedFetch(`/api/database/project-databases/${projectName}`);
      const data = await response.json();
      console.log('项目数据库数据:', data);
      
      setProjectDatabases(data.databases || []);
      
      // 提取配置文件中的数据库连接
      const dbConnections = [];
      if (data.configs) {
        console.log('配置文件数量:', data.configs.length);
        data.configs.forEach(config => {
          console.log('配置文件:', config.name, '数据库连接:', config.db_connections);
          if (config.db_connections && config.db_connections.length > 0) {
            config.db_connections.forEach(conn => {
              dbConnections.push({
                ...conn,
                source_file: config.name,
                source_type: config.type
              });
            });
          }
        });
      }
      console.log('最终数据库连接配置:', dbConnections);
      setProjectConfigs(dbConnections);
    } catch (error) {
      console.error('Failed to load project databases:', error);
      setProjectDatabases([]);
      setProjectConfigs([]);
    } finally {
      setIsLoadingProjectDatabases(false);
    }
  };

  const loadSavedConfigs = async (projectName) => {
    if (!projectName) {
      setSavedConfigs([]);
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/database/configs/${projectName}`);
      const data = await response.json();
      setSavedConfigs(data.configs || []);
    } catch (error) {
      console.error('Failed to load saved configs:', error);
      setSavedConfigs([]);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedProject || !configName.trim()) {
      setError('请选择项目并输入配置名称');
      return;
    }

    try {
      const configData = {
        project_name: selectedProject,
        config_name: configName.trim(),
        db_type: dbType,
        config: dbType === 'sqlite' ? { db_path: dbPath } : dbConfig
      };

      const response = await authenticatedFetch('/api/database/save-config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });

      const data = await response.json();

      if (data.success) {
        setShowSaveConfig(false);
        setConfigName('');
        loadSavedConfigs(selectedProject);
        setError(null);
      } else {
        setError(data.error || '保存配置失败');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setError('保存配置失败: ' + error.message);
    }
  };

  const handleLoadConfig = (config) => {
    setDbType(config.db_type);
    
    if (config.db_type === 'sqlite') {
      setDbPath(config.config.db_path);
    } else {
      setDbConfig(config.config);
    }
    
    setConnectionName(config.name);
    setShowSaveConfig(false);
  };

  const handleDeleteConfig = async (configName) => {
    if (!selectedProject) return;

    if (!confirm(`确定要删除配置 "${configName}" 吗？`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/database/config/${selectedProject}/${configName}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        loadSavedConfigs(selectedProject);
      } else {
        setError(data.error || '删除配置失败');
      }
    } catch (error) {
      console.error('Failed to delete config:', error);
      setError('删除配置失败: ' + error.message);
    }
  };

  const handleConnect = async () => {
    try {
      const connectData = {
        db_type: dbType,
        connection_name: connectionName
      };

      // 根据数据库类型添加不同的参数
      if (dbType === 'sqlite') {
        connectData.db_path = dbPath;
        if (!connectData.connection_name) {
          connectData.connection_name = dbPath.split(/[/\\]/).pop();
        }
      } else {
        connectData.host = dbConfig.host;
        connectData.port = parseInt(dbConfig.port);
        connectData.database = dbConfig.database;
        connectData.username = dbConfig.username;
        connectData.password = dbConfig.password;
        if (!connectData.connection_name) {
          connectData.connection_name = `${dbConfig.username}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
        }
      }

      const response = await authenticatedFetch('/api/database/connect', {
        method: 'POST',
        body: JSON.stringify(connectData)
      });

      const data = await response.json();

      if (data.success) {
        setShowConnectDialog(false);
        setDbPath('');
        setConnectionName('');
        setSelectedProject(null);
        setProjectDatabases([]);
        setDbType('sqlite');
        setDbConfig({ host: '', port: '', database: '', username: '', password: '' });
        loadConnections();
        setError(null);
      } else {
        setError(data.error || '连接失败');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      setError('连接失败: ' + error.message);
    }
  };

  const handleDisconnect = async (connectionName) => {
    try {
      const response = await authenticatedFetch(`/api/database/disconnect/${connectionName}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        if (selectedConnection === connectionName) {
          setSelectedConnection(null);
          setTables([]);
          setSelectedTable(null);
          setTableInfo(null);
        }
        loadConnections();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSelectConnection = async (connectionName) => {
    setSelectedConnection(connectionName);
    await loadTables(connectionName);
  };

  const loadTables = async (connectionName) => {
    try {
      const response = await authenticatedFetch(`/api/database/tables/${connectionName}`);
      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables([]);
    }
  };

  const handleSelectTable = async (tableName) => {
    setSelectedTable(tableName);
    await loadTableInfo(selectedConnection, tableName);
  };

  const loadTableInfo = async (connectionName, tableName) => {
    try {
      const encodedTableName = encodeURIComponent(tableName);
      const response = await authenticatedFetch(`/api/database/table/${connectionName}/${encodedTableName}`);
      const data = await response.json();
      setTableInfo(data);
    } catch (error) {
      console.error('Failed to load table info:', error);
      setTableInfo(null);
    }
  };

  const handleExecuteQuery = async () => {
    if (!selectedConnection) {
      setError('请先选择数据库连接');
      return;
    }

    if (!sqlQuery.trim()) {
      setError('请输入 SQL 查询语句');
      return;
    }

    setIsQueryLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/database/query', {
        method: 'POST',
        body: JSON.stringify({
          connection_name: selectedConnection,
          sql: sqlQuery
        })
      });

      const data = await response.json();

      if (data.success) {
        setQueryResult(data);
        loadHistory();
      } else {
        setQueryResult(data);
        setError(data.error || '查询失败');
      }
    } catch (error) {
      console.error('Failed to execute query:', error);
      setError('查询失败: ' + error.message);
    } finally {
      setIsQueryLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!queryResult || !queryResult.success) return;

    try {
      const response = await authenticatedFetch(
        `/api/database/export/${selectedConnection}/${format}?sql=${encodeURIComponent(sqlQuery)}`,
        {
          method: 'GET'
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const extensions = {
          csv: '.csv',
          json: '.json',
          excel: '.xlsx'
        };

        a.download = `query_result_${Date.now()}${extensions[format]}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export:', error);
      setError('导出失败: ' + error.message);
    }
  };

  const handleRefreshTables = () => {
    if (selectedConnection) {
      loadTables(selectedConnection);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">数据库查询工具</h1>
        </div>

        <div className="flex items-center space-x-3">
          {selectedConnection && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600/20 border border-blue-600 rounded">
              <span className="text-sm text-blue-400">{selectedConnection}</span>
              <button
                onClick={() => handleDisconnect(selectedConnection)}
                className="text-blue-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {connections.length > 0 && !selectedConnection && (
            <select
              value=""
              onChange={(e) => e.target.value && handleSelectConnection(e.target.value)}
              className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择连接...</option>
              {connections.map(conn => (
                <option key={conn} value={conn}>{conn}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowConnectDialog(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新建连接</span>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-600/20 border border-red-600 rounded flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* 左侧：表浏览器 */}
        <div className="w-80 flex-shrink-0">
          <TableBrowser
            tables={tables}
            selectedTable={selectedTable}
            onTableSelect={handleSelectTable}
            tableInfo={tableInfo}
            onRefresh={handleRefreshTables}
          />
        </div>

        {/* 右侧：编辑器和结果 */}
        <div className="flex-1 flex flex-col gap-6">
          {/* SQL 编辑器 */}
          <div className="h-96">
            <SqlEditor
              value={sqlQuery}
              onChange={setSqlQuery}
              onExecute={handleExecuteQuery}
              templates={templates}
              history={history}
              placeholder="输入 SQL 查询语句，例如: SELECT * FROM users LIMIT 10;"
            />
          </div>

          {/* 查询结果 */}
          <div className="flex-1">
            <QueryResult
              result={queryResult}
              onExport={handleExport}
              isLoading={isQueryLoading}
            />
          </div>
        </div>
      </div>

      {/* 连接对话框 */}
      {showConnectDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">连接数据库</h2>
              <button
                onClick={() => setShowConnectDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 数据库类型选择器 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  数据库类型
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {databaseTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setDbType(type.value);
                        if (type.defaultPort) {
                          setDbConfig(prev => ({ ...prev, port: type.defaultPort.toString() }));
                        }
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        dbType === type.value
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-xs font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {databaseTypes.find(t => t.value === dbType)?.description}
                </p>
              </div>

              {/* 项目选择器 - 所有数据库类型都支持 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择项目（可选）
                </label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => {
                    const projectName = e.target.value;
                    setSelectedProject(projectName);
                    // 总是加载项目配置，不管当前是什么数据库类型
                    loadProjectDatabases(projectName);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择项目...</option>
                  {projects.map(project => (
                    <option key={project.name} value={project.name}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  选择项目后，可以保存数据库配置到该项目
                </p>
              </div>

              {/* 已保存的配置 */}
              {selectedProject && savedConfigs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    已保存的配置
                  </label>
                  <div className="space-y-2">
                    {savedConfigs.map((config) => (
                      <div key={config.name} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{config.name}</div>
                          <div className="text-xs text-gray-400">
                            {config.db_type.toUpperCase()} - {new Date(config.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLoadConfig(config)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                          >
                            加载
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(config.name)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 配置文件中的数据库连接 - 对所有数据库类型显示 */}
              {selectedProject && projectConfigs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    配置文件中的数据库连接
                  </label>
                  <div className="space-y-2">
                    {projectConfigs.map((conn, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                        onClick={() => {
                          console.log('=== 点击配置连接 ===');
                          console.log('完整连接对象:', JSON.stringify(conn, null, 2));
                          console.log('连接名称:', conn.name);
                          console.log('连接类型:', conn.type);
                          console.log('配置对象:', conn.config);
                          
                          // 设置数据库类型
                          const dbTypeToSet = conn.type === 'unknown' ? 'mysql' : conn.type;
                          console.log('设置数据库类型:', dbTypeToSet);
                          setDbType(dbTypeToSet);
                          
                          // 设置数据库配置
                          if (conn.config && Object.keys(conn.config).length > 0) {
                            const newConfig = {
                              host: conn.config.host || '',
                              port: conn.config.port || '',
                              database: conn.config.database || conn.config.dbname || conn.config.name || '',
                              username: conn.config.user || conn.config.username || '',
                              password: conn.config.password || ''
                            };
                            console.log('设置数据库配置:', newConfig);
                            setDbConfig(newConfig);
                            
                            // 设置连接名称
                            if (!connectionName) {
                              console.log('设置连接名称:', conn.name);
                              setConnectionName(conn.name);
                            }
                          } else {
                            console.warn('配置数据为空或无效:', conn);
                            alert('配置数据为空，无法加载');
                          }
                          console.log('=== 点击配置连接结束 ===');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-white">
                                {conn.name}
                              </div>
                              {conn.source_type && (
                                <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                                  {conn.source_type.toUpperCase()}
                                </span>
                              )}
                              {conn.source_file.includes('.dev.') && (
                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                                  DEV
                                </span>
                              )}
                              {conn.source_file.includes('.pro.') && (
                                <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded">
                                  PRO
                                </span>
                              )}
                              {conn.source_file.includes('.test.') && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                                  TEST
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              来源: {conn.source_file}
                            </div>
                            {conn.config && (
                              <div className="text-xs text-gray-400 mt-1">
                                {conn.config.host && `${conn.config.host}:${conn.config.port}`}
                                {conn.config.database && ` / ${conn.config.database}`}
                              </div>
                            )}
                          </div>
                          <div className="text-blue-400 text-xs ml-2">点击加载</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SQLite 特定配置 */}
              {dbType === 'sqlite' && (
                <>
                  {/* 数据库选择器 */}
                  {selectedProject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        选择项目数据库
                      </label>
                      {isLoadingProjectDatabases ? (
                        <div className="text-sm text-gray-400">加载中...</div>
                      ) : projectDatabases.length > 0 ? (
                        <select
                          value={dbPath}
                          onChange={(e) => {
                            const selectedDb = projectDatabases.find(db => db.full_path === e.target.value);
                            setDbPath(e.target.value);
                            if (selectedDb && !connectionName) {
                              setConnectionName(selectedDb.name);
                            }
                          }}
                          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">选择数据库...</option>
                          {projectDatabases.map(db => (
                            <option key={db.full_path} value={db.full_path}>
                              {db.name} ({db.path}) - {(db.size / 1024).toFixed(2)} KB
                              {!db.is_valid && ' ⚠️ 无效'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-400">项目中未找到数据库文件</div>
                      )}
                    </div>
                  )}

                  {/* 手动输入路径 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      或手动输入数据库路径
                    </label>
                    <input
                      type="text"
                      value={dbPath}
                      onChange={(e) => setDbPath(e.target.value)}
                      placeholder="例如: /path/to/database.db"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* 其他数据库类型配置 */}
              {dbType !== 'sqlite' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      主机地址
                    </label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="例如: localhost"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      端口
                    </label>
                    <input
                      type="number"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="例如: 3306"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      数据库名称
                    </label>
                    <input
                      type="text"
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, database: e.target.value }))}
                      placeholder="例如: mydb"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={dbConfig.username}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="例如: root"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      密码
                    </label>
                    <input
                      type="password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 连接名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  连接名称（可选）
                </label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="例如: My Database"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => setShowSaveConfig(true)}
                disabled={!selectedProject || (
                  dbType === 'sqlite' ? !dbPath :
                  !dbConfig.host || !dbConfig.port || !dbConfig.database || !dbConfig.username || !dbConfig.password
                )}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存配置
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowConnectDialog(false);
                    setSelectedProject(null);
                    setProjectDatabases([]);
                    setDbPath('');
                    setConnectionName('');
                    setDbType('sqlite');
                    setDbConfig({ host: '', port: '', database: '', username: '', password: '' });
                    setSavedConfigs([]);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConnect}
                  disabled={
                    dbType === 'sqlite' ? !dbPath :
                    !dbConfig.host || !dbConfig.port || !dbConfig.database || !dbConfig.username || !dbConfig.password
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  连接
                </button>
              </div>
            </div>
            
            {/* 保存配置对话框 */}
            {showSaveConfig && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">保存数据库配置</h2>
                    <button
                      onClick={() => setShowSaveConfig(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        配置名称
                      </label>
                      <input
                        type="text"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        placeholder="例如: 生产环境 MySQL"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowSaveConfig(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      disabled={!configName.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseQuery;