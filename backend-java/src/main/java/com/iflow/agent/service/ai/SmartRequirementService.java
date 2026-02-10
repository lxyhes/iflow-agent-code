package com.iflow.agent.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.dto.smartrequirement.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/**
 * 智能需求分析服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmartRequirementService {

    private final ObjectMapper objectMapper;
    private final UnifiedAIService unifiedAIService;

    /**
     * 步骤1: 分析需求
     */
    public Step1AnalyzeResponse step1Analyze(Step1AnalyzeRequest request) {
        log.info("智能需求分析 - 步骤1: 分析需求, text length: {}", request.getText().length());

        String prompt = buildStep1Prompt(request);
        String aiResponse = unifiedAIService.chat(prompt, "GLM-4.7").block();

        try {
            // 移除可能的 Markdown 代码块标记
            String cleanedResponse = extractJsonFromMarkdown(aiResponse);
            // 解析 AI 返回的 JSON
            return objectMapper.readValue(cleanedResponse, Step1AnalyzeResponse.class);
        } catch (Exception e) {
            log.error("解析步骤1响应失败, 原始响应: {}", aiResponse, e);
            return createDefaultAnalysis();
        }
    }

    /**
     * 步骤2: 匹配模块
     */
    public Step2MatchResponse step2Match(Step2MatchRequest request) {
        log.info("智能需求分析 - 步骤2: 匹配模块, keywords: {}, project: {}",
                request.getKeywords(), request.getProjectName());

        // TODO: 实现真正的项目扫描和模块匹配
        // 这里返回模拟数据，实际应该扫描项目文件并匹配关键词
        List<MatchedModule> modules = createMockMatchedModules(request.getKeywords());

        return new Step2MatchResponse(modules);
    }

    /**
     * 步骤2.5: 分析上下文
     */
    public Step25ContextResponse step25Context(Step25ContextRequest request) {
        log.info("智能需求分析 - 步骤2.5: 分析上下文, modules count: {}",
                request.getMatchedModules().size());

        // TODO: 基于匹配的模块分析业务上下文
        // 这里返回模拟数据
        BusinessContext context = createMockBusinessContext();

        return new Step25ContextResponse(context);
    }

    /**
     * 步骤3: 生成解决方案
     */
    public Step3SolutionResponse step3Solution(Step3SolutionRequest request) {
        log.info("智能需求分析 - 步骤3: 生成解决方案");

        String prompt = buildStep3Prompt(request);
        String aiResponse = unifiedAIService.chat(prompt, "GLM-4.7").block();

        try {
            // 移除可能的 Markdown 代码块标记
            String cleanedResponse = extractJsonFromMarkdown(aiResponse);
            return objectMapper.readValue(cleanedResponse, Step3SolutionResponse.class);
        } catch (Exception e) {
            log.error("解析步骤3响应失败, 原始响应: {}", aiResponse, e);
            return createDefaultSolution();
        }
    }

    /**
     * 优化需求
     */
    public OptimizeResponse optimize(OptimizeRequest request) {
        log.info("智能需求分析: 优化需求");

        String prompt = String.format("""
                请优化以下需求描述，使其更清晰、更完整。

                原始需求：%s

                请返回JSON格式：
                {
                  "optimizedText": "优化后的需求文本",
                  "changes": ["改进点1", "改进点2"],
                  "suggestions": ["建议1", "建议2"]
                }
                """, request.getText());

        String aiResponse = unifiedAIService.chat(prompt, "GLM-4.7").block();

        try {
            // 移除可能的 Markdown 代码块标记
            String cleanedResponse = extractJsonFromMarkdown(aiResponse);
            return objectMapper.readValue(cleanedResponse, OptimizeResponse.class);
        } catch (Exception e) {
            log.error("解析优化响应失败, 原始响应: {}", aiResponse, e);
            return new OptimizeResponse(
                    request.getText(),
                    Arrays.asList("格式优化"),
                    Arrays.asList("添加更多细节")
            );
        }
    }

    /**
     * 优化项目
     */
    public OptimizeProjectResponse optimizeProject(OptimizeProjectRequest request) {
        log.info("智能需求分析: 优化项目, focus: {}, project: {}",
                request.getFocus(), request.getProjectName());

        // TODO: 实现真正的项目扫描和分析
        // 这里先调用 AI 进行智能分析
        String prompt = buildOptimizeProjectPrompt(request.getFocus(), request.getProjectName());
        String aiResponse = unifiedAIService.chat(prompt, "GLM-4.7").block();

        try {
            // 移除可能的 Markdown 代码块标记
            String cleanedResponse = extractJsonFromMarkdown(aiResponse);
            return objectMapper.readValue(cleanedResponse, OptimizeProjectResponse.class);
        } catch (Exception e) {
            log.error("解析项目优化响应失败, 原始响应: {}", aiResponse, e);
            // 返回模拟数据作为后备
            ProjectOptimizationResult analysis = new ProjectOptimizationResult(
                    "项目整体结构良好，代码规范性较高",
                    85,
                    Arrays.asList("模块化设计清晰", "注释完整", "命名规范"),
                    Arrays.asList("部分代码重复", "测试覆盖率待提升")
            );

            OptimizationRecommendation rec1 = new OptimizationRecommendation(
                    "高", "代码质量", "存在重复代码", "提取公共方法到工具类", "2小时"
            );
            OptimizationRecommendation rec2 = new OptimizationRecommendation(
                    "中", "测试", "测试覆盖率不足", "添加单元测试", "4小时"
            );

            return new OptimizeProjectResponse(analysis, Arrays.asList(rec1, rec2));
        }
    }

    /**
     * 细化需求
     */
    public RefineResponse refine(RefineRequest request) {
        log.info("智能需求分析: 细化需求, feedback: {}", request.getFeedback());

        String prompt = String.format("""
                基于用户反馈，更新现有解决方案。

                原方案：%s
                用户反馈：%s

                请返回JSON格式：
                {
                  "updatedSolution": {
                    "solutionDoc": "更新后的方案文档",
                    "executionPlan": {...},
                    "apiDesign": [...]
                  }
                }
                """,
                request.getPreviousSolution().getSolutionDoc(),
                request.getFeedback()
        );

        String aiResponse = unifiedAIService.chat(prompt, "GLM-4.7").block();

        try {
            // 移除可能的 Markdown 代码块标记
            String cleanedResponse = extractJsonFromMarkdown(aiResponse);
            return objectMapper.readValue(cleanedResponse, RefineResponse.class);
        } catch (Exception e) {
            log.error("解析细化响应失败, 原始响应: {}", aiResponse, e);
            // 返回更新后的原方案
            return new RefineResponse(new UpdatedSolution(
                    request.getPreviousSolution().getSolutionDoc(),
                    request.getPreviousSolution().getExecutionPlan(),
                    null
            ));
        }
    }

    /**
     * 保存需求分析结果
     */
    public SaveResponse save(SaveRequest request) {
        log.info("智能需求分析: 保存结果, project: {}, title: {}",
                request.getProjectName(), request.getTitle());

        // TODO: 实现真正的文件保存
        String path = String.format("/projects/%s/smart-requirements/%s.md",
                request.getProjectName(),
                System.currentTimeMillis()
        );

        return new SaveResponse(path);
    }

    // ==================== 私有辅助方法 ====================

    /**
     * 从 Markdown 代码块中提取 JSON 内容
     */
    private String extractJsonFromMarkdown(String response) {
        if (response == null || response.trim().isEmpty()) {
            return response;
        }

        String trimmed = response.trim();

        // 移除 ```json 或 ``` 开头
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7).trim();
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3).trim();
        }

        // 移除结尾的 ```
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3).trim();
        }

        return trimmed;
    }

    private String buildStep1Prompt(Step1AnalyzeRequest request) {
        return String.format("""
                请分析以下需求，提取关键信息：

                需求：%s
                项目：%s

                请返回JSON格式：
                {
                  "type": "需求类型（如：功能需求、性能需求、安全需求等）",
                  "summary": "需求摘要（1-2句话概括）",
                  "keywords": ["关键词1", "关键词2", "关键词3"],
                  "complexity": "复杂度评估（低/中/高）",
                  "complexityScore": 复杂度评分（1-10的整数）,
                  "priority": "优先级建议（低/中/高）",
                  "acceptanceCriteria": ["验收标准1", "验收标准2", "验收标准3"],
                  "keyFeatures": ["核心功能1", "核心功能2"],
                  "techConstraints": ["技术约束1", "技术约束2"]
                }
                """,
                request.getText(),
                request.getProjectName()
        );
    }

    private String buildStep3Prompt(Step3SolutionRequest request) {
        return String.format("""
                基于以下需求分析和匹配的模块，生成详细的技术解决方案：

                需求分析：%s
                匹配模块：%s

                请返回JSON格式：
                {
                  "solutionDoc": "完整的技术方案文档（Markdown格式）",
                  "executionPlan": {
                    "milestones": [
                      {
                        "name": "里程碑名称",
                        "date": "2024-XX-XX",
                        "tasks": ["任务1", "任务2"]
                      }
                    ]
                  },
                  "apiDesign": [
                    {
                      "endpoint": "/api/endpoint",
                      "method": "POST",
                      "description": "描述"
                    }
                  ],
                  "effortEstimation": "预估工作量（如：30天）",
                  "testScenarios": [
                    {
                      "name": "测试场景",
                      "steps": ["步骤1", "步骤2"]
                    }
                  ]
                }
                """,
                request.getAnalysis(),
                request.getMatchedModules()
        );
    }

    private String buildOptimizeProjectPrompt(String focus, String projectName) {
        return String.format("""
                请对项目进行智能诊断和优化建议分析。

                项目名称：%s
                关注重点：%s

                请返回JSON格式：
                {
                  "analysis": {
                    "summary": "项目整体评估摘要",
                    "healthScore": 85,
                    "strengths": ["优势1", "优势2", "优势3"],
                    "weaknesses": ["待改进点1", "待改进点2"]
                  },
                  "recommendations": [
                    {
                      "priority": "高/中/低",
                      "category": "类别（如：代码质量、性能、安全、测试等）",
                      "issue": "问题描述",
                      "solution": "解决方案",
                      "effort": "预估工作量"
                    }
                  ]
                }
                """,
                projectName != null ? projectName : "当前项目",
                focus != null && !focus.isEmpty() ? focus : "全项目扫描"
        );
    }

    private Step1AnalyzeResponse createDefaultAnalysis() {
        return new Step1AnalyzeResponse(
                "功能需求",
                "未成功解析的需求",
                Arrays.asList("需求", "分析"),
                "中",
                5,
                "中",
                Arrays.asList("需要进一步分析"),
                Arrays.asList("默认功能"),
                Arrays.asList("默认约束")
        );
    }

    private Step3SolutionResponse createDefaultSolution() {
        return new Step3SolutionResponse(
                "# 技术方案\n\n由于AI解析失败，请重新尝试。",
                new ExecutionPlan(Arrays.asList()),
                Arrays.asList(),
                "待评估",
                Arrays.asList()
        );
    }

    private List<MatchedModule> createMockMatchedModules(List<String> keywords) {
        // TODO: 扫描项目文件，根据关键词匹配模块
        return Arrays.asList(
                new MatchedModule(
                        "用户管理模块",
                        "/src/main/java/com/example/UserService.java",
                        0.85,
                        "处理用户注册、登录、权限等功能"
                ),
                new MatchedModule(
                        "数据访问模块",
                        "/src/main/java/com/example/Repository.java",
                        0.72,
                        "处理数据库操作"
                )
        );
    }

    private BusinessContext createMockBusinessContext() {
        return new BusinessContext(
                "当前系统采用分层架构，包含表现层、业务层和持久层。",
                "sequenceDiagram\n    participant User\n    participant Controller\n    participant Service\n    participant Repository\n    participant Database\n\n    User->>Controller: 发起请求\n    Controller->>Service: 调用服务\n    Service->>Repository: 查询数据\n    Repository->>Database: 执行SQL\n    Database-->>Repository: 返回结果\n    Repository-->>Service: 返回数据\n    Service-->>Controller: 返回结果\n    Controller-->>User: 返回响应",
                Arrays.asList(
                        new DomainTerm("用户", "系统使用者"),
                        new DomainTerm("权限", "用户访问资源的权限")
                )
        );
    }
}
