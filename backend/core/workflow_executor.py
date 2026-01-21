"""
Workflow Executor
工作流执行引擎，使用 iFlow SDK 执行工作流
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
from .agent import Agent
from .iflow_sdk_client import IFlowSDKClient, MessageType

logger = logging.getLogger("WorkflowExecutor")


class WorkflowExecutionResult:
    """工作流执行结果"""
    def __init__(self):
        self.success = False
        self.error = None
        self.steps_completed = 0
        self.steps_total = 0
        self.logs = []
        self.output = None
        self.execution_time = 0


class WorkflowExecutor:
    """工作流执行器"""

    def __init__(self):
        self.executions: Dict[str, Dict[str, Any]] = {}

    async def execute_workflow(
        self,
        workflow_id: str,
        workflow_data: Dict[str, Any],
        project_path: str,
        context: Optional[Dict[str, Any]] = None
    ) -> WorkflowExecutionResult:
        """
        执行工作流

        Args:
            workflow_id: 工作流 ID
            workflow_data: 工作流数据（包含 nodes 和 edges）
            project_path: 项目路径
            context: 执行上下文

        Returns:
            WorkflowExecutionResult: 执行结果
        """
        result = WorkflowExecutionResult()
        execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        try:
            logger.info(f"Starting workflow execution: {execution_id}")

            # 记录执行信息
            self.executions[execution_id] = {
                'workflow_id': workflow_id,
                'project_path': project_path,
                'start_time': datetime.now().isoformat(),
                'status': 'running',
                'context': context or {},
                'logs': []
            }

            # 构建执行计划
            execution_plan = self._build_execution_plan(workflow_data)

            result.steps_total = len(execution_plan)

            # 初始化 iFlow Agent
            agent = Agent(
                name=f"WorkflowAgent_{workflow_id}",
                cwd=project_path,
                mode="yolo",
                use_sdk=True
            )

            # 执行每个步骤
            for step in execution_plan:
                step_result = await self._execute_step(agent, step, context)
                result.steps_completed += 1
                result.logs.append({
                    'step': step.get('type'),
                    'timestamp': datetime.now().isoformat(),
                    'result': step_result
                })

                # 记录日志
                self.executions[execution_id]['logs'].append({
                    'step': step.get('type'),
                    'timestamp': datetime.now().isoformat(),
                    'result': step_result
                })

                # 如果步骤失败，停止执行
                if not step_result.get('success', True):
                    result.error = step_result.get('error', 'Step execution failed')
                    logger.error(f"Step {step.get('type')} failed: {result.error}")
                    break

            result.success = True
            result.output = self._collect_output(execution_plan)

            # 更新执行状态
            self.executions[execution_id]['status'] = 'completed'
            self.executions[execution_id]['end_time'] = datetime.now().isoformat()
            self.executions[execution_id]['success'] = True

            logger.info(f"Workflow execution completed: {execution_id}")

        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Workflow execution failed: {e}", exc_info=True)

            if execution_id in self.executions:
                self.executions[execution_id]['status'] = 'failed'
                self.executions[execution_id]['end_time'] = datetime.now().isoformat()
                self.executions[execution_id]['error'] = str(e)

        return result

    async def execute_workflow_stream(
        self,
        workflow_id: str,
        workflow_data: Dict[str, Any],
        project_path: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式执行工作流

        Args:
            workflow_id: 工作流 ID
            workflow_data: 工作流数据
            project_path: 项目路径
            context: 执行上下文

        Yields:
            Dict: 执行状态更新
        """
        execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        try:
            yield {
                'type': 'start',
                'execution_id': execution_id,
                'timestamp': datetime.now().isoformat()
            }

            # 构建执行计划
            execution_plan = self._build_execution_plan(workflow_data)

            yield {
                'type': 'plan',
                'steps_total': len(execution_plan),
                'timestamp': datetime.now().isoformat()
            }

            # 初始化 iFlow Agent
            agent = Agent(
                name=f"WorkflowAgent_{workflow_id}",
                cwd=project_path,
                mode="yolo",
                use_sdk=True
            )

            # 执行每个步骤
            for index, step in enumerate(execution_plan):
                node_id = step.get('id')
                yield {
                    'type': 'step_start',
                    'step_index': index,
                    'node_id': node_id,
                    'step_type': step.get('type'),
                    'timestamp': datetime.now().isoformat()
                }

                # 流式执行步骤
                async for update in self._execute_step_stream(agent, step, context):
                    yield update

                yield {
                    'type': 'step_complete',
                    'step_index': index,
                    'node_id': node_id,
                    'step_type': step.get('type'),
                    'timestamp': datetime.now().isoformat()
                }

            yield {
                'type': 'complete',
                'execution_id': execution_id,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            yield {
                'type': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _build_execution_plan(self, workflow_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        构建执行计划

        Args:
            workflow_data: 工作流数据

        Returns:
            List[Dict]: 执行步骤列表
        """
        nodes = workflow_data.get('nodes', [])
        edges = workflow_data.get('edges', [])

        # 找到起始节点
        start_node = next((n for n in nodes if n.get('type') == 'start'), None)
        if not start_node:
            raise ValueError("工作流必须包含起始节点")

        # 构建邻接表
        adjacency = {}
        for node in nodes:
            adjacency[node['id']] = []
        for edge in edges:
            if edge['source'] in adjacency:
                adjacency[edge['source']].append(edge['target'])

        # BFS 遍历生成执行计划
        visited = set()
        plan = []
        queue = [start_node['id']]

        while queue:
            current_id = queue.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            current_node = next((n for n in nodes if n['id'] == current_id), None)
            if current_node:
                plan.append(current_node)

            # 添加下一个节点
            for next_id in adjacency.get(current_id, []):
                if next_id not in visited:
                    queue.append(next_id)

        return plan

    async def _execute_step(
        self,
        agent: Agent,
        step: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        执行单个步骤

        Args:
            agent: iFlow Agent
            step: 步骤数据
            context: 执行上下文

        Returns:
            Dict: 执行结果
        """
        step_type = step.get('type')
        step_data = step.get('data', {})

        try:
            if step_type == 'start':
                return {'success': True, 'message': 'Workflow started'}

            elif step_type == 'end':
                return {'success': True, 'message': 'Workflow completed'}

            elif step_type == 'prompt':
                prompt = step_data.get('prompt', '')
                response = await agent.chat(prompt)
                return {'success': True, 'output': response}

            elif step_type == 'condition':
                condition = step_data.get('condition', '')
                # 简单的条件评估（实际应该更复杂）
                result = await agent.chat(f"Evaluate condition: {condition}")
                return {'success': True, 'output': result}

            elif step_type == 'action':
                action = step_data.get('action', '')
                if action == 'generate_fix':
                    # 专门处理生成修复建议的逻辑
                    result = await agent.chat("请分析当前项目中的问题并生成结构化的修复建议。请以 JSON 格式返回，包含 'issues' 列表，每个 issue 包含 'file', 'line', 'description', 'suggestion'。")
                else:
                    result = await agent.chat(f"Execute action: {action}")
                return {'success': True, 'output': result}

            elif step_type == 'askUser':
                # 等待用户输入（需要前端实现）
                return {'success': True, 'message': 'Waiting for user input'}

            elif step_type == 'mcp':
                mcp_tool = step_data.get('mcpTool', '')
                result = await agent.chat(f"Call MCP tool: {mcp_tool}")
                return {'success': True, 'output': result}

            elif step_type == 'skill':
                skill = step_data.get('skill', '')
                result = await agent.chat(f"Use skill: {skill}")
                return {'success': True, 'output': result}

            elif step_type == 'fileRead':
                file_path = step_data.get('filePath', '')
                result = await agent.chat(f"Read file: {file_path}")
                return {'success': True, 'output': result}

            elif step_type == 'fileWrite':
                file_path = step_data.get('filePath', '')
                content = step_data.get('content', '')
                result = await agent.chat(f"Write to file {file_path}: {content}")
                return {'success': True, 'output': result}

            elif step_type == 'shell':
                command = step_data.get('command', '')
                result = await agent.chat(f"Execute shell command: {command}")
                return {'success': True, 'output': result}

            elif step_type == 'git':
                git_command = step_data.get('gitCommand', '')
                result = await agent.chat(f"Execute git command: {git_command}")
                return {'success': True, 'output': result}

            elif step_type == 'search':
                search_query = step_data.get('searchQuery', '')
                result = await agent.chat(f"Search code: {search_query}")
                return {'success': True, 'output': result}

            elif step_type == 'codeEdit':
                edit_type = step_data.get('editType', '')
                result = await agent.chat(f"Edit code: {edit_type}")
                return {'success': True, 'output': result}

            else:
                return {'success': False, 'error': f'Unknown step type: {step_type}'}

        except Exception as e:
            logger.error(f"Step execution failed: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    async def _execute_step_stream(
        self,
        agent: Agent,
        step: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式执行单个步骤

        Args:
            agent: iFlow Agent
            step: 步骤数据
            context: 执行上下文

        Yields:
            Dict: 执行更新
        """
        step_type = step.get('type')
        step_data = step.get('data', {})

        try:
            if step_type in ['prompt', 'condition', 'action', 'mcp', 'skill',
                           'fileRead', 'fileWrite', 'shell', 'git', 'search', 'codeEdit']:
                prompt = self._build_step_prompt(step_type, step_data)
                full_output = ""

                async for chunk in agent.chat_stream(prompt):
                    if isinstance(chunk, dict):
                        if chunk.get('type') == MessageType.ASSISTANT.value:
                            content = chunk.get('content', '')
                            full_output += content
                            yield {
                                'type': 'chunk',
                                'content': content,
                                'timestamp': datetime.now().isoformat()
                            }
                    elif isinstance(chunk, str):
                        full_output += chunk
                        yield {
                            'type': 'chunk',
                            'content': chunk,
                            'timestamp': datetime.now().isoformat()
                        }

                yield {
                    'type': 'step_output',
                    'output': full_output,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                yield {
                    'type': 'step_complete',
                    'message': f'Step {step_type} completed',
                    'timestamp': datetime.now().isoformat()
                }

        except Exception as e:
            logger.error(f"Stream step execution failed: {e}", exc_info=True)
            yield {
                'type': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _build_step_prompt(self, step_type: str, step_data: Dict[str, Any]) -> str:
        """构建步骤提示词"""
        base_instruction = "\n请务必使用中文进行回答。"
        
        if step_type == 'action' and step_data.get('action') == 'generate_fix':
            return "请分析当前项目中的问题并生成结构化的修复建议。请以 JSON 格式返回，包含 'issues' 列表，每个 issue 包含 'file', 'line', 'description', 'suggestion'。" + base_instruction

        prompts = {
            'prompt': step_data.get('prompt', ''),
            'condition': f"Evaluate condition: {step_data.get('condition', '')}",
            'action': f"Execute action: {step_data.get('action', '')}",
            'mcp': f"Call MCP tool: {step_data.get('mcpTool', '')}",
            'skill': f"Use skill: {step_data.get('skill', '')}",
            'fileRead': f"Read file: {step_data.get('filePath', '')}",
            'fileWrite': f"Write to file {step_data.get('filePath', '')}: {step_data.get('content', '')}",
            'shell': f"Execute shell command: {step_data.get('command', '')}",
            'git': f"Execute git command: {step_data.get('gitCommand', '')}",
            'search': f"Search code: {step_data.get('searchQuery', '')}",
            'codeEdit': f"Edit code: {step_data.get('editType', '')}"
        }
        
        prompt = prompts.get(step_type, '')
        if prompt:
            return prompt + base_instruction
        return prompt

    def _collect_output(self, execution_plan: List[Dict[str, Any]]) -> Dict[str, Any]:
        """收集执行输出"""
        return {
            'steps': len(execution_plan),
            'timestamp': datetime.now().isoformat()
        }

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """获取执行状态"""
        return self.executions.get(execution_id)

    def get_execution_logs(self, execution_id: str) -> List[Dict[str, Any]]:
        """获取执行日志"""
        execution = self.executions.get(execution_id)
        return execution.get('logs', []) if execution else []


# 全局执行器实例
workflow_executor = WorkflowExecutor()
