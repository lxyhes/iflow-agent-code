package com.iflow.agent.domain.command.repository;

import com.iflow.agent.domain.command.entity.CommandShortcut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 命令快捷键仓储
 */
@Repository
public interface CommandShortcutRepository extends JpaRepository<CommandShortcut, String> {

    List<CommandShortcut> findByCreatedByOrderByUsageCountDesc(String createdBy);

    List<CommandShortcut> findByCategoryOrderByUsageCountDesc(String category);

    List<CommandShortcut> findByIsGlobalTrueOrderByUsageCountDesc();

    Optional<CommandShortcut> findByShortcutKeyAndCreatedBy(String shortcutKey, String createdBy);

    List<CommandShortcut> findByTagsContaining(String tag);

    List<CommandShortcut> findTop10ByCreatedByOrderByUsageCountDesc(String createdBy);
}
