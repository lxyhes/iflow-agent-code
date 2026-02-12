package com.iflow.agent.controller;

import com.iflow.agent.entity.User;
import com.iflow.agent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * 用户设置 API
 */
@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final AuthController authController;

    /**
     * 获取用户 Git 配置
     */
    @GetMapping("/git-config")
    public ResponseEntity<Map<String, Object>> getGitConfig(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        User user = getCurrentUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "未登录"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "gitName", user.getGitName() != null ? user.getGitName() : "",
                "gitEmail", user.getGitEmail() != null ? user.getGitEmail() : ""
        ));
    }

    /**
     * 更新用户 Git 配置
     */
    @PostMapping("/git-config")
    public ResponseEntity<Map<String, Object>> updateGitConfig(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody GitConfigRequest request) {
        
        User user = getCurrentUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "未登录"
            ));
        }

        user.setGitName(request.getGitName());
        user.setGitEmail(request.getGitEmail());
        userRepository.save(user);

        log.info("用户 {} 更新 Git 配置: {} <{}>", user.getUsername(), request.getGitName(), request.getGitEmail());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Git 配置已更新",
                "gitName", request.getGitName(),
                "gitEmail", request.getGitEmail()
        ));
    }

    /**
     * 获取用户入门引导状态
     */
    @GetMapping("/onboarding-status")
    public ResponseEntity<Map<String, Object>> getOnboardingStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        User user = getCurrentUser(authHeader);
        if (user == null) {
            // 未登录用户，返回默认状态
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "completed", false,
                    "steps", Map.of(
                            "welcome", false,
                            "project", false,
                            "chat", false
                    )
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "completed", user.getOnboardingCompleted() != null ? user.getOnboardingCompleted() : false,
                "steps", Map.of(
                        "welcome", true,
                        "project", true,
                        "chat", user.getOnboardingCompleted() != null ? user.getOnboardingCompleted() : false
                )
        ));
    }

    /**
     * 完成入门引导
     */
    @PostMapping("/complete-onboarding")
    public ResponseEntity<Map<String, Object>> completeOnboarding(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        User user = getCurrentUser(authHeader);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "未登录"
            ));
        }

        user.setOnboardingCompleted(true);
        userRepository.save(user);

        log.info("用户 {} 完成入门引导", user.getUsername());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "入门引导已完成"
        ));
    }

    /**
     * 从 token 获取当前用户
     */
    private User getCurrentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authHeader.substring(7);
        Long userId = authController.getTokenStore().get(token);

        if (userId == null) {
            return null;
        }

        Optional<User> userOpt = userRepository.findById(userId);
        return userOpt.orElse(null);
    }

    // DTO
    @lombok.Data
    public static class GitConfigRequest {
        private String gitName;
        private String gitEmail;
    }
}
