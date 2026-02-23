import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, X, Loader } from 'lucide-react';

/**
 * 会话导出组件
 */
const ConversationExport = ({ conversationId, onClose }) => {
  const [format, setFormat] = useState('markdown');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/export?format=${format}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conversationId}.${getExtension(format)}`;
      a.click();
      URL.revokeObjectURL(url);

      onClose?.();
    } catch (error) {
      alert('导出失败：' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const getExtension = (fmt) => {
    switch (fmt) {
      case 'markdown': return 'md';
      case 'html': return 'html';
      case 'pdf': return 'pdf';
      case 'json': return 'json';
      default: return 'txt';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">导出会话</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            选择导出格式：
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('markdown')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                format === 'markdown'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">Markdown</span>
            </button>

            <button
              onClick={() => setFormat('html')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                format === 'html'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <FileCode className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium">HTML</span>
            </button>

            <button
              onClick={() => setFormat('pdf')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                format === 'pdf'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Download className="w-6 h-6 text-red-600" />
              <span className="text-sm font-medium">PDF</span>
            </button>

            <button
              onClick={() => setFormat('json')}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                format === 'json'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">JSON</span>
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationExport;
