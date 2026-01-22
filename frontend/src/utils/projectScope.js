export function projectScopeId(project) {
  const raw = project?.fullPath || project?.path || project?.name || '';
  const normalized = String(raw).replace(/\\/g, '/').toLowerCase();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
  }
  return `p${(hash >>> 0).toString(36)}`;
}

export function scopedKey(project, key) {
  const scope = projectScopeId(project);
  return `${scope}:${String(key)}`;
}

export function scopedSessionId(project, sessionId) {
  const base = String(sessionId || 'default');
  return scopedKey(project, `session:${base}`);
}

