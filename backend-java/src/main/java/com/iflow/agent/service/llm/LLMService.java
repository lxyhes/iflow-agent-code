package com.iflow.agent.service.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class LLMService {

    @Value("${llm.api-key:}")
    private String defaultApiKey;

    @Value("${llm.base-url:https://api.iflow.cn/v1}")
    private String baseUrl;

    @Value("${llm.default-model:glm-4}")
    private String defaultModel;

    @Value("${llm.default-temperature:0.7}")
    private double defaultTemperature;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public LLMService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public Mono<String> complete(List<Map<String, String>> messages, Double temperature, Integer maxTokens, String model) {
        String apiKey = getApiKey();
        if (apiKey.isEmpty()) {
            log.error("API key not configured");
            return Mono.just("Error: API key not configured");
        }

        String requestModel = model != null ? model : defaultModel;
        Double requestTemp = temperature != null ? temperature : defaultTemperature;

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", requestModel);
        requestBody.put("temperature", requestTemp);
        requestBody.put("stream", false);

        if (maxTokens != null) {
            requestBody.put("max_tokens", maxTokens);
        }

        ArrayNode messagesArray = requestBody.putArray("messages");
        for (Map<String, String> msg : messages) {
            ObjectNode messageNode = messagesArray.addObject();
            messageNode.put("role", msg.getOrDefault("role", "user"));
            messageNode.put("content", msg.getOrDefault("content", ""));
        }

        return webClient.post()
                .uri(baseUrl + "/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(responseBody -> {
                    log.debug("LLM raw response: {}", responseBody);
                    try {
                        JsonNode response = objectMapper.readTree(responseBody);
                        JsonNode choices = response.get("choices");
                        if (choices != null && choices.isArray() && choices.size() > 0) {
                            JsonNode message = choices.get(0).get("message");
                            if (message != null && message.has("content")) {
                                return Mono.just(message.get("content").asText());
                            }
                        }
                        log.warn("LLM response missing expected fields: {}", responseBody);
                        return Mono.just("");
                    } catch (Exception e) {
                        log.error("Failed to parse LLM response: {}", responseBody, e);
                        return Mono.just("");
                    }
                })
                .onErrorResume(e -> {
                    // 只在真正的错误时返回错误消息
                    // 如果是 JSON 解析错误，记录警告但不返回错误
                    String errorMsg = e.getMessage();
                    if (errorMsg != null && errorMsg.contains("200 OK")) {
                        log.warn("LLM response parsing issue: {}", errorMsg);
                        // 尝试返回原始响应
                        return Mono.just("");
                    } else {
                        log.error("LLM request failed: {}", errorMsg, e);
                        return Mono.just("Error: " + errorMsg);
                    }
                });
    }

    public Mono<String> complete(List<Map<String, String>> messages) {
        return complete(messages, null, null, null);
    }

    public Flux<String> completeStream(List<Map<String, String>> messages, Double temperature, Integer maxTokens, String model) {
        String apiKey = getApiKey();
        if (apiKey.isEmpty()) {
            log.error("API key not configured");
            return Flux.just("Error: API key not configured");
        }

        String requestModel = model != null ? model : defaultModel;
        Double requestTemp = temperature != null ? temperature : defaultTemperature;

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", requestModel);
        requestBody.put("temperature", requestTemp);
        requestBody.put("stream", true);

        if (maxTokens != null) {
            requestBody.put("max_tokens", maxTokens);
        }

        ArrayNode messagesArray = requestBody.putArray("messages");
        for (Map<String, String> msg : messages) {
            ObjectNode messageNode = messagesArray.addObject();
            messageNode.put("role", msg.getOrDefault("role", "user"));
            messageNode.put("content", msg.getOrDefault("content", ""));
        }

        return webClient.post()
                .uri(baseUrl + "/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(String.class)
                .flatMap(line -> {
                    if (line.startsWith("data: ")) {
                        String data = line.substring(6);
                        if ("[DONE]".equals(data)) {
                            return Mono.empty();
                        }
                        try {
                            JsonNode node = objectMapper.readTree(data);
                            JsonNode choices = node.get("choices");
                            if (choices != null && choices.isArray() && choices.size() > 0) {
                                JsonNode delta = choices.get(0).get("delta");
                                if (delta != null && delta.has("content")) {
                                    return Mono.just(delta.get("content").asText());
                                }
                            }
                        } catch (Exception e) {
                            log.debug("Failed to parse SSE data: {}", line);
                        }
                    }
                    return Mono.empty();
                })
                .onErrorResume(e -> {
                    log.error("LLM stream request failed: {}", e.getMessage());
                    return Flux.just("Error: " + e.getMessage());
                });
    }

    public Mono<String> generate(String prompt, Double temperature, Integer maxTokens) {
        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", prompt)
        );
        return complete(messages, temperature, maxTokens, null);
    }

    public Mono<String> generate(String prompt) {
        return generate(prompt, null, null);
    }

    private String getApiKey() {
        String key = System.getenv("IFLOW_API_KEY");
        if (key != null && !key.isEmpty()) {
            return key;
        }
        return defaultApiKey != null ? defaultApiKey : "";
    }
}
