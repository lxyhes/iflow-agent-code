package com.iflow.agent.config;

import lombok.Data;
import org.springframework.stereotype.Component;

/**
 * iFlow 后端配置
 * 用于控制使用 SDK 还是 subprocess 方式调用 iFlow
 */
@Data
@Component
public class IFlowBackendConfig {
    
    /**
     * 后端模式: "sdk" 或 "subprocess"
     * 默认: "sdk" (类型安全，更稳定)
     */
    private String backendMode = "sdk";
    
    /**
     * 设置后端模式
     * @param mode "sdk" 或 "subprocess"
     */
    public void setBackendMode(String mode) {
        if ("sdk".equals(mode) || "subprocess".equals(mode)) {
            this.backendMode = mode;
        } else {
            throw new IllegalArgumentException("Invalid backend mode: " + mode + ". Must be 'sdk' or 'subprocess'");
        }
    }
    
    /**
     * 检查是否使用 SDK 模式
     */
    public boolean isSdkMode() {
        return "sdk".equals(backendMode);
    }
    
    /**
     * 检查是否使用 Subprocess 模式
     */
    public boolean isSubprocessMode() {
        return "subprocess".equals(backendMode);
    }
}