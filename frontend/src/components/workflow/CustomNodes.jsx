/**
 * Custom Node Components for React Flow
 * 工作流自定义节点组件
 */

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import {
  Play, StopCircle, GitBranch, HelpCircle, Bot,
  Zap, Cpu, Sparkles, FileText, Edit3, Search,
  GitPullRequest, Terminal, MessageSquare, Loader2, X
} from 'lucide-react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const StatusBadge = ({ status }) => {
  if (!status) return null;

  const badgeClass = cx(
    'absolute -top-2 -right-2 w-5 h-5 rounded-full border-2 shadow-lg flex items-center justify-center',
    'border-white dark:border-gray-950',
    status === 'executing' && 'bg-blue-600',
    status === 'success' && 'bg-green-600',
    status === 'error' && 'bg-red-600'
  );

  return (
    <div className={badgeClass}>
      {status === 'executing' ? (
        <Loader2 className="w-3 h-3 text-white animate-spin" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      )}
    </div>
  );
};

const NodeFrame = ({ status, accent, children, className }) => {
  const ringClass =
    status === 'executing'
      ? 'ring-2 ring-blue-500/30 dark:ring-blue-400/30'
      : status === 'success'
      ? 'ring-2 ring-green-500/25 dark:ring-green-400/25'
      : status === 'error'
      ? 'ring-2 ring-red-500/25 dark:ring-red-400/25'
      : 'ring-1 ring-black/5 dark:ring-white/10';

  return (
    <div
      className={cx(
        'iflow-node-frame relative rounded-2xl px-4 py-3 shadow-sm transition-all',
        'bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-700',
        ringClass,
        accent,
        className
      )}
    >
      <StatusBadge status={status} />
      {children}
    </div>
  );
};

const OutputButton = ({ data, position = 'right' }) => {
  const [open, setOpen] = useState(false);

  const output = String(
    data?.status === 'executing'
      ? (data?.liveOutput ?? data?.lastOutput ?? '')
      : (data?.lastOutput ?? data?.liveOutput ?? '')
  );

  if (!output) return null;

  const preview = output.replace(/\s+/g, ' ').trim().slice(0, 120);

  return (
    <div className={position === 'right' ? 'absolute top-2 right-2' : 'absolute top-2 left-2'}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="nodrag nodrag pointer-events-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-gray-200 bg-white/90 hover:bg-white text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:hover:bg-gray-900 dark:text-gray-200"
        title={preview || '查看输出'}
      >
        <FileText className="w-3 h-3" />
        <span>输出</span>
      </button>

      {open && (
        <div className="nodrag pointer-events-auto absolute top-0 right-0 translate-x-0 translate-y-10 z-50 w-[360px] max-w-[70vw]">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {data?.label || '输出'}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[260px] overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900">
              <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none">
                {output}
              </MarkdownRenderer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 开始节点
export const StartNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-green-600 dark:border-l-green-500" className="min-w-[150px]">
      <Handle type="source" position={Position.Bottom} style={{ background: '#16a34a' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 结束节点
export const EndNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-red-600 dark:border-l-red-500" className="min-w-[150px]">
      <Handle type="target" position={Position.Top} style={{ background: '#dc2626' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <StopCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 提示词节点
export const PromptNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-purple-600 dark:border-l-purple-500" className="min-w-[220px]">
      <Handle type="target" position={Position.Top} style={{ background: '#7c3aed' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#7c3aed' }} />
      <OutputButton data={data} />
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</div>
          {data.prompt && (
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">{data.prompt}</div>
          )}
          {(data.status === 'executing' ? data.liveOutput : data.lastOutput) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {(String(data.status === 'executing' ? data.liveOutput : data.lastOutput)).slice(0, 120)}
              {String(data.status === 'executing' ? data.liveOutput : data.lastOutput).length > 120 ? '…' : ''}
            </div>
          )}
        </div>
      </div>
    </NodeFrame>
  );
};

// 条件判断节点
export const ConditionNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-blue-600 dark:border-l-blue-500" className="min-w-[200px]">
      <Handle type="target" position={Position.Top} style={{ background: '#2563eb' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#2563eb' }} />
      <OutputButton data={data} />
      <div className="flex items-start gap-2">
        <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</div>
          {data.condition && (
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">{data.condition}</div>
          )}
          {(data.status === 'executing' ? data.liveOutput : data.lastOutput) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {(String(data.status === 'executing' ? data.liveOutput : data.lastOutput)).slice(0, 120)}
              {String(data.status === 'executing' ? data.liveOutput : data.lastOutput).length > 120 ? '…' : ''}
            </div>
          )}
        </div>
      </div>
    </NodeFrame>
  );
};

// 动作节点
export const ActionNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-orange-600 dark:border-l-orange-500" className="min-w-[160px]">
      <Handle type="target" position={Position.Top} style={{ background: '#ea580c' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#ea580c' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 询问用户节点
export const AskUserNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-yellow-500 dark:border-l-yellow-400" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#eab308' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#eab308' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 子代理节点
export const SubAgentNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-fuchsia-600 dark:border-l-fuchsia-500" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#d946ef' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#d946ef' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// MCP 工具节点
export const McpNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-cyan-600 dark:border-l-cyan-500" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#0891b2' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#0891b2' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 技能节点
export const SkillNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-pink-600 dark:border-l-pink-500" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#db2777' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#db2777' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 读取文件节点
export const ReadFileNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-teal-600 dark:border-l-teal-500" className="min-w-[180px]">
      <Handle type="target" position={Position.Top} style={{ background: '#0d9488' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#0d9488' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 写入文件节点
export const WriteFileNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-teal-700 dark:border-l-teal-500" className="min-w-[180px]">
      <Handle type="target" position={Position.Top} style={{ background: '#0f766e' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f766e' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Edit3 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 搜索文件节点
export const SearchFilesNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-emerald-600 dark:border-l-emerald-500" className="min-w-[180px]">
      <Handle type="target" position={Position.Top} style={{ background: '#059669' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#059669' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// Git 提交节点
export const GitCommitNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-emerald-600 dark:border-l-emerald-500" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <GitPullRequest className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// Git 分支节点
export const GitBranchNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-emerald-700 dark:border-l-emerald-500" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#059669' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#059669' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// Shell 命令节点
export const ShellNode = ({ data }) => {
  return (
    <NodeFrame status={data.status} accent="border-l-4 border-l-gray-500 dark:border-l-gray-400" className="min-w-[170px]">
      <Handle type="target" position={Position.Top} style={{ background: '#6b7280' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#6b7280' }} />
      <OutputButton data={data} />
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{data.label}</span>
      </div>
    </NodeFrame>
  );
};

// 节点类型映射
export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  condition: ConditionNode,
  action: ActionNode,
  askUser: AskUserNode,
  subAgent: SubAgentNode,
  mcp: McpNode,
  skill: SkillNode,
  readFile: ReadFileNode,
  writeFile: WriteFileNode,
  searchFiles: SearchFilesNode,
  gitCommit: GitCommitNode,
  gitBranch: GitBranchNode,
  shell: ShellNode,
};
