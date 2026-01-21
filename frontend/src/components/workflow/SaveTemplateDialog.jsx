import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

function splitTags(text) {
  return String(text || '')
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function SaveTemplateDialog({ open, initialName, onClose, onSave }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('我的模板');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setName(String(initialName || ''));
    setCategory('我的模板');
    setDescription('');
    setTagsText('');
    const t = setTimeout(() => nameRef.current?.focus?.(), 50);
    return () => clearTimeout(t);
  }, [initialName, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const tags = useMemo(() => splitTags(tagsText), [tagsText]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[340] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close save template" />
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-900 dark:text-white">保存为模板</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">模板将保存在本地“我的模板”里</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">模板名称</div>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我的发版流程"
              className="mt-2 w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">分类</div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如：我的模板"
              className="mt-2 w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">标签（用逗号分隔）</div>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="release, checklist, rollback"
              className="mt-2 w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">描述</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话说明模板用途（可选）"
              className="mt-2 w-full h-24 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 transition-colors dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700"
          >
            取消
          </button>
          <button
            onClick={() => {
              const trimmed = String(name || '').trim();
              if (!trimmed) return;
              onSave?.({
                name: trimmed,
                category: String(category || '我的模板').trim() || '我的模板',
                tags,
                description: String(description || '').trim(),
              });
            }}
            disabled={!String(name || '').trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

