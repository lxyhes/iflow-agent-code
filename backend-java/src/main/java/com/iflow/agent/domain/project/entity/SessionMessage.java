package com.iflow.agent.domain.project.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

/**
 * 会话消息实体
 */
@Entity
@Table(name = "session_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionMessage {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "role", nullable = false)
    private String role; // user, assistant, system

    @Column(name = "content", length = 10000)
    private String content;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "token_count")
    private Integer tokenCount;
}
