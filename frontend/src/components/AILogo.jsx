import React from 'react';

/**
 * AI 工作台 Logo 组件
 * 设计理念：融合 AI 智能与工作台概念
 * - 六边形：代表工作台的模块化和结构化
 * - AI 脑波：代表人工智能和智能能力
 * - 渐变色彩：体现科技感和现代化
 */

const AILogo = ({ size = 32, className = '', variant = 'default' }) => {
  const gradients = {
    default: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#06B6D4'
    },
    light: {
      primary: '#2563EB',
      secondary: '#7C3AED',
      accent: '#0891B2'
    },
    dark: {
      primary: '#60A5FA',
      secondary: '#A78BFA',
      accent: '#22D3EE'
    }
  };

  const colors = gradients[variant] || gradients.default;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.secondary} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>
        <linearGradient id="ai-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.accent} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* 外层六边形 - 代表工作台 */}
      <path
        d="M256 32L472 156V404L256 528L40 404V156L256 32Z"
        fill="url(#ai-gradient)"
        opacity="0.9"
      />

      {/* 内层六边形 - 代表结构化 */}
      <path
        d="M256 80L424 180V372L256 472L88 372V180L256 80Z"
        fill="url(#ai-gradient-light)"
        opacity="0.5"
      />

      {/* AI 脑波图案 - 中心点 */}
      <circle cx="256" cy="256" r="40" fill="white" opacity="0.9" />

      {/* AI 脑波 - 第一层 */}
      <path
        d="M256 216C278.091 216 296 233.909 296 256C296 278.091 278.091 296 256 296C233.909 296 216 278.091 216 256C216 233.909 233.909 216 256 216Z"
        stroke="white"
        strokeWidth="3"
        fill="none"
        opacity="0.8"
      />

      {/* AI 脑波 - 第二层 */}
      <path
        d="M256 184C285.491 184 310 208.509 310 256C310 303.491 285.491 328 256 328C226.509 328 202 303.491 202 256C202 208.509 226.509 184 256 184Z"
        stroke="white"
        strokeWidth="3"
        fill="none"
        opacity="0.6"
      />

      {/* AI 脑波 - 第三层 */}
      <path
        d="M256 152C292.99 152 324 183.01 324 256C324 328.99 292.99 360 256 360C219.01 360 188 328.99 188 256C188 183.01 219.01 152 256 152Z"
        stroke="white"
        strokeWidth="3"
        fill="none"
        opacity="0.4"
      />

      {/* AI 芯点 - 代表智能化 */}
      <circle cx="256" cy="256" r="8" fill={colors.secondary} />
      
      {/* 左上角节点 */}
      <circle cx="180" cy="180" r="6" fill="white" opacity="0.7" />
      
      {/* 右上角节点 */}
      <circle cx="332" cy="180" r="6" fill="white" opacity="0.7" />
      
      {/* 左下角节点 */}
      <circle cx="180" cy="332" r="6" fill="white" opacity="0.7" />
      
      {/* 右下角节点 */}
      <circle cx="332" cy="332" r="6" fill="white" opacity="0.7" />
    </svg>
  );
};

export default AILogo;