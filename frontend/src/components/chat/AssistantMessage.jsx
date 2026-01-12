/**
 * AI 助手消息组件
 * 支持代码块、Markdown 渲染
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function AssistantMessage({ message, onCopyCode }) {
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code, language) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(language);
    setTimeout(() => setCopiedCode(null), 2000);
    onCopyCode?.(code);
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-gray-700 text-white rounded-lg px-4 py-2">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              return !inline && match ? (
                <div className="relative my-2">
                  <div className="flex justify-between items-center bg-gray-800 px-3 py-1 rounded-t">
                    <span className="text-xs text-gray-400">{language}</span>
                    <button
                      onClick={() => handleCopyCode(String(children).replace(/\n$/, ''), language)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedCode === language ? '✓ 已复制' : '复制'}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    className="!mt-0 !rounded-t-none"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code className="bg-gray-800 px-1 py-0.5 rounded" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}