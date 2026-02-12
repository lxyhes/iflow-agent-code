package com.iflow.agent.controller;

import com.iflow.agent.entity.User;
import com.iflow.agent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 认证 API
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // 简单的 token 存储（生产环境应使用 Redis 或 JWT）
    private final Map<String, Long> tokenStore = new HashMap<>();

    /**
     * 获取 token 存储（供其他控制器使用）
     */
    public Map<String, Long> getTokenStore() {
        return tokenStore;
    }

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        log.info("用户登录请求: {}", request.getUsername());

        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "用户名或密码错误"
            ));
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "用户名或密码错误"
            ));
        }

        // 生成 token
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, user.getId());

        log.info("用户登录成功: {}", user.getUsername());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername(),
                        "email", user.getEmail() != null ? user.getEmail() : "",
                        "role", user.getRole() != null ? user.getRole() : "user",
                        "avatar", user.getAvatar() != null ? user.getAvatar() : ""
                )
        ));
    }

    /**
     * 用户注册
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        log.info("用户注册请求: {}", request.getUsername());

        // 检查用户名是否已存在
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "用户名已存在"
            ));
        }

        // 检查邮箱是否已存在
        if (request.getEmail() != null && !request.getEmail().isEmpty() 
                && userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "邮箱已被使用"
            ));
        }

        // 创建新用户
        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .displayName(request.getUsername())
                .role("user")
                .onboardingCompleted(false)
                .build();

        user = userRepository.save(user);

        // 生成 token
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, user.getId());

        log.info("用户注册成功: {}", user.getUsername());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "token", token,
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "displayName", user.getDisplayName(),
                        "email", user.getEmail() != null ? user.getEmail() : "",
                        "role", user.getRole(),
                        "avatar", ""
                )
        ));
    }

    /**
     * 用户登出
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.info("用户登出请求");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenStore.remove(token);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "登出成功"
        ));
    }

    /**
     * 获取当前用户信息
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "未登录"
            ));
        }

        String token = authHeader.substring(7);
        Long userId = tokenStore.get(token);

        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "Token 无效或已过期"
            ));
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "error", "用户不存在"
            ));
        }

        User user = userOpt.get();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername(),
                        "email", user.getEmail() != null ? user.getEmail() : "",
                        "role", user.getRole() != null ? user.getRole() : "user",
                        "avatar", user.getAvatar() != null ? user.getAvatar() : "",
                        "gitName", user.getGitName() != null ? user.getGitName() : "",
                        "gitEmail", user.getGitEmail() != null ? user.getGitEmail() : "",
                        "onboardingCompleted", user.getOnboardingCompleted() != null ? user.getOnboardingCompleted() : false
                )
        ));
    }

    /**
     * 获取认证状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAuthStatus(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        boolean authenticated = false;
        Map<String, Object> userData = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Long userId = tokenStore.get(token);

            if (userId != null) {
                Optional<User> userOpt = userRepository.findById(userId);
                if (userOpt.isPresent()) {
                    authenticated = true;
                    User user = userOpt.get();
                    userData = Map.of(
                            "id", user.getId(),
                            "username", user.getUsername(),
                            "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername(),
                            "role", user.getRole() != null ? user.getRole() : "user"
                    );
                }
            }
        }

        // 如果没有认证，返回默认系统用户
        if (!authenticated) {
            return ResponseEntity.ok(Map.of(
                    "authenticated", true,
                    "user", Map.of(
                            "id", "system",
                            "name", "System User",
                            "role", "admin"
                    ),
                    "timestamp", System.currentTimeMillis()
            ));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", authenticated);
        response.put("user", userData);
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    // DTO classes
    @lombok.Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @lombok.Data
    public static class RegisterRequest {
        private String username;
        private String password;
        private String email;
    }
}
