import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Key, Clock, Shield, Info, ExternalLink, LogIn } from 'lucide-react';

const TokenManager = () => {
    const [status, setStatus] = useState(null);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showRefreshModal, setShowRefreshModal] = useState(false);
    const [newApiKey, setNewApiKey] = useState('');
    const [error, setError] = useState(null);
    const [oauthStatus, setOauthStatus] = useState(null);
    const [oauthLoading, setOauthLoading] = useState(false);

    // 加载 Token 概览
    const loadOverview = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/token/overview');
            const data = await response.json();
            setOverview(data);
            setStatus(data.tokenStatus);
        } catch (err) {
            setError('加载 Token 状态失败');
            console.error('加载 Token 状态失败:', err);
        } finally {
            setLoading(false);
        }
    };

    // 手动检测 Token
    const handleCheckToken = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/token/check', { method: 'POST' });
            const data = await response.json();
            setStatus(data);
            await loadOverview();
        } catch (err) {
            setError('检测 Token 失败');
            console.error('检测 Token 失败:', err);
        } finally {
            setLoading(false);
        }
    };

    // 刷新 Token
    const handleRefreshToken = async () => {
        if (!newApiKey.trim()) {
            setError('请输入新的 API Key');
            return;
        }

        try {
            setRefreshing(true);
            setError(null);

            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: newApiKey.trim() })
            });

            const data = await response.json();

            if (data.success) {
                setShowRefreshModal(false);
                setNewApiKey('');
                await loadOverview();
            } else {
                setError(data.message || '刷新 Token 失败');
            }
        } catch (err) {
            setError('刷新 Token 失败');
            console.error('刷新 Token 失败:', err);
        } finally {
            setRefreshing(false);
        }
    };

    // 加载 OAuth 配置状态
    const loadOAuthStatus = async () => {
        try {
            const response = await fetch('/api/iflow/oauth/status');
            const data = await response.json();
            setOauthStatus(data);
        } catch (err) {
            console.error('加载 OAuth 状态失败:', err);
        }
    };

    // 处理 iFlow OAuth 登录
    const handleIFlowLogin = async () => {
        try {
            setOauthLoading(true);
            setError(null);

            const response = await fetch('/api/iflow/oauth/login-url');
            const data = await response.json();

            if (data.success && data.loginUrl) {
                // 保存 state 到 sessionStorage 用于回调验证
                sessionStorage.setItem('iflow_oauth_state', data.state);
                // 打开 iFlow 登录窗口
                window.location.href = data.loginUrl;
            } else {
                setError('获取登录链接失败');
            }
        } catch (err) {
            setError('登录请求失败');
            console.error('登录请求失败:', err);
        } finally {
            setOauthLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
        loadOAuthStatus();
        // 每 5 分钟自动刷新一次状态
        const interval = setInterval(loadOverview, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (!overview && loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">加载中...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                    <Shield className="w-6 h-6 mr-2" />
                    Token 管理
                </h2>
                <p className="text-gray-600">
                    管理 iFlow API Token，确保服务正常运行
                </p>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-red-800">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-500 hover:text-red-700"
                    >
                        ×
                    </button>
                </div>
            )}

            {overview && (
                <div className="space-y-6">
                    {/* Token 状态卡片 */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Key className="w-5 h-5 mr-2" />
                                Token 状态
                            </h3>
                            <button
                                onClick={handleCheckToken}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                检测状态
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 状态指示 */}
                            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                                {status?.valid ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                                )}
                                <div>
                                    <p className="text-sm text-gray-600">状态</p>
                                    <p className="font-medium text-gray-900">
                                        {status?.valid ? '正常' : '异常'}
                                    </p>
                                </div>
                            </div>

                            {/* 最后检测时间 */}
                            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-500 mr-3" />
                                <div>
                                    <p className="text-sm text-gray-600">最后检测</p>
                                    <p className="font-medium text-gray-900">
                                        {status?.lastCheckTime 
                                            ? new Date(status.lastCheckTime).toLocaleString('zh-CN')
                                            : '未知'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {status?.message && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">{status.message}</p>
                            </div>
                        )}

                        {/* 警告提示 */}
                        {overview.warning?.needsWarning && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                                <div>
                                    <p className="font-medium text-yellow-800">Token 即将过期</p>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        建议提前准备新的 API Key，避免服务中断
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* API Key 信息 */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Key className="w-5 h-5 mr-2" />
                            API Key 信息
                        </h3>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">配置状态</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    overview.apiKeyInfo?.configured 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {overview.apiKeyInfo?.configured ? '已配置' : '未配置'}
                                </span>
                            </div>
                            
                            {overview.apiKeyInfo?.maskedKey && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">API Key</span>
                                    <code className="px-3 py-1 bg-gray-100 rounded text-sm font-mono">
                                        {overview.apiKeyInfo.maskedKey}
                                    </code>
                                </div>
                            )}
                            
                            {overview.apiKeyInfo?.source && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">来源</span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                        {overview.apiKeyInfo.source === 'dynamic' ? '动态设置' : 
                                         overview.apiKeyInfo.source === 'environment' ? '环境变量' : '配置文件'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 操作区域 */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">操作</h3>

                        <div className="space-y-3">
                            {/* iFlow OAuth 登录按钮 */}
                            {oauthStatus?.configured && (
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start">
                                        <LogIn className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-blue-900 mb-1">使用 iFlow 账号登录</p>
                                            <p className="text-sm text-blue-700 mb-3">
                                                通过 iFlow 平台 OAuth2 授权，自动获取并更新 API Token
                                            </p>
                                            <button
                                                onClick={handleIFlowLogin}
                                                disabled={oauthLoading}
                                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {oauthLoading ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        加载中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <LogIn className="w-4 h-4 mr-2" />
                                                        使用 iFlow 登录
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {overview.advice?.needsRefresh ? (
                                <div className="flex flex-col space-y-3">
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="font-medium text-red-800 mb-2">
                                            需要刷新 Token
                                        </p>
                                        <p className="text-sm text-red-700 mb-3">
                                            {overview.advice.message}
                                        </p>
                                        {overview.advice.url && (
                                            <a
                                                href={overview.advice.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-1" />
                                                访问平台获取新 Token
                                            </a>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setShowRefreshModal(true)}
                                        className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center"
                                    >
                                        <RefreshCw className="w-5 h-5 mr-2" />
                                        手动刷新 Token
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                                    <div>
                                        <p className="font-medium text-green-800">Token 状态正常</p>
                                        <p className="text-sm text-green-700">
                                            无需操作，系统会自动监控 Token 状态
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 使用说明 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-start">
                            <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-blue-900 mb-2">使用说明</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• iFlow API Token 有效期为 7 天</li>
                                    <li>• 系统会每 30 分钟自动检测 Token 状态</li>
                                    <li>• Token 即将过期时系统会提前预警</li>
                                    <li>• Token 过期后请访问 iFlow 平台获取新的 API Key</li>
                                    <li>• 刷新 Token 后系统会自动应用新配置，无需重启服务</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Token 刷新模态框 */}
            {showRefreshModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">刷新 Token</h3>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    新的 API Key
                                </label>
                                <input
                                    type="password"
                                    value={newApiKey}
                                    onChange={(e) => setNewApiKey(e.target.value)}
                                    placeholder="请输入新的 API Key"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                <p className="text-sm text-blue-800">
                                    请访问{' '}
                                    <a
                                        href="https://platform.iflow.cn/docs/api-key-management"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                        iFlow 平台
                                    </a>
                                    {' '}获取新的 API Key
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowRefreshModal(false);
                                        setNewApiKey('');
                                        setError(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleRefreshToken}
                                    disabled={refreshing || !newApiKey.trim()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
                                >
                                    {refreshing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            刷新中...
                                        </>
                                    ) : (
                                        '确认刷新'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TokenManager;