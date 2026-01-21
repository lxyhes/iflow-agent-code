import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function WorkflowDraftBanner({ draft, onRestore, onDiscard }) {
  if (!draft) return null;

  return (
    <div className="mb-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200 truncate">
              发现未保存的草稿
            </div>
            <div className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              {draft.workflow_name ? `名称：${draft.workflow_name}` : '未命名工作流'}
              {draft.saved_at ? ` · 保存于 ${formatTime(draft.saved_at)}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onRestore}
            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-xs font-medium flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            丢弃
          </button>
        </div>
      </div>
    </div>
  );
}

