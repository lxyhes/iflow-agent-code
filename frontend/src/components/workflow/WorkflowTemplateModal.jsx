import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Sparkles, Layers, ArrowRight, Star, Clock, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { workflowTemplates } from './workflowTemplates';
import { cn } from '../../lib/utils';
import { loadCustomTemplates, removeCustomTemplate, saveCustomTemplates } from './workflowTemplateStorage';

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

const TemplateCard = ({ t, isFavorite, isRecent, onPick, onToggleFavorite, onRename, onDelete, onExport }) => {
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
          <div className="flex items-center gap-2">
            {isRecent && (
              <div className="w-9 h-9 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-gray-700 dark:text-gray-200" />
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(t);
              }}
              className="w-9 h-9 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-950/60 transition-colors"
              aria-label={isFavorite ? '取消收藏' : '收藏'}
              title={isFavorite ? '取消收藏' : '收藏'}
            >
              <Star
                className={cn('w-4 h-4', isFavorite ? 'text-amber-600 dark:text-amber-300' : 'text-gray-700 dark:text-gray-200')}
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </button>
            {!isRecent && (
              <div className="w-9 h-9 rounded-2xl bg-white/70 dark:bg-gray-950/40 border border-white/60 dark:border-white/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-gray-700 dark:text-gray-200" />
              </div>
            )}
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
        {t.source === 'custom' ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onExport?.(t);
              }}
              className="w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors flex items-center justify-center"
              title="导出"
              aria-label="导出"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRename?.(t);
              }}
              className="w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors flex items-center justify-center"
              title="重命名"
              aria-label="重命名"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(t);
              }}
              className="w-8 h-8 rounded-xl border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/40 transition-colors flex items-center justify-center"
              title="删除"
              aria-label="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
            使用模板
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </button>
  );
};

const WorkflowTemplateModal = ({ open, onClose, onPickTemplate }) => {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('全部');
  const [view, setView] = useState('all');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [recentIds, setRecentIds] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [importFlash, setImportFlash] = useState(null);
  const searchInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchInputRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      const fav = JSON.parse(localStorage.getItem('iflow:workflow:template:favorites') || '[]');
      if (Array.isArray(fav)) setFavoriteIds(fav.map(String));
    } catch {
    }
    try {
      const rec = JSON.parse(localStorage.getItem('iflow:workflow:template:recent') || '[]');
      if (Array.isArray(rec)) setRecentIds(rec.map(String));
    } catch {
    }
    setCustomTemplates(loadCustomTemplates());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const categories = useMemo(() => {
    const s = new Set([...workflowTemplates, ...customTemplates].map((t) => t.category || '其他'));
    return ['全部', ...Array.from(s)];
  }, [customTemplates]);

  const templateById = useMemo(() => {
    const m = new Map();
    [...workflowTemplates, ...customTemplates].forEach((t) => m.set(String(t.id), t));
    return m;
  }, [customTemplates]);

  const favoriteSet = useMemo(() => new Set(favoriteIds.map(String)), [favoriteIds]);
  const recentSet = useMemo(() => new Set(recentIds.map(String)), [recentIds]);

  const toggleFavorite = (tpl) => {
    const id = String(tpl?.id || '');
    if (!id) return;
    setFavoriteIds((prev) => {
      const nextSet = new Set(prev.map(String));
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      const next = Array.from(nextSet);
      try {
        localStorage.setItem('iflow:workflow:template:favorites', JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };

  const pushRecent = (tpl) => {
    const id = String(tpl?.id || '');
    if (!id) return;
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => String(x) !== id)].slice(0, 12);
      try {
        localStorage.setItem('iflow:workflow:template:recent', JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = [...workflowTemplates, ...customTemplates];
    if (view === 'favorites') {
      list = list.filter((t) => favoriteSet.has(String(t.id)));
    } else if (view === 'recent') {
      list = recentIds.map((id) => templateById.get(String(id))).filter(Boolean);
    } else if (view === 'mine') {
      list = customTemplates;
    }

    return list.filter((t) => {
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
  }, [category, favoriteSet, q, recentIds, templateById, view]);

  const exportTemplate = (tpl) => {
    const safeName = String(tpl?.name || 'template').replace(/[\\/:*?"<>|]+/g, '_');
    const payload = {
      version: 1,
      template: {
        id: String(tpl?.id || ''),
        name: String(tpl?.name || ''),
        category: String(tpl?.category || ''),
        tags: Array.isArray(tpl?.tags) ? tpl.tags : [],
        description: String(tpl?.description || ''),
        nodes: Array.isArray(tpl?.nodes) ? tpl.nodes : [],
        edges: Array.isArray(tpl?.edges) ? tpl.edges : [],
        source: String(tpl?.source || 'custom'),
        exported_at: new Date().toISOString(),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const readFileText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsText(file);
    });

  const extractTemplatesFromPayload = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (payload?.template) return [payload.template];
    if (Array.isArray(payload?.templates)) return payload.templates;
    return [payload];
  };

  const importTemplatesFromFiles = async (files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    const existing = new Set([...workflowTemplates, ...customTemplates].map((t) => String(t.id)));
    let imported = 0;
    let skipped = 0;

    const nextCustom = [...customTemplates];

    for (const file of list) {
      try {
        const raw = await readFileText(file);
        const json = JSON.parse(raw);
        const candidates = extractTemplatesFromPayload(json);
        for (const c of candidates) {
          const nodes = Array.isArray(c?.nodes) ? c.nodes : null;
          const edges = Array.isArray(c?.edges) ? c.edges : null;
          if (!nodes || !edges) {
            skipped += 1;
            continue;
          }

          const baseId = String(c?.id || '');
          let id = baseId;
          if (!id || existing.has(id)) {
            id = `custom_import_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
          }
          existing.add(id);

          const tpl = {
            id,
            name: String(c?.name || file.name?.replace(/\.template\.json$|\.json$/i, '') || '导入模板'),
            category: String(c?.category || '我的模板'),
            tags: Array.isArray(c?.tags) ? c.tags.map(String).filter(Boolean) : [],
            description: String(c?.description || ''),
            nodes,
            edges,
            source: 'custom',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          nextCustom.unshift(tpl);
          imported += 1;
        }
      } catch {
        skipped += 1;
      }
    }

    if (imported > 0) {
      saveCustomTemplates(nextCustom);
      setCustomTemplates(loadCustomTemplates());
      setView('mine');
      setImportFlash(`已导入 ${imported} 个模板`);
    } else {
      setImportFlash('导入失败：未找到可用模板');
    }

    if (skipped > 0 && imported > 0) {
      setTimeout(() => setImportFlash(null), 1800);
    } else {
      setTimeout(() => setImportFlash(null), 1800);
    }
  };

  const deleteTemplate = (tpl) => {
    const id = String(tpl?.id || '');
    if (!id) return;
    if (!window.confirm(`确定删除模板「${String(tpl?.name || '')}」？此操作不可撤销。`)) return;
    removeCustomTemplate(id);
    const next = loadCustomTemplates();
    setCustomTemplates(next);
    setFavoriteIds((prev) => {
      const updated = prev.filter((x) => String(x) !== id);
      try {
        localStorage.setItem('iflow:workflow:template:favorites', JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
    setRecentIds((prev) => {
      const updated = prev.filter((x) => String(x) !== id);
      try {
        localStorage.setItem('iflow:workflow:template:recent', JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
  };

  const startRename = (tpl) => {
    setRenameTarget(tpl);
    setRenameValue(String(tpl?.name || ''));
    setTimeout(() => renameInputRef.current?.focus?.(), 50);
  };

  const applyRename = () => {
    const target = renameTarget;
    const nextName = String(renameValue || '').trim();
    if (!target || !nextName) {
      setRenameTarget(null);
      return;
    }
    const id = String(target.id);
    const list = loadCustomTemplates();
    const idx = list.findIndex((t) => String(t.id) === id);
    if (idx >= 0) {
      const updated = [...list];
      updated[idx] = { ...updated[idx], name: nextName, updated_at: new Date().toISOString() };
      saveCustomTemplates(updated);
      setCustomTemplates(updated);
    }
    setRenameTarget(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close templates" />
      <div className="relative w-full max-w-5xl max-h-[85vh] rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col">
        <input
          ref={importInputRef}
          type="file"
          accept=".json,.template.json,application/json"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = '';
            importTemplatesFromFiles(files);
          }}
        />
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
                ref={searchInputRef}
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

          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('all')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  view === 'all'
                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                    : 'bg-white/70 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-950/50'
                )}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setView('favorites')}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  view === 'favorites'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white/70 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-950/50'
                )}
              >
                <Star className="w-3.5 h-3.5" fill={view === 'favorites' ? 'currentColor' : 'none'} />
                收藏
              </button>
              <button
                type="button"
                onClick={() => setView('recent')}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  view === 'recent'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white/70 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-950/50'
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                最近
              </button>
              <button
                type="button"
                onClick={() => setView('mine')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  view === 'mine'
                    ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                    : 'bg-white/70 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-950/50'
                )}
              >
                我的
              </button>
            </div>
            <div className="flex items-center gap-2">
              {importFlash && (
                <div className="text-xs text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full border border-white/50 dark:border-white/10 bg-white/60 dark:bg-gray-950/30">
                  {importFlash}
                </div>
              )}
              <button
                type="button"
                onClick={() => importInputRef.current?.click?.()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/30 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-950/50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                导入
              </button>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {view === 'favorites'
                  ? `${favoriteIds.length} 收藏`
                  : view === 'recent'
                    ? `${recentIds.length} 最近`
                    : view === 'mine'
                      ? `${customTemplates.length} 我的`
                      : `${workflowTemplates.length} 模板`}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-950/30 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                {view === 'favorites' ? '暂无收藏模板' : view === 'recent' ? '暂无最近使用模板' : view === 'mine' ? '暂无我的模板' : '没有匹配的模板'}
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {view === 'favorites'
                  ? '点模板右上角星标即可收藏'
                  : view === 'recent'
                    ? '使用一次模板后会出现在这里'
                    : view === 'mine'
                      ? '在工作流里使用“保存为模板”即可添加'
                      : '试试换个关键词或切换分类'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  isFavorite={favoriteSet.has(String(t.id))}
                  isRecent={recentSet.has(String(t.id))}
                  onToggleFavorite={toggleFavorite}
                  onExport={exportTemplate}
                  onRename={startRename}
                  onDelete={deleteTemplate}
                  onPick={(tpl) => {
                    pushRecent(tpl);
                    onPickTemplate?.(tpl);
                    onClose?.();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {renameTarget && (
        <div className="fixed inset-0 z-[330] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRenameTarget(null)} aria-label="Close rename" />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900 dark:text-white">重命名模板</div>
              <button onClick={() => setRenameTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyRename()}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
              >
                取消
              </button>
              <button
                onClick={applyRename}
                disabled={!String(renameValue || '').trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTemplateModal;
