/**
 * Claude Code 工作流导出器
 * 将可视化工作流转换为 Claude Code 可识别的 .claude/agents/ 和 .claude/commands/ 格式
 */

/**
 * 节点类型到 Claude Code 格式的映射
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
  skill: 'skill'
};

/**
 * 将工作流转换为 Claude Code Agent 格式
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @returns {Object} Claude Code Agent 配置
 */
export function exportToClaudeAgent(workflow, projectName) {
  const { nodes, edges, name } = workflow;

  // 构建步骤序列
  const steps = buildStepsSequence(nodes, edges);

  // 构建 Agent 配置
  const agentConfig = {
    name: name,
    description: `Generated from workflow: ${name}`,
    version: "1.0.0",
    instructions: generateInstructions(steps),
    tools: extractTools(nodes),
    steps: steps.map(step => ({
      id: step.id,
      type: step.type,
      description: step.data?.description || step.data?.label || '',
      config: step.data?.config || {}
    }))
  };

  return agentConfig;
}

/**
 * 将工作流转换为 Claude Code Command 格式
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @returns {Object} Claude Code Command 配置
 */
export function exportToClaudeCommand(workflow, projectName) {
  const { nodes, edges, name } = workflow;

  // 构建步骤序列
  const steps = buildStepsSequence(nodes, edges);

  // 构建 Command 配置
  const commandConfig = {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    description: `Workflow command: ${name}`,
    instructions: generateCommandInstructions(steps),
    tools: extractTools(nodes),
    parameters: extractParameters(nodes)
  };

  return commandConfig;
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
 * 生成 Agent 指令
 * @param {Array} steps - 步骤数组
 * @returns {string} 指令文本
 */
function generateInstructions(steps) {
  let instructions = "Follow this workflow to complete the task:\n\n";

  steps.forEach((step, index) => {
    const stepType = step.type;
    const label = step.data?.label || step.data?.description || `Step ${index + 1}`;

    instructions += `${index + 1}. ${label} (${stepType})\n`;

    // 根据节点类型添加特定指令
    switch (stepType) {
      case 'prompt':
        if (step.data?.prompt) {
          instructions += `   Prompt: ${step.data.prompt}\n`;
        }
        break;
      case 'condition':
        if (step.data?.condition) {
          instructions += `   Condition: ${step.data.condition}\n`;
        }
        break;
      case 'action':
        if (step.data?.action) {
          instructions += `   Action: ${step.data.action}\n`;
        }
        break;
      case 'askUser':
        instructions += `   Ask user for confirmation\n`;
        break;
      case 'mcp':
        if (step.data?.mcpTool) {
          instructions += `   MCP Tool: ${step.data.mcpTool}\n`;
        }
        break;
      case 'skill':
        if (step.data?.skill) {
          instructions += `   Skill: ${step.data.skill}\n`;
        }
        break;
    }

    instructions += "\n";
  });

  return instructions;
}

/**
 * 生成 Command 指令
 * @param {Array} steps - 步骤数组
 * @returns {string} 指令文本
 */
function generateCommandInstructions(steps) {
  let instructions = "Execute the following workflow:\n";

  steps.forEach((step, index) => {
    const label = step.data?.label || step.data?.description || `Step ${index + 1}`;
    instructions += `\n${index + 1}. ${label}`;
  });

  return instructions;
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
    }
  });

  return tools;
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
            description: `Parameter from ${node.data.label || node.type}`
          });
        }
      });
    }
  });

  return parameters;
}

/**
 * 生成 Claude Code 文件内容
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @param {string} exportType - 导出类型 ('agent' 或 'command')
 * @returns {string} YAML 格式的内容
 */
export function generateClaudeCodeFile(workflow, projectName, exportType) {
  let config;

  if (exportType === 'agent') {
    config = exportToClaudeAgent(workflow, projectName);
  } else {
    config = exportToClaudeCommand(workflow, projectName);
  }

  // 转换为 YAML 格式
  return toYAML(config);
}

/**
 * 简单的 YAML 转换器
 * @param {Object} obj - 要转换的对象
 * @param {number} indent - 缩进级别
 * @returns {string} YAML 字符串
 */
function toYAML(obj, indent = 0) {
  const spaces = ' '.repeat(indent);
  let yaml = '';

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${spaces}-\n${toYAML(item, indent + 2)}`;
      } else {
        yaml += `${spaces}- ${item}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n${toYAML(value, indent + 2)}`;
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    });
  }

  return yaml;
}

/**
 * 下载 Claude Code 文件
 * @param {Object} workflow - 工作流对象
 * @param {string} projectName - 项目名称
 * @param {string} exportType - 导出类型 ('agent' 或 'command')
 */
export function downloadClaudeCodeFile(workflow, projectName, exportType) {
  const content = generateClaudeCodeFile(workflow, projectName, exportType);
  const filename = exportType === 'agent'
    ? `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.agent.yaml`
    : `${workflow.name.toLowerCase().replace(/\s+/g, '-')}.command.yaml`;

  const blob = new Blob([content], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
