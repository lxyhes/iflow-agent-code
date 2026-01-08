/**
 * ToolsSettings.jsx - 工具设置组件
 *
 * 管理允许和禁止的工具列表
 */

import React, { useState, useEffect } from 'react';
import { Badge, Input, Button } from '../ui';
import { Plus, X, Shield, AlertTriangle, Zap } from 'lucide-react';

const ToolsSettings = ({ toolsProvider, allowedTools, disallowedTools, onAllowedToolsChange, onDisallowedToolsChange, skipPermissions, onSkipPermissionsChange }) => {
  const [newAllowedTool, setNewAllowedTool] = useState('');
  const [newDisallowedTool, setNewDisallowedTool] = useState('');

  const commonTools = [
    'Bash(git log:*)',
    'Bash(git diff:*)',
    'Bash(git status)',
    'Bash(git branch)',
    'ReadFile(*)',
    'WriteFile(*)',
    'ListDirectory(*)',
    'SearchFiles(*)'
  ];

  const handleAddAllowedTool = () => {
    if (newAllowedTool.trim() && !allowedTools.includes(newAllowedTool.trim())) {
      onAllowedToolsChange([...allowedTools, newAllowedTool.trim()]);
      setNewAllowedTool('');
    }
  };

  const handleRemoveAllowedTool = (tool) => {
    onAllowedToolsChange(allowedTools.filter(t => t !== tool));
  };

  const handleAddDisallowedTool = () => {
    if (newDisallowedTool.trim() && !disallowedTools.includes(newDisallowedTool.trim())) {
      onDisallowedToolsChange([...disallowedTools, newDisallowedTool.trim()]);
      setNewDisallowedTool('');
    }
  };

  const handleRemoveDisallowedTool = (tool) => {
    onDisallowedToolsChange(disallowedTools.filter(t => t !== tool));
  };

  const handleAddCommonTool = (tool) => {
    if (!allowedTools.includes(tool)) {
      onAllowedToolsChange([...allowedTools, tool]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 工具提供者选择 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">工具提供者</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onToolsProviderChange?.('claude')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              toolsProvider === 'claude'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Claude
          </button>
          <button
            onClick={() => onToolsProviderChange?.('cursor')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              toolsProvider === 'cursor'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Cursor
          </button>
        </div>
      </div>

      {/* 跳过权限确认 */}
      <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">自动批准所有工具</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              跳过工具权限确认（YOLO 模式）
            </p>
          </div>
        </div>
        <button
          onClick={() => onSkipPermissionsChange(!skipPermissions)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            skipPermissions ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              skipPermissions ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* 允许的工具 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          允许的工具
        </h3>

        {/* 快捷添加常用工具 */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">常用工具:</p>
          <div className="flex flex-wrap gap-2">
            {commonTools.map((tool) => (
              <Badge
                key={tool}
                variant="outline"
                className="cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                onClick={() => handleAddCommonTool(tool)}
              >
                + {tool}
              </Badge>
            ))}
          </div>
        </div>

        {/* 添加新工具 */}
        <div className="flex gap-2 mb-3">
          <Input
            value={newAllowedTool}
            onChange={(e) => setNewAllowedTool(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddAllowedTool()}
            placeholder="输入工具模式（如 Bash(*)）"
            className="flex-1"
          />
          <Button onClick={handleAddAllowedTool} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* 已允许的工具列表 */}
        <div className="flex flex-wrap gap-2">
          {allowedTools.map((tool) => (
            <Badge
              key={tool}
              variant="secondary"
              className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            >
              {tool}
              <button
                onClick={() => handleRemoveAllowedTool(tool)}
                className="ml-2 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* 禁止的工具 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          禁止的工具
        </h3>

        {/* 添加新工具 */}
        <div className="flex gap-2 mb-3">
          <Input
            value={newDisallowedTool}
            onChange={(e) => setNewDisallowedTool(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDisallowedTool()}
            placeholder="输入工具模式（如 rm -rf）"
            className="flex-1"
          />
          <Button onClick={handleAddDisallowedTool} size="sm" variant="destructive">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* 已禁止的工具列表 */}
        <div className="flex flex-wrap gap-2">
          {disallowedTools.map((tool) => (
            <Badge
              key={tool}
              variant="secondary"
              className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            >
              {tool}
              <button
                onClick={() => handleRemoveDisallowedTool(tool)}
                className="ml-2 hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolsSettings;