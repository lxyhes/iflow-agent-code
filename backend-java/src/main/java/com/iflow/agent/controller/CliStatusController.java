package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.*;

/**
 * CLI 状态检查 API
 */
@Slf4j
@RestController
@RequestMapping("/api/cli")
@RequiredArgsConstructor
public class CliStatusController {

    /**
     * 获取 Claude CLI 状态
     * GET /api/cli/claude/status
     */
    @GetMapping("/claude/status")
    public ResponseEntity<Map<String, Object>> getClaudeStatus() {
        log.info("检查 Claude CLI 状态");

        boolean installed = checkCliInstalled("claude");
        String version = installed ? getCliVersion("claude --version") : null;

        return ResponseEntity.ok(Map.of(
                "success", true,
                "installed", installed,
                "version", version != null ? version : "未安装",
                "name", "Claude CLI",
                "description", "Anthropic Claude 命令行工具"
        ));
    }

    /**
     * 获取 Cursor CLI 状态
     * GET /api/cli/cursor/status
     */
    @GetMapping("/cursor/status")
    public ResponseEntity<Map<String, Object>> getCursorStatus() {
        log.info("检查 Cursor CLI 状态");

        boolean installed = checkCliInstalled("cursor");
        String version = installed ? getCliVersion("cursor --version") : null;

        return ResponseEntity.ok(Map.of(
                "success", true,
                "installed", installed,
                "version", version != null ? version : "未安装",
                "name", "Cursor CLI",
                "description", "Cursor AI 编辑器命令行工具"
        ));
    }

    /**
     * 获取 iFlow CLI 状态
     * GET /api/cli/iflow/status
     */
    @GetMapping("/iflow/status")
    public ResponseEntity<Map<String, Object>> getIFlowStatus() {
        log.info("检查 iFlow CLI 状态");

        boolean installed = checkCliInstalled("iflow");
        String version = installed ? getCliVersion("iflow --version") : null;

        return ResponseEntity.ok(Map.of(
                "success", true,
                "installed", installed,
                "version", version != null ? version : "未安装",
                "name", "iFlow CLI",
                "description", "AI 工作台命令行工具"
        ));
    }

    // ========== 内部方法 ==========

    private boolean checkCliInstalled(String cliName) {
        try {
            ProcessBuilder pb = new ProcessBuilder("which", cliName);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                return line != null && !line.isEmpty();
            }
        } catch (Exception e) {
            log.debug("CLI {} 未安装或检查失败: {}", cliName, e.getMessage());
            return false;
        }
    }

    private String getCliVersion(String command) {
        try {
            String[] parts = command.split(" ");
            ProcessBuilder pb = new ProcessBuilder(parts);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null) {
                    // 提取版本号
                    return line.trim();
                }
            }
        } catch (Exception e) {
            log.debug("获取 CLI 版本失败: {}", e.getMessage());
        }
        return null;
    }
}
