import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearWorkflowDraft, loadWorkflowDraft, nowIso, saveWorkflowDraft } from './workflowStorage';
import { computeGraphSignature } from './workflowGraphUtils';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function useWorkflowAutosave({
  projectName,
  workflowName,
  nodes,
  edges,
  enabled = true,
  debounceMs = 800,
}) {
  const [draftInfo, setDraftInfo] = useState(() => {
    const draft = typeof window !== 'undefined' ? loadWorkflowDraft({ projectName }) : null;
    return draft;
  });
  const hadDraftOnInitRef = useRef(!!draftInfo);
  const [lastSavedAt, setLastSavedAt] = useState(draftInfo?.saved_at || null);
  const signatureRef = useRef(null);
  const timerRef = useRef(null);

  const signature = useMemo(() => {
    return computeGraphSignature({ workflowName, nodes, edges });
  }, [workflowName, nodes, edges]);

  useEffect(() => {
    signatureRef.current = signature;
  }, [signature]);

  useEffect(() => {
    if (!enabled) return;
    if (!projectName) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        const draft = {
          version: 1,
          workflow_name: workflowName || 'Untitled Workflow',
          nodes,
          edges,
          saved_at: nowIso(),
        };
        saveWorkflowDraft({ projectName, draft });
        setDraftInfo(draft);
        setLastSavedAt(draft.saved_at);
      } catch {
        // ignore
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, debounceMs, projectName, workflowName, nodes, edges]);

  const hasDraft = !!draftInfo?.nodes && !!draftInfo?.edges;

  const restoreDraft = useCallback(() => {
    const draft = loadWorkflowDraft({ projectName });
    if (!draft) return null;
    setDraftInfo(draft);
    setLastSavedAt(draft.saved_at || null);
    return draft;
  }, [projectName]);

  const discardDraft = useCallback(() => {
    clearWorkflowDraft({ projectName });
    setDraftInfo(null);
    setLastSavedAt(null);
  }, [projectName]);

  const markSaved = useCallback(() => {
    clearWorkflowDraft({ projectName });
    setDraftInfo(null);
    setLastSavedAt(null);
  }, [projectName]);

  const meta = useMemo(() => {
    return {
      hasDraft,
      hadDraftOnInit: hadDraftOnInitRef.current,
      lastSavedAt,
      lastSavedAtText: lastSavedAt ? formatTime(lastSavedAt) : null,
      signature: signatureRef.current,
    };
  }, [hasDraft, lastSavedAt]);

  return { meta, draft: draftInfo, restoreDraft, discardDraft, markSaved };
}
