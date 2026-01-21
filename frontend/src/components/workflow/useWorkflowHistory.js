import { useCallback, useMemo, useRef, useState } from 'react';
import { cloneGraph } from './workflowGraphUtils';

const DEFAULT_LIMIT = 50;

export function useWorkflowHistory({ initialNodes, initialEdges, limit = DEFAULT_LIMIT }) {
  const limitRef = useRef(limit);
  const pastRef = useRef([]);
  const presentRef = useRef(cloneGraph({ nodes: initialNodes, edges: initialEdges }));
  const futureRef = useRef([]);

  const [present, setPresent] = useState(presentRef.current);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const reset = useCallback(({ nodes, edges }) => {
    pastRef.current = [];
    futureRef.current = [];
    presentRef.current = cloneGraph({ nodes, edges });
    setPresent(presentRef.current);
    syncFlags();
    return presentRef.current;
  }, [syncFlags]);

  const replacePresent = useCallback(({ nodes, edges }) => {
    presentRef.current = cloneGraph({ nodes, edges });
    setPresent(presentRef.current);
    syncFlags();
    return presentRef.current;
  }, [syncFlags]);

  const commit = useCallback(({ nodes, edges }) => {
    pastRef.current.push(presentRef.current);
    const overflow = pastRef.current.length - limitRef.current;
    if (overflow > 0) pastRef.current = pastRef.current.slice(overflow);
    futureRef.current = [];
    presentRef.current = cloneGraph({ nodes, edges });
    setPresent(presentRef.current);
    syncFlags();
    return presentRef.current;
  }, [syncFlags]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return presentRef.current;
    futureRef.current.unshift(presentRef.current);
    presentRef.current = pastRef.current.pop();
    setPresent(presentRef.current);
    syncFlags();
    return presentRef.current;
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return presentRef.current;
    pastRef.current.push(presentRef.current);
    const overflow = pastRef.current.length - limitRef.current;
    if (overflow > 0) pastRef.current = pastRef.current.slice(overflow);
    presentRef.current = futureRef.current.shift();
    setPresent(presentRef.current);
    syncFlags();
    return presentRef.current;
  }, [syncFlags]);

  const api = useMemo(() => {
    return {
      canUndo,
      canRedo,
      present,
      commit,
      reset,
      replacePresent,
      undo,
      redo,
    };
  }, [canUndo, canRedo, present, commit, reset, replacePresent, undo, redo]);

  return api;
}
