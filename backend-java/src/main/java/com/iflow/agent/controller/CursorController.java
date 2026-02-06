package com.iflow.agent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cursor CLI API
 */
@Slf4j
@RestController
@RequestMapping("/api/cursor")
public class CursorController {

    /**
     * 获取 Cursor 会话列表
     */
    @GetMapping("/sessions")
    public ResponseEntity<Map<String, Object>> getSessions(@RequestParam(required = false) String projectPath) {
        log.info("获取 Cursor 会话: {}", projectPath);

        try {
            // 如果没有提供 projectPath，使用当前工作目录
            if (projectPath == null || projectPath.isEmpty()) {
                projectPath = System.getProperty("user.dir");
            }

            // 计算 cwdID (MD5 hash)
            String cwdId = md5Hash(projectPath);

            // Cursor chats 路径
            String cursorChatsPath = System.getProperty("user.home") + "/.cursor/chats/" + cwdId;
            File cursorChatsDir = new File(cursorChatsPath);

            if (!cursorChatsDir.exists() || !cursorChatsDir.isDirectory()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "sessions", List.of(),
                        "cwdId", cwdId,
                        "path", cursorChatsPath
                ));
            }

            List<Map<String, Object>> sessions = new ArrayList<>();
            File[] sessionDirs = cursorChatsDir.listFiles(File::isDirectory);

            if (sessionDirs != null) {
                for (File sessionDir : sessionDirs) {
                    String sessionId = sessionDir.getName();
                    Map<String, Object> sessionData = new HashMap<>();
                    sessionData.put("id", sessionId);
                    sessionData.put("cwdId", cwdId);

                    // 尝试读取 store.db 获取更多信息
                    File storeDb = new File(sessionDir, "store.db");
                    if (storeDb.exists()) {
                        sessionData.put("hasStoreDb", true);
                        sessionData.put("createdAt", new java.util.Date(storeDb.lastModified()).toInstant().toString());
                    } else {
                        sessionData.put("hasStoreDb", false);
                        sessionData.put("createdAt", new java.util.Date(sessionDir.lastModified()).toInstant().toString());
                    }

                    sessions.add(sessionData);
                }
            }

            // 按创建时间排序（最新的在前）
            sessions.sort((a, b) -> {
                String aTime = (String) a.get("createdAt");
                String bTime = (String) b.get("createdAt");
                if (aTime == null) return 1;
                if (bTime == null) return -1;
                return bTime.compareTo(aTime);
            });

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "sessions", sessions,
                    "cwdId", cwdId,
                    "path", cursorChatsPath
            ));

        } catch (Exception e) {
            log.error("获取 Cursor 会话失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to read Cursor sessions",
                    "details", e.getMessage()
            ));
        }
    }

    /**
     * 获取 Cursor 配置
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        log.info("获取 Cursor 配置");

        String configPath = System.getProperty("user.home") + "/.cursor/cli-config.json";
        File configFile = new File(configPath);

        try {
            if (configFile.exists()) {
                String content = Files.readString(Paths.get(configPath));
                // 简单解析 JSON，实际应该使用 Jackson
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "config", content,
                        "path", configPath
                ));
            } else {
                // 返回默认配置
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "config", Map.of(
                                "version", 1,
                                "model", Map.of(
                                        "modelId", "gpt-5",
                                        "displayName", "GPT-5"
                                ),
                                "permissions", Map.of(
                                        "allow", List.of(),
                                        "deny", List.of()
                                )
                        ),
                        "isDefault", true
                ));
            }
        } catch (IOException e) {
            log.error("读取 Cursor 配置失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to read Cursor configuration",
                    "details", e.getMessage()
            ));
        }
    }

    /**
     * MD5 哈希
     */
    private String md5Hash(String input) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(input.getBytes());
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
