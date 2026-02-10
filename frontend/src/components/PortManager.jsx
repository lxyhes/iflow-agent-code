/**
 * PortManager.jsx - 端口管理组件
 * 
 * 功能特性：
 * - 多维度端口查询（单端口、多端口、端口范围）
 * - 现代化表格视图（Treeview实现，支持排序和多选）
 * - 进程深度管理（Kill/Restart，支持批量操作）
 * - 智能标签筛选系统（动态标签+自定义组）
 * - 实时连接监控（2秒扫描间隔）
 * - 分片渲染优化性能
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, RefreshCw, Trash2, Play, Filter, Tag, Plus, Save, FolderOpen } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const PortManager = () => {
  const { isDarkMode } = useTheme();
  // 状态管理
  const [portInput, setPortInput] = useState('');
  const [portData, setPortData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedPorts, setSelectedPorts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'port', direction: 'asc' });
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [customGroups, setCustomGroups] = useState(() => {
    const saved = localStorage.getItem('port-manager-groups');
    return saved ? JSON.parse(saved) : [
      { name: '数据库', ports: '3306,5432,6379,27017' },
      { name: 'Web服务', ports: '80,443,8080,8000,3000,5173' },
      { name: '后端API', ports: '8000,9000,5000,4000' }
    ];
  });
  const [activeTag, setActiveTag] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPorts, setNewGroupPorts] = useState('');
  const [scanLogs, setScanLogs] = useState([]);
  const [chunkSize] = useState(50); // 分片渲染大小
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentPortLogs, setCurrentPortLogs] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 添加日志
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setScanLogs(prev => [...prev.slice(-99), { time: timestamp, message, type }]);
  }, []);

  // 解析端口输入
  const parsePortInput = useCallback((input) => {
    const ports = new Set();
    
    input.split(',').forEach(part => {
      part = part.trim();
      if (!part) return;
      
      // 处理端口范围 (如 8000-9000)
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            if (i >= 1 && i <= 65535) {
              ports.add(i);
            }
          }
        }
      } else {
        // 单个端口
        const port = parseInt(part);
        if (!isNaN(port) && port >= 1 && port <= 65535) {
          ports.add(port);
        }
      }
    });
    
    return Array.from(ports).sort((a, b) => a - b);
  }, []);

  // 扫描端口
  const scanPorts = useCallback(async () => {
    if (!portInput.trim()) {
      addLog('请输入要扫描的端口', 'error');
      return;
    }

    const portsToScan = parsePortInput(portInput);
    if (portsToScan.length === 0) {
      addLog('无效的端口输入', 'error');
      return;
    }

    setIsScanning(true);
    addLog(`开始扫描 ${portsToScan.length} 个端口...`, 'info');

    try {
      const response = await fetch('/api/system/scan-ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ports: portsToScan })
      });

      if (!response.ok) {
        throw new Error(`扫描失败: ${response.statusText}`);
      }

      const data = await response.json();
      setPortData(data.results || []);
      setFilteredData(data.results || []);
      addLog(`扫描完成，发现 ${data.results.length} 个活跃端口`, 'success');
    } catch (error) {
      addLog(`扫描错误: ${error.message}`, 'error');
      console.error('Port scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [portInput, parsePortInput, addLog]);

  // 实时监控
  useEffect(() => {
    let interval;
    if (isScanning) {
      interval = setInterval(() => {
        scanPorts();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanPorts]);

  // 排序
  const sortData = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // 排序后的数据
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (!a[sortConfig.key]) return 1;
      if (!b[sortConfig.key]) return -1;
      
      if (sortConfig.key === 'port') {
        return sortConfig.direction === 'asc' 
          ? a.port - b.port 
          : b.port - a.port;
      }
      
      const aVal = String(a[sortConfig.key]).toLowerCase();
      const bVal = String(b[sortConfig.key]).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }, [filteredData, sortConfig]);

  // 分片渲染
  const paginatedData = sortedData;

  // 筛选逻辑
  const applyFilter = useCallback((tag) => {
    setActiveTag(tag);
    if (!tag) {
      setFilteredData(portData);
      return;
    }

    const group = customGroups.find(g => g.name === tag);
    if (group) {
      const groupPorts = parsePortInput(group.ports);
      setFilteredData(portData.filter(p => groupPorts.includes(p.port)));
    }
  }, [portData, customGroups, parsePortInput]);

  // 选中/取消选中
  const toggleSelection = useCallback((port) => {
    setSelectedPorts(prev => {
      if (prev.includes(port)) {
        return prev.filter(p => p !== port);
      } else {
        return [...prev, port];
      }
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedPorts.length === filteredData.length) {
      setSelectedPorts([]);
    } else {
      setSelectedPorts(filteredData.map(p => p.port));
    }
  }, [selectedPorts.length, filteredData]);

  // 终止进程
  const killProcess = useCallback(async (port) => {
    try {
      const response = await fetch('/api/system/kill-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      
      if (response.ok) {
        addLog(`已终止端口 ${port} 的进程`, 'success');
        scanPorts();
      } else {
        addLog(`终止进程失败: ${response.statusText}`, 'error');
      }
    } catch (error) {
      addLog(`错误: ${error.message}`, 'error');
    }
  }, [addLog, scanPorts]);

  // 重启进程
  const restartProcess = useCallback(async (port) => {
    try {
      addLog(`正在重启端口 ${port} 的服务...`, 'info');
      const response = await fetch('/api/system/restart-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog(data.message || `端口 ${port} 的服务已重启`, 'success');
        // 延迟后重新扫描，给服务启动时间
        setTimeout(() => scanPorts(), 3000);
      } else {
        addLog(`重启失败: ${data.message}`, 'error');
      }
    } catch (error) {
      addLog(`错误: ${error.message}`, 'error');
    }
  }, [addLog, scanPorts]);

  // 批量终止
  const killSelected = useCallback(async () => {
    if (selectedPorts.length === 0) {
      addLog('请先选择要终止的端口', 'error');
      return;
    }

    addLog(`正在终止 ${selectedPorts.length} 个进程...`, 'info');
    
    for (const port of selectedPorts) {
      await killProcess(port);
    }
    
    setSelectedPorts([]);
  }, [selectedPorts, killProcess, addLog]);

  // 批量重启
  const restartSelected = useCallback(async () => {
    if (selectedPorts.length === 0) {
      addLog('请先选择要重启的端口', 'error');
      return;
    }

    addLog(`正在重启 ${selectedPorts.length} 个服务...`, 'info');
    
    for (const port of selectedPorts) {
      await restartProcess(port);
    }
    
    setSelectedPorts([]);
  }, [selectedPorts, restartProcess, addLog]);

  // 保存自定义组
  const saveCustomGroup = useCallback(() => {
    if (!newGroupName.trim() || !newGroupPorts.trim()) {
      addLog('请输入组名称和端口', 'error');
      return;
    }

    const newGroup = {
      name: newGroupName.trim(),
      ports: newGroupPorts.trim()
    };

    setCustomGroups(prev => {
      // 检查是否已存在同名组
      if (prev.some(g => g.name === newGroup.name)) {
        addLog(`组名 "${newGroup.name}" 已存在`, 'error');
        return prev;
      }
      
      const updated = [...prev, newGroup];
      localStorage.setItem('port-manager-groups', JSON.stringify(updated));
      addLog(`已保存自定义组: ${newGroupName}`, 'success');
      return updated;
    });

    setNewGroupName('');
    setNewGroupPorts('');
    setShowGroupModal(false);
  }, [newGroupName, newGroupPorts, addLog]);

  // 删除自定义组
  const deleteCustomGroup = useCallback((groupName) => {
    setCustomGroups(prev => {
      const updated = prev.filter(g => g.name !== groupName);
      localStorage.setItem('port-manager-groups', JSON.stringify(updated));
      addLog(`已删除自定义组: ${groupName}`, 'success');
      
      // 如果删除的是当前激活的组，清除激活状态
      if (activeTag === groupName) {
        setActiveTag(null);
      }
      
      return updated;
    });
  }, [activeTag, addLog]);

  // 快速应用端口组
  const applyGroup = useCallback(async (group) => {
    const ports = group.ports;
    
    // 先更新状态
    setPortInput(ports);
    setActiveTag(group.name);
    setShowTagFilter(false);
    
    // 直接使用端口参数进行扫描，不依赖状态
    if (!ports.trim()) {
      addLog('端口组为空', 'error');
      return;
    }

    const portsToScan = parsePortInput(ports);
    if (portsToScan.length === 0) {
      addLog('无效的端口输入', 'error');
      return;
    }

    setIsScanning(true);
    addLog(`开始扫描端口组 "${group.name}" 的 ${portsToScan.length} 个端口...`, 'info');

    try {
      const response = await fetch('/api/system/scan-ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ports: portsToScan })
      });

      if (!response.ok) {
        throw new Error(`扫描失败: ${response.statusText}`);
      }

      const data = await response.json();
      setPortData(data.results || []);
      
      // 筛选结果
      setFilteredData(data.results || []);
      addLog(`扫描完成，发现 ${data.results.length} 个活跃端口`, 'success');
    } catch (error) {
      addLog(`扫描错误: ${error.message}`, 'error');
      console.error('Port scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [parsePortInput, addLog]);

  // 查看端口日志
  const viewPortLogs = useCallback(async (port) => {
    setLoadingLogs(true);
    setShowLogModal(true);
    setCurrentPortLogs('');
    
    try {
      addLog(`正在获取端口 ${port} 的日志...`, 'info');
      const response = await fetch(`/api/system/port-logs?port=${port}`);
      
      if (!response.ok) {
        throw new Error(`获取日志失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.logs) {
        setCurrentPortLogs(data.logs);
        addLog(`已加载端口 ${port} 的日志 (${data.logs.length} 字符)`, 'success');
      } else {
        setCurrentPortLogs(data.message || '未找到日志文件');
      }
    } catch (error) {
      setCurrentPortLogs(`错误: ${error.message}`);
      addLog(`获取日志错误: ${error.message}`, 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, [addLog]);

  // 渲染表格
  const renderTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              <th className={`p-3 text-left border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={selectedPorts.length === filteredData.length && filteredData.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4"
                />
              </th>
              <th 
                className={`p-3 text-left border-b cursor-pointer ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-200'}`}
                onClick={() => sortData('port')}
              >
                端口 {sortConfig.key === 'port' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className={`p-3 text-left border-b cursor-pointer ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-200'}`}
                onClick={() => sortData('pid')}
              >
                PID {sortConfig.key === 'pid' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className={`p-3 text-left border-b cursor-pointer ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-200'}`}
                onClick={() => sortData('processName')}
              >
                进程名 {sortConfig.key === 'processName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className={`p-3 text-left border-b cursor-pointer ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-200'}`}
                onClick={() => sortData('status')}
              >
                状态 {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className={`p-3 text-left border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="6" className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  暂无数据，请输入端口进行扫描
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr 
                  key={`${item.port}-${index}`}
                  className={`hover:opacity-80 ${index % 2 === 0 ? (isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50') : (isDarkMode ? 'bg-gray-800/30' : 'bg-white')}`}
                >
                  <td className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedPorts.includes(item.port)}
                      onChange={() => toggleSelection(item.port)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className={`p-3 border-b font-mono ${isDarkMode ? 'text-blue-400 border-gray-800' : 'text-blue-600 border-gray-200'}`}>
                    {item.port}
                  </td>
                  <td className={`p-3 border-b font-mono ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    {item.pid || '-'}
                  </td>
                  <td className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    {item.processName || '-'}
                  </td>
                  <td className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === 'listening' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status || 'unknown'}
                    </span>
                  </td>
                  <td className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => restartProcess(item.port)}
                        className="p-1 hover:bg-green-500/20 rounded text-green-400"
                        title="重启服务"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => killProcess(item.port)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        title="终止进程"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => viewPortLogs(item.port)}
                        className="p-1 hover:bg-blue-500/20 rounded text-blue-400"
                        title="查看日志"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col p-4 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FolderOpen size={24} />
          端口管理器
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGroupModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
          >
            <Plus size={16} />
            自定义组
          </button>
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
              isScanning 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                停止监控
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                开始监控
              </>
            )}
          </button>
        </div>
      </div>

      {/* 输入区 */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={portInput}
            onChange={(e) => setPortInput(e.target.value)}
            placeholder="输入端口 (如: 8000, 或 8000-9000, 或 8000,8001,8002)"
            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${
              isDarkMode 
                ? 'bg-gray-800 border border-gray-700 text-white' 
                : 'bg-white border border-gray-300 text-gray-900'
            }`}
            onKeyPress={(e) => e.key === 'Enter' && scanPorts()}
          />
        </div>
        <button
          onClick={scanPorts}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg flex items-center gap-2 text-white"
        >
          <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
          扫描
        </button>
        <button
          onClick={() => setShowTagFilter(!showTagFilter)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 text-white"
        >
          <Filter size={18} />
          筛选
        </button>
      </div>

      {/* 标签筛选 - 始终显示自定义组 */}
      <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Tag size={16} />
            <span className="text-sm font-medium">端口组:</span>
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>({customGroups.length} 个组)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={`text-xs ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-500'}`}
            >
              {showTagFilter ? '收起' : '展开'}
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
            >
              <Plus size={12} />
              新建组
            </button>
          </div>
        </div>
        
        {showTagFilter && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => applyFilter(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeTag === null 
                    ? 'bg-blue-600 text-white' 
                    : isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                全部
              </button>
              {customGroups.map(group => (
                <div key={group.name} className="flex items-center gap-1 group">
                  <button
                    onClick={() => applyGroup(group)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      activeTag === group.name 
                        ? 'bg-blue-600 text-white' 
                        : isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    title={`端口: ${group.ports}`}
                  >
                    {group.name}
                  </button>
                  <button
                    onClick={() => deleteCustomGroup(group.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-opacity"
                    title="删除组"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            
            {/* 显示当前选中的组的端口信息 */}
            {activeTag && customGroups.find(g => g.name === activeTag) && (
              <div className={`text-xs p-2 rounded ${isDarkMode ? 'text-gray-400 bg-gray-700/50' : 'text-gray-600 bg-gray-200'}`}>
                <span className="font-medium">{activeTag}:</span> {customGroups.find(g => g.name === activeTag).ports}
              </div>
            )}
          </>
        )}
        
        {/* 收起时显示的简化版 */}
        {!showTagFilter && customGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customGroups.map(group => (
              <button
                key={group.name}
                onClick={() => applyGroup(group)}
                className={`px-2 py-1 rounded-full text-xs ${
                  activeTag === group.name 
                    ? 'bg-blue-600 text-white' 
                    : isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={`端口: ${group.ports}`}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}
        
        {customGroups.length === 0 && (
          <div className={`text-xs text-center py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            暂无自定义组，点击"新建组"创建
          </div>
        )}
      </div>

      {/* 批量操作栏 */}
      {selectedPorts.length > 0 && (
        <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-300'}`}>
          <span className="text-sm">已选择 {selectedPorts.length} 个端口</span>
          <div className="flex gap-2">
            <button
              onClick={restartSelected}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1 text-white"
            >
              <Play size={14} />
              批量重启
            </button>
            <button
              onClick={killSelected}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm flex items-center gap-1 text-white"
            >
              <Trash2 size={14} />
              批量终止
            </button>
            <button
              onClick={() => setSelectedPorts([])}
              className={`px-3 py-1.5 rounded text-sm ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className={`flex gap-4 mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <span>总计: {portData.length}</span>
        <span>显示: {filteredData.length}</span>
        {activeTag && <span>筛选: {activeTag}</span>}
      </div>

      {/* 表格区域 */}
      <div className="flex-1 overflow-auto">
        {renderTable()}
      </div>

      {/* 日志区域 */}
      <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">扫描日志:</span>
        </div>
        <div className="h-24 overflow-y-auto text-xs font-mono space-y-1">
          {scanLogs.length === 0 ? (
            <div className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>暂无日志</div>
          ) : (
            scanLogs.map((log, index) => (
              <div 
                key={index}
                className={`${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-blue-400'
                }`}
              >
                [{log.time}] {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 自定义组模态框 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold mb-4">创建端口组</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">组名称</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={`w-full px-3 py-2 rounded focus:outline-none focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                  placeholder="如: 数据库"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">端口 (逗号分隔或范围)</label>
                <input
                  type="text"
                  value={newGroupPorts}
                  onChange={(e) => setNewGroupPorts(e.target.value)}
                  className={`w-full px-3 py-2 rounded focus:outline-none focus:border-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                  placeholder="如: 3306,5432 或 8000-9000"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveCustomGroup}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowGroupModal(false);
                    setNewGroupName('');
                    setNewGroupPorts('');
                  }}
                  className={`flex-1 px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日志查看模态框 */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg w-[800px] max-h-[80vh] overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">端口日志</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <X size={20} />
              </button>
            </div>
            <div className={`flex-1 overflow-auto p-4 rounded font-mono text-xs whitespace-pre-wrap ${isDarkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-800'}`}>
              {loadingLogs ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw size={24} className="animate-spin" />
                  <span className="ml-2">加载日志中...</span>
                </div>
              ) : currentPortLogs ? (
                currentPortLogs
              ) : (
                <div className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>暂无日志</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortManager;