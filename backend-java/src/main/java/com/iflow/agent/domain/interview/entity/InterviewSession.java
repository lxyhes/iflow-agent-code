package com.iflow.agent.domain.interview.entity;

import com.iflow.agent.domain.interview.enums.InterviewStatus;
import com.iflow.agent.domain.interview.enums.CoordinationMode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 面试会话
 */
@Entity
@Table(name = "interview_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "position")
    private String position;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private InterviewStatus status;

    @Column(name = "coordination_mode")
    @Enumerated(EnumType.STRING)
    private CoordinationMode coordinationMode;

    @Column(name = "total_rounds")
    private Integer totalRounds;

    @Column(name = "current_round")
    private Integer currentRound;

    @Column(name = "max_duration")
    private Integer maxDuration;

    @ElementCollection
    @CollectionTable(name = "interview_agent_order", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "agent_type")
    private List<String> agentOrder;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = InterviewStatus.PENDING;
        }
        if (currentRound == null) {
            currentRound = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
