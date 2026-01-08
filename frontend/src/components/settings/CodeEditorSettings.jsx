/**
 * CodeEditorSettings.jsx - 代码编辑器设置组件
 *
 * 管理代码编辑器的显示设置
 */

import React, { useEffect } from 'react';
import { Input, Button } from '../ui';
import { Settings as SettingsIcon } from 'lucide-react';

const CodeEditorSettings = ({
  theme,
  onThemeChange,
  wordWrap,
  onWordWrapChange,
  showMinimap,
  onShowMinimapChange,
  showLineNumbers,
  onShowLineNumbersChange,
  fontSize,
  onFontSizeChange
}) => {
  useEffect(() => {
    localStorage.setItem('codeEditorTheme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('codeEditorWordWrap', wordWrap);
  }, [wordWrap]);

  useEffect(() => {
    localStorage.setItem('codeEditorShowMinimap', showMinimap);
  }, [showMinimap]);

  useEffect(() => {
    localStorage.setItem('codeEditorLineNumbers', showLineNumbers);
  }, [showLineNumbers]);

  useEffect(() => {
    localStorage.setItem('codeEditorFontSize', fontSize);
  }, [fontSize]);

  const themes = [
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
    { value: 'monokai', label: 'Monokai' },
    { value: 'dracula', label: 'Dracula' },
    { value: 'github', label: 'GitHub' },
    { value: 'vscode', label: 'VS Code' }
  ];

  const fontSizes = ['12', '13', '14', '15', '16', '17', '18', '20'];

  return (
    <div className="space-y-6">
      {/* 主题选择 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <SettingsIcon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">编辑器主题</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => onThemeChange(t.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === t.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 字体大小 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">字体大小</h3>
        <div className="flex gap-2">
          {fontSizes.map((size) => (
            <button
              key={size}
              onClick={() => onFontSizeChange(size)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                fontSize === size
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {size}px
            </button>
          ))}
        </div>
      </div>

      {/* 显示选项 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">显示选项</h3>

        {/* 自动换行 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">自动换行</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              长行自动换行显示
            </p>
          </div>
          <button
            onClick={() => onWordWrapChange(!wordWrap)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              wordWrap ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                wordWrap ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 显示缩略图 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">显示缩略图</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              在右侧显示代码缩略图
            </p>
          </div>
          <button
            onClick={() => onShowMinimapChange(!showMinimap)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showMinimap ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showMinimap ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 显示行号 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">显示行号</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              显示代码行号
            </p>
          </div>
          <button
            onClick={() => onShowLineNumbersChange(!showLineNumbers)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showLineNumbers ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showLineNumbers ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 重置按钮 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            onThemeChange('dark');
            onWordWrapChange(false);
            onShowMinimapChange(true);
            onShowLineNumbersChange(true);
            onFontSizeChange('14');
          }}
        >
          重置为默认
        </Button>
      </div>
    </div>
  );
};

export default CodeEditorSettings;