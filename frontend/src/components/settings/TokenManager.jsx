import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Key, Clock, Shield, Info, ExternalLink, LogIn, Eye, EyeOff, Trash2, Save } from 'lucide-react';

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
    
    // iFlow API Key 设置相关状态
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [keyStatus, setKeyStatus] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [apiKeySource, setApiKeySource] = useState(''); // 'terminal' | 'dynamic' | 'environment' | 'config'

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

    // 检测 iFlow API Key 状态
    const checkApiKeyStatus = async () => {
        setCheckingStatus(true);
        try {
            const response = await fetch('/api/iflow/api-key-status');
            if (response.ok) {
                const data = await response.json();
                setKeyStatus(data);
            } else {
                setKeyStatus({ valid: false, status: 'error', message: '检测失败' });
            }
        } catch (error) {
            console.error('Failed to check API key status:', error);
            setKeyStatus({ valid: false, status: 'error', message: '无法连接到后端服务' });
        } finally {
            setCheckingStatus(false);
        }
    };

    // 保存 iFlow API Key
    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) {
            setError('请输入 API Key');
            return;
        }

        if (apiKey.length < 10) {
            setError('API Key 长度太短，请检查输入');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            
            const response = await fetch('/api/iflow/api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || '保存失败');
                return;
            }

            // 同时保存到 localStorage 作为备份
            localStorage.setItem('iflow_api_key', apiKey.trim());
            
            setSaveSuccess(true);
            setApiKey('');
            
            // 触发全局事件，通知其他组件 API Key 已更新
            window.dispatchEvent(new CustomEvent('apikey-changed', {
                detail: { apiKey: apiKey.trim() }
            }));

            // 重新检测状态
            await checkApiKeyStatus();
            await loadOverview();
            await loadApiKeyInfo();

            setTimeout(() => {
                setSaveSuccess(false);
            }, 2000);
        } catch (err) {
            setError('保存失败: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // 清除 iFlow API Key
    const handleClearApiKey = async () => {
        if (window.confirm('确定要清除已保存的 API Key 吗？')) {
            try {
                await fetch('/api/iflow/api-key', {
                    method: 'DELETE',
                });

                localStorage.removeItem('iflow_api_key');
                setApiKey('');
                setSaveSuccess(true);
                
                window.dispatchEvent(new CustomEvent('apikey-changed', {
                    detail: { apiKey: null }
                }));

                await checkApiKeyStatus();
                await loadOverview();
                await loadApiKeyInfo();

                setTimeout(() => {
                    setSaveSuccess(false);
                }, 2000);
            } catch (err) {
                setError('清除失败: ' + err.message);
            }
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

    // 加载当前 API Key 信息（从后端获取）
    const loadApiKeyInfo = async () => {
        try {
            const response = await fetch('/api/iflow/api-key-info');
            if (response.ok) {
                const data = await response.json();
                // 如果后端配置了 API Key，显示脱敏后的 Key
                if (data.configured && data.maskedKey) {
                    // 只显示脱敏的 Key 作为提示，不显示完整 Key
                    setApiKey(data.maskedKey);
                    setApiKeySource(data.source || 'unknown');
                } else {
                    // 如果没有配置，清空显示
                    setApiKey('');
                    setApiKeySource('');
                }
            }
        } catch (err) {
            console.error('加载 API Key 信息失败:', err);
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
        checkApiKeyStatus();
        loadApiKeyInfo();
        
        // 每 5 分钟自动刷新一次状态
        const interval = setInterval(() => {
            loadOverview();
            checkApiKeyStatus();
        }, 5 * 60 * 1000);
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

                    {/* iFlow API Key 设置区域 */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Key className="w-5 h-5 mr-2" />
                                设置 iFlow API Key
                            </h3>
                            <button
                                onClick={checkApiKeyStatus}
                                disabled={checkingStatus}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center"
                            >
                                <RefreshCw className={`w-4 h-4 mr-1 ${checkingStatus ? 'animate-spin' : ''}`} />
                                检测状态
                            </button>
                        </div>

                        {/* API Key 状态显示 */}
                        {keyStatus && (
                            <div className={`mb-4 p-3 rounded-lg border ${
                                keyStatus.valid
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${
                                        keyStatus.valid ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        状态: {keyStatus.valid ? '正常' : keyStatus.status === 'expired' ? '已过期' : '异常'}
                                    </span>
                                </div>
                                <p className={`text-xs mt-1 ${
                                    keyStatus.valid ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {keyStatus.message}
                                </p>
                            </div>
                        )}

                        {/* API Key 输入 */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value);
                                            setError(null);
                                            setSaveSuccess(false);
                                        }}
                                        placeholder="请输入您的 iFlow API Key"
                                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {/* 显示 API Key 来源信息 */}
                                {apiKeySource && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {apiKeySource === 'terminal' && '✓ 已从 iFlow 终端配置读取'}
                                        {apiKeySource === 'dynamic' && '✓ 已设置动态 API Key'}
                                        {apiKeySource === 'environment' && '✓ 已从环境变量读取'}
                                        {apiKeySource === 'config' && '✓ 已从配置文件读取'}
                                        {apiKeySource === 'unknown' && '✓ 已配置 API Key'}
                                        ，输入新值将覆盖原有设置
                                    </p>
                                )}
                            </div>

                            {/* 按钮组 */}
                            <div className="flex items-center justify-between">
                                {(apiKeySource === 'dynamic' || apiKeySource === 'terminal' || apiKeySource === 'environment' || apiKeySource === 'config') && (
                                    <button
                                        onClick={handleClearApiKey}
                                        className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        清除
                                    </button>
                                )}
                                <div className="flex-1"></div>
                                <button
                                    onClick={handleSaveApiKey}
                                    disabled={saving || !apiKey.trim()}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            保存中...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            保存
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* 成功提示 */}
                            {saveSuccess && (
                                <div className="flex items-center gap-2 text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    保存成功！
                                </div>
                            )}

                            {/* 提示信息 */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    <strong>提示：</strong>API Key 用于 AI 功能（智能描述生成、简历诊断等）。
                                    输入新的 API Key 后点击保存，将立即生效，无需重启服务。
                                    <a
                                        href="https://platform.iflow.cn/docs/api-key-management"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center ml-1 text-blue-600 hover:text-blue-800 underline"
                                    >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        获取 API Key
                                    </a>
                                </p>
                            </div>
                        </div>
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