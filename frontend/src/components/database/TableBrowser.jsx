/**
 * Table Browser Component
 * 数据库表结构浏览器，显示表信息和列详情
 */

import React, { useState } from 'react';
import { Database, Table2, Key, Hash, FileText, ChevronRight, ChevronDown, Search } from 'lucide-react';

const TableBrowser = ({
  tables,
  selectedTable,
  onTableSelect,
  tableInfo,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTables, setExpandedTables] = useState(new Set());

  const filteredTables = tables.filter(table =>
    table.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTableExpand = (tableName) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
        onTableSelect(tableName);
      }
      return newSet;
    });
  };

  const getTypeColor = (type) => {
    const typeColors = {
      'INTEGER': 'text-blue-400',
      'TEXT': 'text-green-400',
      'REAL': 'text-purple-400',
      'BLOB': 'text-orange-400',
      'NUMERIC': 'text-cyan-400',
      'VARCHAR': 'text-green-400',
      'CHAR': 'text-green-400',
      'BOOLEAN': 'text-pink-400',
      'DATE': 'text-yellow-400',
      'DATETIME': 'text-yellow-400',
      'TIMESTAMP': 'text-yellow-400',
    };
    return typeColors[type.toUpperCase()] || 'text-gray-400';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">数据库表</h2>
          <span className="text-xs text-gray-400">({tables.length})</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          title="刷新"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索表名..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 表列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Table2 className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">没有找到表</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredTables.map((table) => (
              <div key={table}>
                {/* 表名行 */}
                <div
                  onClick={() => toggleTableExpand(table)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800 transition-colors ${
                    selectedTable === table ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {expandedTables.has(table) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <Table2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-white font-medium">{table}</span>
                  </div>
                  {tableInfo && tableInfo.name === table && (
                    <span className="text-xs text-gray-400">{tableInfo.row_count.toLocaleString()} 行</span>
                  )}
                </div>

                {/* 表详细信息 */}
                {expandedTables.has(table) && tableInfo && tableInfo.name === table && (
                  <div className="px-4 py-3 bg-gray-800/50 border-l-2 border-blue-500">
                    {/* 列信息 */}
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        列信息
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                              <th className="pb-2 pr-2">列名</th>
                              <th className="pb-2 pr-2">类型</th>
                              <th className="pb-2 pr-2">主键</th>
                              <th className="pb-2 pr-2">非空</th>
                              <th className="pb-2">默认值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableInfo.columns.map((col) => (
                              <tr key={col.cid} className="border-b border-gray-700/50">
                                <td className="py-2 pr-2 text-white font-mono">{col.name}</td>
                                <td className="py-2 pr-2">
                                  <span className={getTypeColor(col.type)}>{col.type}</span>
                                </td>
                                <td className="py-2 pr-2">
                                  {col.pk ? (
                                    <Key className="w-3 h-3 text-yellow-400" title="主键" />
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                </td>
                                <td className="py-2 pr-2">
                                  {col.notnull ? (
                                    <span className="text-red-400">✓</span>
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                </td>
                                <td className="py-2 text-gray-400">
                                  {col.default_value || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 索引信息 */}
                    {tableInfo.indexes && tableInfo.indexes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          索引
                        </h4>
                        <div className="space-y-1">
                          {tableInfo.indexes.map((index) => (
                            <div key={index.seq} className="flex items-center justify-between text-xs">
                              <span className="text-white font-mono">{index.name}</span>
                              <div className="flex items-center space-x-2">
                                {index.unique && (
                                  <span className="text-yellow-400">唯一</span>
                                )}
                                <span className="text-gray-400">{index.origin}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TableBrowser;