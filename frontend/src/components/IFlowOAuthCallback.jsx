import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * iFlow OAuth2 回调处理页面
 * 处理 iFlow 平台登录后的回调，显示登录结果
 */
const IFlowOAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('正在处理登录...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // 检查 URL 参数中的错误
        if (errorParam) {
            setStatus('error');
            setError(errorDescription || errorParam);
            setMessage('登录失败');
            return;
        }

        // 验证必要的参数
        if (!code || !state) {
            setStatus('error');
            setError('缺少必要的授权参数');
            setMessage('登录失败');
            return;
        }

        // 验证 state（可选的安全检查）
        const savedState = sessionStorage.getItem('iflow_oauth_state');
        if (savedState && savedState !== state) {
            setStatus('error');
            setError('安全验证失败，请重新登录');
            setMessage('登录失败');
            return;
        }

        // 清除保存的 state
        sessionStorage.removeItem('iflow_oauth_state');

        // 处理 OAuth 回调
        handleOAuthCallback(code, state);
    }, [searchParams]);

    const handleOAuthCallback = async (code, state) => {
        try {
            setStatus('processing');
            setMessage('正在验证登录信息...');

            // 调用后端回调接口
            const response = await fetch(`/api/iflow/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
            const data = await response.json();

            if (data.success) {
                setStatus('success');
                setMessage('登录成功！iFlow API Token 已更新');

                // 3秒后跳转到设置页面
                setTimeout(() => {
                    navigate('/settings?tab=token');
                }, 3000);
            } else {
                setStatus('error');
                setError(data.message || '登录失败');
                setMessage('登录失败');
            }
        } catch (err) {
            console.error('OAuth 回调处理失败:', err);
            setStatus('error');
            setError('网络错误，请稍后重试');
            setMessage('登录失败');
        }
    };

    const handleRetry = () => {
        window.location.href = '/api/iflow/oauth/login-url';
    };

    const handleGoBack = () => {
        navigate('/settings?tab=token');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
                {/* 状态图标 */}
                <div className="flex justify-center mb-6">
                    {status === 'processing' && (
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                    )}
                </div>

                {/* 标题 */}
                <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    iFlow 登录
                </h1>

                {/* 状态消息 */}
                <p className="text-center text-gray-600 mb-6">
                    {message}
                </p>

                {/* 错误详情 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* 成功信息 */}
                {status === 'success' && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                            您的 iFlow API Token 已成功更新，系统将在 3 秒后自动跳转...
                        </p>
                    </div>
                )}

                {/* 操作按钮 */}
                <div className="flex flex-col gap-3">
                    {status === 'error' && (
                        <button
                            onClick={handleRetry}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            重新登录
                        </button>
                    )}

                    <button
                        onClick={handleGoBack}
                        className="w-full px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center justify-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        返回设置页面
                    </button>
                </div>

                {/* 帮助信息 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        如果登录遇到问题，请确保您已在 iFlow 平台注册账号
                    </p>
                </div>
            </div>
        </div>
    );
};

export default IFlowOAuthCallback;
