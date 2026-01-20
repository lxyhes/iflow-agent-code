"""
Workflow Service
工作流管理服务，支持创建、保存、加载和执行工作流
"""

import json
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger("WorkflowService")


@dataclass
class Workflow:
    """工作流数据模型"""
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    project_name: str
    created_at: str
    updated_at: str
    id: Optional[str] = None


class WorkflowService:
    """工作流服务"""
    
    def __init__(self):
        self.workflows: Dict[str, Workflow] = {}
        self.storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "workflows")
        os.makedirs(self.storage_dir, exist_ok=True)
        self._load_workflows()
    
    def _load_workflows(self):
        """加载所有工作流"""
        try:
            for filename in os.listdir(self.storage_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(self.storage_dir, filename)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        workflow = Workflow(**data)
                        self.workflows[workflow.id] = workflow
            logger.info(f"Loaded {len(self.workflows)} workflows")
        except Exception as e:
            logger.error(f"Failed to load workflows: {e}")
    
    def save_workflow(self, workflow: Workflow) -> str:
        """保存工作流"""
        try:
            if not workflow.id:
                workflow.id = f"workflow_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            workflow.updated_at = datetime.now().isoformat()
            
            file_path = os.path.join(self.storage_dir, f"{workflow.id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'id': workflow.id,
                    'name': workflow.name,
                    'nodes': workflow.nodes,
                    'edges': workflow.edges,
                    'project_name': workflow.project_name,
                    'created_at': workflow.created_at,
                    'updated_at': workflow.updated_at,
                }, f, indent=2, ensure_ascii=False)
            
            self.workflows[workflow.id] = workflow
            logger.info(f"Saved workflow: {workflow.name} ({workflow.id})")
            return workflow.id
        except Exception as e:
            logger.error(f"Failed to save workflow: {e}")
            raise
    
    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """获取工作流"""
        return self.workflows.get(workflow_id)
    
    def get_workflows_by_project(self, project_name: str) -> List[Workflow]:
        """获取项目的所有工作流"""
        return [
            workflow for workflow in self.workflows.values()
            if workflow.project_name == project_name
        ]
    
    def delete_workflow(self, workflow_id: str) -> bool:
        """删除工作流"""
        try:
            if workflow_id in self.workflows:
                file_path = os.path.join(self.storage_dir, f"{workflow_id}.json")
                if os.path.exists(file_path):
                    os.remove(file_path)
                del self.workflows[workflow_id]
                logger.info(f"Deleted workflow: {workflow_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete workflow: {e}")
            return False
    
    def execute_workflow(self, workflow_id: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """执行工作流"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return {
                'success': False,
                'error': f'Workflow {workflow_id} not found'
            }
        
        try:
            # 这里实现工作流执行逻辑
            # 1. 解析节点和边
            # 2. 按照顺序执行节点
            # 3. 处理条件分支
            # 4. 处理人工确认节点
            # 5. 调用 MCP 工具和 Skills
            
            logger.info(f"Executing workflow: {workflow.name}")
            
            # 简化版执行逻辑
            results = []
            for node in workflow.nodes:
                result = self._execute_node(node, context)
                results.append(result)
            
            return {
                'success': True,
                'workflow_id': workflow_id,
                'workflow_name': workflow.name,
                'results': results
            }
        except Exception as e:
            logger.error(f"Failed to execute workflow: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _execute_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个节点"""
        node_type = node.get('type', 'unknown')
        node_data = node.get('data', {})
        
        logger.info(f"Executing node: {node_type} - {node_data.get('label')}")
        
        if node_type == 'prompt':
            # 执行提示词节点
            return {
                'node_id': node['id'],
                'type': 'prompt',
                'label': node_data.get('label'),
                'status': 'completed',
                'result': f"Executed prompt: {node_data.get('prompt', '')}"
            }
        elif node_type == 'condition':
            # 执行条件判断
            return {
                'node_id': node['id'],
                'type': 'condition',
                'label': node_data.get('label'),
                'status': 'completed',
                'result': f"Evaluated condition: {node_data.get('condition', '')}"
            }
        elif node_type == 'action':
            # 执行动作
            return {
                'node_id': node['id'],
                'type': 'action',
                'label': node_data.get('label'),
                'status': 'completed',
                'result': f"Executed action: {node_data.get('action', '')}"
            }
        else:
            return {
                'node_id': node['id'],
                'type': node_type,
                'label': node_data.get('label'),
                'status': 'skipped',
                'result': 'Unknown node type'
            }
    
    def generate_workflow_from_prompt(self, prompt: str) -> Dict[str, Any]:
        """从描述生成工作流"""
        try:
            # 这里可以调用 LLM 生成工作流
            # 简化版：返回一个示例工作流
            
            logger.info(f"Generating workflow from prompt: {prompt}")
            
            # 示例工作流结构
            nodes = [
                {
                    'id': '1',
                    'type': 'start',
                    'position': {'x': 250, 'y': 50},
                    'data': {'label': '开始'}
                },
                {
                    'id': '2',
                    'type': 'prompt',
                    'position': {'x': 250, 'y': 150},
                    'data': {
                        'label': '分析需求',
                        'prompt': f'分析以下需求：{prompt}'
                    }
                },
                {
                    'id': '3',
                    'type': 'action',
                    'position': {'x': 250, 'y': 280},
                    'data': {
                        'label': '生成方案',
                        'action': 'generate_solution'
                    }
                },
                {
                    'id': '4',
                    'type': 'end',
                    'position': {'x': 250, 'y': 400},
                    'data': {'label': '结束'}
                }
            ]
            
            edges = [
                {'id': 'e1-2', 'source': '1', 'target': '2', 'animated': True},
                {'id': 'e2-3', 'source': '2', 'target': '3', 'animated': True},
                {'id': 'e3-4', 'source': '3', 'target': '4', 'animated': True}
            ]
            
            return {
                'success': True,
                'nodes': nodes,
                'edges': edges
            }
        except Exception as e:
            logger.error(f"Failed to generate workflow: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# 全局实例
workflow_service = WorkflowService()