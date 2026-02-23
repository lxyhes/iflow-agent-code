package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 用户偏好实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_preference")
@IdClass(UserPreferenceId.class)
public class UserPreference {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "preference_key", nullable = false, length = 200)
    private String preferenceKey;

    /**
     * 偏好值 (JSON 格式)
     */
    @Column(name = "preference_value", columnDefinition = "TEXT")
    private String preferenceValue;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
