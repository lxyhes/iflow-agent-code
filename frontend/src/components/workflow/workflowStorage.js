const DRAFT_VERSION = 1;

export function getWorkflowDraftKey({ projectName }) {
  const safeProject = (projectName || 'default').trim() || 'default';
  return `iflow:workflow:draft:v${DRAFT_VERSION}:${safeProject}`;
}

export function loadWorkflowDraft({ projectName }) {
  try {
    const key = getWorkflowDraftKey({ projectName });
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkflowDraft({ projectName, draft }) {
  const key = getWorkflowDraftKey({ projectName });
  localStorage.setItem(key, JSON.stringify(draft));
}

export function clearWorkflowDraft({ projectName }) {
  try {
    const key = getWorkflowDraftKey({ projectName });
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function nowIso() {
  return new Date().toISOString();
}

