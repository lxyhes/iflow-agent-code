import React, { useState, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  BarChart3, 
  Wand2, 
  Broom, 
  Download,
  Loader,
  Table,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

/**
 * Excel 分析器组件
 * 支持 Excel 文件分析、美化、数据清洗等功能
 */
const ExcelAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('analyze'); // analyze, beautify, clean
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [beautifiedData, setBeautifiedData] = useState(null);
  const [cleanOptions, setCleanOptions] = useState({
    removeEmptyRows: true,
    fillEmptyCells: false,
    fillValue: ''
  });

  // 处理文件选择
  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysisResult(null);
      setBeautifiedData(null);
    }
  }, []);

  // 分析 Excel
  const handleAnalyze = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/excel/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('分析失败');
      
      const data = await response.json();
      setAnalysisResult(data);

    } catch (error) {
      alert('分析失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 美化 Excel
  const handleBeautify = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    setLoading(true);
    setBeautifiedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/excel/beautify', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('美化失败');
      
      // 下载美化后的文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beautified_' + file.name;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setBeautifiedData({ success: true, message: '美化完成，文件已下载' });

    } catch (error) {
      alert('美化失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 数据清洗
  const handleClean = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/excel/clean-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanOptions)
      });

      if (!response.ok) throw new Error('清洗失败');
      
      const data = await response.json();
      
      if (data.fileData) {
        // 下载清洗后的文件
        const byteCharacters = atob(data.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cleaned_' + file.name;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      alert(`清洗完成！\n删除空行：${data.removedRows}\n填充单元格：${data.filledCells}`);

    } catch (error) {
      alert('清洗失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Excel 分析工具
      </h1>

      {/* 选项卡 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'analyze'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          文件分析
        </button>
        <button
          onClick={() => setActiveTab('beautify')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'beautify'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          美化表格
        </button>
        <button
          onClick={() => setActiveTab('clean')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'clean'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Broom className="w-4 h-4" />
          数据清洗
        </button>
      </div>

      {/* 文件选择 */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              选择 Excel 文件
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              支持 .xlsx, .xls 格式
            </div>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        {file && (
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            已选择：{file.name} ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}
      </div>

      {/* 分析功能 */}
      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <button
            onClick={handleAnalyze}
            disabled={loading || !file}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            开始分析
          </button>

          {analysisResult && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* 基本信息 */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  基本信息
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">文件名:</span>
                    <span className="text-gray-900 dark:text-white">{analysisResult.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">文件大小:</span>
                    <span className="text-gray-900 dark:text-white">{(analysisResult.fileSize / 1024).toFixed(2)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">工作表数量:</span>
                    <span className="text-gray-900 dark:text-white">{analysisResult.sheetCount}</span>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              {analysisResult.statistics && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    数据统计
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">总行数:</span>
                      <span className="text-gray-900 dark:text-white">{analysisResult.statistics.totalRows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">总单元格数:</span>
                      <span className="text-gray-900 dark:text-white">{analysisResult.statistics.totalCells}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">填充率:</span>
                      <span className="text-gray-900 dark:text-white">{analysisResult.statistics.fillRate}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 工作表列表 */}
              {analysisResult.sheets && (
                <div className="md:col-span-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">工作表列表</h3>
                  <div className="space-y-3">
                    {analysisResult.sheets.map((sheet, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="font-medium text-gray-900 dark:text-white">{sheet.sheetName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          行数：{sheet.lastRowNum} | 列数：{sheet.columnCount}
                        </div>
                        {sheet.headers && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {sheet.headers.slice(0, 5).map((header, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                {header}
                              </span>
                            ))}
                            {sheet.headers.length > 5 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{sheet.headers.length - 5} 更多
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 美化功能 */}
      {activeTab === 'beautify' && (
        <div className="space-y-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">美化选项</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                自动应用标题样式
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                交替行颜色
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                自动调整列宽
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                添加边框
              </li>
            </ul>
          </div>

          <button
            onClick={handleBeautify}
            disabled={loading || !file}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            美化并下载
          </button>

          {beautifiedData && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                {beautifiedData.message}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 数据清洗功能 */}
      {activeTab === 'clean' && (
        <div className="space-y-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">清洗选项</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={cleanOptions.removeEmptyRows}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, removeEmptyRows: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">删除空行</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={cleanOptions.fillEmptyCells}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, fillEmptyCells: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">填充空单元格</span>
              </label>
              {cleanOptions.fillEmptyCells && (
                <input
                  type="text"
                  value={cleanOptions.fillValue}
                  onChange={(e) => setCleanOptions({ ...cleanOptions, fillValue: e.target.value })}
                  placeholder="填充值"
                  className="ml-7 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              )}
            </div>
          </div>

          <button
            onClick={handleClean}
            disabled={loading || !file}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Broom className="w-4 h-4" />}
            清洗数据并下载
          </button>
        </div>
      )}
    </div>
  );
};

export default ExcelAnalyzer;
