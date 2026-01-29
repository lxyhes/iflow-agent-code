/**
 * SmartTabBar Component
 * 智能 Tab 栏 - 将次要功能折叠到"更多"菜单
 * 
 * 核心功能：Chat、Shell、Files、Source Control（始终显示）
 * 次要功能：RAG、Smart Req、Database、Workflow、Interview（折叠到更多）
 */

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Database, Workflow, FileSearch, BrainCircuit, MessagesSquare } from 'lucide-react';
import Tooltip from './Tooltip';

// Tab 配置
const CORE_TABS = [
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    tooltip: 'Chat'
  },
  {
    id: 'shell',
    label: 'Shell',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    tooltip: 'Shell'
  },
  {
    id: 'files',
    label: 'Files',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    tooltip: 'Project Files'
  },
  {
    id: 'git',
    label: 'Source Control',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    tooltip: 'Source Control'
  }
];

const SECONDARY_TABS = [
  {
    id: 'rag',
    label: 'RAG',
    icon: <FileSearch className="w-4 h-4" />,
    tooltip: 'RAG Knowledge Base',
    description: '检索增强生成'
  },
  {
    id: 'smart-req',
    label: 'Smart Req',
    icon: <BrainCircuit className="w-4 h-4" />,
    tooltip: 'Smart Requirement Analysis',
    description: '智能需求分析'
  },
  {
    id: 'database',
    label: 'Database',
    icon: <Database className="w-4 h-4" />,
    tooltip: 'Database Query',
    description: '数据库查询'
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: <Workflow className="w-4 h-4" />,
    tooltip: 'Workflow Editor',
    description: '工作流编辑器'
  },
  {
    id: 'interview',
    label: 'Interview',
    icon: <MessagesSquare className="w-4 h-4" />,
    tooltip: 'Interview Preparation',
    description: '面试准备'
  }
];

const SmartTabBar = ({ 
  activeTab, 
  onTabChange, 
  shouldShowTasksTab,
  showModelSelector = false 
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  // 检查当前活动 Tab 是否在"更多"中
  const isSecondaryTabActive = SECONDARY_TABS.some(tab => tab.id === activeTab);
  const isTasksTabActive = activeTab === 'tasks';

  // 切换 Tab
  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    setShowMoreMenu(false);
  };

  return (
    <div className="relative flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {/* 核心功能 Tab */}
      {CORE_TABS.map(tab => (
        <Tooltip key={tab.id} content={tab.tooltip} position="bottom">
          <button
            onClick={() => handleTabClick(tab.id)}
            className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-1 sm:gap-1.5">
              {tab.icon}
              <span className="hidden lg:inline">{tab.label}</span>
            </span>
          </button>
        </Tooltip>
      ))}

      {/* Tasks Tab (条件显示) */}
      {shouldShowTasksTab && (
        <Tooltip content="Tasks" position="bottom">
          <button
            onClick={() => handleTabClick('tasks')}
            className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-1 sm:gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="hidden lg:inline">Tasks</span>
            </span>
          </button>
        </Tooltip>
      )}

      {/* 更多菜单按钮 */}
      <div ref={menuRef} className="relative">
        <Tooltip content="More Tools" position="bottom">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
              isSecondaryTabActive || isTasksTabActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-1 sm:gap-1.5">
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">更多</span>
              {(isSecondaryTabActive || isTasksTabActive) && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </span>
          </button>
        </Tooltip>

        {/* 更多菜单下拉 */}
        {showMoreMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700 mb-1">
              高级功能
            </div>
            
            {SECONDARY_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs text-gray-400">{tab.description}</div>
                </div>
                {activeTab === tab.id && (
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-600 text-center"
              >
                按 ESC 关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartTabBar;
