package com.iflow.agent.service.interview.agent;

import com.iflow.agent.domain.interview.entity.Answer;
import com.iflow.agent.domain.interview.entity.Evaluation;
import com.iflow.agent.domain.interview.entity.Question;
import com.iflow.agent.domain.interview.enums.InterviewPhase;
import com.iflow.agent.domain.interview.enums.InterviewerType;
import com.iflow.agent.domain.interview.enums.QuestionStrategy;
import com.iflow.agent.repository.EvaluationRepository;
import com.iflow.agent.repository.QuestionRepository;
import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 技术面试官智能体
 */
@Slf4j
@Component
public class TechnicalInterviewerAgent extends AbstractInterviewerAgent {

    private static final String SYSTEM_PROMPT = """
        你是一位经验丰富的技术面试官，专注于考察候选人的技术能力和编程思维。
        
        你的职责：
        1. 评估候选人的技术深度和广度
        2. 考察算法和数据结构知识
        3. 了解候选人的项目经验和技术选型思路
        4. 评估问题解决能力和调试技巧
        
        面试风格：
        - 专业但友好
        - 循序渐进，从基础到深入
        - 关注实际应用能力
        - 鼓励候选人展示思考过程
        
        评估维度：
        - 技术基础（0-100）
        - 问题解决能力（0-100）
        - 代码质量（0-100）
        - 系统设计思维（0-100）
        """;

    public TechnicalInterviewerAgent(
            TongyiQianwenService aiService,
            QuestionRepository questionRepository,
            EvaluationRepository evaluationRepository) {
        super(
                InterviewerType.TECHNICAL,
                "技术面试官",
                SYSTEM_PROMPT,
                1.0,
                QuestionStrategy.ADAPTIVE,
                aiService,
                questionRepository,
                evaluationRepository
        );
    }

    @Override
    public String getSystemPrompt() {
        return SYSTEM_PROMPT;
    }

    @Override
    public Question generateQuestion(String sessionId, Map<String, Object> candidateProfile, List<Map<String, Object>> interviewHistory) {
        log.info("技术面试官生成问题，session: {}", sessionId);

        String position = (String) candidateProfile.getOrDefault("position", "Java开发工程师");
        String experience = (String) candidateProfile.getOrDefault("experience", "3年");

        String prompt = String.format("""
            %s
            
            当前面试阶段：%s
            目标职位：%s
            候选经验：%s
            
            请生成一个适合的技术面试问题。
            要求：
            1. 难度适中，符合候选经验水平
            2. 考察核心技术能力
            3. 问题清晰具体
            4. 预期回答时长3-5分钟
            
            请以JSON格式输出：
            {
                "content": "问题内容",
                "category": "问题类别（如：Java基础、Spring、数据库等）",
                "difficulty": 难度等级1-5,
                "expectedDuration": 预期回答秒数
            }
            """, SYSTEM_PROMPT, currentPhase.getDescription(), position, experience);

        String response = aiService.generate(prompt);

        // 解析JSON响应（简化处理）
        Question question = Question.builder()
                .sessionId(sessionId)
                .content(extractContent(response))
                .type("technical")
                .category(extractCategory(response))
                .difficulty(3)
                .expectedDuration(300)
                .build();

        Question saved = questionRepository.save(question);
        recordQuestion(sessionId, saved.getId());

        return saved;
    }

    @Override
    public Evaluation evaluateAnswer(Question question, Answer answer) {
        log.info("技术面试官评估回答，question: {}, answer: {}", question.getId(), answer.getId());

        String prompt = String.format("""
            %s
            
            问题：%s
            问题类别：%s
            候选人回答：%s
            
            请评估该回答，并以JSON格式输出：
            {
                "score": 总分0-100,
                "dimension": "评估维度",
                "feedback": "详细反馈",
                "strengths": ["优点1", "优点2"],
                "weaknesses": ["不足1", "不足2"]
            }
            """, SYSTEM_PROMPT, question.getContent(), question.getCategory(), answer.getContent());

        String response = aiService.generate(prompt);

        // 解析评估结果（简化处理）
        Evaluation evaluation = Evaluation.builder()
                .sessionId(question.getSessionId())
                .questionId(question.getId())
                .answerId(answer.getId())
                .score(extractScore(response))
                .dimension("technical")
                .feedback(extractFeedback(response))
                .strengths(List.of("回答完整", "思路清晰"))
                .weaknesses(List.of("可以更深入"))
                .confidence(0.8)
                .build();

        return evaluationRepository.save(evaluation);
    }

    private String extractContent(String response) {
        // 简化实现，实际应该解析JSON
        if (response.contains("content")) {
            int start = response.indexOf("content");
            int quoteStart = response.indexOf("\"", start + 8);
            int quoteEnd = response.indexOf("\"", quoteStart + 1);
            if (quoteStart > 0 && quoteEnd > quoteStart) {
                return response.substring(quoteStart + 1, quoteEnd);
            }
        }
        return response.length() > 200 ? response.substring(0, 200) : response;
    }

    private String extractCategory(String response) {
        if (response.contains("Java")) return "Java基础";
        if (response.contains("Spring")) return "Spring框架";
        if (response.contains("数据库")) return "数据库";
        return "技术综合";
    }

    private double extractScore(String response) {
        // 简化实现，提取分数
        try {
            if (response.contains("score")) {
                int start = response.indexOf("score");
                int colon = response.indexOf(":", start);
                int comma = response.indexOf(",", colon);
                if (comma < 0) comma = response.indexOf("}", colon);
                String scoreStr = response.substring(colon + 1, comma).trim();
                return Double.parseDouble(scoreStr);
            }
        } catch (Exception e) {
            log.warn("Failed to extract score", e);
        }
        return 75.0;
    }

    private String extractFeedback(String response) {
        if (response.length() > 500) {
            return response.substring(0, 500) + "...";
        }
        return response;
    }
}
