import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, X, RefreshCw, FileText, Bug, Shield, Zap, Wrench, BookOpen } from 'lucide-react';

const ProjectHealthDashboard = ({ projectName, filePaths, onClose }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 加载健康度数据
  const loadHealthMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectName)}/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_paths: filePaths || [],
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setMetrics(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectName, filePaths]);

  // 初始化加载
  useEffect(() => {
    if (projectName && filePaths) {
      loadHealthMetrics();
    }
  }, [projectName, filePaths, loadHealthMetrics]);

  // 获取分数颜色
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // 获取指标图标
  const getMetricIcon = (metric) => {
    const icons = {
      code_quality: <FileText size={20} />,
      maintainability: <Wrench size={20} />,
      security: <Shield size={20} />,
      performance: <Zap size={20} />,
      documentation: <BookOpen size={20} />,
      test_coverage: <Bug size={20} />,
    };
    return icons[metric] || <Activity size={20} />;
  };

  // 获取指标名称
  const getMetricName = (metric) => {
    const names = {
      code_quality: '代码质量',
      maintainability: '可维护性',
      security: '安全性',
      performance: '性能',
      documentation: '文档',
      test_coverage: '测试覆盖率',
    };
    return names[metric] || metric;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">项目健康度</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHealthMetrics}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">正在分析项目健康度...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={loadHealthMetrics}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!loading && !error && metrics && (
          <div className="space-y-6">
            {/* 总体分数 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">总体健康度</h3>
                <div className={`text-4xl font-bold ${getScoreColor(metrics.overall_score)}`}>
                  {metrics.overall_score}
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getScoreBgColor(
                    metrics.overall_score
                  )}`}
                  style={{ width: `${metrics.overall_score}%` }}
                />
              </div>
            </div>

            {/* 各项指标 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                'code_quality',
                'maintainability',
                'security',
                'performance',
                'documentation',
                'test_coverage',
              ].map((metric) => (
                <div
                  key={metric}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getMetricIcon(metric)}
                    <span className="text-sm font-medium text-gray-300">
                      {getMetricName(metric)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-2xl font-bold ${getScoreColor(
                      metrics[metric]
                    )}`}>
                      {metrics[metric]}
                    </div>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getScoreBgColor(
                          metrics[metric]
                        )}`}
                        style={{ width: `${metrics[metric]}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 详细信息 */}
            {metrics.details && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">详细信息</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {metrics.details.total_files || 0}
                    </div>
                    <div className="text-sm text-gray-400">文件总数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {metrics.details.total_lines || 0}
                    </div>
                    <div className="text-sm text-gray-400">代码行数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {metrics.details.total_functions || 0}
                    </div>
                    <div className="text-sm text-gray-400">函数数量</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {metrics.details.total_classes || 0}
                    </div>
                    <div className="text-sm text-gray-400">类数量</div>
                  </div>
                </div>

                {/* 问题统计 */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-md font-semibold text-white mb-4">问题统计</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-red-900/20 rounded-lg p-3 border border-red-900">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={16} className="text-red-500" />
                        <span className="text-sm text-gray-300">严重</span>
                      </div>
                      <div className="text-xl font-bold text-red-500">
                        {metrics.details.critical_issues || 0}
                      </div>
                    </div>
                    <div className="bg-orange-900/20 rounded-lg p-3 border border-orange-900">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={16} className="text-orange-500" />
                        <span className="text-sm text-gray-300">高</span>
                      </div>
                      <div className="text-xl font-bold text-orange-500">
                        {metrics.details.high_issues || 0}
                      </div>
                    </div>
                    <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-900">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={16} className="text-yellow-500" />
                        <span className="text-sm text-gray-300">中</span>
                      </div>
                      <div className="text-xl font-bold text-yellow-500">
                        {metrics.details.medium_issues || 0}
                      </div>
                    </div>
                    <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={16} className="text-blue-500" />
                        <span className="text-sm text-gray-300">低</span>
                      </div>
                      <div className="text-xl font-bold text-blue-500">
                        {metrics.details.low_issues || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 其他指标 */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">平均复杂度</span>
                      <span className="text-lg font-semibold text-white">
                        {metrics.details.average_complexity?.toFixed(2) || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">总问题数</span>
                      <span className="text-lg font-semibold text-white">
                        {metrics.details.total_issues || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 建议 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">改进建议</h3>
              <div className="space-y-3">
                {metrics.overall_score < 80 && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">提升代码质量</div>
                      <div className="text-xs text-gray-400">
                        关注重构建议，优先处理严重和高优先级问题
                      </div>
                    </div>
                  </div>
                )}
                {metrics.test_coverage < 60 && (
                  <div className="flex items-start gap-3">
                    <Bug className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">增加测试覆盖率</div>
                      <div className="text-xs text-gray-400">
                        使用自动化测试生成工具为关键功能添加测试
                      </div>
                    </div>
                  </div>
                )}
                {metrics.documentation < 60 && (
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">完善文档</div>
                      <div className="text-xs text-gray-400">
                        添加 README 和代码注释，提高项目可读性
                      </div>
                    </div>
                  </div>
                )}
                {metrics.overall_score >= 80 && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">项目状态良好</div>
                      <div className="text-xs text-gray-400">
                        保持当前的开发规范和代码质量
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectHealthDashboard;