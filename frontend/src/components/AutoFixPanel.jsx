/**
 * AutoFixPanel.jsx - 自动错误修复面板
 *
 * 显示自动修复的状态和历史记录
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Wrench, History, Trash2, Play } from 'lucide-react';

const AutoFixPanel = ({ projectPath, visible, onClose }) => {
    const [isFixing, setIsFixing] = useState(false);
    const [fixHistory, setFixHistory] = useState([]);
    const [currentError, setCurrentError] = useState(null);
    const [error, setError] = useState(null);

    // 加载修复历史
    useEffect(() => {
        if (visible && projectPath) {
            loadFixHistory();
        }
    }, [visible, projectPath]);

    const loadFixHistory = async () => {
        try {
            const response = await fetch(`/api/auto-fix/history?projectPath=${encodeURIComponent(projectPath)}`);
            const data = await response.json();
            if (data.success) {
                setFixHistory(data.history || []);
            }
        } catch (err) {
            console.error('加载修复历史失败:', err);
        }
    };

    const clearHistory = async () => {
        try {
            const response = await fetch(`/api/auto-fix/history?projectPath=${encodeURIComponent(projectPath)}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                setFixHistory([]);
            }
        } catch (err) {
            console.error('清空修复历史失败:', err);
        }
    };

    const triggerAutoFix = async (errorOutput) => {
        if (!projectPath) {
            setError('项目路径不能为空');
            return;
        }

        setIsFixing(true);
        setError(null);
        setCurrentError(errorOutput);

        try {
            const response = await fetch('/api/auto-fix', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: errorOutput,
                    projectPath: projectPath,
                    context: {}
                })
            });

            const data = await response.json();

            if (data.success) {
                // 重新加载历史
                await loadFixHistory();
                setCurrentError(null);
            } else {
                setError(data.error || '自动修复失败');
            }
        } catch (err) {
            setError(`自动修复失败: ${err.message}`);
        } finally {
            setIsFixing(false);
        }
    };

    const getStatusIcon = (result) => {
        if (result.fix_successful) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        } else if (result.fix_attempted) {
            return <XCircle className="w-5 h-5 text-red-500" />;
        } else {
            return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getStatusText = (result) => {
        if (result.fix_successful) {
            return '修复成功';
        } else if (result.fix_attempted) {
            return '修复失败';
        } else {
            return '未尝试修复';
        }
    };

    const getErrorTypeColor = (errorType) => {
        const colors = {
            'module_not_found': 'text-blue-500',
            'import_error': 'text-blue-500',
            'syntax_error': 'text-red-500',
            'name_error': 'text-orange-500',
            'attribute_error': 'text-orange-500',
            'file_not_found': 'text-purple-500',
            'permission_denied': 'text-red-500',
            'unknown': 'text-gray-500'
        };
        return colors[errorType] || colors['unknown'];
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                {/* 头部 */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Wrench className="w-6 h-6 text-white" />
                        <h2 className="text-xl font-bold text-white">自动错误修复</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* 当前错误输入 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            错误输出（粘贴错误信息）
                        </label>
                        <textarea
                            value={currentError || ''}
                            onChange={(e) => setCurrentError(e.target.value)}
                            placeholder="粘贴错误输出，例如：ModuleNotFoundError: No module named 'requests'"
                            className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                            onClick={() => triggerAutoFix(currentError)}
                            disabled={isFixing || !currentError}
                            className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {isFixing ? (
                                <>
                                    <Clock className="w-4 h-4 animate-spin" />
                                    修复中...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    开始自动修复
                                </>
                            )}
                        </button>
                        {error && (
                            <div className="mt-2 text-red-500 text-sm">{error}</div>
                        )}
                    </div>

                    {/* 修复历史 */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    修复历史
                                </h3>
                            </div>
                            {fixHistory.length > 0 && (
                                <button
                                    onClick={clearHistory}
                                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    清空历史
                                </button>
                            )}
                        </div>

                        {fixHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                暂无修复历史
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {fixHistory.map((result, index) => (
                                    <div
                                        key={index}
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(result)}
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {getStatusText(result)}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(result.timestamp).toLocaleString('zh-CN')}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            {result.error_type && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-600 dark:text-gray-400">错误类型:</span>
                                                    <span className={`font-medium ${getErrorTypeColor(result.error_type)}`}>
                                                        {result.error_type}
                                                    </span>
                                                </div>
                                            )}

                                            {result.error_message && (
                                                <div className="flex items-start gap-2">
                                                    <span className="text-gray-600 dark:text-gray-400">错误信息:</span>
                                                    <span className="text-gray-900 dark:text-white break-all">
                                                        {result.error_message}
                                                    </span>
                                                </div>
                                            )}

                                            {result.fix_details && (
                                                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                        修复详情:
                                                    </div>
                                                    <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                                                        {JSON.stringify(result.fix_details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutoFixPanel;