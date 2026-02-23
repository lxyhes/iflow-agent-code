import React, { useState } from 'react';
import { Menu, X, Home, MessageSquare, Folder, GitBranch, Settings, User } from 'lucide-react';

/**
 * 移动端响应式导航组件
 */
const MobileNav = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'chat', label: '聊天', icon: MessageSquare },
    { id: 'files', label: '文件', icon: Folder },
    { id: 'git', label: 'Git', icon: GitBranch },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 shadow-sm z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            AI 工作台
          </h1>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
      </header>

      {/* 侧边菜单 */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 z-50 shadow-lg transform transition-transform">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                菜单
              </h2>
            </div>
            <div className="p-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </>
      )}

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 flex items-center justify-around px-2">
        {navItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 ${
              activeTab === item.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 主内容区 */}
      <main className="pt-14 pb-16 px-4">
        {children}
      </main>
    </div>
  );
};

export default MobileNav;
