package com.iflow.agent.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.io.Serializable;

/**
 * 用户偏好复合主键类
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceId implements Serializable {
    private Long userId;
    private String preferenceKey;
}
