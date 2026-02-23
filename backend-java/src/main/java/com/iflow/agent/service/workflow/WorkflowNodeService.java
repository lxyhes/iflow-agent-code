package com.iflow.agent.service.workflow;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.entity.WorkflowNode;
import com.iflow.agent.repository.WorkflowNodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 工作流节点服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowNodeService {

    private final WorkflowNodeRepository nodeRepository;
    private final ObjectMapper objectMapper;

    /**
     * 创建节点
     */
    @Transactional
    public WorkflowNode createNode(Long workflowId, String nodeType, String nodeName, 
                                    Map<String, Object> config, Integer x, Integer y) {
        WorkflowNode node = new WorkflowNode();
        node.setWorkflowId(workflowId);
        node.setNodeType(nodeType);
        node.setNodeName(nodeName);
        node.setPositionX(x);
        node.setPositionY(y);
        
        if (config != null) {
            try {
                node.setNodeConfig(objectMapper.writeValueAsString(config));
            } catch (JsonProcessingException e) {
                log.warn("序列化节点配置失败", e);
            }
        }
        
        return nodeRepository.save(node);
    }

    /**
     * 获取工作流的所有节点
     */
    @Transactional(readOnly = true)
    public List<WorkflowNode> getNodesByWorkflow(Long workflowId) {
        return nodeRepository.findByWorkflowIdOrderByCreatedAtAsc(workflowId);
    }

    /**
     * 更新节点
     */
    @Transactional
    public WorkflowNode updateNode(Long nodeId, String nodeName, Map<String, Object> config,
                                    Integer x, Integer y) {
        WorkflowNode node = nodeRepository.findById(nodeId)
            .orElseThrow(() -> new IllegalArgumentException("节点不存在：" + nodeId));
        
        if (nodeName != null) {
            node.setNodeName(nodeName);
        }
        if (config != null) {
            try {
                node.setNodeConfig(objectMapper.writeValueAsString(config));
            } catch (JsonProcessingException e) {
                log.warn("序列化节点配置失败", e);
            }
        }
        if (x != null) {
            node.setPositionX(x);
        }
        if (y != null) {
            node.setPositionY(y);
        }
        
        return nodeRepository.save(node);
    }

    /**
     * 更新节点连接
     */
    @Transactional
    public WorkflowNode updateConnections(Long nodeId, List<Long> connectedNodeIds) {
        WorkflowNode node = nodeRepository.findById(nodeId)
            .orElseThrow(() -> new IllegalArgumentException("节点不存在：" + nodeId));
        
        try {
            node.setConnections(objectMapper.writeValueAsString(connectedNodeIds));
        } catch (JsonProcessingException e) {
            log.warn("序列化连接失败", e);
        }
        
        return nodeRepository.save(node);
    }

    /**
     * 删除节点
     */
    @Transactional
    public void deleteNode(Long nodeId) {
        nodeRepository.deleteById(nodeId);
    }

    /**
     * 删除工作流的所有节点
     */
    @Transactional
    public void deleteNodesByWorkflow(Long workflowId) {
        nodeRepository.deleteByWorkflowId(workflowId);
    }

    /**
     * 获取节点类型定义
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNodeTypes() {
        List<Map<String, Object>> types = new ArrayList<>();
        
        types.add(createNodeType("prompt", "提示词节点", "输入 AI 提示词", "💬"));
        types.add(createNodeType("agent", "Agent 节点", "调用 AI Agent", "🤖"));
        types.add(createNodeType("condition", "条件判断", "条件分支", "🔀"));
        types.add(createNodeType("loop", "循环", "循环执行", "🔄"));
        types.add(createNodeType("tool", "工具调用", "调用外部工具", "🔧"));
        types.add(createNodeType("human_approval", "人工确认", "等待用户确认", "✅"));
        types.add(createNodeType("variable", "变量", "定义变量", "📝"));
        types.add(createNodeType("output", "输出", "输出结果", "📤"));
        
        return types;
    }

    private Map<String, Object> createNodeType(String type, String label, String description, String icon) {
        Map<String, Object> nodeType = new HashMap<>();
        nodeType.put("type", type);
        nodeType.put("label", label);
        nodeType.put("description", description);
        nodeType.put("icon", icon);
        return nodeType;
    }
}
