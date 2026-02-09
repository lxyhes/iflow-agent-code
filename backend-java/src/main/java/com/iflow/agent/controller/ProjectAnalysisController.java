package com.iflow.agent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 项目分析 API - 用于面试准备
 */
@Slf4j
@RestController
@RequestMapping("/api")
public class ProjectAnalysisController {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 分析项目结构用于面试准备
     */
    @PostMapping("/analyze-project-for-interview")
    public ResponseEntity<Map<String, Object>> analyzeProjectForInterview(@RequestBody Map<String, String> request) {
        String projectPath = request.get("project_path");
        
        if (projectPath == null || projectPath.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "缺少项目路径"
            ));
        }

        log.info("分析项目用于面试准备: {}", projectPath);

        try {
            Path path = Paths.get(projectPath);
            if (!Files.exists(path)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "项目路径不存在"
                ));
            }

            String projectName = path.getFileName().toString();
            
            // 分析技术栈
            Map<String, List<String>> techStack = analyzeTechStack(path);
            
            // 确定架构类型
            String architecture = determineArchitecture(techStack);
            
            // 确定复杂度
            String complexity = determineComplexity(techStack);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "project_name", projectName,
                "tech_stack", techStack,
                "features", List.of(),
                "architecture", architecture,
                "complexity", complexity
            ));

        } catch (Exception e) {
            log.error("分析项目失败: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * 分析项目技术栈
     */
    private Map<String, List<String>> analyzeTechStack(Path projectPath) {
        Map<String, List<String>> techStack = new HashMap<>();
        techStack.put("languages", new ArrayList<>());
        techStack.put("frameworks", new ArrayList<>());
        techStack.put("databases", new ArrayList<>());
        techStack.put("tools", new ArrayList<>());

        // 检查 package.json (Node.js/JavaScript 项目)
        Path packageJson = projectPath.resolve("package.json");
        if (Files.exists(packageJson)) {
            analyzePackageJson(packageJson, techStack);
        }

        // 检查 requirements.txt (Python 项目)
        Path requirementsTxt = projectPath.resolve("requirements.txt");
        if (Files.exists(requirementsTxt)) {
            analyzeRequirementsTxt(requirementsTxt, techStack);
        }

        // 检查 go.mod (Go 项目)
        Path goMod = projectPath.resolve("go.mod");
        if (Files.exists(goMod)) {
            if (!techStack.get("languages").contains("Go")) {
                techStack.get("languages").add("Go");
            }
            techStack.get("tools").add("Go Modules");
        }

        // 检查 pom.xml (Java 项目)
        Path pomXml = projectPath.resolve("pom.xml");
        if (Files.exists(pomXml)) {
            if (!techStack.get("languages").contains("Java")) {
                techStack.get("languages").add("Java");
            }
            techStack.get("tools").add("Maven");
        }

        // 检查 build.gradle (Gradle 项目)
        Path buildGradle = projectPath.resolve("build.gradle");
        if (Files.exists(buildGradle)) {
            if (!techStack.get("languages").contains("Java") && !techStack.get("languages").contains("Kotlin")) {
                techStack.get("languages").add("Java");
            }
            techStack.get("tools").add("Gradle");
        }

        // 去重
        techStack.replaceAll((k, v) -> new ArrayList<>(new LinkedHashSet<>(v)));

        return techStack;
    }

    /**
     * 分析 package.json
     */
    private void analyzePackageJson(Path packageJson, Map<String, List<String>> techStack) {
        try {
            JsonNode root = objectMapper.readTree(packageJson.toFile());
            JsonNode dependencies = root.path("dependencies");
            JsonNode devDependencies = root.path("devDependencies");

            Set<String> allDeps = new HashSet<>();
            dependencies.fields().forEachRemaining(entry -> allDeps.add(entry.getKey().toLowerCase()));
            devDependencies.fields().forEachRemaining(entry -> allDeps.add(entry.getKey().toLowerCase()));

            // 检测语言
            if (allDeps.contains("typescript")) {
                techStack.get("languages").add("TypeScript");
            } else {
                techStack.get("languages").add("JavaScript");
            }

            // 检测框架
            if (allDeps.contains("react")) techStack.get("frameworks").add("React");
            if (allDeps.contains("vue")) techStack.get("frameworks").add("Vue");
            if (allDeps.contains("angular")) techStack.get("frameworks").add("Angular");
            if (allDeps.contains("next")) techStack.get("frameworks").add("Next.js");
            if (allDeps.contains("nuxt")) techStack.get("frameworks").add("Nuxt.js");
            if (allDeps.contains("express")) techStack.get("frameworks").add("Express");
            if (allDeps.contains("fastify")) techStack.get("frameworks").add("Fastify");
            if (allDeps.contains("koa")) techStack.get("frameworks").add("Koa");
            if (allDeps.contains("nestjs")) techStack.get("frameworks").add("NestJS");

            // 检测数据库
            if (allDeps.contains("pg") || allDeps.contains("postgres") || allDeps.contains("postgresql")) {
                techStack.get("databases").add("PostgreSQL");
            }
            if (allDeps.contains("mysql") || allDeps.contains("mysql2")) {
                techStack.get("databases").add("MySQL");
            }
            if (allDeps.contains("mongodb") || allDeps.contains("mongoose")) {
                techStack.get("databases").add("MongoDB");
            }
            if (allDeps.contains("redis")) {
                techStack.get("databases").add("Redis");
            }
            if (allDeps.contains("sqlite3")) {
                techStack.get("databases").add("SQLite");
            }

            // 检测工具
            if (allDeps.contains("webpack")) techStack.get("tools").add("Webpack");
            if (allDeps.contains("vite")) techStack.get("tools").add("Vite");
            if (allDeps.contains("rollup")) techStack.get("tools").add("Rollup");
            if (allDeps.contains("jest")) techStack.get("tools").add("Jest");
            if (allDeps.contains("mocha")) techStack.get("tools").add("Mocha");
            if (allDeps.contains("eslint")) techStack.get("tools").add("ESLint");
            if (allDeps.contains("prettier")) techStack.get("tools").add("Prettier");

        } catch (IOException e) {
            log.error("解析 package.json 失败: {}", e.getMessage());
        }
    }

    /**
     * 分析 requirements.txt
     */
    private void analyzeRequirementsTxt(Path requirementsTxt, Map<String, List<String>> techStack) {
        try {
            String content = Files.readString(requirementsTxt).toLowerCase();

            if (!techStack.get("languages").contains("Python")) {
                techStack.get("languages").add("Python");
            }

            if (content.contains("django")) techStack.get("frameworks").add("Django");
            if (content.contains("flask")) techStack.get("frameworks").add("Flask");
            if (content.contains("fastapi")) techStack.get("frameworks").add("FastAPI");

            if (content.contains("pymysql")) techStack.get("databases").add("MySQL");
            if (content.contains("psycopg2")) techStack.get("databases").add("PostgreSQL");
            if (content.contains("pymongo")) techStack.get("databases").add("MongoDB");

        } catch (IOException e) {
            log.error("解析 requirements.txt 失败: {}", e.getMessage());
        }
    }

    /**
     * 确定架构类型
     */
    private String determineArchitecture(Map<String, List<String>> techStack) {
        List<String> frameworks = techStack.get("frameworks");
        
        boolean hasFrontend = frameworks.contains("React") || frameworks.contains("Vue") || 
                             frameworks.contains("Angular") || frameworks.contains("Next.js") ||
                             frameworks.contains("Nuxt.js");
        boolean hasBackend = frameworks.contains("Express") || frameworks.contains("FastAPI") ||
                            frameworks.contains("Django") || frameworks.contains("Flask") ||
                            frameworks.contains("NestJS") || frameworks.contains("Fastify") ||
                            frameworks.contains("Koa") || frameworks.contains("Spring Boot");

        if (hasFrontend && hasBackend) {
            return "前后端分离架构";
        } else if (hasBackend) {
            return "服务端渲染架构";
        } else if (hasFrontend) {
            return "纯前端应用";
        }
        
        return "单体架构";
    }

    /**
     * 确定复杂度
     */
    private String determineComplexity(Map<String, List<String>> techStack) {
        int frameworkCount = techStack.get("frameworks").size();
        int databaseCount = techStack.get("databases").size();
        int toolCount = techStack.get("tools").size();

        if (frameworkCount >= 3 || databaseCount >= 2 || toolCount >= 5) {
            return "复杂";
        } else if (frameworkCount >= 1 || databaseCount >= 1 || toolCount >= 2) {
            return "中等";
        }
        
        return "简单";
    }
}
