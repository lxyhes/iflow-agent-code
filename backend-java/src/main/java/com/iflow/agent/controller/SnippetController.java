package com.iflow.agent.controller;

import com.iflow.agent.entity.Snippet;
import com.iflow.agent.repository.SnippetRepository;
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
 * 代码片段管理 API - 对应 Python 的 snippets.py
 */
@Slf4j
@RestController
@RequestMapping("/api/snippets")
@RequiredArgsConstructor
public class SnippetController {

    private final SnippetRepository snippetRepository;

    /**
     * 获取代码片段列表
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listSnippets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String tag) {

        log.info("Listing snippets: search={}, category={}, language={}, tag={}", search, category, language, tag);

        List<Snippet> snippets;

        if (search != null && !search.isEmpty()) {
            snippets = snippetRepository.findByTitleContainingIgnoreCase(search);
        } else if (category != null && !category.isEmpty()) {
            snippets = snippetRepository.findByCategory(category);
        } else if (language != null && !language.isEmpty()) {
            snippets = snippetRepository.findByLanguage(language);
        } else if (tag != null && !tag.isEmpty()) {
            snippets = snippetRepository.findByTagsContaining(tag);
        } else {
            snippets = snippetRepository.findAll();
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", snippets,
                "count", snippets.size()
        ));
    }

    /**
     * 创建代码片段
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createSnippet(@RequestBody Snippet snippet) {
        log.info("Creating snippet: {}", snippet.getTitle());

        snippet.setUsageCount(0);
        Snippet saved = snippetRepository.save(snippet);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", saved
        ));
    }

    /**
     * 获取单个代码片段
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getSnippet(@PathVariable Long id) {
        log.info("Getting snippet: {}", id);

        Optional<Snippet> snippet = snippetRepository.findById(id);

        if (snippet.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", snippet.get()
            ));
        } else {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Snippet not found"
            ));
        }
    }

    /**
     * 更新代码片段
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateSnippet(@PathVariable Long id, @RequestBody Snippet snippet) {
        log.info("Updating snippet: {}", id);

        if (!snippetRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Snippet not found"
            ));
        }

        snippet.setId(id);
        Snippet updated = snippetRepository.save(snippet);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", updated
        ));
    }

    /**
     * 删除代码片段
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteSnippet(@PathVariable Long id) {
        log.info("Deleting snippet: {}", id);

        if (!snippetRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Snippet not found"
            ));
        }

        snippetRepository.deleteById(id);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Snippet deleted"
        ));
    }

    /**
     * 获取分类列表
     */
    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        List<String> categories = snippetRepository.findAll().stream()
                .map(Snippet::getCategory)
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
        List<String> tags = snippetRepository.findAll().stream()
                .flatMap(s -> s.getTags().stream())
                .distinct()
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", tags
        ));
    }

    /**
     * 获取热门代码片段
     */
    @GetMapping("/popular")
    public ResponseEntity<Map<String, Object>> getPopularSnippets(
            @RequestParam(defaultValue = "10") int limit) {

        List<Snippet> snippets = snippetRepository.findByOrderByUsageCountDesc(PageRequest.of(0, limit));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", snippets
        ));
    }

    /**
     * 获取最近代码片段
     */
    @GetMapping("/recent")
    public ResponseEntity<Map<String, Object>> getRecentSnippets(
            @RequestParam(defaultValue = "10") int limit) {

        List<Snippet> snippets = snippetRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, limit));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", snippets
        ));
    }

    /**
     * 增加使用次数
     */
    @PostMapping("/{id}/usage")
    public ResponseEntity<Map<String, Object>> incrementUsage(@PathVariable Long id) {
        Optional<Snippet> optional = snippetRepository.findById(id);

        if (optional.isPresent()) {
            Snippet snippet = optional.get();
            snippet.setUsageCount(snippet.getUsageCount() + 1);
            snippetRepository.save(snippet);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Usage incremented"
            ));
        } else {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Snippet not found"
            ));
        }
    }
}
