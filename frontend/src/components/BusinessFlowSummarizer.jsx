import React, { useState, useEffect } from 'react';

/**
 * 业务流程总结组件
 * 从 Git 历史总结业务流程
 */

const BusinessFlowSummarizer = ({ onClose }) => {
  const [businessFlow, setBusinessFlow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);

  // 加载业务流程
  const loadBusinessFlow = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/business-flow/summary?limit=${limit}`);
      
      if (response.ok) {
        const data = await response.json();
        setBusinessFlow(data.business_flow);
      } else {
        setError('加载业务流程失败，请重试');
      }
    } catch (err) {
      console.error('加载业务流程失败:', err);
      setError('加载业务流程失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessFlow();
  }, [limit]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            业务流程总结
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="20">最近 20 次提交</option>
              <option value="50">最近 50 次提交</option>
              <option value="100">最近 100 次提交</option>
              <option value="200">最近 200 次提交</option>
            </select>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={loadBusinessFlow}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isLoading ? '加载中...' : '刷新业务流程'}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!businessFlow && !isLoading && !error && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>点击"刷新业务流程"按钮加载</p>
          </div>
        )}

        {businessFlow && (
          <div className="space-y-6">
            {/* 概览统计 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                概览统计
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {businessFlow.summary?.total_commits || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">总提交数</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {businessFlow.summary?.total_contributors || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">贡献者</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Object.keys(businessFlow.commit_types || {}).length}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">提交类型</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {businessFlow.milestones?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">里程碑</p>
                </div>
              </div>
            </div>

            {/* 时间范围 */}
            {businessFlow.summary?.date_range?.start && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  时间范围
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">开始时间</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(businessFlow.summary.date_range.start).toLocaleDateString()}
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">结束时间</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(businessFlow.summary.date_range.end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 贡献者 */}
            {businessFlow.contributors && Object.keys(businessFlow.contributors).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  贡献者
                </h3>
                <div className="space-y-2">
                  {Object.entries(businessFlow.contributors)
                    .sort(([, a], [, b]) => b - a)
                    .map(([author, count]) => (
                      <div key={author} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-900 dark:text-white">{author}</span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {count} 次提交
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 提交类型分布 */}
            {businessFlow.commit_types && Object.keys(businessFlow.commit_types).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  提交类型分布
                </h3>
                <div className="space-y-2">
                  {Object.entries(businessFlow.commit_types)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const total = Object.values(businessFlow.commit_types).reduce((sum, val) => sum + val, 0);
                      const percentage = ((count / total) * 100).toFixed(1);
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-900 dark:text-white">{type}</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 功能演进 */}
            {businessFlow.feature_evolution && businessFlow.feature_evolution.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  功能演进
                </h3>
                <div className="space-y-2">
                  {businessFlow.feature_evolution.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.feature}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 里程碑 */}
            {businessFlow.milestones && businessFlow.milestones.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  关键里程碑
                </h3>
                <div className="space-y-3">
                  {businessFlow.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-yellow-500 text-white rounded-full text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {milestone.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(milestone.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 时间线 */}
            {businessFlow.timeline && businessFlow.timeline.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  时间线
                </h3>
                <div className="space-y-4">
                  {businessFlow.timeline.map((monthData, index) => (
                    <div key={index}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {monthData.month}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({monthData.commits_count} 次提交)
                        </span>
                      </div>
                      <div className="ml-5 space-y-2">
                        {monthData.activities.slice(0, 3).map((activity, actIndex) => (
                          <div key={actIndex} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border-l-2 border-blue-500">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {new Date(activity.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                              {activity.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {activity.author}
                            </p>
                          </div>
                        ))}
                        {monthData.activities.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            还有 {monthData.activities.length - 3} 条活动...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 生成时间 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                生成时间: {new Date(businessFlow.generated_at).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessFlowSummarizer;