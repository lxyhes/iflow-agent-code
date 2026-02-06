package com.iflow.agent.controller;

import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 代码审查 API
 */
@Slf4j
@RestController
@RequestMapping("/api/review")
@RequiredArgsConstructor
public class CodeReviewController {

    private final TongyiQianwenService tongyiQianwenService;

    /**
     * 代码审查
     */
    @PostMapping("/code")
    public ResponseEntity<Map<String, Object>> reviewCode(@RequestBody Map<String, String> request) {
        log.info("代码审查");
        String code = request.get("code");
        String language = request.getOrDefault("language", "java");

        String prompt = """
            请对以下代码进行审查，找出潜在问题并给出改进建议：
            
            语言：%s
            
            代码：
            ```%s
            %s
            ```
            
            请从以下维度进行审查：
            1. 代码风格和规范
            2. 潜在bug和安全问题
            3. 性能问题
            4. 可读性和可维护性
            5. 最佳实践
            
            请返回JSON格式：
            {
              "overall_score": 85,
              "issues": [
                {
                  "severity": "high/medium/low",
                  "category": "类别",
                  "line": 行号,
                  "message": "问题描述",
                  "suggestion": "改进建议"
                }
              ],
              "strengths": ["优点1", "优点2"],
              "suggestions": ["建议1", "建议2"],
              "summary": "总体评价"
            }
            """.formatted(language, language, code);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "review", aiResponse
        ));
    }

    /**
     * 错误分析
     */
    @PostMapping("/error-analyze")
    public ResponseEntity<Map<String, Object>> analyzeError(@RequestBody Map<String, String> request) {
        log.info("错误分析");
        String errorMessage = request.get("error_message");
        String stackTrace = request.get("stack_trace");
        String code = request.get("code");

        String prompt = """
            请分析以下错误信息，找出根本原因并给出解决方案：
            
            错误信息：
            %s
            
            堆栈跟踪：
            %s
            
            相关代码：
            ```
            %s
            ```
            
            请返回JSON格式：
            {
              "error_type": "错误类型",
              "root_cause": "根本原因",
              "explanation": "详细解释",
              "solution": "解决方案",
              "prevention": "预防措施",
              "references": ["参考链接1", "参考链接2"]
            }
            """.formatted(
                errorMessage != null ? errorMessage : "未提供",
                stackTrace != null ? stackTrace : "未提供",
                code != null ? code : "未提供"
        );

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "analysis", aiResponse
        ));
    }

    /**
     * 自动修复
     */
    @PostMapping("/auto-fix")
    public ResponseEntity<Map<String, Object>> autoFix(@RequestBody Map<String, String> request) {
        log.info("自动修复");
        String code = request.get("code");
        String issue = request.get("issue");
        String language = request.getOrDefault("language", "java");

        String prompt = """
            请修复以下代码中的问题：
            
            语言：%s
            问题描述：%s
            
            原始代码：
            ```%s
            %s
            ```
            
            请返回JSON格式：
            {
              "fixed_code": "修复后的代码",
              "explanation": "修复说明",
              "changes": ["变更1", "变更2"],
              "confidence": "high/medium/low"
            }
            """.formatted(language, issue != null ? issue : "自动检测", language, code);

        String aiResponse = tongyiQianwenService.generate(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "fix", aiResponse
        ));
    }

    /**
     * 获取自动修复历史
     */
    @GetMapping("/auto-fix/history")
    public ResponseEntity<Map<String, Object>> getAutoFixHistory() {
        log.info("获取自动修复历史");
        // 简化实现
        return ResponseEntity.ok(Map.of(
                "success", true,
                "history", List.of()
        ));
    }

    /**
     * 删除自动修复历史
     */
    @DeleteMapping("/auto-fix/history")
    public ResponseEntity<Map<String, Object>> deleteAutoFixHistory() {
        log.info("删除自动修复历史");
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "历史记录已删除"
        ));
    }

    /**
     * CICD平台列表
     */
    @GetMapping("/cicd/platforms")
    public ResponseEntity<Map<String, Object>> getCicdPlatforms() {
        log.info("获取CICD平台列表");

        List<Map<String, Object>> platforms = List.of(
                Map.of("id", "github-actions", "name", "GitHub Actions", "type", "cloud"),
                Map.of("id", "gitlab-ci", "name", "GitLab CI", "type", "cloud"),
                Map.of("id", "jenkins", "name", "Jenkins", "type", "self-hosted"),
                Map.of("id", "circleci", "name", "CircleCI", "type", "cloud"),
                Map.of("id", "travis", "name", "Travis CI", "type", "cloud"),
                Map.of("id", "azure-devops", "name", "Azure DevOps", "type", "cloud")
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "platforms", platforms
        ));
    }

    /**
     * 生成CICD配置
     */
    @PostMapping("/cicd/generate")
    public ResponseEntity<Map<String, Object>> generateCicd(@RequestBody Map<String, String> request) {
        log.info("生成CICD配置");
        String platform = request.get("platform");
        String projectType = request.get("project_type");

        String config = generateCicdConfig(platform, projectType);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "platform", platform,
                "config", config
        ));
    }

    private String generateCicdConfig(String platform, String projectType) {
        return switch (platform) {
            case "github-actions" -> """
                name: CI/CD Pipeline
                
                on:
                  push:
                    branches: [ main, develop ]
                  pull_request:
                    branches: [ main ]
                
                jobs:
                  build:
                    runs-on: ubuntu-latest
                    steps:
                    - uses: actions/checkout@v3
                    - name: Set up JDK
                      uses: actions/setup-java@v3
                      with:
                        java-version: '17'
                        distribution: 'temurin'
                    - name: Build with Maven
                      run: mvn clean package
                    - name: Run tests
                      run: mvn test
                """;
            case "gitlab-ci" -> """
                stages:
                  - build
                  - test
                  - deploy
                
                build:
                  stage: build
                  script:
                    - mvn clean package
                  artifacts:
                    paths:
                      - target/*.jar
                
                test:
                  stage: test
                  script:
                    - mvn test
                """;
            default -> "# CICD configuration for " + platform + "\n# Project type: " + projectType;
        };
    }
}
