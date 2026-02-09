package com.iflow.agent.service.llm;

import cn.iflow.sdk.query.IFlowQuery;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * iFlow LLM 服务
 * 使用 iFlow SDK 调用 AI 模型
 */
@Slf4j
@Service
public class IFlowLLMService {

    /**
     * 生成回答
     */
    public Mono<String> generate(String prompt) {
        return Mono.fromCallable(() -> {
            try {
                log.info("Calling iFlow SDK with prompt length: {}", prompt.length());
                
                // 使用 IFlowQuery 查询
                List<cn.iflow.sdk.types.messages.Message> response = IFlowQuery.querySync(prompt);
                
                StringBuilder result = new StringBuilder();
                for (cn.iflow.sdk.types.messages.Message msg : response) {
                    if (msg instanceof cn.iflow.sdk.types.messages.AssistantMessage) {
                        cn.iflow.sdk.types.messages.AssistantMessage assistantMsg = 
                            (cn.iflow.sdk.types.messages.AssistantMessage) msg;
                        result.append(assistantMsg.getChunk().getText());
                    }
                }
                
                String answer = result.toString().trim();
                if (answer.isEmpty()) {
                    log.warn("iFlow SDK returned empty response");
                    return "";
                }
                
                log.info("iFlow SDK response length: {}", answer.length());
                return answer;
            } catch (Exception e) {
                log.error("iFlow SDK call failed", e);
                throw new RuntimeException("iFlow SDK call failed: " + e.getMessage(), e);
            }
        });
    }

    /**
     * 生成回答（带温度参数）
     */
    public Mono<String> generate(String prompt, Double temperature, Integer maxTokens) {
        // iFlow SDK 不支持温度和最大 token 参数，直接调用 generate
        return generate(prompt);
    }

    /**
     * 完成（兼容接口）
     */
    public Mono<String> complete(List<Map<String, String>> messages, Double temperature, Integer maxTokens, String model) {
        if (messages == null || messages.isEmpty()) {
            return Mono.just("");
        }

        // 合并所有消息为一个 prompt
        StringBuilder promptBuilder = new StringBuilder();
        for (Map<String, String> msg : messages) {
            String role = msg.getOrDefault("role", "user");
            String content = msg.getOrDefault("content", "");
            
            if (!content.isEmpty()) {
                if (role.equals("system")) {
                    promptBuilder.append("System: ").append(content).append("\n");
                } else if (role.equals("assistant")) {
                    promptBuilder.append("Assistant: ").append(content).append("\n");
                } else {
                    promptBuilder.append("User: ").append(content).append("\n");
                }
            }
        }

        return generate(promptBuilder.toString(), temperature, maxTokens);
    }
}