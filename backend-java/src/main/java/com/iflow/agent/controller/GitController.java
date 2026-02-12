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

    // ========== 新增的 Git 操作 ==========

    /**
     * 从远程获取更新
     */
    @PostMapping("/fetch")
    public ResponseEntity<Map<String, Object>> fetch(@RequestParam(required = false) String project) {
        log.info("Fetching from remote: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            List<String> output = executeGitCommand(projectPath, "fetch");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Fetched from remote",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to fetch", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 拉取远程更改
     */
    @PostMapping("/pull")
    public ResponseEntity<Map<String, Object>> pull(@RequestParam(required = false) String project) {
        log.info("Pulling from remote: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            List<String> output = executeGitCommand(projectPath, "pull");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Pulled from remote",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to pull", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 推送到远程
     */
    @PostMapping("/push")
    public ResponseEntity<Map<String, Object>> push(
            @RequestParam(required = false) String project,
            @RequestBody(required = false) Map<String, String> request) {
        log.info("Pushing to remote: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            List<String> output;
            if (request != null && Boolean.TRUE.equals(Boolean.parseBoolean(request.get("force")))) {
                output = executeGitCommand(projectPath, "push", "--force");
            } else {
                output = executeGitCommand(projectPath, "push");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Pushed to remote",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to push", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 发布分支到远程
     */
    @PostMapping("/publish")
    public ResponseEntity<Map<String, Object>> publish(
            @RequestParam(required = false) String project,
            @RequestBody(required = false) Map<String, String> request) {
        String projectPath = resolveProjectPath(project);
        String branch = request != null ? request.get("branch") : null;

        if (branch == null || branch.isEmpty()) {
            branch = getCurrentBranch(projectPath);
        }

        log.info("Publishing branch {} to remote: {}", branch, project);

        try {
            List<String> output = executeGitCommand(projectPath, "push", "-u", "origin", branch);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Published branch to remote: " + branch,
                    "branch", branch,
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to publish", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 丢弃本地更改
     */
    @PostMapping("/discard")
    public ResponseEntity<Map<String, Object>> discard(
            @RequestParam(required = false) String project,
            @RequestBody(required = false) Map<String, String> request) {
        log.info("Discarding changes: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            String filePath = request != null ? request.get("file") : null;

            if (filePath != null && !filePath.isEmpty()) {
                // 丢弃单个文件
                executeGitCommand(projectPath, "checkout", "--", filePath);
            } else {
                // 丢弃所有更改
                executeGitCommand(projectPath, "checkout", "--", ".");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", filePath != null ? "Discarded changes for: " + filePath : "Discarded all changes"
            ));
        } catch (Exception e) {
            log.error("Failed to discard changes", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 删除未跟踪的文件
     */
    @PostMapping("/delete-untracked")
    public ResponseEntity<Map<String, Object>> deleteUntracked(
            @RequestParam(required = false) String project,
            @RequestBody(required = false) Map<String, Boolean> request) {
        log.info("Deleting untracked files: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            boolean includeIgnored = request != null && Boolean.TRUE.equals(request.get("includeIgnored"));

            List<String> output;
            if (includeIgnored) {
                output = executeGitCommand(projectPath, "clean", "-fdx");
            } else {
                output = executeGitCommand(projectPath, "clean", "-fd");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Deleted untracked files",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to delete untracked files", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * AI 生成提交信息
     */
    @PostMapping("/generate-commit-message")
    public ResponseEntity<Map<String, Object>> generateCommitMessage(@RequestParam(required = false) String project) {
        log.info("Generating commit message for: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            // 获取差异摘要
            List<String> statusOutput = executeGitCommand(projectPath, "status", "--short");
            List<String> diffOutput = executeGitCommand(projectPath, "diff", "--stat");

            // 简单的提交信息生成逻辑
            StringBuilder message = new StringBuilder();

            if (!statusOutput.isEmpty()) {
                int modified = 0, added = 0, deleted = 0;

                for (String line : statusOutput) {
                    if (line.length() >= 2) {
                        String status = line.substring(0, 2).trim();
                        if (status.contains("M")) modified++;
                        else if (status.contains("A") || status.contains("?")) added++;
                        else if (status.contains("D")) deleted++;
                    }
                }

                if (added > 0) message.append("添加 ").append(added).append(" 个文件");
                if (modified > 0) {
                    if (message.length() > 0) message.append(", ");
                    message.append("修改 ").append(modified).append(" 个文件");
                }
                if (deleted > 0) {
                    if (message.length() > 0) message.append(", ");
                    message.append("删除 ").append(deleted).append(" 个文件");
                }
            }

            if (message.length() == 0) {
                message.append("更新代码");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", message.toString()
            ));
        } catch (Exception e) {
            log.error("Failed to generate commit message", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "更新代码"  // 默认消息
            ));
        }
    }

    /**
     * 初始提交（用于新仓库）
     */
    @PostMapping("/initial-commit")
    public ResponseEntity<Map<String, Object>> initialCommit(@RequestParam(required = false) String project) {
        log.info("Creating initial commit for: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            // 检查是否已经有提交
            try {
                executeGitCommand(projectPath, "rev-parse", "HEAD");
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "error", "Repository already has commits"
                ));
            } catch (Exception e) {
                // 没有提交，继续
            }

            // 添加所有文件
            executeGitCommand(projectPath, "add", ".");

            // 创建初始提交
            List<String> output = executeGitCommand(projectPath, "commit", "-m", "Initial commit");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Initial commit created",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to create initial commit", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取提交差异
     */
    @GetMapping("/commit-diff")
    public ResponseEntity<Map<String, Object>> getCommitDiff(
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String hash) {
        log.info("Getting commit diff: project={}, hash={}", project, hash);
        String projectPath = resolveProjectPath(project);

        if (hash == null || hash.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "error", "Commit hash is required"
            ));
        }

        try {
            List<String> output = executeGitCommand(projectPath, "show", hash);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "diff", String.join("\n", output)
            ));
        } catch (Exception e) {
            log.error("Failed to get commit diff", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 暂存更改
     */
    @PostMapping("/stash")
    public ResponseEntity<Map<String, Object>> stash(
            @RequestParam(required = false) String project,
            @RequestBody(required = false) Map<String, String> request) {
        log.info("Stashing changes: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            String message = request != null ? request.get("message") : null;

            List<String> output;
            if (message != null && !message.isEmpty()) {
                output = executeGitCommand(projectPath, "stash", "push", "-m", message);
            } else {
                output = executeGitCommand(projectPath, "stash");
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Changes stashed",
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to stash", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 重置更改
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset(
            @RequestParam(required = false) String project,
            @RequestBody(required = false) Map<String, String> request) {
        log.info("Resetting changes: {}", project);
        String projectPath = resolveProjectPath(project);

        try {
            String mode = request != null ? request.get("mode") : "soft";

            List<String> output;
            switch (mode) {
                case "hard":
                    output = executeGitCommand(projectPath, "reset", "--hard");
                    break;
                case "mixed":
                    output = executeGitCommand(projectPath, "reset", "--mixed");
                    break;
                case "soft":
                default:
                    output = executeGitCommand(projectPath, "reset", "--soft");
                    break;
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Reset completed: " + mode,
                    "output", output
            ));
        } catch (Exception e) {
            log.error("Failed to reset", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
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
