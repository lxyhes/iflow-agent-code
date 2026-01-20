/**
 * Query Result Component
 * 查询结果展示组件，支持分页、排序、导出等
 */

import React, { useState, useMemo } from 'react';
import { Download, Copy, Check, ChevronLeft, ChevronRight, Database, Clock, AlertCircle } from 'lucide-react';

const QueryResult = ({
  result,
  onExport,
  isLoading
}) => {
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const rowsPerPage = pageSize;
  const totalPages = Math.ceil((result?.row_count || 0) / rowsPerPage);

  // 排序和分页数据
  const processedData = useMemo(() => {
    if (!result || !result.rows) return [];

    let data = [...result.rows];

    // 排序
    if (sortColumn !== null) {
      data.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === bVal) return 0;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // 分页
    const startIndex = (currentPage - 1) * rowsPerPage;
    return data.slice(startIndex, startIndex + rowsPerPage);
  }, [result, sortColumn, sortDirection, currentPage, rowsPerPage]);

  const handleSort = (columnIndex) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    const csv = [
      result.columns.join(','),
      ...result.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleExport = (format) => {
    if (!result) return;
    onExport(format, result);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500 italic">NULL</span>;
    }
    if (typeof value === 'boolean') {
      return value ? <span className="text-green-400">TRUE</span> : <span className="text-red-400">FALSE</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-400">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-gray-100">{value}</span>;
    }
    return String(value);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-lg">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">执行查询中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-lg">
        <Database className="w-16 h-16 text-gray-600 mb-4" />
        <p className="text-gray-400">执行查询以查看结果</p>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-lg p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-400 text-lg font-semibold mb-2">查询失败</p>
        <p className="text-gray-400 text-center">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">
              {result.row_count.toLocaleString()} 行
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">
              {result.execution_time.toFixed(3)}s
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            title="复制为 CSV"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>

          <div className="relative">
            <button
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              title="导出"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>

            <div className="absolute top-full right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-t-lg"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-b-lg"
              >
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 w-12">
                #
              </th>
              {result.columns.map((column, index) => (
                <th
                  key={index}
                  onClick={() => handleSort(index)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 cursor-pointer hover:bg-gray-700 transition-colors select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>{column}</span>
                    {sortColumn === index && (
                      <span className="text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {processedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-2 text-gray-500 text-xs font-mono">
                  {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                </td>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2">
                    {formatValue(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">每页显示:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400">
            第 {currentPage} / {totalPages || 1} 页
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryResult;