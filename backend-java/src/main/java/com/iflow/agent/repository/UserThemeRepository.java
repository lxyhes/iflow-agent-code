package com.iflow.agent.repository;

import com.iflow.agent.entity.UserTheme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 用户主题 Repository
 */
@Repository
public interface UserThemeRepository extends JpaRepository<UserTheme, Long> {

    /**
     * 根据用户 ID 查找
     */
    List<UserTheme> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 查找内置主题
     */
    List<UserTheme> findByIsBuiltInTrueOrderByCreatedAtDesc();
}
