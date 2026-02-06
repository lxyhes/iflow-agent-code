package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Git API - 对应 Python 的 git.py
 */
@Slf4j
@RestController
@RequestMapping("/api/git")
@RequiredArgsConstructor
public class GitController {

    /**
     * 获取 Git 状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(@RequestParam(required = false) String projectPath) {
        log.info("Getting git status for: {}", projectPath);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            List<String> output = executeGitCommand(projectPath, "status", "--porcelain");
            List<Map<String, String>> changes = new ArrayList<>();

            for (String line : output) {
                if (line.length() >= 2) {
                    String status = line.substring(0, 2).trim();
                    String file = line.substring(3).trim();
                    changes.add(Map.of(
                            "status", status,
                            "file", file
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "changes", changes,
                    "branch", getCurrentBranch(projectPath)
            ));
        } catch (Exception e) {
            log.error("Failed to get git status", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取所有分支
     */
    @GetMapping("/branches")
    public ResponseEntity<Map<String, Object>> getBranches(@RequestParam(required = false) String projectPath) {
        log.info("Getting git branches for: {}", projectPath);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            List<String> output = executeGitCommand(projectPath, "branch", "-a");
            List<Map<String, Object>> branches = new ArrayList<>();

            String currentBranch = getCurrentBranch(projectPath);

            for (String line : output) {
                if (line.trim().isEmpty()) continue;

                boolean isCurrent = line.startsWith("*");
                String name = line.replace("*", "").trim();

                branches.add(Map.of(
                        "name", name,
                        "current", isCurrent,
                        "remote", name.startsWith("remotes/")
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "branches", branches,
                    "current", currentBranch
            ));
        } catch (Exception e) {
            log.error("Failed to get git branches", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取提交历史
     */
    @GetMapping("/commits")
    public ResponseEntity<Map<String, Object>> getCommits(
            @RequestParam(required = false) String projectPath,
            @RequestParam(defaultValue = "10") int limit) {
        log.info("Getting git commits for: {}", projectPath);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            List<String> output = executeGitCommand(projectPath,
                    "log", "--pretty=format:%H|%an|%ae|%ad|%s", "--date=short", "-" + limit);

            List<Map<String, String>> commits = new ArrayList<>();

            for (String line : output) {
                String[] parts = line.split("\\|", 5);
                if (parts.length >= 5) {
                    commits.add(Map.of(
                            "hash", parts[0],
                            "author", parts[1],
                            "email", parts[2],
                            "date", parts[3],
                            "message", parts[4]
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "commits", commits
            ));
        } catch (Exception e) {
            log.error("Failed to get git commits", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 切换分支
     */
    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(
            @RequestParam(required = false) String projectPath,
            @RequestBody Map<String, String> request) {
        String branch = request.get("branch");
        log.info("Checking out branch: {} in {}", branch, projectPath);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            List<String> output = executeGitCommand(projectPath, "checkout", branch);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Switched to branch: " + branch,
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to checkout branch", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 创建新分支
     */
    @PostMapping("/create-branch")
    public ResponseEntity<Map<String, Object>> createBranch(
            @RequestParam(required = false) String projectPath,
            @RequestBody Map<String, String> request) {
        String branch = request.get("branch");
        log.info("Creating branch: {} in {}", branch, projectPath);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            List<String> output = executeGitCommand(projectPath, "checkout", "-b", branch);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Created and switched to branch: " + branch,
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to create branch", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 提交更改
     */
    @PostMapping("/commit")
    public ResponseEntity<Map<String, Object>> commit(
            @RequestParam(required = false) String projectPath,
            @RequestBody Map<String, String> request) {
        String message = request.get("message");
        log.info("Committing changes in {} with message: {}", projectPath, message);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            // 先添加所有更改
            executeGitCommand(projectPath, "add", ".");

            // 提交
            List<String> output = executeGitCommand(projectPath, "commit", "-m", message);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Changes committed",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to commit", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取文件差异
     */
    @GetMapping("/diff")
    public ResponseEntity<Map<String, Object>> getDiff(
            @RequestParam(required = false) String projectPath,
            @RequestParam(required = false) String filePath) {
        log.info("Getting git diff for: {}", projectPath);

        // 如果 projectPath 为空，使用当前工作目录
        if (projectPath == null || projectPath.isEmpty()) {
            projectPath = System.getProperty("user.dir");
        }

        try {
            List<String> output;
            if (filePath != null && !filePath.isEmpty()) {
                output = executeGitCommand(projectPath, "diff", filePath);
            } else {
                output = executeGitCommand(projectPath, "diff");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "diff", String.join("\n", output)
            ));
        } catch (Exception e) {
            log.error("Failed to get git diff", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ========== 私有方法 ==========

    private List<String> executeGitCommand(String projectPath, String... args) throws Exception {
        List<String> command = new ArrayList<>();
        command.add("git");
        command.addAll(List.of(args));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(new File(projectPath));
        pb.redirectErrorStream(true);

        Process process = pb.start();

        List<String> output = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.add(line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("Git command failed with exit code: " + exitCode);
        }

        return output;
    }

    private String getCurrentBranch(String projectPath) {
        try {
            List<String> output = executeGitCommand(projectPath, "branch", "--show-current");
            return output.isEmpty() ? "unknown" : output.get(0).trim();
        } catch (Exception e) {
            return "unknown";
        }
    }
}
