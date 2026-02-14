package com.iflow.agent.service.ai;

import com.iflow.agent.config.ModelConfig;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Token 健康监控服务
 * 定期检测 Token 状态，提供过期预警
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenHealthMonitor {

    private final IFlowService iFlowService;
    private final ApiKeyManager apiKeyManager;
    private final ModelConfig modelConfig;

    private final AtomicReference<TokenStatus> lastStatus = new AtomicReference<>(
            TokenStatus.builder()
                    .status("unknown")
                    .valid(false)
                    .message("未检测")
                    .lastCheckTime(LocalDateTime.now())
                    .build()
    );

    /**
     * 定时检测 Token 状态（每 30 分钟）
     */
    @Scheduled(fixedRate = 30 * 60 * 1000, initialDelay = 5 * 60 * 1000)
    public void checkTokenHealth() {
        log.info("开始定时检测 Token 健康状态...");
        TokenStatus status = checkTokenStatus();
        lastStatus.set(status);
        log.info("Token 健康检测完成: {}", status);
    }

    /**
     * 检测 Token 状态
     */
    public TokenStatus checkTokenStatus() {
        log.info("检测 Token 状态...");
        LocalDateTime checkTime = LocalDateTime.now();

        try {
            boolean connected = iFlowService.isConnected();

            if (!connected) {
                return TokenStatus.builder()
                        .status("disconnected")
                        .valid(false)
                        .message("iFlow 服务未连接")
                        .requiresAction("start_iflow")
                        .lastCheckTime(checkTime)
                        .build();
            }

            // 发送测试查询验证 Token
            String testMessage = "Token status check";
            StringBuilder response = new StringBuilder();
            final AtomicReference<Boolean> hasError = new AtomicReference<>(false);
            final AtomicReference<String> errorMsg = new AtomicReference<>(null);

            try {
                iFlowService.queryStream(testMessage, modelConfig.getDefaultModel())
                        .doOnNext(response::append)
                        .doOnError(error -> {
                            log.error("Token 检测查询失败: {}", error.getMessage());
                            errorMsg.set(error.getMessage());
                            hasError.set(true);
                        })
                        .blockLast();
            } catch (Exception e) {
                log.error("Token 检测异常: {}", e.getMessage());
                errorMsg.set(e.getMessage());
                hasError.set(true);
            }

            if (hasError.get() && errorMsg.get() != null) {
                if (errorMsg.get().contains("API Token") || errorMsg.get().contains("过期") || errorMsg.get().contains("expired")) {
                    return TokenStatus.builder()
                            .status("expired")
                            .valid(false)
                            .message("API Token 已过期，需要重新获取")
                            .requiresAction("renew_token")
                            .lastCheckTime(checkTime)
                            .build();
                }
            }

            String responseText = response.toString();

            // 检查响应中的错误信息
            if (responseText.contains("API Token") || responseText.contains("过期") || 
                responseText.contains("expired") || responseText.contains("已过期")) {
                return TokenStatus.builder()
                        .status("expired")
                        .valid(false)
                        .message("API Token 已过期，需要重新获取")
                        .requiresAction("renew_token")
                        .lastCheckTime(checkTime)
                        .build();
            }

            // 检查响应是否正常
            if (responseText.trim().isEmpty() || responseText.length() < 5) {
                return TokenStatus.builder()
                        .status("invalid")
                        .valid(false)
                        .message("API 响应异常，Token 可能无效")
                        .requiresAction("renew_token")
                        .lastCheckTime(checkTime)
                        .build();
            }

            // Token 正常
            return TokenStatus.builder()
                    .status("valid")
                    .valid(true)
                    .message("Token 状态正常")
                    .lastCheckTime(checkTime)
                    .build();

        } catch (Exception e) {
            log.error("Token 检测失败: {}", e.getMessage());
            return TokenStatus.builder()
                    .status("error")
                    .valid(false)
                    .message("检测失败: " + e.getMessage())
                    .requiresAction("retry")
                    .lastCheckTime(checkTime)
                    .build();
        }
    }

    /**
     * 获取最后一次检测的状态
     */
    public TokenStatus getLastStatus() {
        return lastStatus.get();
    }

    /**
     * 手动触发 Token 检测
     */
    public TokenStatus manualCheck() {
        TokenStatus status = checkTokenStatus();
        lastStatus.set(status);
        return status;
    }

    /**
     * 检查是否需要提醒用户（Token 即将过期）
     * 假设 Token 有效期为 7 天，如果距离上次检测超过 6.5 天，提醒用户
     */
    public boolean needsWarning() {
        TokenStatus status = lastStatus.get();
        if (!status.isValid() || status.getLastCheckTime() == null) {
            return false;
        }

        // 计算距离上次检测的时间（模拟 Token 剩余有效时间）
        // 实际场景中，应该从 Token 本身获取过期时间
        LocalDateTime lastCheck = status.getLastCheckTime();
        LocalDateTime now = LocalDateTime.now();
        long hoursSinceCheck = ChronoUnit.HOURS.between(lastCheck, now);

        // 如果距离上次检测超过 6 天（144 小时），提醒用户
        // 注意：这只是一个简单的估算，实际情况应该根据 Token 的实际过期时间
        return hoursSinceCheck > 144; // 6 天 = 144 小时
    }

    /**
     * Token 状态信息
     */
    @Data
    @lombok.Builder
    public static class TokenStatus {
        private String status;           // 状态: valid, expired, invalid, disconnected, error
        private boolean valid;           // 是否有效
        private String message;          // 状态描述
        private String requiresAction;   // 需要执行的操作
        private LocalDateTime lastCheckTime; // 最后检测时间
    }
}