import React, { useMemo } from 'react';
import { Copy, Layers } from 'lucide-react';
import { workflowTemplates } from './workflowTemplates';
import { loadCustomTemplatesForProject } from './workflowTemplateStorage';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

const categoryColor = (category) => {
  switch (category) {
    case '工程效率':
      return 'from-indigo-500/15 to-purple-500/10 border-indigo-200 dark:border-indigo-800';
    case '运维与监控':
      return 'from-emerald-500/15 to-cyan-500/10 border-emerald-200 dark:border-emerald-800';
    case '产品与交付':
      return 'from-amber-500/15 to-orange-500/10 border-amber-200 dark:border-amber-800';
    case '数据与平台':
      return 'from-teal-500/15 to-sky-500/10 border-teal-200 dark:border-teal-800';
    case '安全与合规':
      return 'from-rose-500/15 to-red-500/10 border-rose-200 dark:border-rose-800';
    default:
      return 'from-gray-500/10 to-gray-500/5 border-gray-200 dark:border-gray-800';
  }
};

const toSafeList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const TemplateCard = ({ t, onPick }) => {
  const toast = useToast();

  const copyJson = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(JSON.stringify(t, null, 2));
      toast.success('已复制模板 JSON');
    } catch (err) {
      toast.error(`复制失败：${err?.message || '未知错误'}`);
    }
  };

  const clickable = typeof onPick === 'function';

  return (
    <button
      type="button"
      onClick={() => onPick?.(t)}
      className={cn(
        'group text-left rounded-2xl border p-4 transition-all shadow-sm hover:shadow-md',
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
        !clickable && 'cursor-default'
      )}
    >
      <div className={cn('rounded-2xl border bg-gradient-to-br p-3', categoryColor(t.category))}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.name}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.category}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyJson}
              className="w-9 h-9 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-950/60 transition-colors"
              aria-label="复制模板 JSON"
              title="复制模板 JSON"
            >
              <Copy className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
            <div className="w-9 h-9 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </div>
          </div>
        </div>
      </div>

      {t.description ? (
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{t.description}</div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {toSafeList(t.tags).slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
        {toSafeList(t.nodes).length} 节点 · {toSafeList(t.edges).length} 连线
      </div>
    </button>
  );
};

const WorkflowTemplateCards = ({
  templates,
  limit = 8,
  includeCustom = false,
  project,
  title = '工作流模板',
  onPick,
  className
}) => {
  const list = useMemo(() => {
    const base = toSafeList(templates);
    if (base.length > 0) return base;
    const builtin = workflowTemplates || [];
    const custom = includeCustom ? loadCustomTemplatesForProject(project) : [];
    return [...builtin, ...custom];
  }, [templates, includeCustom, project]);

  const shown = useMemo(() => list.slice(0, Math.max(0, limit || 0)), [list, limit]);

  if (!shown.length) return null;

  return (
    <div className={cn('w-full', className)}>
      {title ? (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">共 {list.length} 个</div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shown.map((t) => (
          <TemplateCard key={String(t.id)} t={t} onPick={onPick} />
        ))}
      </div>
    </div>
  );
};

export default WorkflowTemplateCards;

