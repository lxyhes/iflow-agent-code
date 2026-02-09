import React from 'react';
import AILogo from './AILogo';

/**
 * Logo 使用示例组件
 * 展示 AI 工作台 Logo 的不同用法
 */

const LogoShowcase = () => {
  const logos = [
    { size: 32, variant: 'default', label: '默认 (32px)' },
    { size: 48, variant: 'light', label: '浅色 (48px)' },
    { size: 64, variant: 'dark', label: '深色 (64px)' },
    { size: 80, variant: 'default', label: '完整 (80px)' },
  ];

  const gradients = [
    { name: '主色', color: '#3B82F6' },
    { name: '辅色', color: '#8B5CF6' },
    { name: '强调色', color: '#06B6D4' },
    { name: '成功', color: '#10B981' },
    { name: '警告', color: '#F59E0B' },
    { name: '错误', color: '#EF4444' },
  ];

  return (
    <div className="p-8 bg-white dark:bg-gray-900 rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        AI 工作台 Logo 展示
      </h2>

      {/* Logo 尺寸展示 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
          Logo 尺寸与变体
        </h3>
        <div className="flex items-end gap-8 flex-wrap">
          {logos.map((logo, index) => (
            <div key={index} className="flex flex-col items-center">
              <AILogo size={logo.size} variant={logo.variant} />
              <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {logo.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 品牌色彩展示 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
          品牌色彩系统
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {gradients.map((color, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-lg shadow-md"
                style={{ backgroundColor: color.color }}
              />
              <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {color.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {color.color}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 渐变色展示 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
          品牌渐变色
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-full h-12 rounded-lg shadow-md"
              style={{
                background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #06B6D4)'
              }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              主渐变
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-full h-12 rounded-lg shadow-md"
              style={{
                background: 'linear-gradient(90deg, #60A5FA, #A78BFA, #22D3EE)'
              }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              浅色渐变
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoShowcase;