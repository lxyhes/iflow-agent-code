package com.iflow.agent.controller;

import com.iflow.agent.service.rag.Document;
import com.iflow.agent.service.rag.RagService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    @PostMapping("/collections/{collectionName}/documents")
    public ResponseEntity<?> addDocument(
            @PathVariable String collectionName,
            @RequestBody AddDocumentRequest request) {

        Document doc = ragService.addDocument(
                collectionName,
                request.getTitle(),
                request.getContent(),
                request.getSource()
        );

        return ResponseEntity.ok(Map.of(
                "id", doc.getId(),
                "collection", collectionName,
                "title", doc.getTitle()
        ));
    }

    @PostMapping("/collections/{collectionName}/documents/batch")
    public ResponseEntity<?> addDocuments(
            @PathVariable String collectionName,
            @RequestBody List<AddDocumentRequest> requests) {

        List<RagService.DocumentInput> inputs = requests.stream()
                .map(r -> RagService.DocumentInput.builder()
                        .title(r.getTitle())
                        .content(r.getContent())
                        .source(r.getSource())
                        .build())
                .collect(Collectors.toList());

        List<Document> docs = ragService.addDocuments(collectionName, inputs);

        return ResponseEntity.ok(Map.of(
                "added", docs.size(),
                "collection", collectionName
        ));
    }

    @PostMapping("/collections/{collectionName}/search")
    public ResponseEntity<?> search(
            @PathVariable String collectionName,
            @RequestBody SearchRequest request) {

        List<RagService.SearchResult> results = ragService.search(
                collectionName,
                request.getQuery(),
                request.getTopK() != null ? request.getTopK() : 5
        );

        List<Map<String, Object>> response = results.stream()
                .map(r -> Map.<String, Object>of(
                        "id", r.getDocument().getId(),
                        "title", r.getDocument().getTitle(),
                        "content", r.getDocument().getContent(),
                        "source", r.getDocument().getSource(),
                        "score", r.getScore()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/collections/{collectionName}/query")
    public ResponseEntity<?> query(
            @PathVariable String collectionName,
            @RequestBody QueryRequest request) {

        RagService.RagResponse result = ragService.query(
                collectionName,
                request.getQuestion(),
                request.getTopK() != null ? request.getTopK() : 5
        );

        return ResponseEntity.ok(Map.of(
                "answer", result.getAnswer(),
                "sources", result.getSources()
        ));
    }

    @GetMapping("/collections/{collectionName}/documents")
    public ResponseEntity<?> getDocuments(@PathVariable String collectionName) {
        List<Document> docs = ragService.getDocuments(collectionName);

        List<Map<String, Object>> response = docs.stream()
                .map(d -> Map.<String, Object>of(
                        "id", d.getId(),
                        "title", d.getTitle(),
                        "content", d.getContent().substring(0, Math.min(200, d.getContent().length())) + "...",
                        "source", d.getSource(),
                        "createdAt", d.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/collections/{collectionName}")
    public ResponseEntity<?> deleteCollection(@PathVariable String collectionName) {
        ragService.deleteCollection(collectionName);
        return ResponseEntity.ok(Map.of(
                "status", "deleted",
                "collection", collectionName
        ));
    }

    @Data
    public static class AddDocumentRequest {
        private String title;
        private String content;
        private String source;
    }

    @Data
    public static class SearchRequest {
        private String query;
        private Integer topK;
    }

    @Data
    public static class QueryRequest {
        private String question;
        private Integer topK;
    }
}
