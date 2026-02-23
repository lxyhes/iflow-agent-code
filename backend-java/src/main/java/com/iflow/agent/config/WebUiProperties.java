package com.iflow.agent.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * WebUI 配置属性
 */
@Data
@Component
@ConfigurationProperties(prefix = "webui")
public class WebUiProperties {

    /**
     * 是否启用 WebUI
     */
    private boolean enabled = true;

    /**
     * 监听主机地址
     */
    private String host = "localhost";

    /**
     * 监听端口
     */
    private int port = 5173;

    /**
     * 是否启用远程访问 (允许局域网访问)
     */
    private boolean remoteAccess = false;

    /**
     * IP 白名单 (为空时允许所有 IP)
     */
    private List<String> ipWhitelist = new ArrayList<>();

    /**
     * 会话超时时间 (毫秒)
     */
    private long sessionTimeout = 3600000; // 1 hour

    /**
     * 最大并发会话数
     */
    private int maxConcurrentSessions = 10;

    /**
     * 是否启用 HTTPS
     */
    private boolean httpsEnabled = false;

    /**
     * SSL 证书路径
     */
    private String sslKeyPath;

    /**
     * SSL 证书密码
     */
    private String sslKeyPassword;

    /**
     * 是否启用 PWA
     */
    private boolean pwaEnabled = true;

    /**
     * 应用名称
     */
    private String appName = "AI 工作台";

    /**
     * 应用描述
     */
    private String appDescription = "智能开发助手平台";
}
