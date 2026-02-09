package com.iflow.agent.controller;

import com.iflow.agent.domain.project.entity.WorkspaceProject;
import com.iflow.agent.domain.project.repository.ProjectRepository;
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

    private final ProjectRepository projectRepository;

    /**
     * 获取 Git 状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(@RequestParam(required = false) String project) {
        log.info("Getting git status for: {}", project);
        String projectPath = resolveProjectPath(project);

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
    public ResponseEntity<Map<String, Object>> getBranches(@RequestParam(required = false) String project) {
        log.info("Getting git branches for: {}", project);
        String projectPath = resolveProjectPath(project);

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
            @RequestParam(required = false) String project,
            @RequestParam(defaultValue = "10") int limit) {
        log.info("Getting git commits for: {}", project);
        String projectPath = resolveProjectPath(project);

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
            @RequestParam(required = false) String project,
            @RequestBody Map<String, String> request) {
        String branch = request.get("branch");
        log.info("Checking out branch: {} in {}", branch, project);
        String projectPath = resolveProjectPath(project);

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
            @RequestParam(required = false) String project,
            @RequestBody Map<String, String> request) {
        String branch = request.get("branch");
        log.info("Creating branch: {} in {}", branch, project);
        String projectPath = resolveProjectPath(project);

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
            @RequestParam(required = false) String project,
            @RequestBody Map<String, String> request) {
        String message = request.get("message");
        log.info("Committing changes in {} with message: {}", project, message);
        String projectPath = resolveProjectPath(project);

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
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String filePath) {
        log.info("Getting git diff for: {}", project);
        String projectPath = resolveProjectPath(project);

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

    /**
     * 获取远程仓库状态
     */
    @GetMapping("/remote-status")
    public ResponseEntity<Map<String, Object>> getRemoteStatus(@RequestParam(required = false) String project) {
        log.info("Getting git remote status for: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            String branch = getCurrentBranch(projectPath);

            try {
                // 获取上游分支
                List<String> upstreamOutput = executeGitCommand(projectPath,
                        "rev-parse", "--abbrev-ref", branch + "@{upstream}");

                if (upstreamOutput.isEmpty()) {
                    return ResponseEntity.ok(Map.of(
                            "hasRemote", false,
                            "hasUpstream", false,
                            "branch", branch,
                            "message", "No remote tracking branch configured"
                    ));
                }

                String upstream = upstreamOutput.get(0);

                // 获取本地和远程的差异
                List<String> countsOutput = executeGitCommand(projectPath,
                        "rev-list", "--count", "--left-right", upstream + "...HEAD");

                String[] counts = countsOutput.get(0).split("\\s+");
                int behind = Integer.parseInt(counts[0]);
                int ahead = Integer.parseInt(counts[1]);

                String remoteName = "origin";
                if (upstream.contains("/")) {
                    remoteName = upstream.split("/")[0];
                }

                return ResponseEntity.ok(Map.of(
                        "hasRemote", true,
                        "hasUpstream", true,
                        "branch", branch,
                        "remoteBranch", upstream,
                        "remoteName", remoteName,
                        "ahead", ahead,
                        "behind", behind,
                        "isUpToDate", ahead == 0 && behind == 0
                ));
            } catch (Exception e) {
                return ResponseEntity.ok(Map.of(
                        "hasRemote", false,
                        "hasUpstream", false,
                        "branch", branch,
                        "message", "No remote tracking branch configured",
                        "error", e.getMessage()
                ));
            }
        } catch (Exception e) {
            log.error("Failed to get remote status", e);
            return ResponseEntity.ok(Map.of(
                    "error", "Failed to get remote status: " + e.getMessage()
            ));
        }
    }

    /**
     * 获取带差异的文件内容
     */
    @GetMapping("/file-with-diff")
    public ResponseEntity<Map<String, Object>> getFileWithDiff(
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String file) {
        log.info("Getting file with diff: project={}, file={}", project, file);
        String projectPath = resolveProjectPath(project);

        if (file == null || file.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "error", "File parameter is required"
            ));
        }

        try {
            // 读取当前文件内容
            String currentContent = "";
            try {
                java.nio.file.Path filePath = java.nio.file.Paths.get(projectPath, file);
                currentContent = java.nio.file.Files.readString(filePath);
            } catch (Exception e) {
                log.warn("Failed to read current file: {}", e.getMessage());
                // 文件可能已被删除，继续处理
            }

            // 获取 HEAD 版本的文件内容
            String oldContent = "";
            try {
                List<String> output = executeGitCommand(projectPath, "show", "HEAD:" + file);
                oldContent = String.join("\n", output);
            } catch (Exception e) {
                log.warn("Failed to get file at HEAD: {}", e.getMessage());
                // 文件可能是新文件，继续处理
            }

            return ResponseEntity.ok(Map.of(
                    "currentContent", currentContent,
                    "oldContent", oldContent
            ));
        } catch (Exception e) {
            log.error("Failed to get file with diff", e);
            return ResponseEntity.ok(Map.of(
                    "error", e.getMessage()
            ));
        }
    }

    // ========== 私有方法 ==========

    private List<String> executeGitCommand(String projectPath, String... args) throws Exception {
        List<String> command = new ArrayList<>();
        // 使用 git 命令的完整路径
        command.add("git");
        command.addAll(List.of(args));

        log.info("Executing git command in {}: {}", projectPath, String.join(" ", args));

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

        log.info("Git command succeeded, output lines: {}", output.size());
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

    /**
     * 将项目名称解析为项目路径
     * @param project 项目名称或路径
     * @return 项目路径
     */
    private String resolveProjectPath(String project) {
        // 如果 project 为空，使用当前工作目录
        if (project == null || project.isEmpty()) {
            String path = System.getProperty("user.dir");
            log.info("Resolved empty project to: {}", path);
            return path;
        }

        // 尝试按项目名称查找
        try {
            WorkspaceProject proj = projectRepository.findByName(project).orElse(null);
            if (proj != null && proj.getPath() != null) {
                log.info("Resolved project '{}' to path: {}", project, proj.getPath());
                return proj.getPath();
            }
        } catch (Exception e) {
            log.warn("Failed to resolve project by name: {}, error: {}", project, e.getMessage());
        }

        // 如果是绝对路径，直接返回
        File file = new File(project);
        if (file.isAbsolute()) {
            log.info("Resolved absolute path: {}", project);
            return project;
        }

        // 否则使用当前工作目录
        String path = System.getProperty("user.dir");
        log.info("Resolved project '{}' to default path: {}", project, path);
        return path;
    }
}
