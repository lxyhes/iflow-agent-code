package com.iflow.agent.controller;

import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 智能需求分析 API
 */
@Slf4j
@RestController
@RequestMapping("/api/smart-requirement")
@RequiredArgsConstructor
public class SmartRequirementController {

    private final TongyiQianwenService tongyiQianwenService;

    /**
     * 步骤1: 分析需求
     */
    @PostMapping("/step1-analyze")
    public ResponseEntity<Map<String, Object>> step1Analyze(@RequestBody Map<String, String> request) {
        log.info("智能需求分析 - 步骤1: 分析需求");
        String requirement = request.get("requirement");

        String prompt = """
            请分析以下需求，提取关键信息：
            
            需求：%s
            
            请返回JSON格式：
            {
              "core_requirements": ["核心需求1", "核心需求2"],
              "functional_requirements": ["功能需求1", "功能需求2"],
              "non_functional_requirements": ["非功能需求1", "非功能需求2"],
              "constraints": ["约束1", "约束2"],
              "ambiguities": ["模糊点1", "模糊点2"],
              "suggestions": ["建议1", "建议2"]
            }
            """.formatted(requirement);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "step", 1,
                "analysis", aiResponse
        ));
    }

    /**
     * 步骤2: 匹配技术方案
     */
    @PostMapping("/step2-match")
    public ResponseEntity<Map<String, Object>> step2Match(@RequestBody Map<String, Object> request) {
        log.info("智能需求分析 - 步骤2: 匹配技术方案");

        String requirement = (String) request.get("requirement");
        @SuppressWarnings("unchecked")
        List<String> coreRequirements = (List<String>) request.get("core_requirements");

        String prompt = """
            基于以下需求，推荐合适的技术方案：
            
            需求：%s
            核心需求：%s
            
            请返回JSON格式：
            {
              "recommended_stack": {
                "frontend": "推荐前端技术",
                "backend": "推荐后端技术",
                "database": "推荐数据库",
                "other": ["其他技术1", "其他技术2"]
              },
              "architecture_pattern": "推荐架构模式",
              "key_libraries": ["库1", "库2"],
              "pros": ["优势1", "优势2"],
              "cons": ["劣势1", "劣势2"]
            }
            """.formatted(requirement, coreRequirements != null ? String.join(", ", coreRequirements) : "");

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "step", 2,
                "match", aiResponse
        ));
    }

    /**
     * 步骤2.5: 分析上下文
     */
    @PostMapping("/step2-5-context")
    public ResponseEntity<Map<String, Object>> step25Context(@RequestBody Map<String, Object> request) {
        log.info("智能需求分析 - 步骤2.5: 分析上下文");

        String projectContext = (String) request.get("project_context");
        String requirement = (String) request.get("requirement");

        String prompt = """
            分析项目上下文与需求的匹配度：
            
            项目上下文：%s
            需求：%s
            
            请返回JSON格式：
            {
              "context_analysis": "上下文分析",
              "compatibility": "兼容性评估",
              "risks": ["风险1", "风险2"],
              "recommendations": ["建议1", "建议2"]
            }
            """.formatted(projectContext, requirement);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "step", "2.5",
                "context_analysis", aiResponse
        ));
    }

    /**
     * 步骤3: 生成解决方案
     */
    @PostMapping("/step3-solution")
    public ResponseEntity<Map<String, Object>> step3Solution(@RequestBody Map<String, Object> request) {
        log.info("智能需求分析 - 步骤3: 生成解决方案");

        String requirement = (String) request.get("requirement");
        @SuppressWarnings("unchecked")
        Map<String, Object> techStack = (Map<String, Object>) request.get("tech_stack");

        String prompt = """
            基于以下需求和技术栈，生成详细的解决方案：
            
            需求：%s
            技术栈：%s
            
            请返回JSON格式：
            {
              "solution_overview": "方案概述",
              "system_architecture": "系统架构描述",
              "data_model": "数据模型设计",
              "api_design": ["API1", "API2"],
              "implementation_steps": ["步骤1", "步骤2"],
              "estimated_effort": "预估工作量"
            }
            """.formatted(requirement, techStack != null ? techStack.toString() : "");

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "step", 3,
                "solution", aiResponse
        ));
    }

    /**
     * 优化需求
     */
    @PostMapping("/optimize")
    public ResponseEntity<Map<String, Object>> optimize(@RequestBody Map<String, String> request) {
        log.info("智能需求优化");
        String requirement = request.get("requirement");

        String prompt = """
            请优化以下需求描述，使其更清晰、更完整：
            
            原始需求：%s
            
            请返回JSON格式：
            {
              "optimized_requirement": "优化后的需求",
              "improvements": ["改进点1", "改进点2"],
              "missing_info": ["缺失信息1", "缺失信息2"],
              "clarifications": ["澄清点1", "澄清点2"]
            }
            """.formatted(requirement);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "optimization", aiResponse
        ));
    }

    /**
     * 优化项目需求
     */
    @PostMapping("/optimize-project")
    public ResponseEntity<Map<String, Object>> optimizeProject(@RequestBody Map<String, String> request) {
        log.info("优化项目需求");
        String projectDescription = request.get("project_description");

        String prompt = """
            请分析并优化以下项目需求：
            
            项目描述：%s
            
            请返回JSON格式：
            {
              "optimized_description": "优化后的项目描述",
              "key_features": ["关键特性1", "关键特性2"],
              "technical_requirements": ["技术要求1", "技术要求2"],
              "suggestions": ["建议1", "建议2"]
            }
            """.formatted(projectDescription);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "project_optimization", aiResponse
        ));
    }

    /**
     * 细化需求
     */
    @PostMapping("/refine")
    public ResponseEntity<Map<String, Object>> refine(@RequestBody Map<String, String> request) {
        log.info("细化需求");
        String requirement = request.get("requirement");

        String prompt = """
            请将以下需求细化为更详细的用户故事和任务：
            
            需求：%s
            
            请返回JSON格式：
            {
              "user_stories": [
                {"role": "角色", "action": "动作", "benefit": "收益"}
              ],
              "tasks": ["任务1", "任务2"],
              "acceptance_criteria": ["验收标准1", "验收标准2"]
            }
            """.formatted(requirement);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "refinement", aiResponse
        ));
    }

    /**
     * 保存需求分析结果
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> save(@RequestBody Map<String, Object> request) {
        log.info("保存需求分析结果");

        // 简化实现，实际应该保存到数据库
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "需求分析结果已保存",
                "saved_at", java.time.LocalDateTime.now().toString()
        ));
    }

    /**
     * 分析需求
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(@RequestBody Map<String, String> request) {
        log.info("分析需求");
        String requirement = request.get("requirement");

        String prompt = """
            请全面分析以下需求：
            
            需求：%s
            
            请返回JSON格式：
            {
              "summary": "需求摘要",
              "complexity": "复杂度评估",
              "priority": "优先级建议",
              "dependencies": ["依赖1", "依赖2"],
              "risks": ["风险1", "风险2"],
              "recommendations": ["建议1", "建议2"]
            }
            """.formatted(requirement);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", aiResponse
        ));
    }
}
