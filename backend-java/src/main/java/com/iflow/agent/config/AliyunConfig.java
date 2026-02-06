package com.iflow.agent.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "aliyun")
public class AliyunConfig {

    private String accessKeyId;
    private String accessKeySecret;
    private String region;
    private OcrConfig ocr = new OcrConfig();

    @Data
    public static class OcrConfig {
        private String endpoint;
    }

    public boolean isConfigured() {
        return accessKeyId != null && !accessKeyId.isEmpty()
                && accessKeySecret != null && !accessKeySecret.isEmpty();
    }
}
