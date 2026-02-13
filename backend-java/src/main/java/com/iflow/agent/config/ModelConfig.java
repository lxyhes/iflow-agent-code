package com.iflow.agent.config;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

/**
 * 模型配置中心
 * 统一管理默认模型配置
 */
@Slf4j
@Component
public class ModelConfig {

    /**
     * 默认模型名称
     * 可以通过配置文件或环境变量覆盖
     */
    public static final String DEFAULT_MODEL = "MiniMax-M2.5";

    @Getter
    @Setter
    @Value("${iflow.default.model:MiniMax-M2.5}")
    private String defaultModel;

    @PostConstruct
    public void init() {
        log.info("默认模型配置: {}", defaultModel);
    }

    /**
     * 获取默认模型
     */
    public String getDefaultModel() {
        return defaultModel != null && !defaultModel.isEmpty() ? defaultModel : DEFAULT_MODEL;
    }

    /**
     * 获取模型，如果传入的模型为空则返回默认模型
     */
    public String resolveModel(String model) {
        return model != null && !model.isEmpty() ? model : getDefaultModel();
    }
}
