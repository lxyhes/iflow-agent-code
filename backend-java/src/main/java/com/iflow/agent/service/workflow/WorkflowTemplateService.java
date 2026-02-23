package com.iflow.agent.service.workflow;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.entity.WorkflowTemplate;
import com.iflow.agent.repository.WorkflowTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * 工作流模板服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowTemplateService {

    private final WorkflowTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    /**
     * 获取所有模板
     */
    @Transactional(readOnly = true)
    public List<WorkflowTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    /**
     * 根据分类获取模板
     */
    @Transactional(readOnly = true)
    public List<WorkflowTemplate> getTemplatesByCategory(String category) {
        return templateRepository.findByCategoryOrderByUsageCountDesc(category);
    }

    /**
     * 获取模板详情
     */
    @Transactional(readOnly = true)
    public WorkflowTemplate getTemplate(Long id) {
        return templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("模板不存在：" + id));
    }

    /**
     * 创建模板
     */
    @Transactional
    public WorkflowTemplate createTemplate(String name, String description, String category,
                                            Map<String, Object> templateData) {
        WorkflowTemplate template = new WorkflowTemplate();
        template.setName(name);
        template.setDescription(description);
        template.setCategory(category);
        
        try {
            template.setTemplateData(objectMapper.writeValueAsString(templateData));
        } catch (JsonProcessingException e) {
            log.warn("序列化模板数据失败", e);
        }
        
        template.setIsBuiltIn(false);
        template.setUsageCount(0);
        
        return templateRepository.save(template);
    }

    /**
     * 更新模板
     */
    @Transactional
    public WorkflowTemplate updateTemplate(Long id, String name, String description,
                                            Map<String, Object> templateData) {
        WorkflowTemplate template = templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("模板不存在：" + id));
        
        if (name != null) {
            template.setName(name);
        }
        if (description != null) {
            template.setDescription(description);
        }
        if (templateData != null) {
            try {
                template.setTemplateData(objectMapper.writeValueAsString(templateData));
            } catch (JsonProcessingException e) {
                log.warn("序列化模板数据失败", e);
            }
        }
        
        return templateRepository.save(template);
    }

    /**
     * 删除模板
     */
    @Transactional
    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    /**
     * 增加模板使用次数
     */
    @Transactional
    public void incrementUsageCount(Long id) {
        templateRepository.findById(id).ifPresent(template -> {
            template.setUsageCount(template.getUsageCount() + 1);
            templateRepository.save(template);
        });
    }

    /**
     * 搜索模板
     */
    @Transactional(readOnly = true)
    public List<WorkflowTemplate> searchTemplates(String keyword) {
        return templateRepository.searchTemplates(keyword);
    }

    /**
     * 初始化内置模板
     */
    @Transactional
    public void initializeBuiltInTemplates() {
        if (templateRepository.count() > 0) {
            return; // 已有模板
        }

        log.info("初始化内置工作流模板...");

        // 代码审查工作流
        createBuiltInTemplate(
            "代码审查工作流",
            "自动化代码审查流程，从获取 PR 到生成审查报告",
            "code-review",
            createCodeReviewTemplate()
        );

        // 文档生成工作流
        createBuiltInTemplate(
            "文档生成工作流",
            "从代码自动生成 API 文档",
            "documentation",
            createDocGenerationTemplate()
        );

        // 数据分析工作流
        createBuiltInTemplate(
            "数据分析工作流",
            "自动化数据处理和分析流程",
            "data-analysis",
            createDataAnalysisTemplate()
        );

        // 自动化测试工作流
        createBuiltInTemplate(
            "自动化测试工作流",
            "运行测试并生成报告",
            "testing",
            createTestingTemplate()
        );

        log.info("内置模板初始化完成");
    }

    private void createBuiltInTemplate(String name, String description, String category,
                                        Map<String, Object> templateData) {
        WorkflowTemplate template = new WorkflowTemplate();
        template.setName(name);
        template.setDescription(description);
        template.setCategory(category);
        
        try {
            template.setTemplateData(objectMapper.writeValueAsString(templateData));
        } catch (JsonProcessingException e) {
            log.error("序列化模板数据失败", e);
            return;
        }
        
        template.setIsBuiltIn(true);
        template.setUsageCount(0);
        template.setIcon("📋");
        
        templateRepository.save(template);
    }

    // ===== 内置模板定义 =====

    private Map<String, Object> createCodeReviewTemplate() {
        Map<String, Object> template = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        // 节点
        nodes.add(createNode("1", "trigger", "GitHub 触发", 100, 100, 
            Map.of("event", "pull_request")));
        nodes.add(createNode("2", "tool", "获取 PR 详情", 300, 100,
            Map.of("tool", "github_get_pr")));
        nodes.add(createNode("3", "condition", "PR 规模判断", 500, 100,
            Map.of("conditions", List.of(
                Map.of("field", "changes_count", "operator", "<", "value", 100),
                Map.of("field", "changes_count", "operator", ">=", "value", 100)
            ))));
        nodes.add(createNode("4", "agent", "小型审查", 700, 50,
            Map.of("agent", "claude-code", "prompt", "审查这个小改动")));
        nodes.add(createNode("5", "agent", "大型审查", 700, 150,
            Map.of("agent", "claude-code", "prompt", "详细审查大改动")));
        nodes.add(createNode("6", "tool", "发布评论", 900, 100,
            Map.of("tool", "github_comment")));

        // 连接
        edges.add(createEdge("1", "2"));
        edges.add(createEdge("2", "3"));
        edges.add(createEdge("3", "4", "small"));
        edges.add(createEdge("3", "5", "large"));
        edges.add(createEdge("4", "6"));
        edges.add(createEdge("5", "6"));

        template.put("nodes", nodes);
        template.put("edges", edges);
        return template;
    }

    private Map<String, Object> createDocGenerationTemplate() {
        Map<String, Object> template = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        nodes.add(createNode("1", "trigger", "文件变更", 100, 100,
            Map.of("event", "file_change")));
        nodes.add(createNode("2", "tool", "读取代码", 300, 100,
            Map.of("tool", "read_file")));
        nodes.add(createNode("3", "agent", "生成文档", 500, 100,
            Map.of("agent", "claude-code", "prompt", "根据代码生成 API 文档")));
        nodes.add(createNode("4", "tool", "保存文档", 700, 100,
            Map.of("tool", "write_file")));

        edges.add(createEdge("1", "2"));
        edges.add(createEdge("2", "3"));
        edges.add(createEdge("3", "4"));

        template.put("nodes", nodes);
        template.put("edges", edges);
        return template;
    }

    private Map<String, Object> createDataAnalysisTemplate() {
        Map<String, Object> template = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        nodes.add(createNode("1", "trigger", "定时触发", 100, 100,
            Map.of("event", "schedule", "cron", "0 9 * * *")));
        nodes.add(createNode("2", "tool", "读取数据", 300, 100,
            Map.of("tool", "read_csv")));
        nodes.add(createNode("3", "agent", "数据分析", 500, 100,
            Map.of("agent", "claude-code", "prompt", "分析数据并生成洞察")));
        nodes.add(createNode("4", "tool", "生成图表", 700, 100,
            Map.of("tool", "generate_chart")));
        nodes.add(createNode("5", "tool", "发送报告", 900, 100,
            Map.of("tool", "send_email")));

        edges.add(createEdge("1", "2"));
        edges.add(createEdge("2", "3"));
        edges.add(createEdge("3", "4"));
        edges.add(createEdge("4", "5"));

        template.put("nodes", nodes);
        template.put("edges", edges);
        return template;
    }

    private Map<String, Object> createTestingTemplate() {
        Map<String, Object> template = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        nodes.add(createNode("1", "trigger", "代码提交", 100, 100,
            Map.of("event", "push")));
        nodes.add(createNode("2", "tool", "运行测试", 300, 100,
            Map.of("tool", "run_tests")));
        nodes.add(createNode("3", "condition", "测试通过？", 500, 100,
            Map.of("conditions", List.of(
                Map.of("field", "test_result", "operator", "==", "value", "pass")
            ))));
        nodes.add(createNode("4", "tool", "生成报告", 700, 50,
            Map.of("tool", "generate_report")));
        nodes.add(createNode("5", "tool", "通知失败", 700, 150,
            Map.of("tool", "notify_failure")));

        edges.add(createEdge("1", "2"));
        edges.add(createEdge("2", "3"));
        edges.add(createEdge("3", "4", "pass"));
        edges.add(createEdge("3", "5", "fail"));

        template.put("nodes", nodes);
        template.put("edges", edges);
        return template;
    }

    private Map<String, Object> createNode(String id, String type, String label, int x, int y,
                                            Map<String, Object> data) {
        Map<String, Object> node = new HashMap<>();
        node.put("id", id);
        node.put("type", type);
        node.put("label", label);
        node.put("position", Map.of("x", x, "y", y));
        node.put("data", data);
        return node;
    }

    private Map<String, Object> createEdge(String source, String target) {
        Map<String, Object> edge = new HashMap<>();
        edge.put("id", source + "-" + target);
        edge.put("source", source);
        edge.put("target", target);
        return edge;
    }

    private Map<String, Object> createEdge(String source, String target, String label) {
        Map<String, Object> edge = createEdge(source, target);
        edge.put("label", label);
        return edge;
    }
}
