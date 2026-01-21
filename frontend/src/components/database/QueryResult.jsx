/**
 * Query Result Component
 * 查询结果展示组件，支持分页、排序、导出等
 */

import React, { useMemo, useRef, useState } from 'react';
import { Download, Copy, Check, ChevronLeft, ChevronRight, Database, Clock, AlertCircle, Sparkles, X, Loader2, BarChart3, ArrowRight, MessageSquareText } from 'lucide-react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

const QueryResult = ({
  result,
  onExport,
  isLoading,
  sqlQuery,
  onApplySql,
  onExecuteSql,
  aiContext
}) => {
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [showAi, setShowAi] = useState(false);
  const [aiMode, setAiMode] = useState('interpret');
  const [aiHint, setAiHint] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const aiAbortRef = useRef(null);

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
    setExportOpen(false);
  };

  const resultContextText = useMemo(() => {
    if (!result) return '';
    if (result.success === false) return `LAST_ERROR\n${String(result.error || '').slice(0, 1200)}`.trim();
    if (!Array.isArray(result.columns) || !Array.isArray(result.rows)) return '';
    const cols = result.columns.slice(0, 40);
    const rows = result.rows.slice(0, 20).map((row) => row.slice(0, 40));
    return `LAST_RESULT\nrow_count: ${Number(result.row_count || 0)}\nexecution_time: ${Number(result.execution_time || 0)}\ncolumns: ${cols.join(', ')}\nrows_sample:\n${rows.map((row) => JSON.stringify(row)).join('\n')}`.trim();
  }, [result]);

  const schemaText = useMemo(() => {
    const info = aiContext?.tableInfo;
    if (!info || !Array.isArray(info.columns)) return '';
    const cols = info.columns
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
    return `TABLE ${String(info.name || aiContext?.selectedTable || '')}\n${cols}`.trim();
  }, [aiContext?.selectedTable, aiContext?.tableInfo]);

  const extractSqlFromReply = (text) => {
    const s = String(text || '');
    const m = s.match(/```sql\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/);
    if (m && m[1]) return m[1].trim();
    const lines = s.split('\n').map((x) => x.trim()).filter(Boolean);
    const start = lines.findIndex((l) => /^(select|with|insert|update|delete|create|alter|drop|explain)\b/i.test(l));
    if (start >= 0) return lines.slice(start).join('\n').trim();
    return '';
  };

  const buildAiMessage = (mode, hint) => {
    const dbType = String(aiContext?.dbType || '');
    const conn = String(aiContext?.selectedConnection || '');
    const selectedTable = String(aiContext?.selectedTable || '');
    const base = `你是资深数据分析师与数据库工程师。请基于提供的查询结果进行分析，并给出可执行的后续 SQL 建议。`;
    const rules =
      mode === 'interpret'
        ? `输出：用要点解读结果（异常/趋势/数据质量风险），并给出 3 条可执行的“下一步查询”方向（不必输出 SQL）。`
        : mode === 'chart'
          ? `输出：给出 2~4 个图表建议（图表类型、X/Y/分组、适用场景），并为每个图表给出对应的数据查询 SQL（每条 SQL 用 \`\`\`sql\`\`\` 包裹）。`
          : `输出：给出 3 条下一步查询 SQL（每条 SQL 用 \`\`\`sql\`\`\` 包裹），并说明各自用途；其中第一条 SQL 作为推荐。`;

    const ctx = [
      dbType ? `DB: ${dbType}` : null,
      conn ? `CONNECTION: ${conn}` : null,
      selectedTable ? `SELECTED_TABLE: ${selectedTable}` : null,
      schemaText ? `SCHEMA\n${schemaText}` : null,
      sqlQuery?.trim?.() ? `CURRENT_SQL\n${String(sqlQuery).slice(0, 6000)}` : null,
      resultContextText ? `CONTEXT\n${resultContextText}` : null
    ]
      .filter(Boolean)
      .join('\n\n');

    const userHint = String(hint || '').trim();
    return [base, rules, ctx, userHint ? `USER_HINT\n${userHint}` : null].filter(Boolean).join('\n\n');
  };

  const runAi = async (mode) => {
    if (aiStreaming) return;
    setAiError(null);
    setAiReply('');
    setAiStreaming(true);
    const abort = new AbortController();
    aiAbortRef.current = abort;

    try {
      const message = buildAiMessage(mode, aiHint);
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

  const openAi = (mode) => {
    setAiMode(mode);
    setShowAi(true);
    setAiHint('');
    setAiError(null);
    setAiReply('');
    setTimeout(() => runAi(mode), 0);
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
            onClick={() => openAi('interpret')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
            title="AI 解读结果"
          >
            <MessageSquareText className="w-4 h-4" />
            <span>AI 解读</span>
          </button>
          <button
            onClick={() => openAi('chart')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
            title="图表建议"
          >
            <BarChart3 className="w-4 h-4" />
            <span>图表</span>
          </button>
          <button
            onClick={() => openAi('next')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            title="生成下一步查询"
          >
            <ArrowRight className="w-4 h-4" />
            <span>下一步</span>
          </button>
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
              onClick={() => setExportOpen((v) => !v)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              title="导出"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>

            {exportOpen && (
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
            )}
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

      {showAi && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div className="text-sm font-semibold text-white">
                  {aiMode === 'interpret' ? 'AI 解读结果' : aiMode === 'chart' ? '图表建议' : '下一步查询'}
                </div>
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
                    placeholder="例如：关注异常值；按 tenant_id 拆分；只看最近30天"
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
                      onClick={() => runAi(aiMode)}
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
                  {aiContext?.selectedTable ? `表：${aiContext.selectedTable}` : '未选择表'}
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
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sql = extractSqlFromReply(aiReply);
                      if (!sql) return;
                      onApplySql?.(sql);
                      setShowAi(false);
                    }}
                    disabled={aiMode === 'interpret' || !extractSqlFromReply(aiReply)}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    插入推荐 SQL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sql = extractSqlFromReply(aiReply);
                      if (!sql) return;
                      onExecuteSql?.(sql);
                      setShowAi(false);
                    }}
                    disabled={aiMode === 'interpret' || !onExecuteSql || !extractSqlFromReply(aiReply)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    插入并执行
                  </button>
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

export default QueryResult;
