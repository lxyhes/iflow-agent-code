import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

/**
 * 项目健康仪表盘组件
 */
const ProjectHealthDashboard = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/project/health');
      if (!response.ok) throw new Error('获取健康数据失败');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('获取健康数据失败:', error);
      setHealth(getMockHealth());
    } finally {
      setLoading(false);
    }
  };

  const getMockHealth = () => ({
    overallScore: 75,
    codeQuality: { score: 80, issues: 5 },
    testCoverage: { percentage: 65, trend: 'up' },
    dependencies: { total: 45, outdated: 8, vulnerable: 2 },
    technicalDebt: { hours: 24, trend: 'down' },
    recommendations: [
      '更新 8 个过时的依赖包',
      '修复 2 个安全漏洞',
      '提高测试覆盖率到 80%',
      '重构 3 个复杂度高的函数',
    ],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        项目健康仪表盘
      </h1>

      {/* 总体评分 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              总体健康评分
            </h2>
            <div className="text-5xl font-bold text-blue-600">
              {health.overallScore}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              满分 100
            </p>
          </div>
          <div className="w-32 h-32 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#3b82f6"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${(health.overallScore / 100) * 352} 352`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 代码质量 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">代码质量</h3>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {health.codeQuality.score}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {health.codeQuality.issues} 个问题
          </div>
        </div>

        {/* 测试覆盖率 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">测试覆盖率</h3>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {health.testCoverage.percentage}%
          </div>
          <div className="text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            上升趋势
          </div>
        </div>

        {/* 依赖健康 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">依赖健康</h3>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            总计：{health.dependencies.total}
          </div>
          <div className="text-sm text-red-600">
            {health.dependencies.vulnerable} 个漏洞
          </div>
        </div>

        {/* 技术债务 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">技术债务</h3>
          </div>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {health.technicalDebt.hours}h
          </div>
          <div className="text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4 transform rotate-180" />
            下降趋势
          </div>
        </div>
      </div>

      {/* 改进建议 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          改进建议
        </h3>
        <ul className="space-y-3">
          {health.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">{idx + 1}</span>
              </div>
              <span className="text-gray-700 dark:text-gray-300">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProjectHealthDashboard;
