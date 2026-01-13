/**
 * Usage Limit Banner Component
 * 配额限制提示横幅组件
 */

import React from 'react';
import MarkdownRenderer from './markdown/MarkdownRenderer';
import { formatUsageLimitText } from '../utils/textProcessors';

const UsageLimitBanner = ({ text }) => {
  if (!text || !text.includes('IFlow AI usage limit reached')) {
    return null;
  }

  const formattedText = formatUsageLimitText(text);

  return (
    <div className="my-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <MarkdownRenderer className="text-sm text-gray-700 dark:text-gray-300">
            {formattedText}
          </MarkdownRenderer>
        </div>
      </div>
    </div>
  );
};

export default UsageLimitBanner;