import { cloneGraph } from './workflowGraphUtils';

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ensureId(id, used) {
  let next = String(id || '').trim();
  if (!next) next = String(Date.now());
  while (used.has(next)) {
    next = `${next}_${Math.random().toString(16).slice(2, 8)}`;
  }
  used.add(next);
  return next;
}

export function normalizeImportedWorkflow(raw) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== 'object') {
    return { errors: ['无效的工作流文件：内容不是对象'], warnings, workflowName: 'Imported Workflow', nodes: [], edges: [] };
  }

  const workflowName = String(raw.name || raw.workflow_name || raw.workflowName || 'Imported Workflow');
  const inputNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const inputEdges = Array.isArray(raw.edges) ? raw.edges : [];

  if (!Array.isArray(raw.nodes)) warnings.push('导入文件缺少 nodes，已按空节点处理');
  if (!Array.isArray(raw.edges)) warnings.push('导入文件缺少 edges，已按空连线处理');

  const usedNodeIds = new Set();
  const normalizedNodes = inputNodes
    .filter((n) => n && typeof n === 'object')
    .map((node, index) => {
      const id = ensureId(node.id ?? `node_${index}`, usedNodeIds);
      const type = String(node.type || 'prompt');
      const position = node.position && typeof node.position === 'object'
        ? { x: toNumber(node.position.x, 0), y: toNumber(node.position.y, 0) }
        : { x: 0, y: 0 };

      const data = node.data && typeof node.data === 'object' ? { ...node.data } : {};
      if (!data.label) data.label = String(node.label || node.name || type);

      return {
        ...node,
        id,
        type,
        position,
        data,
      };
    });

  const nodeIdSet = new Set(normalizedNodes.map((n) => n.id));
  const usedEdgeIds = new Set();
  const normalizedEdges = inputEdges
    .filter((e) => e && typeof e === 'object')
    .map((edge, index) => {
      const id = ensureId(edge.id ?? `edge_${index}`, usedEdgeIds);
      const source = String(edge.source || '');
      const target = String(edge.target || '');
      return { ...edge, id, source, target };
    })
    .filter((edge) => {
      if (!edge.source || !edge.target) {
        warnings.push(`已忽略无效连线（缺少 source/target）：${edge.id}`);
        return false;
      }
      if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) {
        warnings.push(`已忽略无效连线（节点不存在）：${edge.id}`);
        return false;
      }
      return true;
    });

  const graph = cloneGraph({ nodes: normalizedNodes, edges: normalizedEdges });

  if (graph.nodes.length === 0) warnings.push('导入工作流没有节点');

  return { errors, warnings, workflowName, nodes: graph.nodes, edges: graph.edges };
}

