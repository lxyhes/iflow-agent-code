/**
 * ProjectTemplateGenerator.jsx - 项目模板生成器
 * 
 * 支持多种技术栈和最佳实践模板
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FolderOpen, Zap, Code, Database, Cpu, X, CheckCircle, Download, Settings, Plus } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

const ProjectTemplateGenerator = ({ visible, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [outputPath, setOutputPath] = useState('.');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customConfig, setCustomConfig] = useState({});

  // 获取模板列表
  const fetchTemplates = useCallback(async () => {
    if (!visible) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        setError('获取模板列表失败');
      }
    } catch (err) {
      setError(`获取模板列表失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      fetchTemplates();
    }
  }, [visible, fetchTemplates]);

  // 获取技术栈图标
  const getTechStackIcon = (tech) => {
    const techLower = tech.toLowerCase();
    if (techLower.includes('react')) return <Code className="w-4 h-4 text-blue-500" />;
    if (techLower.includes('vue')) return <Code className="w-4 h-4 text-green-500" />;
    if (techLower.includes('node')) return <Cpu className="w-4 h-4 text-yellow-500" />;
    if (techLower.includes('python')) return <Database className="w-4 h-4 text-blue-600" />;
    if (techLower.includes('go')) return <Zap className="w-4 h-4 text-cyan-500" />;
    if (techLower.includes('typescript')) return <Code className="w-4 h-4 text-blue-700" />;
    return <Code className="w-4 h-4 text-gray-500" />;
  };

  // 生成项目
  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError('请选择一个模板');
      return;
    }

    if (!projectName.trim()) {
      setError('请输入项目名称');
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authenticatedFetch('/api/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: selectedTemplate.template_id,
          project_name: projectName,
          output_path: outputPath,
          custom_config: customConfig
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`项目 ${projectName} 创建成功！路径: ${data.project_path}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '生成项目失败');
      }
    } catch (err) {
      setError(`生成项目失败: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // 选择模板
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setSuccess(null);
  };

  // 添加自定义配置
  const handleAddConfig = () => {
    const key = prompt('请输入配置键:');
    if (key) {
      const value = prompt('请输入配置值:');
      if (value !== null) {
        setCustomConfig(prev => ({
          ...prev,
          [key]: value
        }));
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-20 w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">项目模板生成器</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">加载模板中...</p>
          </div>
        ) : error && !success ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 模板选择 */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">选择模板</h4>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <div
                    key={template.template_id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTemplate?.template_id === template.template_id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getTechStackIcon(template.tech_stack[0])}
                      <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                        {template.name}
                      </h5>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.tech_stack.slice(0, 3).map((tech, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                      {template.tech_stack.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          +{template.tech_stack.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 项目配置 */}
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    项目名称
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    输出路径
                  </label>
                  <input
                    type="text"
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    placeholder="."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* 高级配置 */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Settings className="w-4 h-4" />
                    {showAdvanced ? '隐藏' : '显示'}高级配置
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          自定义配置
                        </span>
                        <button
                          onClick={handleAddConfig}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                        >
                          <Plus className="w-3 h-3" />
                          添加
                        </button>
                      </div>
                      {Object.entries(customConfig).length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">暂无自定义配置</p>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(customConfig).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-gray-700 dark:text-gray-300">{key}:</span>
                              <span className="text-gray-900 dark:text-white font-mono">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 模板详情 */}
                {selectedTemplate.structure && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      项目结构
                    </label>
                    <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300">
                      {JSON.stringify(selectedTemplate.structure, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 成功消息 */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
              </div>
            )}

            {/* 错误消息 */}
            {error && !success && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <X className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleGenerate}
          disabled={!selectedTemplate || !projectName.trim() || generating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              生成中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              生成项目
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProjectTemplateGenerator;