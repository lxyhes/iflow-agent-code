package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * GitHub 集成 API
 */
@Slf4j
@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GitHubController {

    /**
     * 获取 GitHub 用户信息
     * GET /api/github/user
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getGithubUser(
            @RequestParam(required = false) String token) {
        log.info("获取 GitHub 用户信息");

        if (token == null || token.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "未提供 GitHub Token"
            ));
        }

        // 模拟返回用户信息（实际需要调用 GitHub API）
        return ResponseEntity.ok(Map.of(
                "success", true,
                "user", Map.of(
                        "login", "example-user",
                        "name", "Example User",
                        "email", "user@example.com",
                        "avatar_url", "https://github.com/images/error/octocat_happy.gif",
                        "public_repos", 10,
                        "followers", 100
                )
        ));
    }

    /**
     * 获取仓库列表
     * GET /api/github/repos
     */
    @GetMapping("/repos")
    public ResponseEntity<Map<String, Object>> getRepos(
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String owner) {
        log.info("获取 GitHub 仓库列表");

        // 模拟返回仓库列表
        List<Map<String, Object>> repos = new ArrayList<>();
        repos.add(Map.of(
                "id", 1,
                "name", "example-repo",
                "full_name", "owner/example-repo",
                "description", "示例仓库",
                "html_url", "https://github.com/owner/example-repo",
                "stargazers_count", 100,
                "forks_count", 20,
                "language", "Java"
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "repos", repos
        ));
    }

    /**
     * 获取 Pull Request 列表
     * GET /api/github/pulls
     */
    @GetMapping("/pulls")
    public ResponseEntity<Map<String, Object>> getPullRequests(
            @RequestParam(required = false) String token,
            @RequestParam String owner,
            @RequestParam String repo) {
        log.info("获取 GitHub PR 列表: {}/{}", owner, repo);

        // 模拟返回 PR 列表
        List<Map<String, Object>> prs = new ArrayList<>();
        prs.add(Map.of(
                "id", 1,
                "number", 42,
                "title", "示例 Pull Request",
                "state", "open",
                "user", Map.of("login", "contributor"),
                "html_url", "https://github.com/" + owner + "/" + repo + "/pull/42"
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "pulls", prs
        ));
    }

    /**
     * 获取 Issue 列表
     * GET /api/github/issues
     */
    @GetMapping("/issues")
    public ResponseEntity<Map<String, Object>> getIssues(
            @RequestParam(required = false) String token,
            @RequestParam String owner,
            @RequestParam String repo) {
        log.info("获取 GitHub Issue 列表: {}/{}", owner, repo);

        // 模拟返回 Issue 列表
        List<Map<String, Object>> issues = new ArrayList<>();
        issues.add(Map.of(
                "id", 1,
                "number", 1,
                "title", "示例 Issue",
                "state", "open",
                "user", Map.of("login", "reporter"),
                "html_url", "https://github.com/" + owner + "/" + repo + "/issues/1"
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "issues", issues
        ));
    }

    /**
     * 代码审查
     * POST /api/github/review
     */
    @PostMapping("/review")
    public ResponseEntity<Map<String, Object>> reviewCode(
            @RequestBody Map<String, Object> request) {
        log.info("GitHub 代码审查");

        String code = (String) request.get("code");
        String language = (String) request.getOrDefault("language", "java");

        // 模拟代码审查结果
        return ResponseEntity.ok(Map.of(
                "success", true,
                "review", Map.of(
                        "score", 85,
                        "issues", List.of(
                                Map.of("type", "warning", "message", "建议添加单元测试", "line", 10),
                                Map.of("type", "info", "message", "代码结构良好", "line", null)
                        ),
                        "suggestions", List.of(
                                "考虑使用设计模式优化代码结构",
                                "添加更多的错误处理"
                        )
                )
        ));
    }
}
