package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 设置 API
 * 管理 API 密钥和凭据
 */
@Slf4j
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    // 内存中存储 API 密钥（生产环境应使用数据库）
    private final Map<Long, Map<String, Object>> apiKeysStore = new HashMap<>();
    private final Map<Long, Map<String, Object>> credentialsStore = new HashMap<>();
    private Long apiKeyIdCounter = 1L;
    private Long credentialIdCounter = 1L;

    // ========== API 密钥管理 ==========

    /**
     * 获取 API 密钥列表
     * GET /api/settings/api-keys
     */
    @GetMapping("/api-keys")
    public ResponseEntity<Map<String, Object>> getApiKeys() {
        log.info("获取 API 密钥列表");

        List<Map<String, Object>> keys = new ArrayList<>();
        apiKeysStore.forEach((id, key) -> {
            Map<String, Object> keyCopy = new HashMap<>(key);
            // 隐藏密钥值
            if (keyCopy.containsKey("key")) {
                String keyValue = (String) keyCopy.get("key");
                keyCopy.put("keyPreview", keyValue.substring(0, Math.min(8, keyValue.length())) + "...");
                keyCopy.remove("key");
            }
            keys.add(keyCopy);
        });

        return ResponseEntity.ok(Map.of(
                "success", true,
                "keys", keys
        ));
    }

    /**
     * 添加 API 密钥
     * POST /api/settings/api-keys
     */
    @PostMapping("/api-keys")
    public ResponseEntity<Map<String, Object>> addApiKey(@RequestBody Map<String, Object> request) {
        String name = (String) request.get("name");
        String key = (String) request.get("key");
        String provider = (String) request.getOrDefault("provider", "custom");

        log.info("添加 API 密钥: {}", name);

        if (name == null || name.isEmpty() || key == null || key.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "名称和密钥不能为空"
            ));
        }

        Long id = apiKeyIdCounter++;
        Map<String, Object> apiKey = new HashMap<>();
        apiKey.put("id", id);
        apiKey.put("name", name);
        apiKey.put("key", key);
        apiKey.put("provider", provider);
        apiKey.put("enabled", true);
        apiKey.put("createdAt", new Date());

        apiKeysStore.put(id, apiKey);

        // 返回时隐藏密钥
        Map<String, Object> response = new HashMap<>(apiKey);
        response.put("keyPreview", key.substring(0, Math.min(8, key.length())) + "...");
        response.remove("key");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "key", response
        ));
    }

    /**
     * 删除 API 密钥
     * DELETE /api/settings/api-keys/{keyId}
     */
    @DeleteMapping("/api-keys/{keyId}")
    public ResponseEntity<Map<String, Object>> deleteApiKey(@PathVariable Long keyId) {
        log.info("删除 API 密钥: {}", keyId);

        if (apiKeysStore.remove(keyId) != null) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "API 密钥已删除"
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "API 密钥不存在"
            ));
        }
    }

    /**
     * 切换 API 密钥状态
     * POST /api/settings/api-keys/{keyId}/toggle
     */
    @PostMapping("/api-keys/{keyId}/toggle")
    public ResponseEntity<Map<String, Object>> toggleApiKey(@PathVariable Long keyId) {
        log.info("切换 API 密钥状态: {}", keyId);

        Map<String, Object> apiKey = apiKeysStore.get(keyId);
        if (apiKey == null) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "API 密钥不存在"
            ));
        }

        boolean enabled = !(Boolean) apiKey.getOrDefault("enabled", true);
        apiKey.put("enabled", enabled);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "enabled", enabled
        ));
    }

    // ========== 凭据管理 ==========

    /**
     * 获取凭据列表
     * GET /api/settings/credentials
     */
    @GetMapping("/credentials")
    public ResponseEntity<Map<String, Object>> getCredentials(
            @RequestParam(required = false) String type) {
        log.info("获取凭据列表, type={}", type);

        List<Map<String, Object>> credentials = new ArrayList<>();
        credentialsStore.forEach((id, cred) -> {
            if (type == null || type.isEmpty() || type.equals(cred.get("type"))) {
                Map<String, Object> credCopy = new HashMap<>(cred);
                // 隐藏令牌值
                if (credCopy.containsKey("token")) {
                    String tokenValue = (String) credCopy.get("token");
                    credCopy.put("tokenPreview", tokenValue.substring(0, Math.min(8, tokenValue.length())) + "...");
                    credCopy.remove("token");
                }
                credentials.add(credCopy);
            }
        });

        return ResponseEntity.ok(Map.of(
                "success", true,
                "credentials", credentials
        ));
    }

    /**
     * 添加凭据
     * POST /api/settings/credentials
     */
    @PostMapping("/credentials")
    public ResponseEntity<Map<String, Object>> addCredential(@RequestBody Map<String, Object> request) {
        String name = (String) request.get("name");
        String token = (String) request.get("token");
        String type = (String) request.getOrDefault("type", "github_token");

        log.info("添加凭据: {}, type={}", name, type);

        if (name == null || name.isEmpty() || token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "名称和令牌不能为空"
            ));
        }

        Long id = credentialIdCounter++;
        Map<String, Object> credential = new HashMap<>();
        credential.put("id", id);
        credential.put("name", name);
        credential.put("token", token);
        credential.put("type", type);
        credential.put("enabled", true);
        credential.put("createdAt", new Date());

        credentialsStore.put(id, credential);

        // 返回时隐藏令牌
        Map<String, Object> response = new HashMap<>(credential);
        response.put("tokenPreview", token.substring(0, Math.min(8, token.length())) + "...");
        response.remove("token");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "credential", response
        ));
    }

    /**
     * 删除凭据
     * DELETE /api/settings/credentials/{credentialId}
     */
    @DeleteMapping("/credentials/{credentialId}")
    public ResponseEntity<Map<String, Object>> deleteCredential(@PathVariable Long credentialId) {
        log.info("删除凭据: {}", credentialId);

        if (credentialsStore.remove(credentialId) != null) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "凭据已删除"
            ));
        } else {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "凭据不存在"
            ));
        }
    }

    /**
     * 切换凭据状态
     * POST /api/settings/credentials/{credentialId}/toggle
     */
    @PostMapping("/credentials/{credentialId}/toggle")
    public ResponseEntity<Map<String, Object>> toggleCredential(@PathVariable Long credentialId) {
        log.info("切换凭据状态: {}", credentialId);

        Map<String, Object> credential = credentialsStore.get(credentialId);
        if (credential == null) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "凭据不存在"
            ));
        }

        boolean enabled = !(Boolean) credential.getOrDefault("enabled", true);
        credential.put("enabled", enabled);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "enabled", enabled
        ));
    }
}
