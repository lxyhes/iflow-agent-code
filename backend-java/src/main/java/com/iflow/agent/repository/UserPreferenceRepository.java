package com.iflow.agent.repository;

import com.iflow.agent.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 用户偏好 Repository
 */
@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreference, String> {

    /**
     * 根据用户 ID 查找所有偏好
     */
    List<UserPreference> findByUserIdOrderByUpdatedAtDesc(Long userId);

    /**
     * 根据用户 ID 和键查找
     */
    Optional<UserPreference> findByUserIdAndPreferenceKey(Long userId, String preferenceKey);
}
