/**
 * iFlow 工作流导出器
 * 将可视化工作流转换为 iFlow SDK 可识别的格式
 */

/**
 * 节点类型到 iFlow 格式的映射
 */
const NODE_TYPE_MAPPING = {
  start: 'start',
  end: 'end',
  prompt: 'prompt',
  condition: 'condition',
  action: 'action',
  askUser: 'ask_user',
  subAgent: 'sub_agent',
  mcp: 'mcp_tool',
  skill: 'skill',
  // iFlow 特有节点
  fileRead: 'file_read',
  fileWrite: 'file_write',
  shell: 'shell',
  git: 'git',
  search: 'search',
  codeEdit: 'code_edit'
};

/**
 * 将工作流转换为 iFlow Command 格式
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @returns {Object} iFlow Command 配置
 */
export function exportToIFlowCommand(workflow, projectName) {
  const { nodes, edges, name } = workflow;

  // 构建步骤序列
  const steps = buildStepsSequence(nodes, edges);

  // 构建 iFlow Command 配置
  const commandConfig = {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    description: `iFlow workflow command: ${name}`,
    instructions: generateCommandInstructions(steps),
    tools: extractTools(nodes),
    parameters: extractParameters(nodes),
    approval_mode: 'auto', // 或 'manual'
    timeout: 300
  };

  return commandConfig;
}

/**
 * 将工作流转换为 iFlow Agent 格式
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @returns {Object} iFlow Agent 配置
 */
export function exportToIFlowAgent(workflow, projectName) {
  const { nodes, edges, name } = workflow;

  // 构建步骤序列
  const steps = buildStepsSequence(nodes, edges);

  // 构建 iFlow Agent 配置
  const agentConfig = {
    name: name,
    description: `Generated from workflow: ${name}`,
    persona: extractPersona(workflow),
    system_prompt: generateSystemPrompt(steps),
    tools: extractTools(nodes),
    commands: extractCommands(nodes),
    mcp_servers: extractMCPServers(nodes),
    file_access: {
      allowed: true,
      read_only: false,
      allowed_dirs: [projectName]
    }
  };

  return agentConfig;
}

/**
 * 构建步骤序列（按执行顺序）
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 连线数组
 * @returns {Array} 排序后的步骤
 */
function buildStepsSequence(nodes, edges) {
  // 找到起始节点
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) {
    return [];
  }

  // 构建邻接表
  const adjacency = {};
  nodes.forEach(node => {
    adjacency[node.id] = [];
  });
  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  });

  // BFS 遍历生成步骤序列
  const visited = new Set();
  const steps = [];
  const queue = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = nodes.find(n => n.id === currentId);
    if (currentNode) {
      steps.push(currentNode);
    }

    // 添加下一个节点到队列
    const nextNodes = adjacency[currentId] || [];
    nextNodes.forEach(nextId => {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    });
  }

  return steps;
}

/**
 * 生成 Command 指令
 * @param {Array} steps - 步骤数组
 * @returns {string} 指令文本
 */
function generateCommandInstructions(steps) {
  let instructions = "Execute the following iFlow workflow:\n\n";

  steps.forEach((step, index) => {
    const stepType = step.type;
    const label = step.data?.label || step.data?.description || `Step ${index + 1}`;

    instructions += `${index + 1}. ${label}`;

    // 根据节点类型添加特定指令
    switch (stepType) {
      case 'prompt':
        if (step.data?.prompt) {
          instructions += ` - ${step.data.prompt}`;
        }
        break;
      case 'condition':
        if (step.data?.condition) {
          instructions += ` (if ${step.data.condition})`;
        }
        break;
      case 'action':
        if (step.data?.action) {
          instructions += ` - ${step.data.action}`;
        }
        break;
      case 'askUser':
        instructions += ` - Wait for user confirmation`;
        break;
      case 'mcp':
        if (step.data?.mcpTool) {
          instructions += ` - Call MCP tool: ${step.data.mcpTool}`;
        }
        break;
      case 'fileRead':
        if (step.data?.filePath) {
          instructions += ` - Read file: ${step.data.filePath}`;
        }
        break;
      case 'fileWrite':
        if (step.data?.filePath) {
          instructions += ` - Write file: ${step.data.filePath}`;
        }
        break;
      case 'shell':
        if (step.data?.command) {
          instructions += ` - Execute: ${step.data.command}`;
        }
        break;
      case 'git':
        if (step.data?.gitCommand) {
          instructions += ` - Git: ${step.data.gitCommand}`;
        }
        break;
      case 'search':
        if (step.data?.searchQuery) {
          instructions += ` - Search: ${step.data.searchQuery}`;
        }
        break;
      case 'codeEdit':
        if (step.data?.editType) {
          instructions += ` - Code ${step.data.editType}`;
        }
        break;
    }

    instructions += "\n";
  });

  return instructions;
}

/**
 * 生成 System Prompt
 * @param {Array} steps - 步骤数组
 * @returns {string} System Prompt
 */
function generateSystemPrompt(steps) {
  let prompt = "You are an iFlow agent. Follow this workflow:\n\n";

  steps.forEach((step, index) => {
    const label = step.data?.label || step.data?.description || `Step ${index + 1}`;
    prompt += `${index + 1}. ${label}\n`;
  });

  return prompt;
}

/**
 * 提取 Persona
 * @param {Object} workflow - 工作流对象
 * @returns {string} Persona
 */
function extractPersona(workflow) {
  // 从工作流元数据中提取 persona
  return workflow.persona || 'partner';
}

/**
 * 提取工具列表
 * @param {Array} nodes - 节点数组
 * @returns {Array} 工具列表
 */
function extractTools(nodes) {
  const tools = [];

  nodes.forEach(node => {
    if (node.type === 'mcp' && node.data?.mcpTool) {
      tools.push({
        type: 'mcp',
        name: node.data.mcpTool,
        server: node.data.mcpServer || 'default'
      });
    } else if (node.type === 'skill' && node.data?.skill) {
      tools.push({
        type: 'skill',
        name: node.data.skill
      });
    } else if (node.type === 'fileRead') {
      tools.push({
        type: 'file',
        action: 'read'
      });
    } else if (node.type === 'fileWrite') {
      tools.push({
        type: 'file',
        action: 'write'
      });
    } else if (node.type === 'shell') {
      tools.push({
        type: 'shell'
      });
    } else if (node.type === 'git') {
      tools.push({
        type: 'git'
      });
    } else if (node.type === 'search') {
      tools.push({
        type: 'search'
      });
    } else if (node.type === 'codeEdit') {
      tools.push({
        type: 'code_edit'
      });
    }
  });

  return tools;
}

/**
 * 提取 Commands
 * @param {Array} nodes - 节点数组
 * @returns {Array} Commands 列表
 */
function extractCommands(nodes) {
  const commands = [];

  nodes.forEach(node => {
    if (node.type === 'action' && node.data?.action) {
      commands.push({
        name: node.data.action,
        description: node.data.description || ''
      });
    }
  });

  return commands;
}

/**
 * 提取 MCP 服务器列表
 * @param {Array} nodes - 节点数组
 * @returns {Array} MCP 服务器列表
 */
function extractMCPServers(nodes) {
  const servers = new Set();

  nodes.forEach(node => {
    if (node.type === 'mcp' && node.data?.mcpServer) {
      servers.add(node.data.mcpServer);
    }
  });

  return Array.from(servers).map(server => ({
    name: server
  }));
}

/**
 * 提取参数列表
 * @param {Array} nodes - 节点数组
 * @returns {Array} 参数列表
 */
function extractParameters(nodes) {
  const parameters = [];

  nodes.forEach(node => {
    if (node.data?.parameters) {
      Object.entries(node.data.parameters).forEach(([key, value]) => {
        if (!parameters.find(p => p.name === key)) {
          parameters.push({
            name: key,
            type: typeof value,
            default: value,
            description: `Parameter from ${node.data.label || node.type}`,
            required: node.data.requiredParameters?.includes(key) || false
          });
        }
      });
    }
  });

  return parameters;
}

/**
 * 生成 iFlow 文件内容
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @param {string} exportType - 导出类型 ('agent' 或 'command')
 * @returns {string} JSON 格式的内容
 */
export function generateIFlowFile(workflow, projectName, exportType) {
  let config;

  if (exportType === 'agent') {
    config = exportToIFlowAgent(workflow, projectName);
  } else {
    config = exportToIFlowCommand(workflow, projectName);
  }

  return JSON.stringify(config, null, 2);
}

/**
 * 下载 iFlow 文件
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @param {string} exportType - 导出类型 ('agent' 或 'command')
 */
export function downloadIFlowFile(workflow, projectName, exportType) {
  const content = generateIFlowFile(workflow, projectName, exportType);
  const filename = exportType === 'agent'
    ? `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.agent.json`
    : `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.command.json`;

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 验证工作流是否可以导出
 * @param {Object} workflow - 工作流对象
 * @returns {Object} 验证结果
 */
export function validateWorkflow(workflow) {
  const errors = [];
  const warnings = [];

  // 检查是否有起始节点
  const hasStart = workflow.nodes.some(n => n.type === 'start');
  if (!hasStart) {
    errors.push('工作流必须包含一个起始节点');
  }

  // 检查是否有结束节点
  const hasEnd = workflow.nodes.some(n => n.type === 'end');
  if (!hasEnd) {
    warnings.push('建议添加结束节点');
  }

  // 检查节点是否都连接
  const connectedNodes = new Set();
  workflow.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  const disconnectedNodes = workflow.nodes.filter(
    n => !connectedNodes.has(n.id) && n.type !== 'start'
  );

  if (disconnectedNodes.length > 0) {
    warnings.push(`有 ${disconnectedNodes.length} 个未连接的节点`);
  }

  // 检查是否有循环
  const hasCycle = detectCycle(workflow.nodes, workflow.edges);
  if (hasCycle) {
    errors.push('工作流包含循环，可能导致无限执行');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检测工作流中的循环
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 连线数组
 * @returns {boolean} 是否有循环
 */
function detectCycle(nodes, edges) {
  const adjacency = {};
  nodes.forEach(node => {
    adjacency[node.id] = [];
  });
  edges.forEach(edge => {
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  });

  const visited = new Set();
  const recursionStack = new Set();

  function hasCycleDFS(nodeId) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency[nodeId] || [];
    for (const neighbor of neighbors) {
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
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleDFS(node.id)) {
        return true;
      }
    }
  }

  return false;
}