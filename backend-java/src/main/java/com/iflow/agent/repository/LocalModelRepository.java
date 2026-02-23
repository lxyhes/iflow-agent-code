package com.iflow.agent.repository;

import com.iflow.agent.entity.LocalModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 本地模型 Repository
 */
@Repository
public interface LocalModelRepository extends JpaRepository<LocalModel, Long> {

    /**
     * 根据状态查找
     */
    List<LocalModel> findByStatusOrderByCreatedAtDesc(String status);

    /**
     * 根据提供商查找
     */
    List<LocalModel> findByProviderOrderByCreatedAtDesc(String provider);
}
