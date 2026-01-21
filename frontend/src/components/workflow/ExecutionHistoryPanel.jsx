import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X, History, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';
import { authenticatedFetch } from '../../utils/api';
import { cn } from '../../lib/utils';

const StatusPill = ({ status }) => {
  const styles = {
    running: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
    completed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
    failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800',
  };
  const text = status === 'running' ? '执行中' : status === 'completed' ? '成功' : status === 'failed' ? '失败' : status || '未知';
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium', styles[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700')}>
      {text}
    </span>
  );
};

const ExecutionHistoryPanel = ({ isOpen, onClose, projectName, workflowId }) => {
  const [loading, setLoading] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const filteredExecutions = useMemo(() => {
    return executions.filter((e) => {
      if (workflowId && e.workflow_id !== workflowId) return false;
      if (projectName && e.project_name !== projectName) return false;
      return true;
    });
  }, [executions, projectName, workflowId]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (workflowId) params.set('workflow_id', workflowId);
      if (projectName) params.set('project_name', projectName);

      const res = await authenticatedFetch(`/api/workflows/executions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExecutions(data.executions || []);
      } else {
        setError(data.error || '加载执行历史失败');
      }
    } catch (e) {
      setError(e.message || '加载执行历史失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (executionId) => {
    try {
      setDetailLoading(true);
      setError(null);
      const res = await authenticatedFetch(`/api/workflows/executions/${encodeURIComponent(executionId)}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data.execution);
      } else {
        setError(data.error || '加载详情失败');
      }
    } catch (e) {
      setError(e.message || '加载详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadExecutions();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selected?.execution_id) return;
    loadDetail(selected.execution_id);
  }, [isOpen, selected?.execution_id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130]">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="Close history" />
      <div className="absolute right-0 top-0 bottom-0 w-[980px] max-w-[96vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">执行历史</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {workflowId ? `workflow: ${workflowId}` : '全部工作流'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadExecutions}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">刷新</span>
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex">
            <div className="w-[360px] border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  加载中...
                </div>
              ) : filteredExecutions.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  暂无执行历史
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredExecutions.map((e) => (
                    <button
                      key={e.execution_id}
                      onClick={() => setSelected(e)}
                      className={cn(
                        'w-full text-left p-3 rounded-2xl border transition-colors',
                        selected?.execution_id === e.execution_id
                          ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {e.workflow_name || e.workflow_id || 'Workflow'}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                            {e.execution_id}
                          </div>
                        </div>
                        <StatusPill status={e.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{e.created_at ? new Date(e.created_at).toLocaleString() : '-'}</span>
                        <span className="font-mono">
                          {e.steps_total ? `${e.steps_completed || 0}/${e.steps_total}` : '--'}
                        </span>
                      </div>
                      {e.error && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 truncate">
                          {e.error}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  <History className="w-10 h-10 opacity-50 mb-2" />
                  <div className="text-sm">选择一条执行记录查看详情</div>
                </div>
              ) : detailLoading ? (
                <div className="h-full flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  加载详情...
                </div>
              ) : detail ? (
                <div className="h-full flex flex-col">
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {detail.workflow_name || detail.workflow_id}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                          {detail.execution_id}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={detail.status} />
                        {detail.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : detail.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        )}
                      </div>
                    </div>
                    {detail.error && (
                      <div className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 text-sm">
                        {detail.error}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      事件数：{detail.events?.length || 0}
                    </div>
                    <div className="space-y-3">
                      {(detail.events || []).map((ev, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'rounded-2xl border p-3 bg-white dark:bg-gray-900',
                            ev.type === 'error'
                              ? 'border-red-200 dark:border-red-800'
                              : ev.type === 'step_start'
                              ? 'border-blue-200 dark:border-blue-800'
                              : 'border-gray-200 dark:border-gray-800'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                {ev.type}
                                {ev.step_type ? ` · ${ev.step_type}` : ''}
                                {ev.node_label ? ` · ${ev.node_label}` : ''}
                              </div>
                              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                {ev.timestamp || ''}
                              </div>
                            </div>
                          </div>
                          {(ev.content || ev.output || ev.error) && (
                            <div className="mt-2">
                              <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none">
                                {String(ev.error || ev.output || ev.content)}
                              </MarkdownRenderer>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>{error || '加载失败'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionHistoryPanel;

