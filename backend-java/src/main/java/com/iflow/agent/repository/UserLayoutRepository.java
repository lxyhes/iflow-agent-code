package com.iflow.agent.repository;

import com.iflow.agent.entity.UserLayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 用户布局 Repository
 */
@Repository
public interface UserLayoutRepository extends JpaRepository<UserLayout, Long> {

    /**
     * 根据用户 ID 查找
     */
    List<UserLayout> findByUserIdOrderByCreatedAtDesc(Long userId);
}
