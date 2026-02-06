package com.iflow.agent.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Configuration
@Getter
public class CacheConfig {

    @Value("${cache.base-dir:E:/cache/agent_project}")
    private String baseDir;

    private Path storagePath;
    private Path chromaDbPath;
    private Path ragTempPath;
    private Path ocrCachePath;
    private Path llmMemoryPath;
    private Path workflowsPath;
    private Path solutionsPath;
    private Path businessMemoryPath;
    private Path promptsPath;
    private Path commandShortcutsPath;
    private Path snippetsPath;
    private Path backupsPath;
    private Path databasePath;
    private Path businessFlowPath;

    @PostConstruct
    public void init() {
        Path base = Paths.get(baseDir);

        storagePath = base.resolve("storage");
        chromaDbPath = base.resolve("chroma_db");
        ragTempPath = base.resolve("rag_temp");
        ocrCachePath = base.resolve("ocr_cache");
        llmMemoryPath = base.resolve("llm_memory");
        workflowsPath = base.resolve("workflows");
        solutionsPath = base.resolve("solutions");
        businessMemoryPath = base.resolve("business_memory");
        promptsPath = base.resolve("prompts");
        commandShortcutsPath = base.resolve("command_shortcuts");
        snippetsPath = base.resolve("snippets");
        backupsPath = base.resolve("backups");
        databasePath = base.resolve("database");
        businessFlowPath = base.resolve("business_flow");

        createDirectories();
    }

    private void createDirectories() {
        try {
            Files.createDirectories(storagePath);
            Files.createDirectories(chromaDbPath);
            Files.createDirectories(ragTempPath);
            Files.createDirectories(ocrCachePath);
            Files.createDirectories(llmMemoryPath);
            Files.createDirectories(workflowsPath);
            Files.createDirectories(solutionsPath);
            Files.createDirectories(businessMemoryPath);
            Files.createDirectories(promptsPath);
            Files.createDirectories(commandShortcutsPath);
            Files.createDirectories(snippetsPath);
            Files.createDirectories(backupsPath);
            Files.createDirectories(databasePath);
            Files.createDirectories(businessFlowPath);

            log.info("Cache directories initialized at: {}", baseDir);
        } catch (Exception e) {
            log.error("Failed to create cache directories", e);
            throw new RuntimeException("Failed to initialize cache directories", e);
        }
    }

    public Path getCacheDir(String name) {
        return switch (name) {
            case "storage" -> storagePath;
            case "chroma_db" -> chromaDbPath;
            case "rag_temp" -> ragTempPath;
            case "ocr_cache" -> ocrCachePath;
            case "llm_memory" -> llmMemoryPath;
            case "workflows" -> workflowsPath;
            case "solutions" -> solutionsPath;
            case "business_memory" -> businessMemoryPath;
            case "prompts" -> promptsPath;
            case "command_shortcuts" -> commandShortcutsPath;
            case "snippets" -> snippetsPath;
            case "backups" -> backupsPath;
            case "database" -> databasePath;
            case "business_flow" -> businessFlowPath;
            default -> throw new IllegalArgumentException("Unknown cache directory: " + name);
        };
    }
}
