import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Folder, 
  Combine, 
  Upload, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Loader,
  Files,
  Tag,
  Scissors
} from 'lucide-react';

/**
 * 文件批量处理器组件
 * 支持批量重命名、分类、合并文件
 */
const FileBatchProcessor = () => {
  const [activeTab, setActiveTab] = useState('rename'); // rename, classify, merge
  const [files, setFiles] = useState([]);
  const [pattern, setPattern] = useState('{name}_{date}');
  const [targetDir, setTargetDir] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [processing, setProcessing] = useState(false);
  const [taskStatus, setTaskStatus] = useState(null);
  const [result, setResult] = useState(null);

  // 处理文件选择
  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles.map(f => ({
      name: f.name,
      path: f.path || f.name,
      size: f.size
    })));
  }, []);

  // 执行批量重命名
  const handleRename = async () => {
    if (files.length === 0) {
      alert('请选择文件');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/file-batch/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePaths: files.map(f => f.path),
          pattern
        })
      });

      if (!response.ok) throw new Error('请求失败');
      
      const data = await response.json();
      setTaskStatus({ taskId: data.taskId, status: data.status });
      
      // 轮询任务状态
      pollTaskStatus(data.taskId);

    } catch (error) {
      alert('批量重命名失败：' + error.message);
      setProcessing(false);
    }
  };

  // 执行批量分类
  const handleClassify = async () => {
    if (files.length === 0) {
      alert('请选择文件');
      return;
    }
    if (!targetDir) {
      alert('请输入目标目录');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/file-batch/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePaths: files.map(f => f.path),
          targetDir
        })
      });

      if (!response.ok) throw new Error('请求失败');
      
      const data = await response.json();
      setTaskStatus({ taskId: data.taskId, status: data.status });
      
      pollTaskStatus(data.taskId);

    } catch (error) {
      alert('批量分类失败：' + error.message);
      setProcessing(false);
    }
  };

  // 执行批量合并
  const handleMerge = async () => {
    if (files.length === 0) {
      alert('请选择文件');
      return;
    }
    if (!outputPath) {
      alert('请输入输出路径');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/file-batch/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePaths: files.map(f => f.path),
          outputPath
        })
      });

      if (!response.ok) throw new Error('请求失败');
      
      const data = await response.json();
      setTaskStatus({ taskId: data.taskId, status: data.status });
      
      pollTaskStatus(data.taskId);

    } catch (error) {
      alert('批量合并失败：' + error.message);
      setProcessing(false);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/file-batch/tasks/${taskId}`);
        if (!response.ok) throw new Error('获取任务状态失败');
        
        const data = await response.json();
        setTaskStatus({ taskId, status: data.status, result: data.result });

        if (data.status === 'completed' || data.status === 'failed') {
          setResult(data);
          setProcessing(false);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        alert('获取任务状态失败：' + error.message);
        setProcessing(false);
      }
    };
    
    poll();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        文件批量处理
      </h1>

      {/* 选项卡 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('rename')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'rename'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          批量重命名
        </button>
        <button
          onClick={() => setActiveTab('classify')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'classify'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Folder className="w-4 h-4" />
          批量分类
        </button>
        <button
          onClick={() => setActiveTab('merge')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'merge'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Combine className="w-4 h-4" />
          批量合并
        </button>
      </div>

      {/* 文件选择 */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              选择文件
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              支持多选文件
            </div>
          </div>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {files.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              已选择 {files.length} 个文件：
            </div>
            <ul className="space-y-1">
              {files.slice(0, 10).map((file, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {file.name}
                </li>
              ))}
              {files.length > 10 && (
                <li className="text-sm text-gray-500 dark:text-gray-400">
                  还有 {files.length - 10} 个文件...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 配置选项 */}
      {activeTab === 'rename' && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            重命名模式
          </h3>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="例如：{name}_{date}"
          />
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>可用变量：</p>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>{'{name}'} - 原文件名</li>
              <li>{'{date}'} - 当前日期</li>
              <li>{'{timestamp}'} - 时间戳</li>
              <li>{'{upper}'} - 大写名称</li>
              <li>{'{lower}'} - 小写名称</li>
            </ul>
          </div>
          <button
            onClick={handleRename}
            disabled={processing || files.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            开始重命名
          </button>
        </div>
      )}

      {activeTab === 'classify' && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            目标目录
          </h3>
          <input
            type="text"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="例如：./organized_files"
          />
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>文件将按类型自动分类到以下目录：</p>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>images - 图片文件</li>
              <li>documents - 文档文件</li>
              <li>spreadsheets - 表格文件</li>
              <li>code - 代码文件</li>
              <li>archives - 压缩文件</li>
              <li>others - 其他文件</li>
            </ul>
          </div>
          <button
            onClick={handleClassify}
            disabled={processing || files.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            开始分类
          </button>
        </div>
      )}

      {activeTab === 'merge' && (
        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            输出路径
          </h3>
          <input
            type="text"
            value={outputPath}
            onChange={(e) => setOutputPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="例如：./merged_output.txt"
          />
          <button
            onClick={handleMerge}
            disabled={processing || files.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            开始合并
          </button>
        </div>
      )}

      {/* 任务状态 */}
      {taskStatus && (
        <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            任务状态
          </h3>
          <div className="flex items-center gap-2">
            {taskStatus.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : taskStatus.status === 'failed' ? (
              <XCircle className="w-5 h-5 text-red-500" />
            ) : (
              <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
            )}
            <span className="text-sm">{taskStatus.status}</span>
          </div>
        </div>
      )}

      {/* 结果 */}
      {result && result.result && (
        <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            处理结果
          </h3>
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {JSON.stringify(JSON.parse(result.result), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FileBatchProcessor;
