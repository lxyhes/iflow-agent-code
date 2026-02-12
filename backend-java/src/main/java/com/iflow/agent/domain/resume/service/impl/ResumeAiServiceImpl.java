package com.iflow.agent.domain.resume.service.impl;

import com.iflow.agent.domain.resume.entity.*;
import com.iflow.agent.domain.resume.repository.ResumeAiHistoryRepository;
import com.iflow.agent.domain.resume.service.ResumeAiService;
import com.iflow.agent.service.ai.TongyiQianwenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 简历AI服务实现 - 提供AI分析、诊断、重写等功能
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeAiServiceImpl implements ResumeAiService {

    private static final String DEFAULT_MODEL = "GLM-4.7";

    private final TongyiQianwenService tongyiQianwenService;
    private final ObjectMapper objectMapper;
    private final ResumeAiHistoryRepository historyRepository;

    @Override
    public Map<String, Object> aiAnalyzeResume(Resume resume) {
        log.info("AI analyzing resume: {}", resume.getId());

        String prompt = buildAiAnalyzePrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);
        log.info("AI Response length: {}, preview: {}", aiResponse.length(), 
                aiResponse.substring(0, Math.min(500, aiResponse.length())));

        // 清理 AI 响应，移除 markdown 代码块标记
        String cleanedResponse = aiResponse.replaceAll("```json\\s*", "")
                                           .replaceAll("```\\s*", "")
                                           .trim();

        try {
            // 检查响应是否完整（JSON 是否被截断）
            String completeResponse = cleanedResponse;
            if (!cleanedResponse.trim().endsWith("}")) {
                log.warn("AI response appears to be truncated, attempting to complete JSON...");
                // 尝试找到最后一个完整的对象并关闭
                int lastBrace = cleanedResponse.lastIndexOf("}");
                int lastBracket = cleanedResponse.lastIndexOf("]");
                int lastValidPos = Math.max(lastBrace, lastBracket);
                if (lastValidPos > 0) {
                    completeResponse = cleanedResponse.substring(0, lastValidPos + 1);
                    // 补全可能缺少的闭合括号
                    int openBraces = countChar(completeResponse, '{') - countChar(completeResponse, '}');
                    int openBrackets = countChar(completeResponse, '[') - countChar(completeResponse, ']');
                    for (int i = 0; i < openBraces; i++) completeResponse += "}";
                    for (int i = 0; i < openBrackets; i++) completeResponse += "]";
                    log.info("Attempted to repair truncated JSON");
                }
            }

            // 解析 JSON 响应
            Map<String, Object> parsedResponse = objectMapper.readValue(completeResponse, Map.class);
            log.info("Parsed response keys: {}", parsedResponse.keySet());

            // 提取 overall_score
            Integer overallScore = extractIntValue(parsedResponse, "overall_score");
            if (overallScore == null || overallScore < 0 || overallScore > 100) {
                log.warn("overall_score invalid or not found in response: {}, using default value 70", overallScore);
                overallScore = 70;
            }

            // 获取 sections 并验证分数
            Map<String, Object> sections = (Map<String, Object>) parsedResponse.getOrDefault("sections", getDefaultSections());
            validateSectionScores(sections);

            // 构建前端期望的格式
            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", overallScore);
            result.put("sections", sections);
            result.put("competitiveness", parsedResponse.getOrDefault("competitiveness", getDefaultCompetitiveness()));
            result.put("suggestions", parsedResponse.getOrDefault("suggestions", new ArrayList<>()));
            result.put("action_items", parsedResponse.getOrDefault("action_items", new ArrayList<>()));
            result.put("analysis", aiResponse);
            result.put("error", false);
            result.put("timestamp", System.currentTimeMillis());

            // 保存历史记录
            saveAiHistory(resume.getId(), "analyze", aiResponse, result);

            return result;

        } catch (Exception e) {
            log.error("Failed to parse AI response as JSON: {}", e.getMessage());
            log.error("Response content: {}", cleanedResponse.substring(0, Math.min(500, cleanedResponse.length())));

            // 尝试提取部分数据（如果可能）
            Map<String, Object> partialResult = extractPartialData(cleanedResponse);
            if (partialResult != null) {
                log.info("Extracted partial data from AI response");
                partialResult.put("analysis", aiResponse);
                partialResult.put("error", true);
                partialResult.put("error_message", "AI 返回数据不完整，显示部分结果");
                partialResult.put("timestamp", System.currentTimeMillis());
                saveAiHistory(resume.getId(), "analyze", aiResponse, partialResult);
                return partialResult;
            }

            // 返回默认结果
            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", 70);
            result.put("sections", getDefaultSections());
            result.put("competitiveness", getDefaultCompetitiveness());
            result.put("suggestions", List.of("请确保简历内容完整", "建议添加更多量化成果", "优化关键词匹配度"));
            result.put("action_items", List.of("补充缺失的简历信息", "添加量化成果数据"));
            result.put("analysis", aiResponse);
            result.put("error", true);
            result.put("error_message", "AI 返回的格式不正确，已使用默认分析结果");
            result.put("timestamp", System.currentTimeMillis());

            // 保存历史记录
            saveAiHistory(resume.getId(), "analyze", aiResponse, result);

            return result;
        }
    }

    @Override
    public Map<String, Object> healthCheck(Resume resume) {
        log.info("Health checking resume: {}", resume.getId());

        String prompt = buildHealthCheckPrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);
        log.info("Health check AI response length: {}", aiResponse.length());

        // 清理 AI 响应，移除 markdown 代码块标记
        String cleanedResponse = aiResponse.replaceAll("```json\\s*", "")
                                           .replaceAll("```\\s*", "")
                                           .trim();

        try {
            // 检查响应是否完整
            String completeResponse = cleanedResponse;
            if (!cleanedResponse.trim().endsWith("}")) {
                log.warn("Health check AI response appears to be truncated, attempting to complete JSON...");
                int lastBrace = cleanedResponse.lastIndexOf("}");
                int lastBracket = cleanedResponse.lastIndexOf("]");
                int lastValidPos = Math.max(lastBrace, lastBracket);
                if (lastValidPos > 0) {
                    completeResponse = cleanedResponse.substring(0, lastValidPos + 1);
                    int openBraces = countChar(completeResponse, '{') - countChar(completeResponse, '}');
                    int openBrackets = countChar(completeResponse, '[') - countChar(completeResponse, ']');
                    for (int i = 0; i < openBraces; i++) completeResponse += "}";
                    for (int i = 0; i < openBrackets; i++) completeResponse += "]";
                }
            }

            // 解析 JSON 响应
            Map<String, Object> parsedResponse = objectMapper.readValue(completeResponse, Map.class);
            log.info("Parsed health check response keys: {}", parsedResponse.keySet());

            // 提取 overall_health
            Integer overallHealth = extractIntValue(parsedResponse, "overall_health");
            if (overallHealth == null || overallHealth < 0 || overallHealth > 100) {
                log.warn("overall_health invalid or not found in response: {}, using default value 75", overallHealth);
                overallHealth = 75;
            }

            // 确定 health_level
            String healthLevel = "一般";
            if (overallHealth >= 90) healthLevel = "优秀";
            else if (overallHealth >= 80) healthLevel = "良好";
            else if (overallHealth >= 70) healthLevel = "一般";
            else if (overallHealth >= 60) healthLevel = "一般";
            else healthLevel = "需改进";

            // 构建前端期望的格式
            Map<String, Object> result = new HashMap<>();
            result.put("overall_health", overallHealth);
            result.put("health_level", healthLevel);
            result.put("summary", parsedResponse.getOrDefault("summary", "基于AI的健康度分析"));
            result.put("error", false);
            result.put("timestamp", System.currentTimeMillis());

            // 处理 dimensions
            List<Map<String, Object>> dimensions = new ArrayList<>();
            Map<String, Object> details = (Map<String, Object>) parsedResponse.getOrDefault("details", new HashMap<>());

            String[] dimensionNames = {"内容完整性", "专业度", "竞争力", "可读性"};
            String[] dimensionKeys = {"completeness", "professionalism", "competitiveness", "readability"};

            for (int i = 0; i < dimensionNames.length; i++) {
                Map<String, Object> detail = (Map<String, Object>) details.get(dimensionKeys[i]);
                if (detail != null) {
                    Integer score = extractIntValue(detail, "score");
                    if (score == null) score = 75;

                    String status = "良好";
                    if (score >= 90) status = "优秀";
                    else if (score >= 80) status = "良好";
                    else if (score >= 70) status = "一般";
                    else status = "需改进";

                    Map<String, Object> dimension = new HashMap<>();
                    dimension.put("name", dimensionNames[i]);
                    dimension.put("score", score);
                    dimension.put("status", status);

                    // 提取 issues 和 suggestions
                    List<String> issues = (List<String>) detail.get("issues");
                    List<String> suggestions = (List<String>) detail.get("suggestions");
                    dimension.put("issues", issues != null ? issues : new ArrayList<>());
                    dimension.put("suggestions", suggestions != null ? suggestions : new ArrayList<>());

                    dimensions.add(dimension);
                }
            }
            result.put("dimensions", dimensions);

            // 处理 critical_issues
            List<Map<String, Object>> criticalIssues = new ArrayList<>();
            List<String> rawIssues = (List<String>) parsedResponse.getOrDefault("issues", new ArrayList<>());
            for (String issue : rawIssues) {
                Map<String, Object> issueObj = new HashMap<>();
                issueObj.put("severity", "中");
                issueObj.put("issue", issue);
                issueObj.put("impact", "影响整体质量");
                issueObj.put("solution", "建议改进");
                criticalIssues.add(issueObj);
            }
            result.put("critical_issues", criticalIssues);

            // 处理 quick_wins
            List<String> rawImprovements = (List<String>) parsedResponse.getOrDefault("improvements", new ArrayList<>());
            result.put("quick_wins", rawImprovements);

            // 行业对比（默认值）
            Map<String, Object> industryBenchmark = new HashMap<>();
            industryBenchmark.put("percentile", 70);
            industryBenchmark.put("comparison", "您的简历表现良好，超过大部分同行");
            result.put("industry_benchmark", industryBenchmark);

            // 保存历史记录
            saveAiHistory(resume.getId(), "health_check", aiResponse, result);

            return result;

        } catch (Exception e) {
            log.error("Failed to parse health check AI response as JSON: {}", e.getMessage());
            log.error("Response content: {}", cleanedResponse.substring(0, Math.min(500, cleanedResponse.length())));

            // 返回默认结果
            Map<String, Object> result = new HashMap<>();
            result.put("overall_health", 75);
            result.put("health_level", "良好");
            result.put("summary", "基于默认的健康度分析");
            result.put("error", true);
            result.put("error_message", "AI 返回数据不完整，已使用默认分析结果");
            result.put("timestamp", System.currentTimeMillis());

            // 默认 dimensions
            List<Map<String, Object>> defaultDimensions = List.of(
                Map.of("name", "内容完整性", "score", 75, "status", "良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "专业度", "score", 75, "status", "良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "竞争力", "score", 75, "status", "良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "可读性", "score", 75, "status", "良好", "issues", List.of(), "suggestions", List.of())
            );
            result.put("dimensions", defaultDimensions);
            result.put("critical_issues", List.of());
            result.put("quick_wins", List.of());
            result.put("industry_benchmark", Map.of("percentile", 70, "comparison", "您的简历表现良好"));

            // 保存历史记录
            saveAiHistory(resume.getId(), "health_check", aiResponse, result);

            return result;
        }
    }

    @Override
    public Map<String, Object> layoutCheck(Resume resume) {
        log.info("Layout checking resume: {}", resume.getId());

        String prompt = buildLayoutCheckPrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);
        log.info("AI response length: {}", aiResponse.length());

        // 清理 AI 响应，移除 markdown 代码块标记
        String cleanedResponse = aiResponse.replaceAll("```json\\s*", "")
                                           .replaceAll("```\\s*", "")
                                           .trim();

        try {
            // 检查响应是否完整
            String completeResponse = cleanedResponse;
            if (!cleanedResponse.trim().endsWith("}")) {
                log.warn("Layout check AI response appears to be truncated, attempting to complete JSON...");
                int lastBrace = cleanedResponse.lastIndexOf("}");
                int lastBracket = cleanedResponse.lastIndexOf("]");
                int lastValidPos = Math.max(lastBrace, lastBracket);
                if (lastValidPos > 0) {
                    completeResponse = cleanedResponse.substring(0, lastValidPos + 1);
                    int openBraces = countChar(completeResponse, '{') - countChar(completeResponse, '}');
                    int openBrackets = countChar(completeResponse, '[') - countChar(completeResponse, ']');
                    for (int i = 0; i < openBraces; i++) completeResponse += "}";
                    for (int i = 0; i < openBrackets; i++) completeResponse += "]";
                }
            }

            // 解析 JSON 响应
            Map<String, Object> parsedResponse = objectMapper.readValue(completeResponse, Map.class);
            log.info("Parsed layout check response keys: {}", parsedResponse.keySet());

            // 提取 overall_score
            Integer overallScore = extractIntValue(parsedResponse, "overall_score");
            if (overallScore == null || overallScore < 0 || overallScore > 100) {
                log.warn("layout_check overall_score invalid or not found in response: {}, using default value 75", overallScore);
                overallScore = 75;
            }

            // 确定 layout_level
            String layoutLevel = "一般";
            if (overallScore >= 90) layoutLevel = "优秀";
            else if (overallScore >= 80) layoutLevel = "专业";
            else if (overallScore >= 70) layoutLevel = "良好";
            else if (overallScore >= 60) layoutLevel = "一般";
            else layoutLevel = "需改进";

            // 构建前端期望的格式
            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", overallScore);
            result.put("layout_level", layoutLevel);
            result.put("summary", parsedResponse.getOrDefault("summary", "基于AI的排版分析"));
            result.put("error", false);
            result.put("timestamp", System.currentTimeMillis());

            // 处理 categories - 从 dimensions 转换
            List<Map<String, Object>> categories = new ArrayList<>();
            Map<String, Object> dimensions = (Map<String, Object>) parsedResponse.getOrDefault("dimensions", new HashMap<>());

            String[] categoryNames = {"视觉层次", "格式一致性", "可读性", "专业外观", "留白使用"};
            String[] categoryKeys = {"visual_hierarchy", "format_consistency", "readability", "professional_appearance", "white_space_usage"};

            for (int i = 0; i < categoryNames.length; i++) {
                Map<String, Object> dim = (Map<String, Object>) dimensions.get(categoryKeys[i]);
                if (dim != null) {
                    Integer score = extractIntValue(dim, "score");
                    if (score == null) score = 75;

                    String status = "良好";
                    if (score >= 90) status = "优秀";
                    else if (score >= 80) status = "良好";
                    else if (score >= 70) status = "一般";
                    else status = "需改进";

                    Map<String, Object> category = new HashMap<>();
                    category.put("name", categoryNames[i]);
                    category.put("score", score);
                    category.put("status", status);
                    category.put("comments", dim.getOrDefault("comment", "表现良好"));

                    // 提取 issues 和 suggestions
                    List<String> issues = (List<String>) dim.get("issues");
                    List<String> suggestions = (List<String>) dim.get("suggestions");
                    category.put("issues", issues != null ? issues : new ArrayList<>());
                    category.put("suggestions", suggestions != null ? suggestions : new ArrayList<>());

                    categories.add(category);
                }
            }
            result.put("categories", categories);

            // 处理 format_issues
            List<Map<String, Object>> formatIssues = new ArrayList<>();
            List<String> rawIssues = (List<String>) parsedResponse.getOrDefault("issues", new ArrayList<>());
            for (String issue : rawIssues) {
                Map<String, Object> issueObj = new HashMap<>();
                issueObj.put("severity", "中");
                issueObj.put("type", "格式问题");
                issueObj.put("location", "整体");
                issueObj.put("description", issue);
                issueObj.put("fix_suggestion", "建议优化排版");
                formatIssues.add(issueObj);
            }
            result.put("format_issues", formatIssues);

            // 处理 design_suggestions
            List<Map<String, Object>> designSuggestions = new ArrayList<>();
            List<String> rawSuggestions = (List<String>) parsedResponse.getOrDefault("suggestions", new ArrayList<>());
            for (String suggestion : rawSuggestions) {
                Map<String, Object> suggestionObj = new HashMap<>();
                suggestionObj.put("area", "排版优化");
                suggestionObj.put("current", "当前状态");
                suggestionObj.put("recommended", suggestion);
                suggestionObj.put("benefit", "提升整体视觉效果");
                designSuggestions.add(suggestionObj);
            }
            result.put("design_suggestions", designSuggestions);

            // ATS兼容性（默认值）
            Map<String, Object> atsCompatibility = new HashMap<>();
            atsCompatibility.put("score", 75);
            atsCompatibility.put("issues", List.of("确保关键词准确", "避免使用复杂格式"));
            atsCompatibility.put("recommendations", List.of("使用标准字体", "避免使用表格和图片"));
            result.put("ats_compatibility", atsCompatibility);

            // 保存历史记录
            saveAiHistory(resume.getId(), "layout_check", aiResponse, result);

            return result;

        } catch (Exception e) {
            log.error("Failed to parse layout check AI response as JSON: {}", e.getMessage());
            log.error("Response content: {}", cleanedResponse.substring(0, Math.min(500, cleanedResponse.length())));

            // 返回默认结果
            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", 75);
            result.put("layout_level", "良好");
            result.put("summary", "基于默认的排版分析");
            result.put("error", true);
            result.put("error_message", "AI 返回数据不完整，已使用默认分析结果");
            result.put("timestamp", System.currentTimeMillis());

            // 默认 categories
            List<Map<String, Object>> defaultCategories = List.of(
                Map.of("name", "视觉层次", "score", 75, "status", "良好", "comments", "表现良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "格式一致性", "score", 75, "status", "良好", "comments", "表现良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "可读性", "score", 75, "status", "良好", "comments", "表现良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "专业外观", "score", 75, "status", "良好", "comments", "表现良好", "issues", List.of(), "suggestions", List.of()),
                Map.of("name", "留白使用", "score", 75, "status", "良好", "comments", "表现良好", "issues", List.of(), "suggestions", List.of())
            );
            result.put("categories", defaultCategories);
            result.put("format_issues", List.of());
            result.put("design_suggestions", List.of());

            Map<String, Object> atsCompatibility = Map.of(
                "score", 75,
                "issues", List.of("确保关键词准确", "避免使用复杂格式"),
                "recommendations", List.of("使用标准字体", "避免使用表格和图片")
            );
            result.put("ats_compatibility", atsCompatibility);

            // 保存历史记录
            saveAiHistory(resume.getId(), "layout_check", aiResponse, result);

            return result;
        }
    }

    @Override
    public Map<String, Object> diagnoseResume(Resume resume) {
        log.info("Diagnosing resume: {}", resume.getId());
        log.debug("Resume updatedAt: {}", resume.getUpdatedAt());

        // 记录简历内容用于调试
        String resumeSummary = buildResumeSummary(resume);
        log.debug("Resume summary for diagnosis:\n{}", resumeSummary);

        String prompt = buildDiagnosePrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);
        log.debug("AI response length: {}", aiResponse.length());
        log.info("AI Response preview: {}", aiResponse.substring(0, Math.min(500, aiResponse.length())));

        // 清理 AI 响应，移除 markdown 代码块标记
        String cleanedResponse = aiResponse.replaceAll("```json\\s*", "")
                                           .replaceAll("```\\s*", "")
                                           .trim();

        try {
            // 解析 JSON 响应
            Map<String, Object> parsedResponse = objectMapper.readValue(cleanedResponse, Map.class);
            log.info("Parsed response keys: {}", parsedResponse.keySet());

            // 提取 overall_score
            Integer overallScore = extractIntValue(parsedResponse, "overall_score");
            if (overallScore == null || overallScore < 0 || overallScore > 100) {
                log.warn("overall_score invalid or not found in response: {}, using default value 70", overallScore);
                overallScore = 70;
            }

            // 获取 sections 并验证分数
            Map<String, Object> sections = (Map<String, Object>) parsedResponse.getOrDefault("sections", new HashMap<>());
            validateSectionScores(sections);
            
            // 构建前端期望的格式
            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", overallScore);
            result.put("sections", sections);
            result.put("competitiveness", parsedResponse.getOrDefault("competitiveness", new HashMap<>()));
            result.put("suggestions", parsedResponse.getOrDefault("suggestions", new ArrayList<>()));
            result.put("action_items", parsedResponse.getOrDefault("action_items", new ArrayList<>()));
            result.put("error", false);
            result.put("timestamp", System.currentTimeMillis());

            // 保存历史记录
            saveAiHistory(resume.getId(), "analyze", aiResponse, result);

            return result;

        } catch (Exception e) {
            log.error("Failed to parse AI response as JSON: {}", e.getMessage());
            log.error("Response content: {}", cleanedResponse.substring(0, Math.min(500, cleanedResponse.length())));

            // 返回默认结果
            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", 70);
            result.put("sections", getDefaultSections());
            result.put("competitiveness", getDefaultCompetitiveness());
            result.put("suggestions", List.of("请确保简历内容完整", "建议添加更多量化成果", "优化关键词匹配度"));
            result.put("action_items", List.of("补充缺失的简历信息", "添加量化成果数据"));
            result.put("error", true);
            result.put("error_message", "AI 返回的格式不正确，已使用默认分析结果");
            result.put("timestamp", System.currentTimeMillis());

            return result;
        }
    }

    /**
     * 统计字符出现次数
     */
    private int countChar(String str, char target) {
        int count = 0;
        for (char c : str.toCharArray()) {
            if (c == target) count++;
        }
        return count;
    }

    /**
     * 从截断的响应中提取部分数据
     */
    private Map<String, Object> extractPartialData(String response) {
        try {
            Map<String, Object> result = new HashMap<>();
            
            // 尝试提取 overall_score
            Integer score = extractScoreFromText(response, "overall_score");
            if (score != null && score >= 0 && score <= 100) {
                result.put("overall_score", score);
            } else {
                result.put("overall_score", 70);
            }
            
            // 尝试提取 sections
            Map<String, Object> sections = extractSectionsFromText(response);
            if (!sections.isEmpty()) {
                validateSectionScores(sections);
                result.put("sections", sections);
            } else {
                result.put("sections", getDefaultSections());
            }
            
            // 尝试提取 competitiveness
            Map<String, Object> competitiveness = extractCompetitivenessFromText(response);
            if (!competitiveness.isEmpty()) {
                result.put("competitiveness", competitiveness);
            } else {
                result.put("competitiveness", getDefaultCompetitiveness());
            }
            
            return result;
        } catch (Exception e) {
            log.warn("Failed to extract partial data: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 从文本中提取 overall_score
     */
    private Integer extractScoreFromText(String text, String fieldName) {
        try {
            String pattern = "\"" + fieldName + "\"\\s*:\\s*(\\d+)";
            java.util.regex.Pattern r = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = r.matcher(text);
            if (m.find()) {
                return Integer.parseInt(m.group(1));
            }
        } catch (Exception e) {
            log.warn("Failed to extract score from text: {}", e.getMessage());
        }
        return null;
    }

    /**
     * 从文本中提取 sections
     */
    private Map<String, Object> extractSectionsFromText(String text) {
        Map<String, Object> sections = new HashMap<>();
        String[] sectionKeys = {"content_quality", "structure", "keywords", "achievements"};
        
        for (String key : sectionKeys) {
            try {
                // 查找 section 的开始位置
                String sectionPattern = "\"" + key + "\"\\s*:\\s*\\{";
                java.util.regex.Pattern r = java.util.regex.Pattern.compile(sectionPattern);
                java.util.regex.Matcher m = r.matcher(text);
                
                if (m.find()) {
                    int start = m.end() - 1;
                    // 找到匹配的结束括号
                    int braceCount = 0;
                    int end = start;
                    for (int i = start; i < text.length() && i < start + 2000; i++) {
                        char c = text.charAt(i);
                        if (c == '{') braceCount++;
                        else if (c == '}') {
                            braceCount--;
                            if (braceCount == 0) {
                                end = i + 1;
                                break;
                            }
                        }
                    }
                    
                    if (end > start) {
                        String sectionJson = text.substring(start, end);
                        Map<String, Object> section = objectMapper.readValue(sectionJson, Map.class);
                        sections.put(key, section);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to extract section {}: {}", key, e.getMessage());
            }
        }
        
        return sections;
    }

    /**
     * 从文本中提取 competitiveness
     */
    private Map<String, Object> extractCompetitivenessFromText(String text) {
        Map<String, Object> competitiveness = new HashMap<>();
        
        try {
            // 尝试提取 industry_ranking
            String rankingPattern = "\"industry_ranking\"\\s*:\\s*\"([^\"]+)\"";
            java.util.regex.Pattern r = java.util.regex.Pattern.compile(rankingPattern);
            java.util.regex.Matcher m = r.matcher(text);
            if (m.find()) {
                competitiveness.put("industry_ranking", m.group(1));
            } else {
                competitiveness.put("industry_ranking", "前50%");
            }
            
            // 尝试提取 strengths
            List<String> strengths = extractStringArrayFromText(text, "strengths");
            if (!strengths.isEmpty()) {
                competitiveness.put("strengths", strengths);
            } else {
                competitiveness.put("strengths", List.of("技术能力扎实", "项目经验丰富"));
            }
            
            // 尝试提取 weaknesses
            List<String> weaknesses = extractStringArrayFromText(text, "weaknesses");
            if (!weaknesses.isEmpty()) {
                competitiveness.put("weaknesses", weaknesses);
            } else {
                competitiveness.put("weaknesses", List.of("缺乏量化成果", "关键词覆盖不足"));
            }
            
        } catch (Exception e) {
            log.warn("Failed to extract competitiveness: {}", e.getMessage());
            competitiveness.put("industry_ranking", "前50%");
            competitiveness.put("strengths", List.of("技术能力扎实", "项目经验丰富"));
            competitiveness.put("weaknesses", List.of("缺乏量化成果", "关键词覆盖不足"));
        }
        
        return competitiveness;
    }

    /**
     * 从文本中提取字符串数组
     */
    private List<String> extractStringArrayFromText(String text, String fieldName) {
        List<String> result = new ArrayList<>();
        try {
            String pattern = "\"" + fieldName + "\"\\s*:\\s*\\[";
            java.util.regex.Pattern r = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = r.matcher(text);
            
            if (m.find()) {
                int start = m.end();
                int bracketCount = 1;
                int end = start;
                for (int i = start; i < text.length() && i < start + 1000; i++) {
                    char c = text.charAt(i);
                    if (c == '[') bracketCount++;
                    else if (c == ']') {
                        bracketCount--;
                        if (bracketCount == 0) {
                            end = i;
                            break;
                        }
                    }
                }
                
                if (end > start) {
                    String arrayContent = text.substring(start, end);
                    // 提取带引号的字符串
                    java.util.regex.Pattern stringPattern = java.util.regex.Pattern.compile("\"([^\"]+)\"");
                    java.util.regex.Matcher stringMatcher = stringPattern.matcher(arrayContent);
                    while (stringMatcher.find()) {
                        result.add(stringMatcher.group(1));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract string array {}: {}", fieldName, e.getMessage());
        }
        return result;
    }

    private Integer extractIntValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 验证并修复 sections 中的分数，确保在 0-100 范围内
     */
    private void validateSectionScores(Map<String, Object> sections) {
        if (sections == null) return;
        
        String[] sectionKeys = {"content_quality", "structure", "keywords", "achievements"};
        for (String key : sectionKeys) {
            Object sectionObj = sections.get(key);
            if (sectionObj instanceof Map) {
                Map<String, Object> section = (Map<String, Object>) sectionObj;
                Object scoreObj = section.get("score");
                int score = 75; // 默认分数
                
                if (scoreObj instanceof Number) {
                    score = ((Number) scoreObj).intValue();
                } else if (scoreObj != null) {
                    try {
                        score = Integer.parseInt(scoreObj.toString());
                    } catch (NumberFormatException e) {
                        log.warn("Invalid score format for section {}: {}", key, scoreObj);
                    }
                }
                
                // 验证分数范围
                if (score < 0 || score > 100) {
                    log.warn("Invalid score range for section {}: {}, using default 75", key, score);
                    score = 75;
                }
                
                section.put("score", score);
            }
        }
    }

    private Map<String, Object> getDefaultSections() {
        Map<String, Object> sections = new HashMap<>();
        
        Map<String, Object> contentQuality = new HashMap<>();
        contentQuality.put("score", 70);
        contentQuality.put("analysis", "内容基本完整，但可以进一步优化");
        sections.put("content_quality", contentQuality);
        
        Map<String, Object> structure = new HashMap<>();
        structure.put("score", 75);
        structure.put("analysis", "结构清晰，布局合理");
        sections.put("structure", structure);
        
        Map<String, Object> keywords = new HashMap<>();
        keywords.put("score", 65);
        keywords.put("analysis", "关键词覆盖尚可，建议增加更多行业术语");
        sections.put("keywords", keywords);
        
        Map<String, Object> achievements = new HashMap<>();
        achievements.put("score", 70);
        achievements.put("analysis", "成果描述较好，建议增加更多量化数据");
        sections.put("achievements", achievements);
        
        return sections;
    }

    private Map<String, Object> getDefaultCompetitiveness() {
        Map<String, Object> competitiveness = new HashMap<>();
        competitiveness.put("industry_ranking", "前50%");
        competitiveness.put("ranking_explanation", "基于当前简历内容的综合评估");
        competitiveness.put("strengths", List.of("技术能力扎实", "项目经验丰富"));
        competitiveness.put("weaknesses", List.of("缺乏量化成果", "关键词覆盖不足"));
        return competitiveness;
    }

    private Map<String, Object> createCheck(String name, Map<String, Object> dimension) {
        Map<String, Object> check = new HashMap<>();
        check.put("name", name);
        
        Integer score = (Integer) dimension.getOrDefault("score", 75);
        check.put("score", score);
        
        // 根据分数确定状态
        if (score >= 80) {
            check.put("status", "pass");
        } else if (score >= 60) {
            check.put("status", "warning");
        } else {
            check.put("status", "fail");
        }
        
        check.put("issues", dimension.getOrDefault("issues", new ArrayList<>()));
        return check;
    }

    private String getDiagnosisLevel(int score) {
        if (score >= 80) return "优秀";
        if (score >= 60) return "良好";
        return "一般";
    }

    private String extractSummary(String aiResponse) {
        // 提取摘要信息
        if (aiResponse.contains("总结") || aiResponse.contains("总体评价")) {
            int start = Math.max(0, aiResponse.indexOf("总体评价"));
            int end = aiResponse.indexOf("\n\n", start);
            if (end > start) {
                return aiResponse.substring(start, end).trim();
            }
        }
        // 如果没有找到总结，返回前200个字符
        return aiResponse.substring(0, Math.min(200, aiResponse.length())) + "...";
    }

    @Override
    public Map<String, Object> rewriteResume(Resume resume, Map<String, Object> healthAnalysis, String model) {
        log.info("Rewriting resume: {} with model: {}", resume.getId(), model);

        String prompt = buildRewritePrompt(resume, healthAnalysis);
        String aiResponse = tongyiQianwenService.generate(prompt, model);
        
        log.info("AI Response length: {}", aiResponse.length());
        log.debug("AI Response preview: {}", aiResponse.substring(0, Math.min(500, aiResponse.length())));

        Map<String, Object> result = new HashMap<>();
        
        // 添加使用的模型信息
        result.put("model", model != null ? model : DEFAULT_MODEL);
        
        // 解析AI响应
        Map<String, Object> parsedResponse = parseRewriteResponse(aiResponse);
        log.info("Parsed response keys: {}", parsedResponse.keySet());
        
        // 重写说明
        result.put("rewrite_summary", "根据AI分析，已对简历进行了全面优化，提升了专业度和竞争力");
        
        // 改进点 - 优先使用解析后的数据
        List<String> improvements = (List<String>) parsedResponse.get("improvements");
        if (improvements != null && !improvements.isEmpty()) {
            result.put("improvements", improvements);
        } else {
            log.warn("No improvements found in parsed response, using fallback");
            result.put("improvements", List.of("增强了量化成果描述", "优化了关键词匹配", "改进了语言表达"));
        }
        
        // 前后对比
        Map<String, Object> comparison = (Map<String, Object>) parsedResponse.get("before_after_comparison");
        if (comparison != null && !comparison.isEmpty()) {
            result.put("before_after_comparison", comparison);
        } else {
            log.warn("No comparison found in parsed response, generating from response");
            result.put("before_after_comparison", extractComparison(aiResponse));
        }
        
        // 已解决的问题
        result.put("issues_resolved", extractResolvedIssues(healthAnalysis));
        
        // 优化后的个人信息
        Map<String, Object> personalInfo = new HashMap<>();
        // AI返回的JSON结构中，个人简介位于personal_info.summary字段
        Map<String, Object> aiPersonalInfo = (Map<String, Object>) parsedResponse.get("personal_info");
        if (aiPersonalInfo != null && aiPersonalInfo.containsKey("summary")) {
            personalInfo.put("summary", aiPersonalInfo.get("summary"));
        } else {
            // 兼容旧格式，尝试直接从parsedResponse获取personal_summary
            String summary = (String) parsedResponse.get("personal_summary");
            if (summary != null) {
                personalInfo.put("summary", summary);
            } else {
                log.warn("No personal info summary found in AI response");
                personalInfo.put("summary", "个人简介已优化，突出核心竞争力");
            }
        }
        result.put("personal_info", personalInfo);
        
        // 优化后的工作经历
        List<Map<String, Object>> workExp = (List<Map<String, Object>>) parsedResponse.get("workExperiences");
        if (workExp == null || workExp.isEmpty()) {
            // 尝试旧字段名
            workExp = (List<Map<String, Object>>) parsedResponse.get("work_experience");
        }
        if (workExp != null && !workExp.isEmpty()) {
            result.put("workExperiences", workExp);
        } else {
            log.warn("No workExperiences found in parsed response");
            result.put("workExperiences", List.of());
        }
        
        // 优化后的技能 - 去重处理
        List<String> skills = (List<String>) parsedResponse.get("skills");
        if (skills != null && !skills.isEmpty()) {
            // 使用 LinkedHashMap 保持顺序并去重（忽略大小写）
            Map<String, String> uniqueSkillsMap = new LinkedHashMap<>();
            for (String skill : skills) {
                if (skill != null && !skill.trim().isEmpty()) {
                    String trimmedSkill = skill.trim();
                    String lowerKey = trimmedSkill.toLowerCase();
                    if (!uniqueSkillsMap.containsKey(lowerKey)) {
                        uniqueSkillsMap.put(lowerKey, trimmedSkill);
                    }
                }
            }
            List<String> uniqueSkills = new ArrayList<>(uniqueSkillsMap.values());
            log.info("Skills deduplicated: {} -> {} items", skills.size(), uniqueSkills.size());
            result.put("skills", uniqueSkills);
        } else {
            log.warn("No skills found in parsed response");
            result.put("skills", List.of());
        }

        // 优化后的教育经历
        List<Map<String, Object>> education = (List<Map<String, Object>>) parsedResponse.get("education");
        if (education != null && !education.isEmpty()) {
            result.put("education", education);
        } else {
            log.warn("No education found in parsed response");
            result.put("education", List.of());
        }

        // 优化后的项目经历
        List<Map<String, Object>> projects = (List<Map<String, Object>>) parsedResponse.get("projects");
        if (projects != null && !projects.isEmpty()) {
            result.put("projects", projects);
        } else {
            log.warn("No projects found in parsed response");
            result.put("projects", List.of());
        }

        result.put("timestamp", System.currentTimeMillis());
        
        log.info("Final result keys: {}", result.keySet());

        // 保存历史记录
        saveAiHistory(resume.getId(), "rewrite", aiResponse, result);

        return result;
    }

    // ========== Prompt构建方法 ==========

    private String buildAiAnalyzePrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位拥有20年HR经验的资深招聘专家和职业发展顾问，曾为世界500强企业招聘过大量人才。\n");
        sb.append("请以专业的视角对以下简历进行深度、精准的分析。\n\n");
        
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        
        sb.append("\n\n=== 分析框架（必须严格遵循） ===\n");
        sb.append("请采用以下专业的评估维度进行分析：\n\n");
        
        sb.append("1. 内容质量（权重25%）\n");
        sb.append("   - 完整性：是否包含所有核心模块（个人信息、教育、工作、技能）\n");
        sb.append("   - 准确性：时间线是否合理，信息是否真实可信\n");
        sb.append("   - 相关性：内容是否与求职目标高度匹配\n");
        sb.append("   - 专业性：用词是否精准，表达是否职业化\n\n");
        
        sb.append("2. 结构合理性（权重20%）\n");
        sb.append("   - 逻辑性：信息组织是否清晰，层次是否分明\n");
        sb.append("   - 优先级：重要信息是否放在显眼位置\n");
        sb.append("   - 一致性：格式、风格是否统一\n");
        sb.append("   - 易读性：是否便于HR快速抓取关键信息\n\n");
        
        sb.append("3. 关键词匹配（权重25%）\n");
        sb.append("   - 行业关键词：是否包含目标行业的专业术语\n");
        sb.append("   - 技能关键词：技术栈是否全面且符合市场要求\n");
        sb.append("   - 软技能关键词：是否体现重要的软实力\n");
        sb.append("   - 热门词汇：是否包含当前市场关注的热点\n\n");
        
        sb.append("4. 成果体现（权重30%）\n");
        sb.append("   - 量化程度：是否使用数据、百分比等量化成果\n");
        sb.append("   - 影响力：是否体现对业务/团队的实际影响\n");
        sb.append("   - 可验证性：成果是否具体、可被验证\n");
        sb.append("   - 价值导向：是否突出为企业创造的价值\n\n");
        
        sb.append("=== 评分标准（必须严格遵循） ===\n");
        sb.append("- 90-100分：优秀（接近完美，可直接用于投递）\n");
        sb.append("- 80-89分：良好（有亮点，小幅优化即可）\n");
        sb.append("- 70-79分：中等（需要重点优化）\n");
        sb.append("- 60-69分：较差（问题较多，需要大幅修改）\n");
        sb.append("- 0-59分：不合格（需要重新构建）\n\n");
        
        sb.append("=== 输出格式要求 ===\n");
        sb.append("必须严格按照以下JSON格式返回，不要添加任何其他文字说明：\n\n");
        sb.append("{\n");
        sb.append("  \"overall_score\": 85,\n");
        sb.append("  \"sections\": {\n");
        sb.append("    \"content_quality\": {\n");
        sb.append("      \"score\": 85,\n");
        sb.append("      \"analysis\": \"简短分析，控制在80字以内\"\n");
        sb.append("    },\n");
        sb.append("    \"structure\": {\n");
        sb.append("      \"score\": 90,\n");
        sb.append("      \"analysis\": \"简短分析，控制在80字以内\"\n");
        sb.append("    },\n");
        sb.append("    \"keywords\": {\n");
        sb.append("      \"score\": 80,\n");
        sb.append("      \"analysis\": \"简短分析，控制在80字以内\"\n");
        sb.append("    },\n");
        sb.append("    \"achievements\": {\n");
        sb.append("      \"score\": 85,\n");
        sb.append("      \"analysis\": \"简短分析，控制在80字以内\"\n");
        sb.append("    }\n");
        sb.append("  },\n");
        sb.append("  \"competitiveness\": {\n");
        sb.append("    \"industry_ranking\": \"前30%\",\n");
        sb.append("    \"strengths\": [\"优势1\", \"优势2\"],\n");
        sb.append("    \"weaknesses\": [\"不足1\", \"不足2\"]\n");
        sb.append("  },\n");
        sb.append("  \"suggestions\": [\n");
        sb.append("    \"建议1\",\n");
        sb.append("    \"建议2\"\n");
        sb.append("  ],\n");
        sb.append("  \"action_items\": [\n");
        sb.append("    \"行动1\",\n");
        sb.append("    \"行动2\"\n");
        sb.append("  ]\n");
        sb.append("}\n\n");
        
        sb.append("重要提示：\n");
        sb.append("- 必须返回纯JSON格式，不要包含markdown代码块标记（```json）\n");
        sb.append("- 所有文本字段必须简洁，避免过长（analysis字段80字以内，其他字段50字以内）\n");
        sb.append("- 严格限制总JSON长度在1500字符以内\n");
        sb.append("- overall_score 为 0-100 的整数\n");
        sb.append("- 每个 section 的 score 为 0-100 的整数\n");
        sb.append("- suggestions 最多3条，每条控制在50字以内\n");
        sb.append("- 基于20年HR经验，给出专业、实用的评价\n");
        
        return sb.toString();
    }

    private String buildHealthCheckPrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("【重要】请直接返回纯JSON格式，不要使用markdown代码块标记（```json），不要添加任何其他文字说明。\n\n");
        sb.append("你是一位专业的简历健康度评估专家，请对以下简历进行全面的健康度检查。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n请评估以下维度（每项0-100分）：\n");
        sb.append("1. 内容完整性 - 是否包含必要的信息（联系方式、教育背景、工作经历等）\n");
        sb.append("2. 专业度 - 用词是否专业，表达是否得体\n");
        sb.append("3. 竞争力 - 相比同类求职者的竞争优势\n");
        sb.append("4. 可读性 - 结构清晰，易于阅读\n\n");
        sb.append("=== 评分标准 ===\n");
        sb.append("- 90-100分：优秀（接近完美）\n");
        sb.append("- 80-89分：良好（表现良好）\n");
        sb.append("- 70-79分：一般（小幅优化即可）\n");
        sb.append("- 60-69分：一般（需要重点优化）\n");
        sb.append("- 0-59分：需改进（需要大幅修改）\n\n");
        sb.append("=== 输出格式要求 ===\n");
        sb.append("必须严格按照以下JSON格式返回，不要添加任何其他文字说明：\n\n");
        sb.append("{\n");
        sb.append("  \"overall_health\": <0-100的整数，基于四个维度的平均分>,\n");
        sb.append("  \"summary\": \"健康度检查的总体评价，2-3句话\",\n");
        sb.append("  \"details\": {\n");
        sb.append("    \"completeness\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"issues\": [\"问题1\", \"问题2\", ...],\n");
        sb.append("      \"suggestions\": [\"建议1\", \"建议2\", ...]\n");
        sb.append("    },\n");
        sb.append("    \"professionalism\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"issues\": [\"问题1\", \"问题2\", ...],\n");
        sb.append("      \"suggestions\": [\"建议1\", \"建议2\", ...]\n");
        sb.append("    },\n");
        sb.append("    \"competitiveness\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"issues\": [\"问题1\", \"问题2\", ...],\n");
        sb.append("      \"suggestions\": [\"建议1\", \"建议2\", ...]\n");
        sb.append("    },\n");
        sb.append("    \"readability\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"issues\": [\"问题1\", \"问题2\", ...],\n");
        sb.append("      \"suggestions\": [\"建议1\", \"建议2\", ...]\n");
        sb.append("    }\n");
        sb.append("  },\n");
        sb.append("  \"issues\": [\"整体问题1\", \"整体问题2\", ...],\n");
        sb.append("  \"improvements\": [\"快速改进1\", \"快速改进2\", ...]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String buildLayoutCheckPrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("【重要】请直接返回纯JSON格式，不要使用markdown代码块标记（```json），不要添加任何其他文字说明。\n\n");
        sb.append("你是一位专业的简历排版设计师，请对以下简历进行排版和格式检查。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n请评估以下排版维度（每项0-100分）：\n");
        sb.append("1. 视觉层次 - 标题、正文、强调的层次是否清晰\n");
        sb.append("2. 格式一致性 - 字体、间距、对齐是否统一\n");
        sb.append("3. 可读性 - 行距、段距是否合适，易于阅读\n");
        sb.append("4. 专业外观 - 整体是否看起来专业\n");
        sb.append("5. 留白使用 - 页面留白是否合理\n\n");
        sb.append("=== 评分标准 ===\n");
        sb.append("- 90-100分：优秀（接近完美）\n");
        sb.append("- 80-89分：专业（表现良好）\n");
        sb.append("- 70-79分：良好（小幅优化即可）\n");
        sb.append("- 60-69分：一般（需要重点优化）\n");
        sb.append("- 0-59分：需改进（需要大幅修改）\n\n");
        sb.append("=== 输出格式要求 ===\n");
        sb.append("必须严格按照以下JSON格式返回，不要添加任何其他文字说明：\n\n");
        sb.append("{\n");
        sb.append("  \"overall_score\": <0-100的整数，基于五个维度的平均分>,\n");
        sb.append("  \"summary\": \"排版检查的总体评价，2-3句话\",\n");
        sb.append("  \"dimensions\": {\n");
        sb.append("    \"visual_hierarchy\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"comment\": \"视觉层次的评价说明\"\n");
        sb.append("    },\n");
        sb.append("    \"format_consistency\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"comment\": \"格式一致性的评价说明\"\n");
        sb.append("    },\n");
        sb.append("    \"readability\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"comment\": \"可读性的评价说明\"\n");
        sb.append("    },\n");
        sb.append("    \"professional_appearance\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"comment\": \"专业外观的评价说明\"\n");
        sb.append("    },\n");
        sb.append("    \"white_space_usage\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"comment\": \"留白使用的评价说明\"\n");
        sb.append("    }\n");
        sb.append("  },\n");
        sb.append("  \"issues\": [\"格式问题1\", \"格式问题2\", ...],\n");
        sb.append("  \"suggestions\": [\"排版建议1\", \"排版建议2\", ...]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String buildDiagnosePrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("【重要】请直接返回纯JSON格式，不要使用markdown代码块标记（```json），不要添加任何其他文字说明。\n\n");
        sb.append("你是一位资深的简历诊断专家，拥有20年HR和招聘经验，请对以下简历进行全面诊断。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n=== 分析框架（必须严格遵循） ===\n");
        sb.append("请采用以下专业的评估维度进行分析：\n\n");
        sb.append("1. 内容质量（权重25%）\n");
        sb.append("   - 完整性：是否包含所有核心模块（个人信息、教育、工作、技能）\n");
        sb.append("   - 准确性：时间线是否合理，信息是否真实可信\n");
        sb.append("   - 相关性：内容是否与求职目标高度匹配\n");
        sb.append("   - 专业性：用词是否精准，表达是否职业化\n\n");
        sb.append("2. 结构合理性（权重20%）\n");
        sb.append("   - 逻辑性：信息组织是否清晰，层次是否分明\n");
        sb.append("   - 优先级：重要信息是否放在显眼位置\n");
        sb.append("   - 一致性：格式、风格是否统一\n");
        sb.append("   - 易读性：是否便于HR快速抓取关键信息\n\n");
        sb.append("3. 关键词匹配（权重25%）\n");
        sb.append("   - 行业关键词：是否包含目标行业的专业术语\n");
        sb.append("   - 技能关键词：技术栈是否全面且符合市场要求\n");
        sb.append("   - 软技能关键词：是否体现重要的软实力\n");
        sb.append("   - 热门词汇：是否包含当前市场关注的热点\n\n");
        sb.append("4. 成果体现（权重30%）\n");
        sb.append("   - 量化程度：是否使用数据、百分比等量化成果\n");
        sb.append("   - 影响力：是否体现对业务/团队的实际影响\n");
        sb.append("   - 可验证性：成果是否具体、可被验证\n");
        sb.append("   - 价值导向：是否突出为企业创造的价值\n\n");
        sb.append("=== 评分标准（必须严格遵循） ===\n");
        sb.append("- 90-100分：优秀（接近完美，可直接用于投递）\n");
        sb.append("- 80-89分：良好（有亮点，小幅优化即可）\n");
        sb.append("- 70-79分：中等（需要重点优化）\n");
        sb.append("- 60-69分：较差（问题较多，需要大幅修改）\n");
        sb.append("- 0-59分：不合格（需要重新构建）\n\n");
        sb.append("=== 输出格式要求 ===\n");
        sb.append("必须严格按照以下JSON格式返回，不要添加任何其他文字说明：\n\n");
        sb.append("{\n");
        sb.append("  \"overall_score\": <0-100的整数，基于四个维度的加权平均>,\n");
        sb.append("  \"sections\": {\n");
        sb.append("    \"content_quality\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"analysis\": \"详细的优缺点分析，至少3点优点和2点缺点\"\n");
        sb.append("    },\n");
        sb.append("    \"structure\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"analysis\": \"详细的优缺点分析，至少3点优点和2点缺点\"\n");
        sb.append("    },\n");
        sb.append("    \"keywords\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"analysis\": \"详细的优缺点分析，列出缺少的关键词\"\n");
        sb.append("    },\n");
        sb.append("    \"achievements\": {\n");
        sb.append("      \"score\": <0-100的整数>,\n");
        sb.append("      \"analysis\": \"详细的优缺点分析，量化成果分析\"\n");
        sb.append("    }\n");
        sb.append("  },\n");
        sb.append("  \"competitiveness\": {\n");
        sb.append("    \"industry_ranking\": \"行业排名（如：前30%、前50%等）\",\n");
        sb.append("    \"ranking_explanation\": \"排名的详细解释，基于什么标准得出\",\n");
        sb.append("    \"strengths\": [\"具体优势1（50字以内）\", \"具体优势2（50字以内）\", \"具体优势3（50字以内）\"],\n");
        sb.append("    \"weaknesses\": [\"具体不足1（50字以内）\", \"具体不足2（50字以内）\", \"具体不足3（50字以内）\"]\n");
        sb.append("  },\n");
        sb.append("  \"suggestions\": [\n");
        sb.append("    \"具体的改进建议1（100字以内）\",\n");
        sb.append("    \"具体的改进建议2（100字以内）\",\n");
        sb.append("    \"具体的改进建议3（100字以内）\"\n");
        sb.append("  ],\n");
        sb.append("  \"action_items\": [\n");
        sb.append("    \"立即行动项1（30字以内）\",\n");
        sb.append("    \"立即行动项2（30字以内）\"\n");
        sb.append("  ]\n");
        sb.append("}\n\n");
        sb.append("重要提示：\n");
        sb.append("- 必须返回纯JSON格式，不要包含markdown代码块标记（```json）\n");
        sb.append("- overall_score 为 0-100 的整数\n");
        sb.append("- 每个 section 的 score 为 0-100 的整数\n");
        sb.append("- analysis 字段必须详细、具体，不能空洞\n");
        sb.append("- suggestions 必须是可执行的具体建议\n");
        sb.append("- 基于20年HR经验，给出专业、实用的评价\n");
        sb.append("- 所有分数必须基于简历实际内容给出，不要使用固定的示例值\n");
        sb.append("- 确保返回的是纯JSON格式，不要包含markdown标记（```json或```）\n");
        sb.append("- 不要添加任何其他文字说明\n");
        sb.append("- 所有字段都必须有值，不能为null\n");
        sb.append("- 响应必须以 { 开始，以 } 结束\n");
        return sb.toString();
    }

    private String buildRewritePrompt(Resume resume, Map<String, Object> healthAnalysis) {
        StringBuilder sb = new StringBuilder();
        sb.append("【重要】请直接返回纯JSON格式，不要使用markdown代码块标记（```json），不要添加任何其他文字说明。\n\n");
        sb.append("你是一位顶级的简历优化专家，拥有15年简历撰写和职业咨询经验。\n");
        sb.append("你曾帮助超过5000名求职者成功获得BAT、TMD等一线互联网公司的offer。\n");
        sb.append("请根据以下简历内容进行专业重写和优化，使其成为一份能够通过HR筛选的顶级简历。\n\n");
        
        sb.append("=== 原始简历 ===\n");
        sb.append(buildResumeSummary(resume));

        if (healthAnalysis != null && !healthAnalysis.isEmpty()) {
            sb.append("\n\n=== 诊断报告（作为优化依据） ===\n");
            try {
                sb.append(objectMapper.writeValueAsString(healthAnalysis));
            } catch (Exception e) {
                sb.append(healthAnalysis.toString());
            }
        }

        sb.append("\n\n=== 优化标准（必须严格遵循） ===\n\n");
        
        sb.append("【个人简介优化标准】\n");
        sb.append("- 字数：80-120字，精炼有力\n");
        sb.append("- 结构：职业定位 + 核心优势 + 量化成果 + 职业目标\n");
        sb.append("- 要求：\n");
        sb.append("  1. 开头用1-2个词明确定位（如：资深全栈开发工程师）\n");
        sb.append("  2. 列出3-5个核心技能，体现专业深度\n");
        sb.append("  3. 至少包含1个量化成果（如：性能提升40%+）\n");
        sb.append("  4. 体现职业发展方向和价值主张\n");
        sb.append("  5. 使用强有力的动词和行业术语\n\n");
        
        sb.append("【工作经历优化标准 - STAR法则】\n");
        sb.append("- 每段经历必须包含：\n");
        sb.append("  1. 公司名 + 职位 + 时间\n");
        sb.append("  2. 职责描述（简洁，3-5句话）\n");
        sb.append("  3. 量化成果（2-4个，每个都包含具体数字）\n");
        sb.append("- 成果格式：动词 + 任务 + 方法 + 结果（数据）\n");
        sb.append("- 示例：\n");
        sb.append("  \"负责核心系统重构，采用微服务架构，优化数据库查询，将系统响应时间从500ms降低到180ms，提升64%\"\n");
        sb.append("- 如果简历中缺少工作经历，根据目标职位提供1-2段典型的专业模板\n\n");
        
        sb.append("【技能优化标准】\n");
        sb.append("- 分类：核心技术栈、相关技术、工具/框架\n");
        sb.append("- 数量：5-10个核心技能，不要太多\n");
        sb.append("- 要求：\n");
        sb.append("  1. 具体明确（不要写\"编程语言\"，要写\"Java、Python\"）\n");
        sb.append("  2. 按熟练度排序（最熟练的放前面）\n");
        sb.append("  3. 避免重复（每个技能只出现一次）\n");
        sb.append("  4. 包含当前市场热门技术\n\n");
        
        sb.append("【量化成果要求】\n");
        sb.append("- 必须包含的具体数据类型：\n");
        sb.append("  1. 性能提升：响应时间、吞吐量、并发量\n");
        sb.append("  2. 效率提升：开发时间、部署时间、测试覆盖率\n");
        sb.append("  3. 业务影响：用户增长、收入提升、成本降低\n");
        sb.append("  4. 团队贡献：代码质量、文档完善、知识分享\n");
        sb.append("- 如果简历中没有量化数据，根据职位提供合理的估算值（标注为示例）\n\n");

        sb.append("【教育经历优化标准】\n");
        sb.append("- 必须包含的字段：\n");
        sb.append("  1. school: 学校名称\n");
        sb.append("  2. degree: 学位（本科/硕士/博士等）\n");
        sb.append("  3. major: 专业名称\n");
        sb.append("  4. startDate: 开始时间（YYYY-MM格式）\n");
        sb.append("  5. endDate: 结束时间（YYYY-MM格式）\n");
        sb.append("- 如果原始简历有教育经历，保持原样或优化描述\n");
        sb.append("- 如果原始简历没有教育经历，根据目标职位生成合理的教育背景模板\n\n");

        sb.append("【项目经历优化标准】\n");
        sb.append("- 必须包含的字段：\n");
        sb.append("  1. name: 项目名称\n");
        sb.append("  2. role: 担任角色\n");
        sb.append("  3. description: 项目描述（使用STAR法则，突出技术难点和解决方案）\n");
        sb.append("  4. technologies: [\"技术栈1\", \"技术栈2\"]（使用的技术栈数组）\n");
        sb.append("  5. achievements: [\"量化成果1\", \"量化成果2\"]（项目成果，含具体数据）\n");
        sb.append("  6. startDate: 开始时间（YYYY-MM格式）\n");
        sb.append("  7. endDate: 结束时间（YYYY-MM格式）\n");
        sb.append("- 每个项目必须包含2-4个量化成果\n");
        sb.append("- 技术栈要具体明确\n");
        sb.append("- 如果原始简历有项目经历，基于原有内容优化\n");
        sb.append("- 如果原始简历没有项目经历，根据目标职位生成1-2个典型项目模板\n\n");
        
        sb.append("=== 重要提示 ===\n");
        sb.append("- 绝对不要说\"我需要更多信息\"或\"请提供更多详情\"\n");
        sb.append("- 如果信息不完整，提供专业的通用模板和示例\n");
        sb.append("- 所有内容必须基于简历内容进行优化，不能凭空捏造\n");
        sb.append("- 确保JSON格式正确，所有字段都有值\n");
        sb.append("- 技能列表要去重，不要重复\n\n");
        
        sb.append("=== 输出格式要求 ===\n");
        sb.append("必须严格按照以下JSON格式返回，不要添加任何其他文字说明：\n\n");
        sb.append("{\n");
        sb.append("  \"personal_info\": {\n");
        sb.append("    \"summary\": \"优化后的个人简介，80-120字，突出核心竞争力\"\n");
        sb.append("  },\n");
        sb.append("  \"workExperiences\": [\n");
        sb.append("    {\n");
        sb.append("      \"company\": \"公司名称\",\n");
        sb.append("      \"position\": \"职位名称\",\n");
        sb.append("      \"startDate\": \"开始时间（YYYY-MM格式）\",\n");
        sb.append("      \"endDate\": \"结束时间（YYYY-MM格式，在职则为null）\",\n");
        sb.append("      \"isCurrent\": false,\n");
        sb.append("      \"description\": \"使用STAR法则描述工作内容，简洁有力\",\n");
        sb.append("      \"achievements\": [\"量化成果1（含具体数据）\", \"量化成果2（含具体数据）\", \"量化成果3（含具体数据）\"]\n");
        sb.append("    }\n");
        sb.append("  ],\n");
        sb.append("  \"education\": [\n");
        sb.append("    {\n");
        sb.append("      \"school\": \"学校名称\",\n");
        sb.append("      \"degree\": \"学位\",\n");
        sb.append("      \"major\": \"专业\",\n");
        sb.append("      \"startDate\": \"开始时间（YYYY-MM格式）\",\n");
        sb.append("      \"endDate\": \"结束时间（YYYY-MM格式）\"\n");
        sb.append("    }\n");
        sb.append("  ],\n");
        sb.append("  \"projects\": [\n");
        sb.append("    {\n");
        sb.append("      \"name\": \"项目名称\",\n");
        sb.append("      \"role\": \"担任角色\",\n");
        sb.append("      \"description\": \"项目描述（突出技术难点和解决方案）\",\n");
        sb.append("      \"technologies\": [\"技术栈1\", \"技术栈2\", \"技术栈3\"],\n");
        sb.append("      \"achievements\": [\"量化成果1\", \"量化成果2\"],\n");
        sb.append("      \"startDate\": \"开始时间（YYYY-MM格式）\",\n");
        sb.append("      \"endDate\": \"结束时间（YYYY-MM格式）\"\n");
        sb.append("    }\n");
        sb.append("  ],\n");
        sb.append("  \"skills\": [\"核心技能1\", \"核心技能2\", \"核心技能3\", \"相关技能1\", \"相关技能2\"],\n");
        sb.append("  \"improvements\": [\n");
        sb.append("    \"具体的改进点1（50字以内）\",\n");
        sb.append("    \"具体的改进点2（50字以内）\",\n");
        sb.append("    \"具体的改进点3（50字以内）\"\n");
        sb.append("  ]\n");
        sb.append("}\n\n");
        
        sb.append("重要提示：\n");
        sb.append("- 必须返回纯JSON格式，不要包含markdown代码块标记（```json）\n");
        sb.append("- personal_info.summary 必须是80-120字的专业简介\n");
        sb.append("- workExperiences 中的 achievements 必须包含具体数据\n");
        sb.append("- workExperiences 中的 startDate 和 endDate 必须使用 YYYY-MM 格式\n");
        sb.append("- skills 数组要去重，不要重复\n");
        sb.append("- improvements 要列出主要的改进点\n");
        sb.append("- 所有字段名必须使用驼峰命名（workExperiences, startDate, endDate, isCurrent）\n");
        sb.append("- 响应必须以 { 开始，以 } 结束\n");
        sb.append("- 不要重复输出相同的内容\n");
        sb.append("- 基于15年简历优化经验，输出顶级质量的优化内容\n");
        
        return sb.toString();
    }

    // ========== 辅助方法 ==========

    private String buildResumeSummary(Resume resume) {
        StringBuilder sb = new StringBuilder();

        sb.append("目标职位: ").append(resume.getTargetPosition() != null ? resume.getTargetPosition() : "未指定").append("\n");

        if (resume.getPersonalInfo() != null) {
            PersonalInfo info = resume.getPersonalInfo();
            sb.append("\n【个人信息】\n");
            sb.append("姓名: ").append(info.getFullName() != null ? info.getFullName() : "未填写").append("\n");
            sb.append("邮箱: ").append(info.getEmail() != null ? info.getEmail() : "未填写").append("\n");
            sb.append("电话: ").append(info.getPhone() != null ? info.getPhone() : "未填写").append("\n");
            sb.append("所在地: ").append(info.getLocation() != null ? info.getLocation() : "未填写").append("\n");
            sb.append("个人简介: ").append(info.getSummary() != null ? info.getSummary() : "未填写").append("\n");
        }

        if (resume.getWorkExperiences() != null && !resume.getWorkExperiences().isEmpty()) {
            sb.append("\n【工作经历】\n");
            for (WorkExperience exp : resume.getWorkExperiences()) {
                sb.append("公司: ").append(exp.getCompany()).append("\n");
                sb.append("职位: ").append(exp.getPosition()).append("\n");
                sb.append("时间: ").append(exp.getStartDate()).append(" - ").append(exp.getEndDate() != null ? exp.getEndDate() : "至今").append("\n");
                sb.append("描述: ").append(exp.getDescription() != null ? exp.getDescription() : "未填写").append("\n");
                if (exp.getAchievements() != null && !exp.getAchievements().isEmpty()) {
                    sb.append("成果: ").append(String.join(", ", exp.getAchievements())).append("\n");
                }
                sb.append("\n");
            }
        }

        if (resume.getEducations() != null && !resume.getEducations().isEmpty()) {
            sb.append("\n【教育经历】\n");
            for (Education edu : resume.getEducations()) {
                sb.append("学校: ").append(edu.getSchool()).append("\n");
                sb.append("学位: ").append(edu.getDegree() != null ? edu.getDegree() : "未填写").append("\n");
                sb.append("专业: ").append(edu.getMajor() != null ? edu.getMajor() : "未填写").append("\n");
                sb.append("时间: ").append(edu.getStartDate()).append(" - ").append(edu.getEndDate()).append("\n\n");
            }
        }

        if (resume.getSkills() != null && !resume.getSkills().isEmpty()) {
            sb.append("\n【技能】\n");
            sb.append(resume.getSkills().stream()
                    .map(s -> s.getName() + "(" + s.getLevel() + "/5)")
                    .collect(Collectors.joining(", "))).append("\n");
        }

        if (resume.getProjects() != null && !resume.getProjects().isEmpty()) {
            sb.append("\n【项目经历】\n");
            for (Project project : resume.getProjects()) {
                sb.append("项目: ").append(project.getName()).append("\n");
                sb.append("角色: ").append(project.getRole() != null ? project.getRole() : "未填写").append("\n");
                sb.append("描述: ").append(project.getDescription() != null ? project.getDescription() : "未填写").append("\n");
                if (project.getTechnologies() != null && !project.getTechnologies().isEmpty()) {
                    sb.append("技术栈: ").append(String.join(", ", project.getTechnologies())).append("\n");
                }
                sb.append("\n");
            }
        }

        return sb.toString();
    }

    /**
     * 清理 AI 响应，去除 Markdown 代码块标记
     */
    private String cleanAiResponse(String response) {
        if (response == null || response.trim().isEmpty()) {
            return "";
        }
        String cleaned = response.trim();
        // 去除 Markdown 代码块标记
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    private int extractScore(String response, String scoreType) {
        try {
            // 清理响应中的 Markdown 标记
            String cleanedResponse = cleanAiResponse(response);
            
            // 首先检查响应是否看起来像 JSON 格式
            if (!cleanedResponse.startsWith("{") || !cleanedResponse.endsWith("}")) {
                log.warn("AI response is not in JSON format: {}", cleanedResponse.substring(0, Math.min(200, cleanedResponse.length())));
                return -1; // 返回 -1 表示响应格式不正确
            }

            // 尝试从JSON中提取分数（支持带引号和不带引号的字段名）
            String quotedPattern = "\"" + scoreType + "\"";
            String unquotedPattern = scoreType;
            
            int start = -1;
            if (cleanedResponse.contains(quotedPattern + ":")) {
                start = cleanedResponse.indexOf(quotedPattern + ":") + quotedPattern.length() + 1;
            } else if (cleanedResponse.contains(unquotedPattern + ":")) {
                start = cleanedResponse.indexOf(unquotedPattern + ":") + unquotedPattern.length() + 1;
            }
            
            if (start > 0) {
                // 跳过冒号后的空白字符
                while (start < cleanedResponse.length() && Character.isWhitespace(cleanedResponse.charAt(start))) {
                    start++;
                }
                int end = cleanedResponse.indexOf(",", start);
                if (end == -1) end = cleanedResponse.indexOf("}", start);
                if (end > start) {
                    String scoreStr = cleanedResponse.substring(start, end).trim();
                    // 去除可能的引号
                    scoreStr = scoreStr.replaceAll("\"", "").trim();
                    if (!scoreStr.isEmpty()) {
                        return Integer.parseInt(scoreStr.replaceAll("[^0-9]", ""));
                    }
                }
            }
            // 尝试从文本中提取
            if (cleanedResponse.contains(scoreType)) {
                int idx = cleanedResponse.indexOf(scoreType);
                String sub = cleanedResponse.substring(idx, Math.min(idx + 50, cleanedResponse.length()));
                String[] parts = sub.split("[:：]");
                if (parts.length > 1) {
                    String num = parts[1].replaceAll("[^0-9]", "").trim();
                    if (!num.isEmpty()) {
                        return Integer.parseInt(num);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract score for {}: {}", scoreType, e.getMessage());
        }
        return -1; // 返回 -1 表示无法提取分数
    }

    private Map<String, Object> parseSections(String response) {
        Map<String, Object> sections = new HashMap<>();
        // 简化实现，实际应该解析JSON
        sections.put("content_quality", Map.of("score", 80, "analysis", "内容质量良好"));
        sections.put("structure", Map.of("score", 85, "analysis", "结构清晰"));
        sections.put("keywords", Map.of("score", 75, "analysis", "关键词覆盖尚可"));
        sections.put("achievements", Map.of("score", 80, "analysis", "成果描述较好"));
        return sections;
    }

    private List<String> extractSuggestions(String response) {
        List<String> suggestions = new ArrayList<>();
        // 简化实现，从响应中提取建议
        if (response.contains("建议")) {
            String[] lines = response.split("\n");
            for (String line : lines) {
                if (line.contains("建议") || line.startsWith("-") || line.startsWith("•")) {
                    suggestions.add(line.trim());
                }
            }
        }
        if (suggestions.isEmpty()) {
            suggestions.add("建议增加更多量化成果");
            suggestions.add("建议优化关键词匹配度");
            suggestions.add("建议完善项目经历描述");
        }
        return suggestions;
    }

    private Map<String, Object> extractCompetitiveness(String response) {
        Map<String, Object> competitiveness = new HashMap<>();
        competitiveness.put("industry_ranking", "前40%");
        competitiveness.put("strengths", List.of("技术能力扎实", "项目经验丰富"));
        competitiveness.put("weaknesses", List.of("缺乏量化成果", "关键词覆盖不足"));
        return competitiveness;
    }

    private String determineOverallStatus(String response) {
        int score = extractScore(response, "健康度评分");
        if (score >= 90) return "优秀";
        if (score >= 80) return "良好";
        if (score >= 70) return "一般";
        if (score >= 60) return "及格";
        return "需要改进";
    }

    private Map<String, Object> extractCompletenessScore(String response) {
        return Map.of("score", extractScore(response, "内容完整性"), "status", "良好");
    }

    private Map<String, Object> extractProfessionalismScore(String response) {
        return Map.of("score", extractScore(response, "专业度"), "status", "良好");
    }

    private Map<String, Object> extractCompetitivenessScore(String response) {
        return Map.of("score", extractScore(response, "竞争力"), "status", "一般");
    }

    private Map<String, Object> extractReadabilityScore(String response) {
        return Map.of("score", extractScore(response, "可读性"), "status", "良好");
    }

    private List<Map<String, Object>> extractIssues(String response) {
        List<Map<String, Object>> issues = new ArrayList<>();
        // 简化实现
        issues.add(Map.of("severity", "medium", "category", "工作经历", "description", "建议增加更多量化成果"));
        issues.add(Map.of("severity", "low", "category", "技能", "description", "建议按重要性排序技能"));
        return issues;
    }

    private List<String> extractImprovements(String response) {
        return extractSuggestions(response);
    }

    private Map<String, Object> extractDimensionScore(String response, String dimension) {
        return Map.of("score", extractScore(response, dimension), "comment", dimension + "评估");
    }

    private List<String> extractLayoutIssues(String response) {
        return List.of("部分段落间距可以优化", "建议统一字体大小");
    }

    private List<String> extractLayoutSuggestions(String response) {
        return List.of("增加段落间距提升可读性", "使用统一的标题样式");
    }

    private List<String> extractCriticalIssues(String response) {
        return List.of();
    }

    private List<String> extractWarnings(String response) {
        return List.of("工作经历描述可以更详细", "建议添加更多技术关键词");
    }

    private List<String> extractDiagnoseSuggestions(String response) {
        return extractSuggestions(response);
    }

    private List<String> extractPriorityActions(String response) {
        return List.of("量化工作成果，使用数据说明贡献", "优化个人简介，突出核心竞争力");
    }

    private String extractSection(String response, String sectionName) {
        // 简化实现，从响应中提取特定部分
        return "优化后的" + sectionName;
    }

    private List<String> extractRewriteImprovements(String response) {
        List<String> improvements = new ArrayList<>();
        
        // 尝试从 AI 响应中提取改进点
        try {
            // 查找 "improvements" 数组
            int improvementsStart = response.indexOf("\"improvements\"");
            if (improvementsStart >= 0) {
                int arrayStart = response.indexOf("[", improvementsStart);
                int arrayEnd = response.indexOf("]", arrayStart);
                
                if (arrayStart >= 0 && arrayEnd > arrayStart) {
                    String arrayStr = response.substring(arrayStart, arrayEnd + 1);
                    try {
                        List<String> improvementsList = objectMapper.readValue(arrayStr, List.class);
                        return improvementsList;
                    } catch (Exception e) {
                        log.warn("Failed to parse improvements array: {}", e.getMessage());
                    }
                }
            }
            
            // 如果没有找到专门的 improvements 数组，从响应中提取
            String[] improvementKeywords = {"改进", "优化", "增强", "提升", "改善"};
            String[] sentences = response.split("[。！？]");
            for (String sentence : sentences) {
                for (String keyword : improvementKeywords) {
                    if (sentence.contains(keyword) && sentence.length() < 100) {
                        improvements.add(sentence.trim());
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error extracting improvements: {}", e.getMessage());
        }
        
        return improvements;
    }

    private Map<String, Object> extractComparison(String response) {
        Map<String, Object> comparison = new HashMap<>();
        
        // 尝试从 AI 响应中提取对比信息
        try {
            // 查找 "before_after_comparison" 部分
            int comparisonStart = response.indexOf("before_after_comparison");
            if (comparisonStart >= 0) {
                int jsonStart = response.indexOf("{", comparisonStart);
                int jsonEnd = response.lastIndexOf("}", comparisonStart + 1000); // 在合理范围内查找
                
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                    String jsonStr = response.substring(jsonStart, jsonEnd + 1);
                    try {
                        Map<String, Object> jsonMap = objectMapper.readValue(jsonStr, Map.class);
                        return jsonMap;
                    } catch (Exception e) {
                        log.warn("Failed to parse comparison JSON: {}", e.getMessage());
                    }
                }
            }
            
            // 如果没有找到专门的对比部分，从整个响应中提取
            comparison.put("key_changes", extractChanges(response));
        } catch (Exception e) {
            log.warn("Error extracting comparison: {}", e.getMessage());
        }
        
        return comparison;
    }
    
    private List<String> extractChanges(String response) {
        List<String> changes = new ArrayList<>();
        
        // 尝试从响应中提取关键改进点
        String[] keywords = {"优化", "改进", "增强", "提升", "增加", "改进了", "优化了"};
        
        String[] sentences = response.split("[。！？]");
        for (String sentence : sentences) {
            for (String keyword : keywords) {
                if (sentence.contains(keyword) && sentence.length() < 100) {
                    changes.add(sentence.trim());
                    break;
                }
            }
        }
        
        return changes;
    }

    private Map<String, Object> parseRewriteResponse(String response) {
        Map<String, Object> parsed = new HashMap<>();
        
        // 清理响应：移除 markdown 代码块标记
        String cleanedResponse = response.replaceAll("```json\\s*", "")
                                        .replaceAll("```\\s*", "")
                                        .trim();
        
        // 尝试从响应中提取 JSON 部分
        int jsonStart = cleanedResponse.indexOf("{");
        int jsonEnd = cleanedResponse.lastIndexOf("}");
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            String jsonStr = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            try {
                log.debug("Parsing JSON from AI response: {}", jsonStr);
                Map<String, Object> jsonMap = objectMapper.readValue(jsonStr, Map.class);
                return jsonMap;
            } catch (Exception e) {
                log.warn("Failed to parse JSON from response: {}", e.getMessage());
                log.debug("Response content: {}", cleanedResponse);
            }
        }
        
        // 如果解析失败，记录错误并返回空映射
        log.error("No valid JSON found in AI response");
        return new HashMap<>();
    }

    private List<String> extractResolvedIssues(Map<String, Object> healthAnalysis) {
        List<String> resolved = new ArrayList<>();
        
        if (healthAnalysis != null) {
            // 从健康分析中提取问题并生成已解决的描述
            List<Map<String, Object>> issues = (List<Map<String, Object>>) healthAnalysis.get("issues");
            if (issues != null && !issues.isEmpty()) {
                for (Map<String, Object> issue : issues) {
                    String description = (String) issue.get("description");
                    String severity = (String) issue.get("severity");
                    if (description != null) {
                        resolved.add("已解决" + (severity != null ? " (" + severity + "级别)" : "") + ": " + description);
                    }
                }
            }
        }
        
        return resolved;
    }

    /**
     * 保存 AI 生成历史记录
     */
    private void saveAiHistory(String resumeId, String type, String aiResponse, Map<String, Object> parsedData) {
        try {
            String parsedDataJson = objectMapper.writeValueAsString(parsedData);
            
            ResumeAiHistory history = ResumeAiHistory.builder()
                    .resumeId(resumeId)
                    .type(type)
                    .aiResponse(aiResponse)
                    .parsedData(parsedDataJson)
                    .model("glm-4")
                    .build();
            
            historyRepository.save(history);
            log.info("Saved AI history: resumeId={}, type={}", resumeId, type);
        } catch (Exception e) {
            log.error("Failed to save AI history", e);
        }
    }

    /**
     * 获取 AI 生成历史记录
     */
    public List<Map<String, Object>> getAiHistory(String resumeId, String type) {
        try {
            List<ResumeAiHistory> histories;
            if (type != null) {
                histories = historyRepository.findByResumeIdAndTypeOrderByCreatedAtDesc(resumeId, type);
            } else {
                histories = historyRepository.findByResumeIdOrderByCreatedAtDesc(resumeId);
            }
            
            return histories.stream().map(h -> {
                try {
                    Map<String, Object> parsedData = objectMapper.readValue(h.getParsedData(), Map.class);
                    Map<String, Object> history = new HashMap<>();
                    history.put("id", h.getId());
                    history.put("type", h.getType());
                    history.put("ai_response", h.getAiResponse());
                    history.put("parsed_data", parsedData);
                    history.put("created_at", h.getCreatedAt());
                    history.put("model", h.getModel());
                    return history;
                } catch (Exception e) {
                    log.warn("Failed to parse history data for id {}: {}", h.getId(), e.getMessage());
                    Map<String, Object> history = new HashMap<>();
                    history.put("id", h.getId());
                    history.put("type", h.getType());
                    history.put("ai_response", h.getAiResponse());
                    history.put("parsed_data", Map.of());
                    history.put("created_at", h.getCreatedAt());
                    history.put("model", h.getModel());
                    history.put("error", "Failed to parse data");
                    return history;
                }
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to get AI history", e);
            return List.of();
        }
    }
}
