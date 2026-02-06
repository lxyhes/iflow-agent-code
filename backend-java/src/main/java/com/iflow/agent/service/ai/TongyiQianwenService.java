package com.iflow.agent.service.ai;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 通义千问服务 - 使用 Spring AI Alibaba (DashScope)
 * 当没有配置 API key 时，可以使用 iFlow SDK 作为替代
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TongyiQianwenService {

    private final ChatModel chatModel;
    private final EmbeddingModel embeddingModel;

    /**
     * 简单的文本生成
     */
    public String generate(String prompt) {
        log.debug("Generating text with prompt: {}", prompt.substring(0, Math.min(100, prompt.length())));

        ChatResponse response = chatModel.call(
                new Prompt(new UserMessage(prompt))
        );
        return response.getResult().getOutput().getText();
    }

    /**
     * 带系统提示词的文本生成
     */
    public String generateWithSystem(String systemPrompt, String userPrompt) {
        log.debug("Generating with system prompt");

        List<Message> messages = List.of(
                new SystemMessage(systemPrompt),
                new UserMessage(userPrompt)
        );

        ChatResponse response = chatModel.call(new Prompt(messages));
        return response.getResult().getOutput().getText();
    }

    /**
     * 多轮对话
     */
    public String chat(List<Map<String, String>> messages) {
        log.debug("Chat with {} messages", messages.size());

        List<Message> chatMessages = messages.stream()
                .map(msg -> {
                    String role = msg.getOrDefault("role", "user");
                    String content = msg.getOrDefault("content", "");
                    return switch (role) {
                        case "system" -> new SystemMessage(content);
                        case "user" -> new UserMessage(content);
                        default -> new UserMessage(content);
                    };
                })
                .collect(Collectors.toList());

        ChatResponse response = chatModel.call(new Prompt(chatMessages));
        return response.getResult().getOutput().getText();
    }

    /**
     * 流式生成
     */
    public Flux<String> generateStream(String prompt) {
        log.debug("Streaming generation with prompt: {}", prompt.substring(0, Math.min(100, prompt.length())));

        return chatModel.stream(new Prompt(new UserMessage(prompt)))
                .map(response -> response.getResult().getOutput().getText())
                .onErrorResume(e -> {
                    log.error("Stream generation failed", e);
                    return Flux.just("Error: " + e.getMessage());
                });
    }

    /**
     * 流式对话
     */
    public Flux<String> chatStream(List<Map<String, String>> messages) {
        log.debug("Streaming chat with {} messages", messages.size());

        List<Message> chatMessages = messages.stream()
                .map(msg -> {
                    String role = msg.getOrDefault("role", "user");
                    String content = msg.getOrDefault("content", "");
                    return switch (role) {
                        case "system" -> new SystemMessage(content);
                        case "user" -> new UserMessage(content);
                        default -> new UserMessage(content);
                    };
                })
                .collect(Collectors.toList());

        return chatModel.stream(new Prompt(chatMessages))
                .map(response -> response.getResult().getOutput().getText())
                .onErrorResume(e -> {
                    log.error("Stream chat failed", e);
                    return Flux.just("Error: " + e.getMessage());
                });
    }

    /**
     * 生成文本向量（用于 RAG）
     */
    public float[] embed(String text) {
        log.debug("Generating embedding for text: {}", text.substring(0, Math.min(100, text.length())));

        EmbeddingResponse response = embeddingModel.embedForResponse(List.of(text));
        return response.getResult().getOutput();
    }

    /**
     * 批量生成文本向量
     */
    public List<float[]> embedBatch(List<String> texts) {
        log.debug("Generating embeddings for {} texts", texts.size());

        EmbeddingResponse response = embeddingModel.embedForResponse(texts);
        return response.getResults().stream()
                .map(result -> result.getOutput())
                .collect(Collectors.toList());
    }

    /**
     * 使用特定模型生成
     */
    public String generateWithModel(String prompt, String model, Double temperature) {
        log.debug("Generating with model: {}, temperature: {}", model, temperature);

        DashScopeChatOptions options = DashScopeChatOptions.builder()
                .withModel(model != null ? model : "qwen-turbo")
                .withTemperature(temperature != null ? temperature : 0.7)
                .build();

        ChatResponse response = chatModel.call(
                new Prompt(new UserMessage(prompt), options)
        );
        return response.getResult().getOutput().getText();
    }
}
