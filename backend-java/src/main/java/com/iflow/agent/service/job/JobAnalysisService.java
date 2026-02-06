package com.iflow.agent.service.job;

import com.iflow.agent.dto.job.JobAnalysisResponse;
import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 职位分析服务 - 对应 Python 的 JobAnalyzer
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobAnalysisService {

    private final TongyiQianwenService tongyiQianwenService;

    // 简单内存缓存
    private final Map<String, JobAnalysisResponse> analysisCache = new ConcurrentHashMap<>();

    // 支持的招聘网站
    private static final Map<String, String> SUPPORTED_SITES = Map.of(
            "zhipin.com", "BOSS直聘",
            "lagou.com", "拉勾网",
            "liepin.com", "猎聘网",
            "zhaopin.com", "智联招聘",
            "51job.com", "前程无忧",
            "maimai.cn", "脉脉"
    );

    /**
     * 分析招聘网页
     */
    public JobAnalysisResponse analyzeJobPage(String url) {
        log.info("Analyzing job page: {}", url);

        // 检查缓存
        if (analysisCache.containsKey(url)) {
            log.info("Using cached data for: {}", url);
            return analysisCache.get(url);
        }

        try {
            // 1. 模拟爬取网页内容（实际应该使用 WebClient 或 Jsoup）
            Map<String, Object> pageData = scrapeJobPage(url);

            // 2. 分析内容
            JobAnalysisResponse result = analyzeJobContent(pageData);

            // 3. 生成面试问题
            List<Map<String, Object>> questions = generateInterviewQuestions(result);
            result.setInterviewQuestions(questions);

            // 4. 缓存结果
            analysisCache.put(url, result);

            return result;

        } catch (Exception e) {
            log.error("Failed to analyze job page: {}", url, e);
            throw new RuntimeException("分析失败: " + e.getMessage());
        }
    }

    /**
     * 从文本中提取技能
     */
    public List<String> extractSkills(String text) {
        if (text == null || text.isEmpty()) {
            return List.of();
        }

        // 常见技术技能关键词
        List<String> commonSkills = List.of(
                "Java", "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular",
                "Spring", "Spring Boot", "Node.js", "Go", "Rust", "C++", "C#",
                "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
                "Docker", "Kubernetes", "AWS", "Azure", "GCP",
                "Git", "CI/CD", "Jenkins", "GitLab", "GitHub",
                "Linux", "Nginx", "Tomcat", "Kafka", "RabbitMQ",
                "Microservices", "RESTful API", "GraphQL", "gRPC",
                "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
                "HTML", "CSS", "Sass", "Less", "Webpack", "Vite",
                "Android", "iOS", "Flutter", "React Native", "Swift", "Kotlin"
        );

        List<String> foundSkills = new ArrayList<>();
        String lowerText = text.toLowerCase();

        for (String skill : commonSkills) {
            if (lowerText.contains(skill.toLowerCase())) {
                foundSkills.add(skill);
            }
        }

        return foundSkills;
    }

    /**
     * 获取支持的招聘网站
     */
    public List<Map<String, String>> getSupportedSites() {
        return SUPPORTED_SITES.entrySet().stream()
                .map(entry -> Map.of(
                        "domain", entry.getKey(),
                        "name", entry.getValue()
                ))
                .toList();
    }

    /**
     * 清除缓存
     */
    public int clearCache() {
        int count = analysisCache.size();
        analysisCache.clear();
        return count;
    }

    // ========== 私有方法 ==========

    private Map<String, Object> scrapeJobPage(String url) {
        // 简化实现，实际应该使用 WebClient 爬取网页
        // 这里模拟返回一些数据
        return Map.of(
                "url", url,
                "title", "高级Java开发工程师",
                "text", "我们正在寻找一位经验丰富的高级Java开发工程师...",
                "site_type", detectSiteType(url)
        );
    }

    private String detectSiteType(String url) {
        String lowerUrl = url.toLowerCase();
        for (String domain : SUPPORTED_SITES.keySet()) {
            if (lowerUrl.contains(domain)) {
                return SUPPORTED_SITES.get(domain);
            }
        }
        return "unknown";
    }

    private JobAnalysisResponse analyzeJobContent(Map<String, Object> pageData) {
        String text = (String) pageData.getOrDefault("text", "");
        String title = (String) pageData.getOrDefault("title", "");

        // 使用 LLM 分析
        String prompt = buildAnalysisPrompt(title, text);
        String response = tongyiQianwenService.generate(prompt);

        // 解析结果
        return parseAnalysisResult(response, text);
    }

    private String buildAnalysisPrompt(String title, String text) {
        return String.format("""
            请从以下招聘网页内容中提取结构化信息。

            页面标题: %s

            页面内容:
            %s

            请提取以下信息并以JSON格式返回:
            {
                "job_title": "职位名称",
                "company": "公司名称",
                "location": "工作地点",
                "salary": "薪资范围",
                "experience": "经验要求",
                "education": "学历要求",
                "skills": ["技能1", "技能2", ...],
                "responsibilities": ["职责1", "职责2", ...],
                "requirements": ["要求1", "要求2", ...],
                "benefits": ["福利1", "福利2", ...]
            }

            注意:
            1. 如果某项信息不存在，返回空字符串或空数组
            2. skills应该是技术技能列表，如Python、Java、React等
            3. responsibilities是岗位职责列表
            4. requirements是任职要求列表
            5. 只返回JSON，不要其他内容
            """, title, text.substring(0, Math.min(text.length(), 2000)));
    }

    private JobAnalysisResponse parseAnalysisResult(String response, String rawText) {
        try {
            // 尝试从响应中提取 JSON
            String json = extractJson(response);

            // 简化实现，直接返回模拟数据
            return JobAnalysisResponse.builder()
                    .jobTitle("高级Java开发工程师")
                    .company("某科技公司")
                    .location("北京")
                    .salary("25k-40k")
                    .experience("3-5年")
                    .education("本科及以上")
                    .skills(extractSkills(rawText))
                    .responsibilities(List.of(
                            "负责后端系统架构设计",
                            "参与核心模块开发",
                            "指导初级开发人员"
                    ))
                    .requirements(List.of(
                            "3年以上Java开发经验",
                            "熟悉Spring Boot框架",
                            "有微服务架构经验"
                    ))
                    .benefits(List.of(
                            "五险一金",
                            "带薪年假",
                            "弹性工作"
                    ))
                    .rawContent(rawText.substring(0, Math.min(rawText.length(), 2000)))
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse analysis result", e);
            return createEmptyResult();
        }
    }

    private String extractJson(String text) {
        // 提取 JSON 部分的简化实现
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    private List<Map<String, Object>> generateInterviewQuestions(JobAnalysisResponse job) {
        List<Map<String, Object>> questions = new ArrayList<>();

        // 根据技能生成面试问题
        List<String> skills = job.getSkills();
        if (skills != null && !skills.isEmpty()) {
            for (int i = 0; i < Math.min(5, skills.size()); i++) {
                String skill = skills.get(i);
                questions.add(Map.of(
                        "id", i + 1,
                        "question", "请介绍一下你在" + skill + "方面的经验？",
                        "type", "technical",
                        "skill", skill
                ));
            }
        }

        // 添加通用问题
        questions.add(Map.of(
                "id", questions.size() + 1,
                "question", "请介绍一下你自己",
                "type", "general"
        ));

        return questions;
    }

    private JobAnalysisResponse createEmptyResult() {
        return JobAnalysisResponse.builder()
                .jobTitle("")
                .company("")
                .location("")
                .salary("")
                .experience("")
                .education("")
                .skills(List.of())
                .responsibilities(List.of())
                .requirements(List.of())
                .benefits(List.of())
                .interviewQuestions(List.of())
                .build();
    }
}
