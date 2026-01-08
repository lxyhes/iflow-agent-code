/**
 * Mind Map Parser - 将 Markdown 转换为思维导图数据
 */

export function parseMarkdownToMindMap(markdown) {
  const lines = markdown.split('\n');
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();
  let nodeId = 0;

  // 解析 Markdown 标题
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = `node-${nodeId++}`;

      const node = {
        id,
        data: { label: text, level },
        position: { x: 0, y: index * 80 },
        style: getNodeStyle(level)
      };

      nodes.push(node);
      nodeMap.set(nodeId - 1, { node, level, lineIndex: index });
    }
  });

  // 创建父子关系
  for (let i = 1; i < nodeMap.size; i++) {
    const current = nodeMap.get(i);
    const parentLevel = current.level - 1;

    // 查找最近的父节点
    for (let j = i - 1; j >= 0; j--) {
      const potentialParent = nodeMap.get(j);
      if (potentialParent.level === parentLevel) {
        edges.push({
          id: `edge-${i}-${j}`,
          source: potentialParent.node.id,
          target: current.node.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 }
        });
        break;
      }
    }
  }

  return { nodes, edges };
}

function getNodeStyle(level) {
  const colors = [
    '#6366f1', // Level 1: Indigo
    '#8b5cf6', // Level 2: Purple
    '#a855f7', // Level 3: Purple
    '#d946ef', // Level 4: Fuchsia
    '#ec4899', // Level 5: Pink
    '#f43f5e'  // Level 6: Rose
  ];

  return {
    background: colors[level - 1] || '#6366f1',
    color: '#ffffff',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: `${16 - level}px`,
    fontWeight: level === 1 ? 'bold' : 'normal',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    minWidth: '150px',
    textAlign: 'center'
  };
}

export function updateMarkdownFromNodes(nodes, edges) {
  // 构建节点层次结构
  const nodeHierarchy = buildNodeHierarchy(nodes, edges);

  // 生成 Markdown
  let markdown = '';
  
  function traverseHierarchy(node, level = 1) {
    const prefix = '#'.repeat(level);
    markdown += `${prefix} ${node.data.label}\n`;
    
    if (node.children) {
      node.children.forEach(child => traverseHierarchy(child, level + 1));
    }
  }

  // 从根节点开始遍历
  const rootNodes = nodeHierarchy.filter(node => node.level === 1);
  rootNodes.forEach(root => traverseHierarchy(root));

  return markdown;
}

function buildNodeHierarchy(nodes, edges) {
  const nodeMap = new Map();
  const hierarchy = [];

  // 创建节点映射
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // 构建父子关系
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);

    if (parent && child) {
      parent.children.push(child);
    }
  });

  // 提取根节点
  nodeMap.forEach(node => {
    if (node.data.level === 1) {
      hierarchy.push(node);
    }
  });

  return hierarchy;
}

export function calculateNodePositions(nodes, edges) {
  const nodeMap = new Map();
  const positionedNodes = [];

  // 初始化节点映射
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [], x: 0, y: 0 });
  });

  // 构建父子关系
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);

    if (parent && child) {
      parent.children.push(child);
    }
  });

  // 计算位置（简单的树形布局）
  let currentX = 0;
  const levelHeight = 100;

  function positionNode(node, level, startX) {
    const nodeWidth = 200;
    const nodeHeight = 60;
    const verticalGap = 20;

    node.x = startX;
    node.y = level * (nodeHeight + verticalGap);

    // 计算子节点位置
    if (node.children.length > 0) {
      const totalWidth = node.children.length * nodeWidth;
      const childStartX = startX - totalWidth / 2 + nodeWidth / 2;

      node.children.forEach((child, index) => {
        positionNode(child, level + 1, childStartX + index * nodeWidth);
      });
    }

    positionedNodes.push({
      id: node.id,
      data: node.data,
      position: { x: node.x, y: node.y },
      style: node.style
    });
  }

  // 从根节点开始定位
  const rootNodes = Array.from(nodeMap.values()).filter(node => node.data.level === 1);
  rootNodes.forEach((root, index) => {
    positionNode(root, 0, index * 400);
  });

  return positionedNodes;
}

export function getTaskStatusColor(status) {
  switch (status) {
    case 'completed':
      return '#22c55e'; // Green
    case 'in-progress':
      return '#3b82f6'; // Blue
    case 'blocked':
      return '#ef4444'; // Red
    case 'pending':
      return '#6b7280'; // Gray
    default:
      return '#6b7280';
  }
}

export function parseTaskList(markdown) {
  const lines = markdown.split('\n');
  const tasks = [];

  lines.forEach((line, index) => {
    // 匹配任务列表项
    const match = line.match(/^\s*[-*]\s*\[(x| )\]\s*(.+)$/);
    if (match) {
      const completed = match[1] === 'x';
      const text = match[2].trim();

      tasks.push({
        id: `task-${index}`,
        text,
        completed,
        status: completed ? 'completed' : 'pending'
      });
    }
  });

  return tasks;
}