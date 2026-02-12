package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 文档生成 API
 */
@Slf4j
@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
public class DocsController {

    /**
     * 生成 API 文档
     * POST /api/docs/generate-api
     */
    @PostMapping("/generate-api")
    public ResponseEntity<Map<String, Object>> generateApiDocs(@RequestBody Map<String, Object> request) {
        log.info("生成 API 文档");

        String code = (String) request.get("code");
        String language = (String) request.getOrDefault("language", "java");

        // 模拟生成 API 文档
        String docs = generateApiDocsInternal(code, language);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "docs", docs
        ));
    }

    /**
     * 生成 README 文档
     * POST /api/docs/generate-readme
     */
    @PostMapping("/generate-readme")
    public ResponseEntity<Map<String, Object>> generateReadme(@RequestBody Map<String, Object> request) {
        log.info("生成 README 文档");

        String projectPath = (String) request.get("projectPath");
        String projectName = (String) request.getOrDefault("projectName", "Project");

        // 模拟生成 README
        String readme = generateReadmeInternal(projectName);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "readme", readme
        ));
    }

    /**
     * 生成代码注释
     * POST /api/docs/generate-comments
     */
    @PostMapping("/generate-comments")
    public ResponseEntity<Map<String, Object>> generateComments(@RequestBody Map<String, Object> request) {
        log.info("生成代码注释");

        String code = (String) request.get("code");
        String language = (String) request.getOrDefault("language", "java");

        // 模拟生成注释
        String commentedCode = generateCommentsInternal(code, language);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "code", commentedCode
        ));
    }

    // ========== 内部方法 ==========

    private String generateApiDocsInternal(String code, String language) {
        if (code == null || code.isEmpty()) {
            return "# API 文档\n\n暂无代码可分析。";
        }

        StringBuilder docs = new StringBuilder();
        docs.append("# API 文档\n\n");
        docs.append("## 概述\n\n");
        docs.append("本文档自动生成于 ").append(new Date()).append("\n\n");
        docs.append("## API 端点\n\n");
        docs.append("### 示例端点\n\n");
        docs.append("**请求方法**: `GET`\n\n");
        docs.append("**路径**: `/api/example`\n\n");
        docs.append("**描述**: 示例 API 端点\n\n");

        return docs.toString();
    }

    private String generateReadmeInternal(String projectName) {
        StringBuilder readme = new StringBuilder();
        readme.append("# ").append(projectName).append("\n\n");
        readme.append("## 项目简介\n\n");
        readme.append("这是一个自动生成的 README 文档。\n\n");
        readme.append("## 安装\n\n");
        readme.append("```bash\n");
        readme.append("npm install\n");
        readme.append("```\n\n");
        readme.append("## 使用\n\n");
        readme.append("```bash\n");
        readme.append("npm start\n");
        readme.append("```\n\n");
        readme.append("## 许可证\n\n");
        readme.append("MIT License\n");

        return readme.toString();
    }

    private String generateCommentsInternal(String code, String language) {
        if (code == null || code.isEmpty()) {
            return code;
        }

        // 简单的注释生成逻辑
        return "/**\n * 自动生成的代码注释\n * \n * 此代码块包含 " + code.split("\n").length + " 行代码\n */\n" + code;
    }
}
