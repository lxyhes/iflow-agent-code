package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 文章生成 API - 对应 Python 的 ai_article.py
 */
@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiArticleController {

    /**
     * 生成公众号文章
     */
    @PostMapping("/generate-article")
    public ResponseEntity<Map<String, Object>> generateArticle(@RequestBody Map<String, String> request) {
        String topic = request.get("topic");
        log.info("Generating article for topic: {}", topic);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "article", Map.of(
                        "title", "Generated Article: " + topic,
                        "content", "This is a generated article about " + topic + ".\n\n" +
                                "## Introduction\n\n" +
                                "Here is the introduction...\n\n" +
                                "## Main Content\n\n" +
                                "Here is the main content...\n\n" +
                                "## Conclusion\n\n" +
                                "Here is the conclusion...",
                        "word_count", 500
                )
        ));
    }

    /**
     * 优化文章
     */
    @PostMapping("/optimize-article")
    public ResponseEntity<Map<String, Object>> optimizeArticle(@RequestBody Map<String, String> request) {
        String content = request.get("content");
        log.info("Optimizing article");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "optimized_content", content + "\n\n[Optimized by AI]",
                "improvements", List.of("Better structure", "Improved readability")
        ));
    }

    /**
     * 生成标题变体
     */
    @PostMapping("/generate-titles")
    public ResponseEntity<Map<String, Object>> generateTitles(@RequestBody Map<String, String> request) {
        String topic = request.get("topic");
        log.info("Generating titles for: {}", topic);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "titles", List.of(
                        "10 Things You Need to Know About " + topic,
                        "The Ultimate Guide to " + topic,
                        "How to Master " + topic + " in 30 Days",
                        "Why " + topic + " Matters in 2024"
                )
        ));
    }

    /**
     * 获取服务状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "active",
                "capabilities", List.of("article_generation", "optimization", "title_generation")
        ));
    }
}
