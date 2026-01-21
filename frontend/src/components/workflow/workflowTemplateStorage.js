const STORAGE_KEY = 'iflow:workflow:template:custom';

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeTemplate(t) {
  if (!t || typeof t !== 'object') return null;
  const id = String(t.id || '');
  if (!id) return null;
  return {
    id,
    name: String(t.name || '未命名模板'),
    category: String(t.category || '我的模板'),
    tags: Array.isArray(t.tags) ? t.tags.map(String).filter(Boolean) : [],
    description: String(t.description || ''),
    nodes: Array.isArray(t.nodes) ? t.nodes : [],
    edges: Array.isArray(t.edges) ? t.edges : [],
    created_at: String(t.created_at || new Date().toISOString()),
    updated_at: String(t.updated_at || new Date().toISOString()),
    source: 'custom',
  };
}

export function loadCustomTemplates() {
  if (typeof localStorage === 'undefined') return [];
  const raw = safeParse(localStorage.getItem(STORAGE_KEY) || '[]', []);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeTemplate).filter(Boolean);
}

export function saveCustomTemplates(list) {
  if (typeof localStorage === 'undefined') return;
  const safeList = Array.isArray(list) ? list.map(normalizeTemplate).filter(Boolean) : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeList));
}

export function upsertCustomTemplate(template) {
  const t = normalizeTemplate(template);
  if (!t) return null;
  const list = loadCustomTemplates();
  const idx = list.findIndex((x) => x.id === t.id);
  const next = [...list];
  if (idx >= 0) next[idx] = { ...list[idx], ...t, updated_at: new Date().toISOString() };
  else next.unshift({ ...t, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  saveCustomTemplates(next);
  return t;
}

export function removeCustomTemplate(id) {
  const templateId = String(id || '');
  if (!templateId) return;
  const list = loadCustomTemplates().filter((t) => t.id !== templateId);
  saveCustomTemplates(list);
}

