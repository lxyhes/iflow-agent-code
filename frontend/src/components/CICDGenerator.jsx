/**
 * CICDGenerator.jsx - CI/CD 配置生成器组件
 * 支持 GitHub Actions、GitLab CI 等主流 CI/CD 平台
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Download, Copy, Check, Settings, Play, Code, Server, Zap, FileText, X } from 'lucide-react';

const CICDGenerator = ({ visible, onClose, projectPath, projectName }) => {
  const [platforms, setPlatforms] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('github');
  const [selectedProjectType, setSelectedProjectType] = useState('react');
  const [customProjectName, setCustomProjectName] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedFile, setCopiedFile] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customConfig, setCustomConfig] = useState({});

  // 获取支持的列表
  const fetchSupported = useCallback(async () => {
    if (!visible) return;

    setLoading(true);
    setError(null);

    try {
      const [platformsRes, typesRes] = await Promise.all([
        fetch('/api/cicd/platforms'),
        fetch('/api/cicd/project-types')
      ]);

      if (platformsRes.ok && typesRes.ok) {
        const platformsData = await platformsRes.json();
        const typesData = await typesRes.json();
        
        setPlatforms(platformsData.platforms || []);
        setProjectTypes(typesData.project_types || []);
      }
    } catch (err) {
      setError(`获取支持列表失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      fetchSupported();
      setCustomProjectName(projectName || '');
    }
  }, [visible, fetchSupported, projectName]);

  // 生成配置
  const handleGenerate = async () => {
    if (!selectedPlatform || !selectedProjectType || !customProjectName) {
      setError('请填写所有必要字段');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedFiles({});

    try {
      const response = await fetch('/api/cicd/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          project_type: selectedProjectType,
          project_name: customProjectName,
          config: customConfig
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成配置失败');
      }

      const data = await response.json();
      setGeneratedFiles(data.files || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 复制文件内容
  const handleCopy = async (fileName, content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (err) {
      setError('复制失败');
    }
  };

  // 下载文件
  const handleDownload = (fileName, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 下载所有文件
  const handleDownloadAll = () => {
    Object.entries(generatedFiles).forEach(([fileName, content]) => {
      handleDownload(fileName, content);
    });
  };

  // 获取平台图标
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'github':
        return <GitBranch className="w-5 h-5" />;
      case 'gitlab':
        return <GitBranch className="w-5 h-5" />;
      case 'jenkins':
        return <Server className="w-5 h-5" />;
      default:
        return <Code className="w-5 h-5" />;
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">CI/CD 配置生成器</h2>
              <p className="text-sm text-gray-400">快速生成自动化部署配置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-700/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 配置选项 */}
          <div className="space-y-4">
            {/* 平台选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CI/CD 平台
              </label>
              <div className="grid grid-cols-3 gap-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPlatform === platform.id
                        ? 'border-blue-500 bg-blue-600/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {getPlatformIcon(platform.id)}
                      <span className="text-sm font-medium text-gray-300 capitalize">
                        {platform.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 项目类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                项目类型
              </label>
              <select
                value={selectedProjectType}
                onChange={(e) => setSelectedProjectType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {projectTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 项目名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                项目名称
              </label>
              <input
                type="text"
                value={customProjectName}
                onChange={(e) => setCustomProjectName(e.target.value)}
                placeholder="输入项目名称"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 高级选项 */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showAdvanced ? '隐藏' : '显示'}高级选项
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 bg-gray-900/50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      自定义配置 (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(customConfig, null, 2)}
                      onChange={(e) => {
                        try {
                          setCustomConfig(JSON.parse(e.target.value));
                        } catch (err) {
                          // 忽略 JSON 解析错误
                        }
                      }}
                      placeholder='{"key": "value"}'
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 font-mono text-sm focus:outline-none focus:border-blue-500"
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  生成配置
                </>
              )}
            </button>
          </div>

          {/* 生成的文件 */}
          {Object.keys(generatedFiles).length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">生成的配置文件</h3>
                <button
                  onClick={handleDownloadAll}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  下载全部
                </button>
              </div>

              {Object.entries(generatedFiles).map(([fileName, content]) => (
                <div
                  key={fileName}
                  className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden"
                >
                  {/* 文件头部 */}
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-300">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(fileName, content)}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="复制"
                      >
                        {copiedFile === fileName ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(fileName, content)}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="下载"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* 文件内容 */}
                  <div className="p-4">
                    <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CICDGenerator;