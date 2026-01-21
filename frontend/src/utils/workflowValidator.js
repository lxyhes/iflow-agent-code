/**
 * Workflow Validator
 * 工作流验证工具 - 类似 cc-wf-studio 的验证功能
 */

export const validateWorkflow = (nodes, edges) => {
  const errors = [];
  const warnings = [];

  // 1. 检查节点数量
  if (nodes.length === 0) {
    errors.push('工作流必须包含至少一个节点');
  }

  if (nodes.length > 50) {
    errors.push('工作流节点数量不能超过 50 个');
  }

  // 2. 检查是否有开始和结束节点
  const hasStartNode = nodes.some(node => node.type === 'start');
  const hasEndNode = nodes.some(node => node.type === 'end');

  if (!hasStartNode) {
    errors.push('工作流必须包含一个开始节点');
  }

  if (!hasEndNode) {
    errors.push('工作流必须包含一个结束节点');
  }

  // 3. 检查开始节点和结束节点是否唯一
  const startNodes = nodes.filter(node => node.type === 'start');
  const endNodes = nodes.filter(node => node.type === 'end');

  if (startNodes.length > 1) {
    warnings.push('建议只使用一个开始节点');
  }

  if (endNodes.length > 1) {
    warnings.push('建议只使用一个结束节点');
  }

  // 4. 检查节点名称是否唯一
  const nodeNames = nodes.map(node => node.data?.label);
  const duplicateNames = nodeNames.filter((name, index) => nodeNames.indexOf(name) !== index);

  if (duplicateNames.length > 0) {
    warnings.push(`存在重复的节点名称: ${[...new Set(duplicateNames)].join(', ')}`);
  }

  // 5. 检查节点配置
  nodes.forEach(node => {
    // 检查提示词节点
    if (node.type === 'prompt' && !node.data?.prompt) {
      errors.push(`节点 "${node.data?.label || node.id}" 缺少提示词内容`);
    }

    // 检查条件节点
    if (node.type === 'condition' && !node.data?.condition) {
      errors.push(`节点 "${node.data?.label || node.id}" 缺少条件表达式`);
    }

    // 检查动作节点
    if (node.type === 'action' && !node.data?.action) {
      errors.push(`节点 "${node.data?.label || node.id}" 缺少动作类型`);
    }

    // 检查 MCP 节点
    if (node.type === 'mcp') {
      if (!node.data?.mcpServer) {
        errors.push(`节点 "${node.data?.label || node.id}" 未选择 MCP 服务器`);
      }
      if (!node.data?.mcpTool) {
        errors.push(`节点 "${node.data?.label || node.id}" 未选择 MCP 工具`);
      }
    }

    // 检查 Skill 节点
    if (node.type === 'skill' && !node.data?.skill) {
      errors.push(`节点 "${node.data?.label || node.id}" 未选择 Skill`);
    }
  });

  // 6. 检查连线
  if (edges.length === 0 && nodes.length > 1) {
    warnings.push('工作流包含多个节点但没有连线');
  }

  // 7. 检查孤立节点
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
  if (isolatedNodes.length > 0) {
    warnings.push(`存在孤立节点: ${isolatedNodes.map(n => n.data?.label || n.id).join(', ')}`);
  }

  // 8. 检查循环引用
  const hasCycle = detectCycle(nodes, edges);
  if (hasCycle) {
    warnings.push('检测到循环引用，可能导致工作流无法正常执行');
  }

  // 9. 检查断开的路径
  const paths = findPaths(nodes, edges);
  const incompletePaths = paths.filter(path => {
    const firstNode = nodes.find(n => n.id === path[0]);
    const lastNode = nodes.find(n => n.id === path[path.length - 1]);
    return firstNode?.type !== 'start' || lastNode?.type !== 'end';
  });

  if (incompletePaths.length > 0) {
    warnings.push('存在未从开始到结束的完整路径');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes: getNodeTypesCount(nodes),
      paths: paths.length
    }
  };
};

// 检测循环引用
const detectCycle = (nodes, edges) => {
  const graph = {};
  nodes.forEach(node => {
    graph[node.id] = [];
  });
  edges.forEach(edge => {
    graph[edge.source].push(edge.target);
  });

  const visited = new Set();
  const recursionStack = new Set();

  const hasCycleDFS = (nodeId) => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    for (const neighbor of graph[nodeId] || []) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const nodeId of Object.keys(graph)) {
    if (!visited.has(nodeId)) {
      if (hasCycleDFS(nodeId)) {
        return true;
      }
    }
  }

  return false;
};

// 查找所有路径
const findPaths = (nodes, edges) => {
  const startNodes = nodes.filter(node => node.type === 'start');
  const endNodes = nodes.filter(node => node.type === 'end');

  if (startNodes.length === 0 || endNodes.length === 0) {
    return [];
  }

  const graph = {};
  nodes.forEach(node => {
    graph[node.id] = [];
  });
  edges.forEach(edge => {
    graph[edge.source].push(edge.target);
  });

  const paths = [];

  const findAllPaths = (currentId, currentPath, visited) => {
    const currentNode = nodes.find(n => n.id === currentId);

    if (currentNode?.type === 'end') {
      paths.push([...currentPath]);
      return;
    }

    for (const neighbor of graph[currentId] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        findAllPaths(neighbor, [...currentPath, neighbor], visited);
        visited.delete(neighbor);
      }
    }
  };

  startNodes.forEach(startNode => {
    const visited = new Set([startNode.id]);
    findAllPaths(startNode.id, [startNode.id], visited);
  });

  return paths;
};

// 统计节点类型
const getNodeTypesCount = (nodes) => {
  const counts = {};
  nodes.forEach(node => {
    counts[node.type] = (counts[node.type] || 0) + 1;
  });
  return counts;
};

// 获取验证结果摘要
export const getValidationSummary = (validationResult) => {
  const { valid, errors, warnings, stats } = validationResult;

  if (valid) {
    return {
      status: 'success',
      message: '工作流验证通过',
      color: 'green'
    };
  }

  if (errors.length > 0) {
    return {
      status: 'error',
      message: `发现 ${errors.length} 个错误`,
      color: 'red'
    };
  }

  if (warnings.length > 0) {
    return {
      status: 'warning',
      message: `发现 ${warnings.length} 个警告`,
      color: 'yellow'
    };
  }

  return {
    status: 'info',
    message: '工作流验证完成',
    color: 'blue'
  };
};