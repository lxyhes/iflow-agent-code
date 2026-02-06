package com.iflow.agent.domain.workflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 工作流实体
 */
@Entity
@Table(name = "workflows")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Workflow {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "name")
    private String name;

    @Column(name = "description")
    private String description;

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Node> nodes = new ArrayList<>();

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Edge> edges = new ArrayList<>();

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private WorkflowStatus status = WorkflowStatus.DRAFT;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 工作流状态
     */
    public enum WorkflowStatus {
        DRAFT, ACTIVE, ARCHIVED
    }

    /**
     * 工作流节点
     */
    @Entity
    @Table(name = "workflow_nodes")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Node {
        @Id
        @GeneratedValue(generator = "uuid")
        @GenericGenerator(name = "uuid", strategy = "uuid2")
        private String id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "workflow_id")
        private Workflow workflow;

        @Column(name = "name")
        private String name;

        @Column(name = "type")
        private String type;

        @Column(name = "config", length = 4000)
        @Convert(converter = JsonConverter.class)
        private Map<String, Object> config;

        @Column(name = "position_x")
        private Double positionX;

        @Column(name = "position_y")
        private Double positionY;

        @Column(name = "sort_order")
        private Integer sortOrder;
    }

    /**
     * 工作流连接
     */
    @Entity
    @Table(name = "workflow_edges")
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Edge {
        @Id
        @GeneratedValue(generator = "uuid")
        @GenericGenerator(name = "uuid", strategy = "uuid2")
        private String id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "workflow_id")
        private Workflow workflow;

        @Column(name = "source_node_id")
        private String source;

        @Column(name = "target_node_id")
        private String target;

        @Column(name = "condition")
        private String condition;
    }

    /**
     * JSON转换器
     */
    @jakarta.persistence.Converter
    public static class JsonConverter implements AttributeConverter<Map<String, Object>, String> {
        private static final com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        @Override
        public String convertToDatabaseColumn(Map<String, Object> attribute) {
            try {
                return mapper.writeValueAsString(attribute);
            } catch (Exception e) {
                return "{}";
            }
        }

        @Override
        public Map<String, Object> convertToEntityAttribute(String dbData) {
            try {
                return mapper.readValue(dbData, Map.class);
            } catch (Exception e) {
                return Map.of();
            }
        }
    }
}
