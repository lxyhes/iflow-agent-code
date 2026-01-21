import React, { useMemo, useState } from 'react';
import { X, Search, Sparkles, Layers, ArrowRight } from 'lucide-react';
import { workflowTemplates } from './workflowTemplates';
import { cn } from '../../lib/utils';

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

const TemplateCard = ({ t, onPick }) => {
  return (
    <button
      type="button"
      onClick={() => onPick(t)}
      className={cn(
        'group text-left rounded-2xl border p-4 transition-all shadow-sm hover:shadow-md',
        'bg-white dark:bg-gray-900',
        'border-gray-200 dark:border-gray-800'
      )}
    >
      <div className={cn('rounded-2xl border bg-gradient-to-br p-3', categoryColor(t.category))}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.name}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.category}</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
        {t.description}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(t.tags || []).slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {(t.nodes?.length || 0)} 节点 · {(t.edges?.length || 0)} 连线
        </div>
        <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          使用模板
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
};

const WorkflowTemplateModal = ({ open, onClose, onPickTemplate }) => {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('全部');

  const categories = useMemo(() => {
    const s = new Set(workflowTemplates.map((t) => t.category || '其他'));
    return ['全部', ...Array.from(s)];
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return workflowTemplates.filter((t) => {
      if (category !== '全部' && (t.category || '其他') !== category) return false;
      if (!query) return true;
      const hay = [
        t.name,
        t.description,
        t.category,
        ...(t.tags || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [q, category]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close templates" />
      <div className="relative w-full max-w-5xl rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">工作流模板库</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">选择一个模板快速开始，然后按你的业务微调</div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索模板：例如 bug / release / incident / api"
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white/80 dark:bg-gray-950/40 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="sm:w-48 px-3 py-2.5 rounded-2xl bg-white/80 dark:bg-gray-950/40 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-950/30">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">没有匹配的模板</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">试试换个关键词或切换分类</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  onPick={(tpl) => {
                    onPickTemplate?.(tpl);
                    onClose?.();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowTemplateModal;

