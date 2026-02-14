package com.iflow.agent.controller;

import com.iflow.agent.service.ai.ApiKeyManager;
import com.iflow.agent.service.ai.TokenRefreshService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * iFlow OAuth2 登录控制器
 * 支持通过 iFlow 平台 OAuth2 授权获取 API Token
 */
@Slf4j
@RestController
@RequestMapping("/api/iflow/oauth")
@RequiredArgsConstructor
public class IFlowOAuthController {

    private final ApiKeyManager apiKeyManager;
    private final TokenRefreshService tokenRefreshService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${iflow.oauth.client-id:10009311001}")
    private String clientId;

    @Value("${iflow.oauth.client-secret:}")
    private String clientSecret;

    @Value("${iflow.oauth.authorization-uri:https://iflow.cn/oauth}")
    private String authorizationUri;

    @Value("${iflow.oauth.token-uri:https://iflow.cn/api/oauth/token}")
    private String tokenUri;

    @Value("${iflow.oauth.redirect-uri:http://localhost:8080/api/iflow/oauth/callback}")
    private String redirectUri;

    // 存储 state 防止 CSRF 攻击
    private final Map<String, Long> stateStore = new ConcurrentHashMap<>();

    /**
     * 获取 iFlow OAuth2 登录 URL
     * 前端调用此接口获取登录链接，然后跳转到 iFlow 登录页面
     */
    @GetMapping("/login-url")
    public ResponseEntity<Map<String, Object>> getLoginUrl() {
        log.info("生成 iFlow OAuth2 登录 URL");

        // 生成随机 state
        String state = UUID.randomUUID().toString();
        stateStore.put(state, System.currentTimeMillis());

        // 构建授权 URL
        String loginUrl = String.format(
            "%s?loginMethod=phone&type=phone&redirect=%s&state=%s&client_id=%s",
            authorizationUri,
            URLEncoder.encode(redirectUri, StandardCharsets.UTF_8),
            state,
            clientId
        );

        log.info("生成的登录 URL: {}", loginUrl);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "loginUrl", loginUrl,
            "state", state
        ));
    }

    /**
     * OAuth2 回调接口
     * iFlow 平台登录成功后会重定向到此接口
     */
    @GetMapping("/callback")
    public ResponseEntity<Map<String, Object>> oauthCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "error_description", required = false) String errorDescription) {

        log.info("收到 OAuth2 回调, code={}, state={}, error={}", code, state, error);

        // 检查错误
        if (error != null) {
            log.error("OAuth2 授权失败: {} - {}", error, errorDescription);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", error,
                "message", errorDescription != null ? errorDescription : "授权失败"
            ));
        }

        // 验证 state
        if (state == null || !stateStore.containsKey(state)) {
            log.error("无效的 state 参数");
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "invalid_state",
                "message", "无效的 state 参数，可能存在 CSRF 攻击"
            ));
        }

        // 检查 state 是否过期（5分钟）
        Long timestamp = stateStore.get(state);
        if (System.currentTimeMillis() - timestamp > 5 * 60 * 1000) {
            stateStore.remove(state);
            log.error("state 已过期");
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "state_expired",
                "message", "登录已过期，请重新尝试"
            ));
        }

        // 清除已使用的 state
        stateStore.remove(state);

        // 检查 code
        if (code == null || code.isEmpty()) {
            log.error("授权码为空");
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "missing_code",
                "message", "授权码为空"
            ));
        }

        // 使用 code 交换 access token
        return exchangeCodeForToken(code);
    }

    /**
     * 使用授权码交换 Token
     */
    private ResponseEntity<Map<String, Object>> exchangeCodeForToken(String code) {
        log.info("使用授权码交换 Token...");

        try {
            // 构建请求参数
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("grant_type", "authorization_code");
            params.add("code", code);
            params.add("client_id", clientId);
            params.add("client_secret", clientSecret);
            params.add("redirect_uri", redirectUri);

            // 构建请求头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(java.util.Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

            // 发送请求
            log.info("发送 Token 交换请求到: {}", tokenUri);
            ResponseEntity<String> response = restTemplate.postForEntity(tokenUri, request, String.class);

            log.info("Token 交换响应状态: {}", response.getStatusCode());
            log.info("Token 交换响应内容类型: {}", response.getHeaders().getContentType());
            log.debug("Token 交换响应内容: {}", response.getBody());

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String responseBody = response.getBody();

                // 检查响应是否是 HTML（错误页面）
                if (responseBody.trim().startsWith("<") || responseBody.trim().startsWith("<!DOCTYPE")) {
                    log.error("Token 交换返回 HTML 页面，可能是错误页面");
                    return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "error", "invalid_response_format",
                        "message", "iFlow 平台返回了 HTML 页面而非 JSON，请检查 client_id 和 client_secret 是否正确"
                    ));
                }

                // 手动解析 JSON
                Map<String, Object> tokenResponse = parseJsonResponse(responseBody);

                if (tokenResponse == null) {
                    log.error("无法解析 Token 响应");
                    return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "error", "parse_error",
                        "message", "无法解析 iFlow 平台的响应"
                    ));
                }

                log.info("Token 交换成功");

                // 获取 access_token
                String accessToken = (String) tokenResponse.get("access_token");
                String refreshToken = (String) tokenResponse.get("refresh_token");
                Integer expiresIn = null;
                if (tokenResponse.get("expires_in") instanceof Number) {
                    expiresIn = ((Number) tokenResponse.get("expires_in")).intValue();
                }

                if (accessToken == null || accessToken.isEmpty()) {
                    log.error("Token 响应中缺少 access_token");
                    return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "error", "invalid_token_response",
                        "message", "Token 响应格式错误，缺少 access_token"
                    ));
                }

                // 更新 API Key
                log.info("更新 API Key...");
                Map<String, Object> refreshResult = tokenRefreshService.refreshToken(accessToken);

                if (Boolean.TRUE.equals(refreshResult.get("success"))) {
                    log.info("iFlow OAuth2 登录成功，API Key 已更新");
                    return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "登录成功",
                        "expiresIn", expiresIn != null ? expiresIn : 0,
                        "hasRefreshToken", refreshToken != null
                    ));
                } else {
                    String errorMsg = (String) refreshResult.get("message");
                    log.error("Token 刷新失败: {}", errorMsg);
                    return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "error", "token_refresh_failed",
                        "message", errorMsg
                    ));
                }
            } else {
                log.error("Token 交换失败: HTTP {}", response.getStatusCode());
                return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "token_exchange_failed",
                    "message", "Token 交换失败: HTTP " + response.getStatusCode()
                ));
            }

        } catch (RestClientException e) {
            log.error("Token 交换请求失败: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "token_exchange_request_failed",
                "message", "Token 交换请求失败: " + e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Token 交换异常: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "token_exchange_error",
                "message", "Token 交换异常: " + e.getMessage()
            ));
        }
    }

    /**
     * 简单解析 JSON 响应
     */
    private Map<String, Object> parseJsonResponse(String json) {
        try {
            // 使用简单的字符串解析来处理基本 JSON
            Map<String, Object> result = new java.util.HashMap<>();

            // 移除首尾空格和大括号
            json = json.trim();
            if (json.startsWith("{") && json.endsWith("}")) {
                json = json.substring(1, json.length() - 1);
            }

            // 简单的键值对解析（仅处理字符串值）
            String[] pairs = json.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim().replace("\"", "");
                    String value = keyValue[1].trim();

                    // 处理字符串值
                    if (value.startsWith("\"") && value.endsWith("\"")) {
                        value = value.substring(1, value.length() - 1);
                        result.put(key, value);
                    }
                    // 处理数字值
                    else if (value.matches("-?\\d+")) {
                        result.put(key, Integer.parseInt(value));
                    }
                    // 处理布尔值
                    else if (value.equals("true") || value.equals("false")) {
                        result.put(key, Boolean.parseBoolean(value));
                    }
                }
            }

            return result;
        } catch (Exception e) {
            log.error("解析 JSON 失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 检查 OAuth 配置状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getOAuthStatus() {
        log.info("获取 OAuth 配置状态");

        boolean configured = clientId != null && !clientId.isEmpty();
        boolean hasClientSecret = clientSecret != null && !clientSecret.isEmpty();

        return ResponseEntity.ok(Map.of(
            "configured", configured,
            "hasClientSecret", hasClientSecret,
            "clientId", clientId != null ? clientId : "",
            "authorizationUri", authorizationUri,
            "redirectUri", redirectUri
        ));
    }

    /**
     * 手动设置 Token（备用方案）
     * 如果 OAuth2 流程有问题，可以手动设置 Token
     */
    @PostMapping("/manual-token")
    public ResponseEntity<Map<String, Object>> setManualToken(@RequestBody ManualTokenRequest request) {
        String token = request.getToken();
        log.info("手动设置 Token, token starts with: {}...",
            token != null ? token.substring(0, Math.min(8, token.length())) : "null");

        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Token 不能为空"
            ));
        }

        Map<String, Object> result = tokenRefreshService.refreshToken(token.trim());
        return ResponseEntity.ok(result);
    }

    @Data
    public static class ManualTokenRequest {
        private String token;
    }
}
