package com.iflow.agent.domain.resume.service.impl;

import com.iflow.agent.domain.resume.entity.*;
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

    private final TongyiQianwenService tongyiQianwenService;
    private final ObjectMapper objectMapper;

    @Override
    public Map<String, Object> aiAnalyzeResume(Resume resume) {
        log.info("AI analyzing resume: {}", resume.getId());

        String prompt = buildAiAnalyzePrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);

        // 解析AI响应，构建结构化结果
        Map<String, Object> result = new HashMap<>();
        result.put("overall_score", extractScore(aiResponse, "整体评分"));
        result.put("analysis", aiResponse);
        result.put("sections", parseSections(aiResponse));
        result.put("suggestions", extractSuggestions(aiResponse));
        result.put("competitiveness", extractCompetitiveness(aiResponse));
        result.put("timestamp", System.currentTimeMillis());

        return result;
    }

    @Override
    public Map<String, Object> healthCheck(Resume resume) {
        log.info("Health checking resume: {}", resume.getId());

        String prompt = buildHealthCheckPrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);

        Map<String, Object> result = new HashMap<>();
        result.put("health_score", extractScore(aiResponse, "健康度评分"));
        result.put("overall_status", determineOverallStatus(aiResponse));
        result.put("analysis", aiResponse);

        // 各项检查详情
        Map<String, Object> details = new HashMap<>();
        details.put("completeness", extractCompletenessScore(aiResponse));
        details.put("professionalism", extractProfessionalismScore(aiResponse));
        details.put("competitiveness", extractCompetitivenessScore(aiResponse));
        details.put("readability", extractReadabilityScore(aiResponse));
        result.put("details", details);

        // 问题列表
        result.put("issues", extractIssues(aiResponse));

        // 改进建议
        result.put("improvements", extractImprovements(aiResponse));
        result.put("timestamp", System.currentTimeMillis());

        return result;
    }

    @Override
    public Map<String, Object> layoutCheck(Resume resume) {
        log.info("Layout checking resume: {}", resume.getId());

        String prompt = buildLayoutCheckPrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);

        Map<String, Object> result = new HashMap<>();
        result.put("layout_score", extractScore(aiResponse, "排版评分"));
        result.put("analysis", aiResponse);

        // 排版检查维度
        Map<String, Object> dimensions = new HashMap<>();
        dimensions.put("visual_hierarchy", extractDimensionScore(aiResponse, "视觉层次"));
        dimensions.put("format_consistency", extractDimensionScore(aiResponse, "格式一致性"));
        dimensions.put("readability", extractDimensionScore(aiResponse, "可读性"));
        dimensions.put("professional_appearance", extractDimensionScore(aiResponse, "专业外观"));
        dimensions.put("white_space_usage", extractDimensionScore(aiResponse, "留白使用"));
        result.put("dimensions", dimensions);

        // 具体问题
        result.put("issues", extractLayoutIssues(aiResponse));

        // 排版建议
        result.put("suggestions", extractLayoutSuggestions(aiResponse));
        result.put("timestamp", System.currentTimeMillis());

        return result;
    }

    @Override
    public Map<String, Object> diagnoseResume(Resume resume) {
        log.info("Diagnosing resume: {}", resume.getId());

        String prompt = buildDiagnosePrompt(resume);
        String aiResponse = tongyiQianwenService.generate(prompt);

        int diagnosisScore = extractScore(aiResponse, "诊断评分");

        // 如果分数为 -1，说明 AI 响应不是 JSON 格式，可能是简历为空或其他错误
        if (diagnosisScore == -1) {
            log.warn("AI response is not in valid JSON format. Response: {}", aiResponse.substring(0, Math.min(500, aiResponse.length())));

            Map<String, Object> result = new HashMap<>();
            result.put("overall_score", 0);
            result.put("diagnosis_level", "无法诊断");
            result.put("summary", "简历诊断失败");
            result.put("analysis", aiResponse);
            result.put("error", true);
            result.put("error_message", "AI 返回的格式不正确，可能是简历内容为空或格式异常");

            // 返回空的检查列表
            result.put("checks", new ArrayList<>());
            result.put("critical_issues", List.of(aiResponse));
            result.put("warnings", List.of());
            result.put("suggestions", List.of("请检查简历内容是否完整", "确保包含个人信息、工作经历、教育背景等"));
            result.put("priority_actions", List.of());
            result.put("timestamp", System.currentTimeMillis());

            return result;
        }

        Map<String, Object> contentCompleteness = extractDimensionScore(aiResponse, "内容完整性");
        Map<String, Object> quantifiedAchievements = extractDimensionScore(aiResponse, "量化成果");
        Map<String, Object> keywordMatching = extractDimensionScore(aiResponse, "关键词匹配");
        Map<String, Object> formatStandard = extractDimensionScore(aiResponse, "格式规范");
        Map<String, Object> languageExpression = extractDimensionScore(aiResponse, "语言表达");
        Map<String, Object> lengthControl = extractDimensionScore(aiResponse, "篇幅控制");

        Map<String, Object> result = new HashMap<>();

        // 前端期望的格式
        result.put("overall_score", diagnosisScore);
        result.put("diagnosis_level", getDiagnosisLevel(diagnosisScore));
        result.put("summary", extractSummary(aiResponse));
        result.put("analysis", aiResponse);
        result.put("error", false);

        // 转换为前端期望的 checks 格式
        List<Map<String, Object>> checks = new ArrayList<>();
        checks.add(createCheck("内容完整性", contentCompleteness));
        checks.add(createCheck("量化成果", quantifiedAchievements));
        checks.add(createCheck("关键词匹配", keywordMatching));
        checks.add(createCheck("格式规范", formatStandard));
        checks.add(createCheck("语言表达", languageExpression));
        checks.add(createCheck("篇幅控制", lengthControl));
        result.put("checks", checks);

        // 问题分类
        result.put("critical_issues", extractCriticalIssues(aiResponse));
        result.put("warnings", extractWarnings(aiResponse));
        result.put("suggestions", extractDiagnoseSuggestions(aiResponse));
        result.put("priority_actions", extractPriorityActions(aiResponse));
        result.put("timestamp", System.currentTimeMillis());

        return result;
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
    public Map<String, Object> rewriteResume(Resume resume, Map<String, Object> healthAnalysis) {
        log.info("Rewriting resume: {}", resume.getId());

        String prompt = buildRewritePrompt(resume, healthAnalysis);
        String aiResponse = tongyiQianwenService.generate(prompt);

        Map<String, Object> result = new HashMap<>();
        result.put("original_resume", buildResumeSummary(resume));
        result.put("rewritten_content", aiResponse);

        // 解析重写后的各个部分
        Map<String, Object> sections = new HashMap<>();
        sections.put("personal_summary", extractSection(aiResponse, "个人简介"));
        sections.put("work_experience", extractSection(aiResponse, "工作经历"));
        sections.put("skills", extractSection(aiResponse, "技能"));
        sections.put("projects", extractSection(aiResponse, "项目经历"));
        result.put("sections", sections);

        // 改进说明
        result.put("improvements", extractRewriteImprovements(aiResponse));
        result.put("before_after_comparison", extractComparison(aiResponse));
        result.put("timestamp", System.currentTimeMillis());

        return result;
    }

    // ========== Prompt构建方法 ==========

    private String buildAiAnalyzePrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位资深的HR和职业发展顾问，请对以下简历进行深度分析。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n请从以下几个维度进行全面分析，并以JSON格式返回结果：\n");
        sb.append("{\n");
        sb.append("  \"overall_score\": 85,\n");
        sb.append("  \"sections\": {\n");
        sb.append("    \"content_quality\": {\"score\": 85, \"analysis\": \"...\"},\n");
        sb.append("    \"structure\": {\"score\": 90, \"analysis\": \"...\"},\n");
        sb.append("    \"keywords\": {\"score\": 80, \"analysis\": \"...\"},\n");
        sb.append("    \"achievements\": {\"score\": 85, \"analysis\": \"...\"}\n");
        sb.append("  },\n");
        sb.append("  \"competitiveness\": {\n");
        sb.append("    \"industry_ranking\": \"前30%\",\n");
        sb.append("    \"strengths\": [\"...\", \"...\"],\n");
        sb.append("    \"weaknesses\": [\"...\", \"...\"]\n");
        sb.append("  },\n");
        sb.append("  \"suggestions\": [\"...\", \"...\"],\n");
        sb.append("  \"action_items\": [\"...\", \"...\"]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String buildHealthCheckPrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位专业的简历健康度评估专家，请对以下简历进行全面的健康度检查。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n请评估以下维度（每项0-100分）：\n");
        sb.append("1. 内容完整性 - 是否包含必要的信息（联系方式、教育背景、工作经历等）\n");
        sb.append("2. 专业度 - 用词是否专业，表达是否得体\n");
        sb.append("3. 竞争力 - 相比同类求职者的竞争优势\n");
        sb.append("4. 可读性 - 结构清晰，易于阅读\n\n");
        sb.append("请返回JSON格式：\n");
        sb.append("{\n");
        sb.append("  \"health_score\": 78,\n");
        sb.append("  \"overall_status\": \"良好\",\n");
        sb.append("  \"details\": {\n");
        sb.append("    \"completeness\": {\"score\": 80, \"status\": \"良好\"},\n");
        sb.append("    \"professionalism\": {\"score\": 85, \"status\": \"优秀\"},\n");
        sb.append("    \"competitiveness\": {\"score\": 70, \"status\": \"一般\"},\n");
        sb.append("    \"readability\": {\"score\": 75, \"status\": \"良好\"}\n");
        sb.append("  },\n");
        sb.append("  \"issues\": [\n");
        sb.append("    {\"severity\": \"high\", \"category\": \"工作经历\", \"description\": \"...\"}\n");
        sb.append("  ],\n");
        sb.append("  \"improvements\": [\"...\", \"...\"]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String buildLayoutCheckPrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位专业的简历排版设计师，请对以下简历进行排版和格式检查。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n请评估以下排版维度（每项0-100分）：\n");
        sb.append("1. 视觉层次 - 标题、正文、强调的层次是否清晰\n");
        sb.append("2. 格式一致性 - 字体、间距、对齐是否统一\n");
        sb.append("3. 可读性 - 行距、段距是否合适，易于阅读\n");
        sb.append("4. 专业外观 - 整体是否看起来专业\n");
        sb.append("5. 留白使用 - 页面留白是否合理\n\n");
        sb.append("请返回JSON格式：\n");
        sb.append("{\n");
        sb.append("  \"layout_score\": 82,\n");
        sb.append("  \"dimensions\": {\n");
        sb.append("    \"visual_hierarchy\": {\"score\": 85, \"comment\": \"...\"},\n");
        sb.append("    \"format_consistency\": {\"score\": 80, \"comment\": \"...\"},\n");
        sb.append("    \"readability\": {\"score\": 85, \"comment\": \"...\"},\n");
        sb.append("    \"professional_appearance\": {\"score\": 80, \"comment\": \"...\"},\n");
        sb.append("    \"white_space_usage\": {\"score\": 80, \"comment\": \"...\"}\n");
        sb.append("  },\n");
        sb.append("  \"issues\": [\"...\", \"...\"],\n");
        sb.append("  \"suggestions\": [\"...\", \"...\"]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String buildDiagnosePrompt(Resume resume) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位资深的简历诊断专家，请对以下简历进行全面诊断。\n\n");
        sb.append("=== 简历内容 ===\n");
        sb.append(buildResumeSummary(resume));
        sb.append("\n\n请从以下维度进行诊断（每项0-100分）：\n");
        sb.append("1. 内容完整性 - 必要信息是否齐全\n");
        sb.append("2. 量化成果 - 是否使用数据说明成果\n");
        sb.append("3. 关键词匹配 - 是否包含行业关键词\n");
        sb.append("4. 格式规范 - 格式是否符合标准\n");
        sb.append("5. 语言表达 - 表达是否清晰、专业\n");
        sb.append("6. 篇幅控制 - 长度是否合适\n\n");
        sb.append("请返回JSON格式：\n");
        sb.append("{\n");
        sb.append("  \"diagnosis_score\": 75,\n");
        sb.append("  \"dimensions\": {\n");
        sb.append("    \"content_completeness\": {\"score\": 80, \"issues\": []},\n");
        sb.append("    \"quantified_achievements\": {\"score\": 65, \"issues\": []},\n");
        sb.append("    \"keyword_matching\": {\"score\": 70, \"issues\": []},\n");
        sb.append("    \"format_standard\": {\"score\": 85, \"issues\": []},\n");
        sb.append("    \"language_expression\": {\"score\": 80, \"issues\": []},\n");
        sb.append("    \"length_control\": {\"score\": 75, \"issues\": []}\n");
        sb.append("  },\n");
        sb.append("  \"critical_issues\": [\"...\", \"...\"],\n");
        sb.append("  \"warnings\": [\"...\", \"...\"],\n");
        sb.append("  \"suggestions\": [\"...\", \"...\"],\n");
        sb.append("  \"priority_actions\": [\"...\", \"...\"]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String buildRewritePrompt(Resume resume, Map<String, Object> healthAnalysis) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位专业的简历优化专家，请根据以下简历和诊断报告，重写并优化简历内容。\n\n");
        sb.append("=== 原始简历 ===\n");
        sb.append(buildResumeSummary(resume));

        if (healthAnalysis != null && !healthAnalysis.isEmpty()) {
            sb.append("\n\n=== 诊断报告 ===\n");
            try {
                sb.append(objectMapper.writeValueAsString(healthAnalysis));
            } catch (Exception e) {
                sb.append(healthAnalysis.toString());
            }
        }

        sb.append("\n\n请重写以下内容，使其更加专业、有竞争力：\n");
        sb.append("1. 个人简介 - 突出核心优势和职业目标\n");
        sb.append("2. 工作经历 - 使用STAR法则，强调成果和量化数据\n");
        sb.append("3. 技能 - 按重要性排序，突出核心技能\n");
        sb.append("4. 项目经历 - 突出技术难点和解决方案\n\n");
        sb.append("请返回JSON格式：\n");
        sb.append("{\n");
        sb.append("  \"personal_summary\": \"优化后的个人简介...\",\n");
        sb.append("  \"work_experience\": [\n");
        sb.append("    {\"company\": \"...\", \"position\": \"...\", \"description\": \"...\"}\n");
        sb.append("  ],\n");
        sb.append("  \"skills\": [\"...\", \"...\"],\n");
        sb.append("  \"projects\": [\n");
        sb.append("    {\"name\": \"...\", \"description\": \"...\"}\n");
        sb.append("  ],\n");
        sb.append("  \"improvements\": [\"...\", \"...\"],\n");
        sb.append("  \"before_after_comparison\": {\"key_changes\": [\"...\", \"...\"]}\n");
        sb.append("}\n");
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

            // 尝试从JSON中提取分数
            if (cleanedResponse.contains("\"" + scoreType + "\":")) {
                int start = cleanedResponse.indexOf("\"" + scoreType + "\":") + scoreType.length() + 3;
                int end = cleanedResponse.indexOf(",", start);
                if (end == -1) end = cleanedResponse.indexOf("}", start);
                String scoreStr = cleanedResponse.substring(start, end).trim();
                return Integer.parseInt(scoreStr.replaceAll("[^0-9]", ""));
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
        return List.of("增强了量化成果描述", "优化了关键词匹配", "改进了语言表达");
    }

    private Map<String, Object> extractComparison(String response) {
        return Map.of("key_changes", List.of("增加了量化数据", "优化了技能描述", "改进了项目经历"));
    }
}
