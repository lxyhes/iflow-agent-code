import React, { useState } from 'react';

/**
 * 快速方案生成组件
 * 针对需求快速给出项目方案
 */

const SolutionGenerator = ({ onClose }) => {
  const [requirement, setRequirement] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [solution, setSolution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedSolutions, setSavedSolutions] = useState([]);

  // 加载已保存的方案
  const loadSavedSolutions = async () => {
    try {
      const response = await fetch('/api/solutions?limit=10');
      if (response.ok) {
        const data = await response.json();
        setSavedSolutions(data.solutions || []);
      }
    } catch (err) {
      console.error('加载方案失败:', err);
    }
  };

  // 生成方案
  const generateSolution = async (e) => {
    e.preventDefault();
    
    if (!requirement.trim()) {
      setError('请输入需求描述');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/solutions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirement: requirement,
          template_type: templateType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSolution(data.solution);
      } else {
        setError('生成方案失败，请重试');
      }
    } catch (err) {
      console.error('生成方案失败:', err);
      setError('生成方案失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存方案
  const saveSolution = async () => {
    if (!solution) return;

    try {
      const response = await fetch(`/api/solutions/${solution.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(solution)
      });

      if (response.ok) {
        alert('方案已保存');
        loadSavedSolutions();
      }
    } catch (err) {
      console.error('保存方案失败:', err);
    }
  };

  // 加载已保存的方案
  const loadSolution = async (solutionId) => {
    try {
      const response = await fetch(`/api/solutions/${solutionId}`);
      if (response.ok) {
        const data = await response.json();
        setSolution(data.solution);
      }
    } catch (err) {
      console.error('加载方案失败:', err);
    }
  };

  // 加载模板
  const [templates, setTemplates] = useState({});
  
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/solutions/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || {});
      }
    } catch (err) {
      console.error('加载模板失败:', err);
    }
  };

  React.useEffect(() => {
    loadTemplates();
    loadSavedSolutions();
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            快速方案生成
          </h2>
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

        {/* 需求输入表单 */}
        <form onSubmit={generateSolution} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              需求描述
            </label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="描述你的项目需求，例如：开发一个电商网站，包含商品展示、购物车、订单管理等功能..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              方案模板（可选）
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">自动选择</option>
              {Object.entries(templates).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? '生成中...' : '生成方案'}
          </button>
        </form>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：已保存的方案 */}
        <div className="w-1/4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            已保存的方案
          </h3>
          {savedSolutions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无保存的方案</p>
          ) : (
            <div className="space-y-2">
              {savedSolutions.map(sol => (
                <div
                  key={sol.id}
                  onClick={() => loadSolution(sol.id)}
                  className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {sol.requirement}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(sol.generated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：方案详情 */}
        <div className="flex-1 overflow-y-auto p-4">
          {!solution ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>输入需求并点击"生成方案"按钮</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 方案概览 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  方案概览
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">需求类型:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {solution.analysis?.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">复杂度:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {solution.analysis?.complexity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">预估时间:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {solution.analysis?.estimated_time}
                    </span>
                  </div>
                </div>
              </div>

              {/* 需求关键词 */}
              {solution.analysis?.keywords && Object.keys(solution.analysis.keywords).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    识别的关键词
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(solution.analysis.keywords).map(([category, words]) => (
                      <div key={category} className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {category}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {words.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 技术栈 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  推荐技术栈
                </h3>
                <div className="flex flex-wrap gap-2">
                  {solution.tech_stack?.map(tech => (
                    <span key={tech} className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* 开发阶段 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  开发阶段
                </h3>
                <div className="space-y-2">
                  {solution.phases?.map((phase, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">{phase}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 交付物 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  交付物清单
                </h3>
                <div className="space-y-3">
                  {solution.deliverables?.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {item.phase}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.items}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 风险提示 */}
              {solution.risks && solution.risks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    风险提示
                  </h3>
                  <div className="space-y-2">
                    {solution.risks.map((risk, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 下一步行动 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  下一步行动
                </h3>
                <div className="space-y-2">
                  {solution.next_steps?.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={saveSolution}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  保存方案
                </button>
                <button
                  onClick={() => {
                    const text = JSON.stringify(solution, null, 2);
                    navigator.clipboard.writeText(text);
                    alert('方案已复制到剪贴板');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  复制方案
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolutionGenerator;