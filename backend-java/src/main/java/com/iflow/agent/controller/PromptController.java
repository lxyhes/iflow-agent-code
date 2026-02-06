package com.iflow.agent.controller;

import com.iflow.agent.entity.Prompt;
import com.iflow.agent.repository.PromptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 提示词管理 API - 对应 Python 的 prompts.py
 */
@Slf4j
@RestController
@RequestMapping("/api/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final PromptRepository promptRepository;

    /**
     * 获取提示词列表
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listPrompts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tag) {

        log.info("Listing prompts: search={}, category={}, tag={}", search, category, tag);

        List<Prompt> prompts;

        if (search != null && !search.isEmpty()) {
            prompts = promptRepository.findByTitleContainingIgnoreCase(search);
        } else if (category != null && !category.isEmpty()) {
            prompts = promptRepository.findByCategory(category);
        } else if (tag != null && !tag.isEmpty()) {
            prompts = promptRepository.findByTagsContaining(tag);
        } else {
            prompts = promptRepository.findAll();
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", prompts,
                "count", prompts.size()
        ));
    }

    /**
     * 创建提示词
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createPrompt(@RequestBody Prompt prompt) {
        log.info("Creating prompt: {}", prompt.getTitle());

        prompt.setUsageCount(0);
        Prompt saved = promptRepository.save(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", saved
        ));
    }

    /**
     * 获取单个提示词
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPrompt(@PathVariable Long id) {
        log.info("Getting prompt: {}", id);

        Optional<Prompt> prompt = promptRepository.findById(id);

        if (prompt.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", prompt.get()
            ));
        } else {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Prompt not found"
            ));
        }
    }

    /**
     * 更新提示词
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updatePrompt(@PathVariable Long id, @RequestBody Prompt prompt) {
        log.info("Updating prompt: {}", id);

        if (!promptRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Prompt not found"
            ));
        }

        prompt.setId(id);
        Prompt updated = promptRepository.save(prompt);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", updated
        ));
    }

    /**
     * 删除提示词
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletePrompt(@PathVariable Long id) {
        log.info("Deleting prompt: {}", id);

        if (!promptRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Prompt not found"
            ));
        }

        promptRepository.deleteById(id);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Prompt deleted"
        ));
    }

    /**
     * 获取分类列表
     */
    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        List<String> categories = promptRepository.findAll().stream()
                .map(Prompt::getCategory)
                .distinct()
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", categories
        ));
    }

    /**
     * 获取标签列表
     */
    @GetMapping("/tags")
    public ResponseEntity<Map<String, Object>> getTags() {
        List<String> tags = promptRepository.findAll().stream()
                .flatMap(p -> p.getTags().stream())
                .distinct()
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", tags
        ));
    }

    /**
     * 获取热门提示词
     */
    @GetMapping("/popular")
    public ResponseEntity<Map<String, Object>> getPopularPrompts(
            @RequestParam(defaultValue = "10") int limit) {

        List<Prompt> prompts = promptRepository.findByOrderByUsageCountDesc(PageRequest.of(0, limit));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", prompts
        ));
    }

    /**
     * 获取最近提示词
     */
    @GetMapping("/recent")
    public ResponseEntity<Map<String, Object>> getRecentPrompts(
            @RequestParam(defaultValue = "10") int limit) {

        List<Prompt> prompts = promptRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, limit));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", prompts
        ));
    }

    /**
     * 增加使用次数
     */
    @PostMapping("/{id}/usage")
    public ResponseEntity<Map<String, Object>> incrementUsage(@PathVariable Long id) {
        Optional<Prompt> optional = promptRepository.findById(id);

        if (optional.isPresent()) {
            Prompt prompt = optional.get();
            prompt.setUsageCount(prompt.getUsageCount() + 1);
            promptRepository.save(prompt);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Usage incremented"
            ));
        } else {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Prompt not found"
            ));
        }
    }
}
