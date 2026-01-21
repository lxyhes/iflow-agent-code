/**
 * Custom Node Components for React Flow
 * 工作流自定义节点组件
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import {
  Play, StopCircle, GitBranch, HelpCircle, Bot,
  Zap, Cpu, Sparkles, FileText, Edit3, Search,
  GitPullRequest, Terminal, MessageSquare
} from 'lucide-react';

// 基础节点样式
const baseNodeStyle = {
  padding: '12px 16px',
  borderRadius: '8px',
  minWidth: '150px',
  border: '2px solid',
  background: '#1f2937',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '500',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

// 开始节点
export const StartNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#22c55e',
      background: 'linear-gradient(135deg, #1f2937 0%, #14532d 100%)',
    }}>
      <Handle type="source" position={Position.Bottom} style={{ background: '#22c55e' }} />
      <Play className="w-4 h-4 text-green-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 结束节点
export const EndNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#ef4444',
      background: 'linear-gradient(135deg, #1f2937 0%, #7f1d1d 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#ef4444' }} />
      <StopCircle className="w-4 h-4 text-red-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 提示词节点
export const PromptNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#a855f7',
      background: 'linear-gradient(135deg, #1f2937 0%, #581c87 100%)',
      minWidth: '200px',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#a855f7' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#a855f7' }} />
      <div className="flex items-start gap-2 w-full">
        <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{data.label}</div>
          {data.prompt && (
            <div className="text-xs text-gray-400 truncate mt-1">{data.prompt}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// 条件判断节点
export const ConditionNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#3b82f6',
      background: 'linear-gradient(135deg, #1f2937 0%, #1e3a8a 100%)',
      minWidth: '180px',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
      <GitBranch className="w-4 h-4 text-blue-400" />
      <div className="flex-1">
        <div className="font-medium">{data.label}</div>
        {data.condition && (
          <div className="text-xs text-gray-400 mt-1">{data.condition}</div>
        )}
      </div>
    </div>
  );
};

// 动作节点
export const ActionNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#f97316',
      background: 'linear-gradient(135deg, #1f2937 0%, #7c2d12 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#f97316' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#f97316' }} />
      <Zap className="w-4 h-4 text-orange-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 询问用户节点
export const AskUserNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#eab308',
      background: 'linear-gradient(135deg, #1f2937 0%, #713f12 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#eab308' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#eab308' }} />
      <HelpCircle className="w-4 h-4 text-yellow-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 子代理节点
export const SubAgentNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#c084fc',
      background: 'linear-gradient(135deg, #1f2937 0%, #6b21a8 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#c084fc' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#c084fc' }} />
      <Bot className="w-4 h-4 text-purple-300" />
      <span>{data.label}</span>
    </div>
  );
};

// MCP 工具节点
export const McpNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#06b6d4',
      background: 'linear-gradient(135deg, #1f2937 0%, #164e63 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#06b6d4' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#06b6d4' }} />
      <Cpu className="w-4 h-4 text-cyan-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 技能节点
export const SkillNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#ec4899',
      background: 'linear-gradient(135deg, #1f2937 0%, #831843 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#ec4899' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#ec4899' }} />
      <Sparkles className="w-4 h-4 text-pink-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 读取文件节点
export const ReadFileNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#14b8a6',
      background: 'linear-gradient(135deg, #1f2937 0%, #134e4a 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#14b8a6' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#14b8a6' }} />
      <FileText className="w-4 h-4 text-teal-400" />
      <span>{data.label}</span>
    </div>
  );
};

// 写入文件节点
export const WriteFileNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#0d9488',
      background: 'linear-gradient(135deg, #1f2937 0%, #115e59 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0d9488' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#0d9488' }} />
      <Edit3 className="w-4 h-4 text-teal-500" />
      <span>{data.label}</span>
    </div>
  );
};

// 搜索文件节点
export const SearchFilesNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#0f766e',
      background: 'linear-gradient(135deg, #1f2937 0%, #0f5132 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#0f766e' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#0f766e' }} />
      <Search className="w-4 h-4 text-teal-600" />
      <span>{data.label}</span>
    </div>
  );
};

// Git 提交节点
export const GitCommitNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#10b981',
      background: 'linear-gradient(135deg, #1f2937 0%, #064e3b 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
      <GitPullRequest className="w-4 h-4 text-emerald-400" />
      <span>{data.label}</span>
    </div>
  );
};

// Git 分支节点
export const GitBranchNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#059669',
      background: 'linear-gradient(135deg, #1f2937 0%, #065f46 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#059669' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#059669' }} />
      <GitBranch className="w-4 h-4 text-emerald-500" />
      <span>{data.label}</span>
    </div>
  );
};

// Shell 命令节点
export const ShellNode = ({ data }) => {
  return (
    <div style={{
      ...baseNodeStyle,
      borderColor: '#6b7280',
      background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#6b7280' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#6b7280' }} />
      <Terminal className="w-4 h-4 text-gray-400" />
      <span>{data.label}</span>
    </div>
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