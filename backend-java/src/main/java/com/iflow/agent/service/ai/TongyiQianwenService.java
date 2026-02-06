package com.iflow.agent.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AI 服务 - 优先使用 iFlow SDK，可选使用 Spring AI
 * 当没有配置 API key 时，返回模拟数据
 */
@Slf4j
@Service
public class TongyiQianwenService {

    private final ChatModel chatModel;
    private final EmbeddingModel embeddingModel;
    private final IFlowService iFlowService;

    public TongyiQianwenService(
            @Nullable ChatModel chatModel,
            @Nullable EmbeddingModel embeddingModel,
            IFlowService iFlowService) {
        this.chatModel = chatModel;
        this.embeddingModel = embeddingModel;
        this.iFlowService = iFlowService;
        
        if (chatModel == null) {
            log.warn("ChatModel not available - AI features will use iFlow SDK only");
        }
        if (embeddingModel == null) {
            log.warn("EmbeddingModel not available - embedding features disabled");
        }
    }

    /**
     * 简单的文本生成 - 优先使用 iFlow
     */
    public String generate(String prompt) {
        log.debug("Generating text with prompt: {}", prompt.substring(0, Math.min(100, prompt.length())));

        // 优先使用 iFlow
        if (iFlowService.isConnected()) {
            return iFlowService.querySync(prompt);
        }

        // 降级使用 Spring AI
        if (chatModel != null) {
            ChatResponse response = chatModel.call(new Prompt(new UserMessage(prompt)));
            return response.getResult().getOutput().getText();
        }

        return "Error: No AI service available. Please configure iFlow or Spring AI.";
    }

    /**
     * 带系统提示词的文本生成
     */
    public String generateWithSystem(String systemPrompt, String userPrompt) {
        log.debug("Generating with system prompt");

        // 优先使用 iFlow
        if (iFlowService.isConnected()) {
            String combinedPrompt = systemPrompt + "\n\n" + userPrompt;
            return iFlowService.querySync(combinedPrompt);
        }

        if (chatModel != null) {
            List<Message> messages = List.of(
                    new SystemMessage(systemPrompt),
                    new UserMessage(userPrompt)
            );
            ChatResponse response = chatModel.call(new Prompt(messages));
            return response.getResult().getOutput().getText();
        }

        return "Error: No AI service available.";
    }

    /**
     * 多轮对话
     */
    public String chat(List<Map<String, String>> messages) {
        log.debug("Chat with {} messages", messages.size());

        // 优先使用 iFlow（只使用最后一条消息）
        if (iFlowService.isConnected() && !messages.isEmpty()) {
            String lastMessage = messages.get(messages.size() - 1).getOrDefault("content", "");
            return iFlowService.querySync(lastMessage);
        }

        if (chatModel != null) {
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

        return "Error: No AI service available.";
    }

    /**
     * 流式生成 - 优先使用 iFlow
     */
    public Flux<String> generateStream(String prompt) {
        log.debug("Streaming generation with prompt: {}", prompt.substring(0, Math.min(100, prompt.length())));

        // 优先使用 iFlow
        if (iFlowService.isConnected()) {
            return iFlowService.queryStream(prompt);
        }

        if (chatModel != null) {
            return chatModel.stream(new Prompt(new UserMessage(prompt)))
                    .map(response -> response.getResult().getOutput().getText())
                    .onErrorResume(e -> {
                        log.error("Stream generation failed", e);
                        return Flux.just("Error: " + e.getMessage());
                    });
        }

        return Flux.just("Error: No AI service available.");
    }

    /**
     * 流式对话
     */
    public Flux<String> chatStream(List<Map<String, String>> messages) {
        log.debug("Streaming chat with {} messages", messages.size());

        // 优先使用 iFlow
        if (iFlowService.isConnected() && !messages.isEmpty()) {
            String lastMessage = messages.get(messages.size() - 1).getOrDefault("content", "");
            return iFlowService.queryStream(lastMessage);
        }

        if (chatModel != null) {
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

        return Flux.just("Error: No AI service available.");
    }

    /**
     * 生成文本向量（用于 RAG）
     */
    public float[] embed(String text) {
        log.debug("Generating embedding for text: {}", text.substring(0, Math.min(100, text.length())));

        if (embeddingModel != null) {
            EmbeddingResponse response = embeddingModel.embedForResponse(List.of(text));
            return response.getResult().getOutput();
        }

        log.warn("Embedding not available");
        return new float[0];
    }

    /**
     * 批量生成文本向量
     */
    public List<float[]> embedBatch(List<String> texts) {
        log.debug("Generating embeddings for {} texts", texts.size());

        if (embeddingModel != null) {
            EmbeddingResponse response = embeddingModel.embedForResponse(texts);
            return response.getResults().stream()
                    .map(result -> result.getOutput())
                    .collect(Collectors.toList());
        }

        log.warn("Embedding not available");
        return List.of();
    }

    /**
     * 使用特定模型生成
     */
    public String generateWithModel(String prompt, String model, Double temperature) {
        log.debug("Generating with model: {}, temperature: {}", model, temperature);
        
        // 优先使用 iFlow
        if (iFlowService.isConnected()) {
            return iFlowService.querySync(prompt);
        }

        if (chatModel != null) {
            ChatResponse response = chatModel.call(new Prompt(new UserMessage(prompt)));
            return response.getResult().getOutput().getText();
        }

        return "Error: No AI service available.";
    }
}
