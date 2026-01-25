/**
 * Table Browser Component
 * 数据库表结构浏览器，显示表信息和列详情
 */

import React, { useMemo, useRef, useState } from 'react';
import { Database, Table2, Key, Hash, FileText, ChevronRight, ChevronDown, Search, Sparkles, X, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

const TableBrowser = ({
  tables,
  selectedTable,
  onTableSelect,
  tableInfo,
  onRefresh,
  onInsertSql,
  onInsertAndExecuteSql,
  aiContext
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [showAi, setShowAi] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiHint, setAiHint] = useState('');
  const aiAbortRef = useRef(null);

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

  const schemaText = useMemo(() => {
    if (!tableInfo || !Array.isArray(tableInfo.columns)) return '';
    const cols = tableInfo.columns
      .map((c) => {
        const parts = [String(c.name || '')];
        if (c.type) parts.push(String(c.type));
        if (c.pk) parts.push('PK');
        if (c.notnull) parts.push('NOT NULL');
        if (c.default_value !== null && c.default_value !== undefined && c.default_value !== '') parts.push(`DEFAULT ${String(c.default_value)}`);
        return parts.filter(Boolean).join(' ');
      })
      .slice(0, 80)
      .join('\n');
    return `TABLE ${String(tableInfo.name || selectedTable || '')}\n${cols}`.trim();
  }, [selectedTable, tableInfo]);

  const extractSqlBlocks = (text) => {
    const s = String(text || '');
    const blocks = [];
    const re = /```sql\s*([\s\S]*?)```/gi;
    let m;
    while ((m = re.exec(s))) {
      const sql = String(m[1] || '').trim();
      if (sql) blocks.push(sql);
      if (blocks.length >= 10) break;
    }
    if (blocks.length > 0) return blocks;
    const lines = s.split('\n');
    const start = lines.findIndex((l) => /^(select|with|insert|update|delete|create|alter|drop|explain)\b/i.test(l.trim()));
    if (start >= 0) return [lines.slice(start).join('\n').trim()];
    return [];
  };

  const buildAiMessage = (hint) => {
    const dbType = String(aiContext?.dbType || '');
    const conn = String(aiContext?.selectedConnection || '');
    const base = `你是资深数据库工程师与SQL助手。请为选中的表生成常用查询模板，覆盖：基础查询、筛选、分页、聚合统计、按时间窗口（若存在时间列）、TopN、去重。`;
    const rules = `输出格式：先给出一个简短清单（要点），然后给出 6~10 条 SQL，每条必须用 \`\`\`sql\`\`\` 包裹，并在 SQL 前用一行标题（例如：### 最近7天按用户聚合）。`;
    const ctx = [
      dbType ? `DB: ${dbType}` : null,
      conn ? `CONNECTION: ${conn}` : null,
      schemaText ? `SCHEMA\n${schemaText}` : null
    ]
      .filter(Boolean)
      .join('\n\n');
    const user = String(hint || '').trim();
    return [base, rules, ctx ? `CONTEXT\n${ctx}` : null, user ? `USER_HINT\n${user}` : null].filter(Boolean).join('\n\n');
  };

  const runAi = async () => {
    if (aiStreaming) return;
    setAiError(null);
    setAiReply('');
    setAiStreaming(true);
    const abort = new AbortController();
    aiAbortRef.current = abort;

    try {
      const message = buildAiMessage(aiHint);
      const url = `/stream?message=${encodeURIComponent(message)}&persona=partner`;
      const res = await fetch(url, { method: 'GET', signal: abort.signal });
      if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
      if (!res.body) throw new Error('AI stream not supported');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let evt;
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type === 'content') {
            const content = String(evt.content || '');
            setAiReply((prev) => prev + content);
          } else if (evt.type === 'error') {
            setAiError(String(evt.content || 'AI error'));
          } else if (evt.type === 'done') {
            break;
          }
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setAiError(String(e?.message || e));
      }
    } finally {
      setAiStreaming(false);
      aiAbortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">数据库表</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">({tables.length})</span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="刷新"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索表名..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* 表列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Table2 className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">没有找到表</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredTables.map((table) => (
              <div key={table}>
                {/* 表名行 */}
                <div
                  onClick={() => toggleTableExpand(table)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedTable === table ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {expandedTables.has(table) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <Table2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-sm text-gray-900 dark:text-white font-medium">{table}</span>
                  </div>
                  {tableInfo && tableInfo.name === table && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{tableInfo.row_count.toLocaleString()} 行</span>
                  )}
                </div>

                {/* 表详细信息 */}
                {expandedTables.has(table) && tableInfo && tableInfo.name === table && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-l-2 border-blue-500">
                    {/* 列信息 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          列信息
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAi(true);
                            setAiReply('');
                            setAiError(null);
                            setAiHint('');
                            setTimeout(() => runAi(), 0);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
                          title="AI 生成常用查询"
                        >
                          <Sparkles className="w-3 h-3" />
                          AI 常用查询
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                              <th className="pb-2 pr-2">列名</th>
                              <th className="pb-2 pr-2">类型</th>
                              <th className="pb-2 pr-2">主键</th>
                              <th className="pb-2 pr-2">非空</th>
                              <th className="pb-2">默认值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableInfo.columns.map((col) => (
                              <tr key={col.cid} className="border-b border-gray-200/50 dark:border-gray-700/50">
                                <td className="py-2 pr-2 text-gray-900 dark:text-white font-mono">{col.name}</td>
                                <td className="py-2 pr-2">
                                  <span className={getTypeColor(col.type)}>{col.type}</span>
                                </td>
                                <td className="py-2 pr-2">
                                  {col.pk ? (
                                    <Key className="w-3 h-3 text-yellow-500 dark:text-yellow-400" title="主键" />
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-600">-</span>
                                  )}
                                </td>
                                <td className="py-2 pr-2">
                                  {col.notnull ? (
                                    <span className="text-red-500 dark:text-red-400">✓</span>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-600">-</span>
                                  )}
                                </td>
                                <td className="py-2 text-gray-500 dark:text-gray-400">
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
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          索引
                        </h4>
                        <div className="space-y-1">
                          {tableInfo.indexes.map((index) => (
                            <div key={index.seq} className="flex items-center justify-between text-xs">
                              <span className="text-gray-900 dark:text-white font-mono">{index.name}</span>
                              <div className="flex items-center space-x-2">
                                {index.unique && (
                                  <span className="text-yellow-600 dark:text-yellow-400">唯一</span>
                                )}
                                <span className="text-gray-500 dark:text-gray-400">{index.origin}</span>
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

      {showAi && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div className="text-sm font-semibold text-white">AI 常用查询</div>
                <div className="text-xs text-gray-400">{selectedTable || tableInfo?.name || ''}</div>
              </div>
              <button
                onClick={() => {
                  aiAbortRef.current?.abort?.();
                  setShowAi(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-300 mb-2">偏好（可选）</div>
                  <textarea
                    value={aiHint}
                    onChange={(e) => setAiHint(e.target.value)}
                    placeholder="例如：时间字段是 created_at；需要按 tenant_id 过滤"
                    className="w-full h-24 bg-gray-800 text-gray-100 text-sm rounded-lg border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {aiStreaming ? (
                    <button
                      type="button"
                      onClick={() => aiAbortRef.current?.abort?.()}
                      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm"
                    >
                      停止
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={runAi}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors text-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      重新生成
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAiReply('');
                      setAiError(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors text-sm"
                  >
                    清空
                  </button>
                </div>

                <div className="text-xs text-gray-400">
                  {schemaText ? '已附带表结构' : '无表结构信息'}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="text-xs font-semibold text-gray-300">AI 输出</div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 overflow-auto max-h-[55vh]">
                  {aiStreaming && !aiReply && !aiError ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </div>
                  ) : aiError ? (
                    <div className="text-red-400 text-sm">{aiError}</div>
                  ) : aiReply ? (
                    <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none">
                      {aiReply}
                    </MarkdownRenderer>
                  ) : (
                    <div className="text-gray-500 text-sm">暂无输出</div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {extractSqlBlocks(aiReply).map((sql, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onInsertSql?.(sql);
                          setShowAi(false);
                        }}
                        className="flex-1 text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-100 text-sm transition-colors"
                        title="插入到 SQL 编辑器"
                      >
                        插入 SQL {idx + 1}
                      </button>
                      {onInsertAndExecuteSql && (
                        <button
                          type="button"
                          onClick={() => {
                            onInsertAndExecuteSql(sql);
                            setShowAi(false);
                          }}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                          title="插入并执行"
                        >
                          执行
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      aiAbortRef.current?.abort?.();
                      setShowAi(false);
                    }}
                    className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors text-sm"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableBrowser;
