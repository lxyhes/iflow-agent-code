const genId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const v = (s) => String(s ?? '').trim();

export const workflowTemplates = [
  {
    id: 'code-review',
    name: '代码审查（PR/提交）',
    category: '工程效率',
    tags: ['code', 'review', 'quality'],
    description: '自动拉取上下文 → 分析风险点 → 输出审查结论与建议',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'prompt', position: { x: 320, y: 150 }, data: { label: '收集审查上下文', prompt: '请先问我：PR 链接/提交范围/关注点/风险约束。然后总结审查清单。' } },
      { id: 'n3', type: 'searchFiles', position: { x: 320, y: 270 }, data: { label: '定位关键文件', searchQuery: 'TODO: 替换为关键模块/函数名关键词' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '审查与输出建议', prompt: '基于找到的文件与变更点，输出：问题列表（严重度/原因/修复建议/示例 patch）。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'bugfix',
    name: 'Bug 修复（可复现 → 定位 → 修复 → 回归）',
    category: '工程效率',
    tags: ['bug', 'fix', 'test'],
    description: '从复现步骤出发定位根因，给出修复与验证命令',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'askUser', position: { x: 320, y: 150 }, data: { label: '收集复现信息' } },
      { id: 'n3', type: 'searchFiles', position: { x: 320, y: 270 }, data: { label: '搜索相关代码', searchQuery: 'TODO: 关键报错/函数名/接口路径' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '分析根因', prompt: '结合日志与代码，给出最可能根因与最小修复方案，并标注风险点。' } },
      { id: 'n5', type: 'shell', position: { x: 320, y: 510 }, data: { label: '运行验证命令', command: 'TODO: npm test / pytest / mvn test' } },
      { id: 'n6', type: 'end', position: { x: 320, y: 640 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' }
    ]
  },
  {
    id: 'refactor-clean',
    name: '重构（保持功能不变）',
    category: '工程效率',
    tags: ['refactor', 'quality', 'architecture'],
    description: '先定边界与测试，再分步重构与回归验证',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'prompt', position: { x: 320, y: 150 }, data: { label: '重构目标与约束', prompt: '请确认：保持功能不变、迁移策略、风险边界、验收标准。输出重构计划。' } },
      { id: 'n3', type: 'searchFiles', position: { x: 320, y: 270 }, data: { label: '定位耦合点', searchQuery: 'TODO: 关键类/模块/接口' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '生成重构步骤', prompt: '输出可分阶段提交的重构步骤，每步包含：改动点、回归点、风险控制。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'incident-runbook',
    name: '线上故障处置（Runbook）',
    category: '运维与监控',
    tags: ['incident', 'mttr', 'runbook'],
    description: '快速分级 → 影响面 → 诊断 → 缓解/恢复 → 复盘',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'prompt', position: { x: 320, y: 150 }, data: { label: '分级与影响面', prompt: '请输出：严重等级、影响用户/功能、当前时间线、当前假设与所需信息清单。' } },
      { id: 'n3', type: 'shell', position: { x: 320, y: 270 }, data: { label: '基础诊断命令', command: 'TODO: top / free -m / docker ps / kubectl get pods' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '缓解策略', prompt: '基于现有信号给出 3 套缓解方案（回滚/降级/限流），标注风险与可逆性。' } },
      { id: 'n5', type: 'prompt', position: { x: 320, y: 510 }, data: { label: '复盘与改进', prompt: '输出：根因、触发条件、修复项、监控/告警/Runbook 更新清单。' } },
      { id: 'n6', type: 'end', position: { x: 320, y: 640 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' }
    ]
  },
  {
    id: 'log-analysis',
    name: '日志分析与定位（错误/慢请求）',
    category: '运维与监控',
    tags: ['logs', 'debug', 'analysis'],
    description: '从错误样本出发，给出关联字段、查询语句与修复建议',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'askUser', position: { x: 320, y: 150 }, data: { label: '提供错误样本/traceId' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '提炼查询条件', prompt: '把日志样本解析为：时间范围、服务名、traceId、关键字段、可复用查询语句（ELK/Loki/SQL）。' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '定位根因与改进', prompt: '输出可能根因、修复建议、需要补充的监控与日志字段。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'prd-to-impl',
    name: '需求→PRD→任务拆解→实现计划',
    category: '产品与交付',
    tags: ['prd', 'planning', 'delivery'],
    description: '把需求拆成可执行任务、验收标准与风险清单',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'prompt', position: { x: 320, y: 150 }, data: { label: '整理 PRD', prompt: '把需求整理成 PRD：目标/范围/用户故事/非功能/验收标准/埋点。' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '任务拆解', prompt: '按前端/后端/数据/测试/发布拆解任务（含预估与依赖）。' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '风险与回滚', prompt: '输出风险清单、灰度方案、回滚策略、监控指标。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'api-integration',
    name: '第三方 API 接入',
    category: '产品与交付',
    tags: ['api', 'integration', 'security'],
    description: '梳理接口契约 → 鉴权/限流 → 集成方案与测试用例',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'askUser', position: { x: 320, y: 150 }, data: { label: '提供 API 文档/示例' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '定义契约', prompt: '输出：请求/响应 schema、错误码、重试策略、超时、鉴权方式。' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '集成实现计划', prompt: '输出：分层设计、配置项、日志/监控、测试用例与回归点。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'db-migration',
    name: '数据库迁移（DDL/回滚/验证）',
    category: '数据与平台',
    tags: ['db', 'migration', 'rollback'],
    description: '生成 DDL、风险评估、回滚脚本与验证 SQL',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'askUser', position: { x: 320, y: 150 }, data: { label: '提供表结构/目标变更' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '生成迁移方案', prompt: '输出：DDL、数据回填方案、索引策略、锁表风险与窗口建议。' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '回滚与验证', prompt: '输出：回滚脚本、验证 SQL、灰度检查点与告警指标。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'release-checklist',
    name: '发版检查清单（灰度/回滚）',
    category: '运维与监控',
    tags: ['release', 'checklist', 'risk'],
    description: '生成可执行的发版 checklist 与回滚验证点',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'prompt', position: { x: 320, y: 150 }, data: { label: '收集发版信息', prompt: '请问我：版本范围、变更点、影响面、依赖、回滚要求。输出摘要。' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '生成 Checklist', prompt: '输出：发布前/发布中/发布后检查点、灰度策略、回滚步骤、观察指标。' } },
      { id: 'n4', type: 'end', position: { x: 320, y: 400 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  },
  {
    id: 'security-audit',
    name: '安全审计（依赖/配置/敏感信息）',
    category: '安全与合规',
    tags: ['security', 'audit', 'deps'],
    description: '识别敏感信息、依赖风险与安全基线缺口',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'searchFiles', position: { x: 320, y: 150 }, data: { label: '搜索敏感信息', searchQuery: 'password|secret|token|AKIA|PRIVATE KEY' } },
      { id: 'n3', type: 'shell', position: { x: 320, y: 270 }, data: { label: '依赖检查', command: 'TODO: npm audit / pip-audit / mvn dependency-check' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '输出审计报告', prompt: '输出：风险项、影响范围、修复优先级、修复建议与验证。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'cicd',
    name: 'CI/CD 流水线生成与校验',
    category: '工程效率',
    tags: ['cicd', 'pipeline', 'release'],
    description: '识别技术栈 → 生成流水线 → 校验构建/测试 → 输出改进建议',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'searchFiles', position: { x: 320, y: 150 }, data: { label: '识别项目类型', searchQuery: 'package.json|pom.xml|build.gradle|requirements.txt|pyproject.toml' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '生成流水线', prompt: '根据项目类型生成 CI/CD（构建、测试、产物、缓存、lint、SAST 可选）。输出 YAML。' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '校验与建议', prompt: '输出风险点、缓存建议、并行策略、失败重试与回滚建议。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'deps-upgrade',
    name: '依赖升级（评估→升级→回归）',
    category: '工程效率',
    tags: ['deps', 'upgrade', 'risk'],
    description: '列出关键依赖 → 评估风险 → 给出升级顺序与验证命令',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'searchFiles', position: { x: 320, y: 150 }, data: { label: '定位依赖文件', searchQuery: 'package.json|requirements.txt|pyproject.toml|pom.xml|build.gradle' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '升级策略', prompt: '输出：升级优先级、破坏性变更风险、灰度建议、验证清单。' } },
      { id: 'n4', type: 'shell', position: { x: 320, y: 390 }, data: { label: '回归命令', command: 'TODO: npm test / npm run build / pytest' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'rag-index',
    name: '知识库/RAG 建设（索引→问答→迭代）',
    category: '数据与平台',
    tags: ['rag', 'search', 'docs'],
    description: '梳理文档范围 → 建索引策略 → 评估召回与答案质量',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'prompt', position: { x: 320, y: 150 }, data: { label: '定义范围与指标', prompt: '定义：目标用户、文档来源、更新频率、召回/准确率/覆盖率指标。' } },
      { id: 'n3', type: 'searchFiles', position: { x: 320, y: 270 }, data: { label: '识别知识资产', searchQuery: 'README|docs/|ADR|design|api|spec' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '索引与问答策略', prompt: '输出：分块策略、元数据、embedding 选择、评测集、失败案例修复。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'docs-generator',
    name: '项目文档生成（架构/接口/上手）',
    category: '产品与交付',
    tags: ['docs', 'onboarding', 'architecture'],
    description: '扫描代码结构 → 总结架构与关键模块 → 输出可读文档',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'searchFiles', position: { x: 320, y: 150 }, data: { label: '扫描入口与模块', searchQuery: 'main|app|server|router|controller|service' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '生成文档', prompt: '输出：架构概览、目录结构、核心流程、接口说明、开发调试步骤。' } },
      { id: 'n4', type: 'writeFile', position: { x: 320, y: 390 }, data: { label: '写入 README', filePath: 'README.md', content: 'TODO: 由上一步生成的内容写入这里' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  },
  {
    id: 'support-triage',
    name: '客服工单分流（分类→优先级→建议）',
    category: '产品与交付',
    tags: ['support', 'triage', 'sla'],
    description: '对用户问题做结构化分类与处理建议，生成可追踪的动作项',
    nodes: [
      { id: 'n1', type: 'start', position: { x: 320, y: 40 }, data: { label: '开始' } },
      { id: 'n2', type: 'askUser', position: { x: 320, y: 150 }, data: { label: '输入工单内容' } },
      { id: 'n3', type: 'prompt', position: { x: 320, y: 270 }, data: { label: '分类与优先级', prompt: '输出：分类、影响面、优先级、需要补充的信息清单。' } },
      { id: 'n4', type: 'prompt', position: { x: 320, y: 390 }, data: { label: '建议与下一步', prompt: '输出：短期解决建议、长期改进项、需要转交的团队与原因。' } },
      { id: 'n5', type: 'end', position: { x: 320, y: 520 }, data: { label: '结束' } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' }
    ]
  }
];

export const cloneWorkflowTemplate = (template) => {
  const idMap = new Map();
  const nodes = (template.nodes || []).map((n) => {
    const newId = genId('node');
    idMap.set(n.id, newId);
    return {
      ...n,
      id: newId,
      data: { ...(n.data || {}), label: v(n.data?.label || n.type) }
    };
  });

  const edges = (template.edges || []).map((e) => {
    const source = idMap.get(e.source) || e.source;
    const target = idMap.get(e.target) || e.target;
    return { ...e, id: genId('edge'), source, target };
  });

  return { nodes, edges };
};

