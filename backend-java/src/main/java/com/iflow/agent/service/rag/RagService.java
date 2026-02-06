package com.iflow.agent.service.rag;

import com.iflow.agent.repository.DocumentRepository;
import com.iflow.agent.service.ai.TongyiQianwenService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private final DocumentRepository documentRepository;
    private final TongyiQianwenService tongyiQianwenService;

    /**
     * 添加文档到知识库
     */
    @Transactional
    public Document addDocument(String collectionName, String title, String content, String source) {
        log.info("Adding document to collection: {}, title: {}", collectionName, title);

        float[] embeddingArray = tongyiQianwenService.embed(content);
        List<Double> embedding = floatArrayToList(embeddingArray);

        Document document = Document.builder()
                .collectionName(collectionName)
                .title(title)
                .content(content)
                .source(source)
                .embedding(embedding)
                .build();

        return documentRepository.save(document);
    }

    /**
     * 批量添加文档
     */
    @Transactional
    public List<Document> addDocuments(String collectionName, List<DocumentInput> inputs) {
        log.info("Adding {} documents to collection: {}", inputs.size(), collectionName);

        List<String> contents = inputs.stream()
                .map(DocumentInput::getContent)
                .collect(Collectors.toList());

        List<float[]> embeddingArrays = tongyiQianwenService.embedBatch(contents);

        List<Document> documents = new ArrayList<>();
        for (int i = 0; i < inputs.size(); i++) {
            DocumentInput input = inputs.get(i);
            List<Double> embedding = i < embeddingArrays.size() 
                ? floatArrayToList(embeddingArrays.get(i)) 
                : List.of();

            Document doc = Document.builder()
                    .collectionName(collectionName)
                    .title(input.getTitle())
                    .content(input.getContent())
                    .source(input.getSource())
                    .embedding(embedding)
                    .build();

            documents.add(doc);
        }

        return documentRepository.saveAll(documents);
    }

    /**
     * 相似度搜索
     */
    public List<SearchResult> search(String collectionName, String query, int topK) {
        log.info("Searching in collection: {}, query: {}", collectionName, query);

        float[] queryEmbeddingArray = tongyiQianwenService.embed(query);
        List<Double> queryEmbedding = floatArrayToList(queryEmbeddingArray);

        List<Document> documents = documentRepository.findByCollectionName(collectionName);

        return documents.stream()
                .map(doc -> {
                    double similarity = calculateCosineSimilarity(queryEmbedding, doc.getEmbedding());
                    return SearchResult.builder()
                            .document(doc)
                            .score(similarity)
                            .build();
                })
                .sorted(Comparator.comparingDouble(SearchResult::getScore).reversed())
                .limit(topK)
                .collect(Collectors.toList());
    }

    /**
     * 带回答的 RAG 查询
     */
    public RagResponse query(String collectionName, String question, int topK) {
        log.info("RAG query in collection: {}, question: {}", collectionName, question);

        List<SearchResult> results = search(collectionName, question, topK);

        if (results.isEmpty()) {
            return RagResponse.builder()
                    .answer("未找到相关信息。")
                    .sources(List.of())
                    .build();
        }

        String context = results.stream()
                .map(r -> String.format("[%s] %s", r.getDocument().getTitle(), r.getDocument().getContent()))
                .collect(Collectors.joining("\n\n"));

        String prompt = String.format(
                "基于以下信息回答问题：\n\n%s\n\n问题：%s\n\n请根据提供的信息回答，如果信息不足请说明。",
                context, question
        );

        String answer = tongyiQianwenService.generate(prompt);

        return RagResponse.builder()
                .answer(answer)
                .sources(results.stream()
                        .map(r -> Source.builder()
                                .title(r.getDocument().getTitle())
                                .content(r.getDocument().getContent())
                                .source(r.getDocument().getSource())
                                .score(r.getScore())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    /**
     * 删除集合
     */
    @Transactional
    public void deleteCollection(String collectionName) {
        log.info("Deleting collection: {}", collectionName);
        documentRepository.deleteByCollectionName(collectionName);
    }

    /**
     * 获取集合中的所有文档
     */
    public List<Document> getDocuments(String collectionName) {
        return documentRepository.findByCollectionName(collectionName);
    }

    /**
     * 计算余弦相似度
     */
    private double calculateCosineSimilarity(List<Double> vec1, List<Double> vec2) {
        if (vec1 == null || vec2 == null || vec1.isEmpty() || vec2.isEmpty()) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;

        int minLength = Math.min(vec1.size(), vec2.size());
        for (int i = 0; i < minLength; i++) {
            dotProduct += vec1.get(i) * vec2.get(i);
            norm1 += vec1.get(i) * vec1.get(i);
            norm2 += vec2.get(i) * vec2.get(i);
        }

        if (norm1 == 0.0 || norm2 == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * float[] 转换为 List<Double>
     */
    private List<Double> floatArrayToList(float[] array) {
        if (array == null) return List.of();
        return IntStream.range(0, array.length)
                .mapToObj(i -> (double) array[i])
                .collect(Collectors.toList());
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentInput {
        private String title;
        private String content;
        private String source;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchResult {
        private Document document;
        private double score;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagResponse {
        private String answer;
        private List<Source> sources;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Source {
        private String title;
        private String content;
        private String source;
        private double score;
    }
}
