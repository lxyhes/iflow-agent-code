/**
 * Workflow Validation Panel
 * 工作流验证面板
 */

import React from 'react';
import {
  AlertCircle, CheckCircle, AlertTriangle, Info,
  X, Activity, GitBranch, Box
} from 'lucide-react';

const WorkflowValidationPanel = ({ validationResult, onClose }) => {
  const { valid, errors, warnings, stats } = validationResult;

  const getSummary = () => {
    if (valid) {
      return {
        icon: CheckCircle,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-700',
        title: '验证通过',
        message: '工作流配置正确，可以导出和执行'
      };
    }

    if (errors.length > 0) {
      return {
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-700',
        title: '发现错误',
        message: `${errors.length} 个错误需要修复`
      };
    }

    if (warnings.length > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-700',
        title: '发现警告',
        message: `${warnings.length} 个建议优化`
      };
    }

    return {
      icon: Info,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      title: '验证完成',
      message: '工作流验证完成'
    };
  };

  const summary = getSummary();
  const SummaryIcon = summary.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* 头部 */}
        <div className={`flex items-center justify-between px-6 py-4 ${summary.bgColor} rounded-t-xl border-b ${summary.borderColor}`}>
          <div className="flex items-center space-x-3">
            <SummaryIcon className={`w-6 h-6 ${summary.color}`} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{summary.title}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">{summary.message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Box className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">节点总数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalNodes}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">连线总数</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEdges}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">执行路径</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.paths}</div>
            </div>
          </div>

          {/* 节点类型分布 */}
          {Object.keys(stats.nodeTypes).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">节点类型分布</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(stats.nodeTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{type}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 错误列表 */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                错误 ({errors.length})
              </h3>
              {errors.map((error, index) => (
                <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3">
                  <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
              ))}
            </div>
          )}

          {/* 警告列表 */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                警告 ({warnings.length})
              </h3>
              {warnings.map((warning, index) => (
                <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* 成功提示 */}
          {valid && errors.length === 0 && warnings.length === 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  工作流结构完整，所有节点配置正确，可以安全导出和执行。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
          >
            关闭
          </button>
          {valid && (
            <button
              onClick={() => {
                // 触发导出
                onClose();
              }}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
            >
              继续导出
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowValidationPanel;
