/**
 * SplitScreenEditor - 实时分屏预览编辑器
 *
 * 左侧编辑，右侧实时预览，支持同步滚动
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Columns,
  Maximize2,
  Minimize2,
  Eye,
  Edit3,
  Settings,
  X,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import ResumePreview from './ResumePreview';

const SplitScreenEditor = ({
  children,
  resume,
  isActive,
  onToggle,
  previewTemplate = 'modern'
}) => {
  const [splitRatio, setSplitRatio] = useState(50); // 默认50%分割
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop, tablet, mobile
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  // 处理分割线拖拽
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    // 限制分割比例在20%-80%之间
    const clampedPercentage = Math.max(20, Math.min(80, percentage));
    setSplitRatio(clampedPercentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 同步滚动
  const handleEditorScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current) return;

    const editor = editorRef.current;
    const preview = previewRef.current;

    const editorScrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    const previewScrollTop = editorScrollRatio * (preview.scrollHeight - preview.clientHeight);

    preview.scrollTop = previewScrollTop;
  }, []);

  // 预览模式配置
  const previewModes = {
    desktop: { width: '100%', label: '桌面端', icon: Monitor },
    tablet: { width: '768px', label: '平板', icon: Tablet },
    mobile: { width: '375px', label: '手机', icon: Smartphone }
  };

  if (!isActive) {
    return (
      <div className="relative h-full overflow-auto">
        {children}
        {/* 分屏预览切换按钮 */}
        <button
          onClick={onToggle}
          className="fixed bottom-20 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 z-40"
          title="开启分屏预览 (Ctrl+\)"
        >
          <Columns className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex h-full ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}
    >
      {/* 左侧编辑区 */}
      <div
        ref={editorRef}
        className="h-full overflow-auto bg-gray-50 dark:bg-gray-900"
        style={{ width: `${splitRatio}%` }}
        onScroll={handleEditorScroll}
      >
        {/* 编辑器头部工具栏 */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">编辑区</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title={isFullscreen ? '退出全屏' : '全屏模式'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="关闭分屏预览"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 编辑器内容 */}
        <div className="p-4">
          {children}
        </div>
      </div>

      {/* 分割线 */}
      <div
        className={`w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-500 cursor-col-resize transition-colors relative ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-gray-400 dark:bg-gray-500 rounded-full flex items-center justify-center">
          <div className="w-0.5 h-3 bg-white rounded-full" />
        </div>
      </div>

      {/* 右侧预览区 */}
      <div
        ref={previewRef}
        className="h-full overflow-auto bg-gray-100 dark:bg-gray-800"
        style={{ width: `${100 - splitRatio}%` }}
      >
        {/* 预览头部工具栏 */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">实时预览</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 设备切换 */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {Object.entries(previewModes).map(([mode, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`p-1.5 rounded transition-colors ${
                      previewMode === mode
                        ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={config.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* 模板选择 */}
            <button
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="切换模板"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 预览内容 */}
        <div className="p-4 flex justify-center">
          <div
            className="bg-white shadow-lg transition-all duration-300"
            style={{
              width: previewModes[previewMode].width,
              minHeight: '800px'
            }}
          >
            <ResumePreview resume={resume} template={previewTemplate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenEditor;
