function safeStructuredClone(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function cloneGraph({ nodes, edges }) {
  return {
    nodes: safeStructuredClone(nodes || []),
    edges: safeStructuredClone(edges || []),
  };
}

export function computeGraphSignature({ workflowName, nodes, edges }) {
  try {
    return JSON.stringify({ workflowName, nodes, edges });
  } catch {
    return String(Date.now());
  }
}

