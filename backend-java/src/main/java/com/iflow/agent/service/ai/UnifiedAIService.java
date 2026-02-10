package com.iflow.agent.service.ai;

import com.iflow.agent.service.ai.IFlowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

/**
 * 统一 AI 服务层 - 带自我学习和进化功能
 * 渐进式实现：先让基础功能工作，再逐步添加学习功能
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UnifiedAIService {

    private final IFlowService iflowService;
    
    // 学习状态 - 简单实现
    private final AtomicReference<Double> learningLevel = new AtomicReference<>(1.0);
    private final Map<String, Double> typeScores = new ConcurrentHashMap<>();
    private final List<Feedback> allFeedbacks = Collections.synchronizedList(new ArrayList<>());

    @javax.annotation.PostConstruct
    public void init() {
        log.info("UnifiedAIService initialized with self-learning capability");
    }

    // ========== 自我学习方法 ==========

    /**
     * 带自我学习的聊天 - 记录每次回答的反馈
     */
    public Mono<ChatResult> chatWithLearning(String promptType, Map<String, Object> context, String model) {
        String conversationId = UUID.randomUUID().toString();
        long startTime = System.currentTimeMillis();

        log.info("Chat with learning: type={}, current level={}", promptType, learningLevel.get());

        return Mono.fromCallable(() -> {
                    String prompt = buildDynamicPrompt(promptType, context);
                    String response = iflowService.querySync(prompt);
                    long duration = System.currentTimeMillis() - startTime;

                    // 记录这次对话
                    allFeedbacks.add(new Feedback(
                            conversationId,
                            promptType,
                            prompt,
                            response,
                            duration,
                            LocalDateTime.now()
                    ));

                    return new ChatResult(
                            response,
                            conversationId,
                            learningLevel.get()
                    );
                });
    }

    /**
     * 提交反馈 - 让 AI 从反馈中学习
     */
    public Mono<LearningResult> submitFeedback(String conversationId, Integer rating, String feedbackText) {
        log.info("Submitting feedback: id={}, rating={}", conversationId, rating);

        return Mono.fromCallable(() -> {
            // 找到对应的对话记录
            Feedback feedbackRecord = allFeedbacks.stream()
                    .filter(f -> f.conversationId().equals(conversationId))
                    .findFirst()
                    .orElse(null);

            if (feedbackRecord == null) {
                throw new RuntimeException("Conversation not found");
            }

            // 更新反馈
            feedbackRecord.setRating(rating);
            feedbackRecord.setFeedback(feedbackText);
            feedbackRecord.setFeedbackTime(LocalDateTime.now());

            // 计算调整
            double adjustment = calculateAdjustment(rating, feedbackText);
            
            // 更新类型得分
            String type = feedbackRecord.promptType();
            double currentScore = typeScores.getOrDefault(type, 3.0);
            double newScore = currentScore + adjustment;
            typeScores.put(type, newScore);

            // 更新全局学习级别（基于所有类型的平均分）
            double avgScore = typeScores.values().stream()
                    .mapToDouble(d -> d)
                    .average()
                    .orElse(3.0);
            
            // 转换为级别：3分=1.0，4分=1.5，5分=2.0
            double newLevel = 0.5 + (avgScore - 2.0) * 0.5;
            learningLevel.set(newLevel);

            log.info("Learning updated: level={}, typeScore={}, adjustment={}", 
                    newLevel, newScore, adjustment);

            return new LearningResult(
                    newLevel,
                    "反馈已处理，AI 已从您的反馈中学习，下次回答会更好",
                    getStats()
            );
        });
    }

    /**
     * 自动进化 - 每小时优化一次
     */
    @Scheduled(fixedRate = 3600000)
    public void autoEvolve() {
        log.info("Starting auto-evolution...");

        try {
            // 分析所有反馈，找出趋势
            double avgRating = allFeedbacks.stream()
                    .filter(f -> f.rating() != null)
                    .mapToInt(Feedback::rating)
                    .average()
                    .orElse(3.0);

            // 缓慢调整
            double adjustment = (avgRating - 3.0) * 0.01;
            double newLevel = learningLevel.get() + adjustment;
            newLevel = Math.max(0.5, Math.min(2.0, newLevel));
            learningLevel.set(newLevel);

            log.info("Auto-evolution completed: avgRating={}, level adjustment={}", avgRating, adjustment);

        } catch (Exception e) {
            log.error("Auto-evolution failed", e);
        }
    }

    /**
     * 获取学习状态
     */
    public Mono<Map<String, Object>> getLearningStatus() {
        return Mono.fromCallable(() -> {
            Map<String, Object> status = new HashMap<>();
            status.put("learningLevel", learningLevel.get());
            
            String message;
            if (learningLevel.get() > 1.5) {
                message = "AI 已达到高级水平，能提供深度、精准的回答";
            } else if (learningLevel.get() > 1.0) {
                message = "AI 正在持续优化，回答质量不断提升";
            } else {
                message = "AI 正在学习中，您的反馈将帮助它进步";
            }
            
            status.put("message", message);
            status.put("totalFeedbacks", allFeedbacks.size());
            status.put("stats", getStats());
            return status;
        });
    }

    // ========== 标准聊天方法 ==========

    public Flux<Map<String, Object>> streamChat(String message, String cwd, String sessionId,
                                                     String project, String model, String persona, String mode) {
        String actualModel = model != null ? model : "GLM-4.7";
        return iflowService.queryStream(message, actualModel)
                .map(content -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("type", "content");
                    map.put("content", content);
                    return map;
                })
                .onErrorResume(error -> {
                    Map<String, Object> errorMap = new HashMap<>();
                    errorMap.put("type", "error");
                    errorMap.put("content", error.getMessage());
                    return Flux.just(errorMap);
                });
    }

    public Mono<String> chat(String message, String model) {
        return Mono.fromCallable(() -> iflowService.querySync(message));
    }

    public Mono<String> chatWithPrompt(String systemPrompt, String userPrompt, String model) {
        String fullPrompt = systemPrompt + "\n\n" + userPrompt;
        return Mono.fromCallable(() -> iflowService.querySync(fullPrompt));
    }

    public Mono<String> chatMultiTurn(List<Map<String, String>> messages, String model) {
        StringBuilder context = new StringBuilder();
        for (Map<String, String> msg : messages) {
            context.append(msg.getOrDefault("role", "user"))
                    .append(": ")
                    .append(msg.getOrDefault("content", ""))
                    .append("\n");
        }
        return Mono.fromCallable(() -> iflowService.querySync(context.toString()));
    }

    public Mono<Map<String, Object>> healthCheck() {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();
            result.put("status", iflowService.isConnected() ? "healthy" : "unhealthy");
            result.put("available", iflowService.isConnected());
            result.put("message", iflowService.isConnected() ? "AI service is available" : "AI service is not responding");
            return result;
        });
    }

    public List<Map<String, String>> getSupportedModels() {
        return List.of(
                Map.of("id", "GLM-4.7", "name", "GLM-4.7", "provider", "iFlow"),
                Map.of("id", "GLM-4", "name", "GLM-4", "provider", "iFlow"),
                Map.of("id", "GLM-3-Turbo", "name", "GLM-3-Turbo", "provider", "iFlow")
        );
    }

    public List<Map<String, Object>> getSupportedPersonas() {
        return List.of(
                Map.of("id", "partner", "name", "合作伙伴", "description", "友好协作的结对编程风格", "icon", "handshake"),
                Map.of("id", "senior", "name", "资深架构师", "description", "强调代码质量和最佳实践", "icon", "award"),
                Map.of("id", "hacker", "name", "黑客", "description", "快速迭代，优先功能实现", "icon", "zap")
        );
    }

    public List<Map<String, String>> getSupportedModes() {
        return List.of(
                Map.of("id", "default", "name", "默认模式"),
                Map.of("id", "yolo", "name", "快速模式"),
                Map.of("id", "plan", "name", "计划模式"),
                Map.of("id", "safe", "name", "安全模式")
        );
    }

    // ========== 私有辅助方法 ==========

    private String buildDynamicPrompt(String promptType, Map<String, Object> context) {
        double level = learningLevel.get();
        StringBuilder prompt = new StringBuilder();

        // 基础提示词
        prompt.append(getBasePrompt(promptType)).append("\n\n");

        // 根据学习级别动态调整
        if (level > 1.5) {
            prompt.append("【高级模式】\n");
            prompt.append("你的回答需要体现深度思考和精准判断。请关注细节，避免泛泛而谈。\n");
        } else if (level > 1.0) {
            prompt.append("【优化模式】\n");
            prompt.append("请在保持自然的同时，确保回答的准确性和实用性。\n");
        } else {
            prompt.append("【基础模式】\n");
            prompt.append("请保持回答的自然和简洁。\n");
        }

        // 添加上下文
        if (!context.isEmpty()) {
            prompt.append("\n【当前场景】\n");
            context.forEach((k, v) -> prompt.append(k).append(": ").append(v).append("\n"));
        }

        return prompt.toString();
    }

    private String getBasePrompt(String promptType) {
        return switch (promptType) {
            case "interview_master" -> """
                    你是一位经验丰富的面试官，现在要示范如何回答这个问题。
                    
                    【回答要求】
                    请给出一个真实自然的回答，像你真的在面试一样：
                    1. 语气要自然，不要太正式，像和朋友聊天
                    2. 用第一人称"我"，不要用"我们"或"本人"
                    3. 多说具体的细节，少说大道理
                    4. 可以带点个人经历，比如"之前我遇到过这种情况..."
                    5. 适当用点口语表达，比如"其实吧"、"说实话"
                    6. 回答长度200-400字即可
                    7. 不要用"第一、第二、第三"这种列举方式
                    8. 不要说"综上所述"、"总而言之"这种总结语
                    
                    请直接给出回答，开头不要说"我会这样回答："，直接说内容。
                    """;
            case "salary_negotiation" -> """
                    你正在和HR谈薪资，对方问你期望多少。
                    
                    【回答要求】
                    请给出一个自然的回答，像真实的薪资谈判场景：
                    1. 语气要自信但不咄咄逼人
                    2. 用口语表达，比如"其实吧"、"说实话"
                    3. 不要说"第一、第二、第三"
                    4. 不要用"综上所述"、"总而言之"
                    5. 可以说一些具体的理由，比如"我之前...所以..."
                    6. 长度控制在150-300字
                    7. 不要用过于正式的商务用语
                    
                    请直接给出回答，像真的在跟HR说话一样。
                    """;
            case "pressure_interview" -> """
                    候选人刚才说了：%s
                    
                    作为压力面试官，你感觉这个回答有点问题，需要质疑一下。
                    
                    【要求】
                    1. 语气要直接、犀利，像真实的压力面试
                    2. 用口语，比如"等等"、"不对"、"你确定吗"
                    3. 直接质疑，不要铺垫
                    4. 可以有点不耐烦的语气
                    5. 长度控制在50-100字
                    
                    请直接输出问题。
                    """;
            case "deep_dive" -> """
                    候选人刚才说了：%s
                    
                    作为技术面试官，你觉得这个回答还可以，但想再深入挖一下。
                    
                    【要求】
                    1. 语气要自然，像同事间的技术讨论
                    2. 可以用"嗯"、"好的"等过渡词
                    3. 问题要有深度，但不要太刁钻
                    4. 可以说"那如果...你会怎么处理"
                    5. 长度控制在50-100字
                    
                    请直接输出问题。
                    """;
            default -> "";
        };
    }

    private double calculateAdjustment(Integer rating, String feedback) {
        double adjustment = (rating - 3.0) * 0.05;

        // 分析反馈文本中的情感倾向
        if (feedback != null && !feedback.isEmpty()) {
            String lowerFeedback = feedback.toLowerCase();
            
            // 积极关键词
            if (lowerFeedback.contains("好") || lowerFeedback.contains("不错") || lowerFeedback.contains("优秀") || 
                lowerFeedback.contains("棒") || lowerFeedback.contains("喜欢")) {
                adjustment += 0.02;
            }
            
            // 消极关键词
            if (lowerFeedback.contains("不好") || lowerFeedback.contains("差") || lowerFeedback.contains("一般") ||
                lowerFeedback.contains("问题") || lowerFeedback.contains("改进") || lowerFeedback.contains("不够")) {
                adjustment -= 0.02;
            }
        }

        return adjustment;
    }

    private Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalResponses", allFeedbacks.size());
        
        long totalDuration = allFeedbacks.stream()
                .mapToLong(f -> f.duration)
                .sum();
        stats.put("averageDuration", allFeedbacks.isEmpty() ? 0.0 : 
                (double) totalDuration / allFeedbacks.size());
        
        double avgRating = allFeedbacks.stream()
                .filter(f -> f.rating != null)
                .mapToInt(Feedback::rating)
                .average()
                .orElse(0.0);
        stats.put("averageRating", avgRating);

        // 按类型统计
        Map<String, Long> typeCounts = allFeedbacks.stream()
                .collect(Collectors.groupingBy(Feedback::promptType, Collectors.counting()));
        stats.put("typeStats", typeCounts);

        return stats;
    }

    // ========== 内部数据类 ==========

    public static class Feedback {
        private final String conversationId;
        private final String promptType;
        private final String prompt;
        private final String response;
        private final long duration;
        private final LocalDateTime timestamp;
        private Integer rating;
        private String feedback;
        private LocalDateTime feedbackTime;

        public Feedback(String conversationId, String promptType, String prompt, 
                       String response, long duration, LocalDateTime timestamp) {
            this.conversationId = conversationId;
            this.promptType = promptType;
            this.prompt = prompt;
            this.response = response;
            this.duration = duration;
            this.timestamp = timestamp;
        }

        public String conversationId() { return conversationId; }
        public String promptType() { return promptType; }
        public String response() { return response; }
        public long duration() { return duration; }
        public Integer rating() { return rating; }
        public String feedback() { return feedback; }
        public LocalDateTime feedbackTime() { return feedbackTime; }
        public LocalDateTime timestamp() { return timestamp; }

        public void setRating(Integer rating) { this.rating = rating; }
        public void setFeedback(String feedback) { this.feedback = feedback; }
        public void setFeedbackTime(LocalDateTime time) { this.feedbackTime = time; }
    }

    public static class ChatResult {
        public final String response;
        public final String conversationId;
        public final double learningLevel;

        public ChatResult(String response, String conversationId, double learningLevel) {
            this.response = response;
            this.conversationId = conversationId;
            this.learningLevel = learningLevel;
        }
    }

    public static class LearningResult {
        public final double level;
        public final String message;
        public final Map<String, Object> stats;

        public LearningResult(double level, String message, Map<String, Object> stats) {
            this.level = level;
            this.message = message;
            this.stats = stats;
        }
    }
}
