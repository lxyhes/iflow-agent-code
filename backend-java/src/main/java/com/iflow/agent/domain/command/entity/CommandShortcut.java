package com.iflow.agent.domain.command.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 命令快捷键实体
 */
@Entity
@Table(name = "command_shortcuts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommandShortcut {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(name = "name")
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "shortcut_key")
    private String shortcutKey;

    @Column(name = "command")
    private String command;

    @Column(name = "category")
    private String category;

    @Column(name = "tags")
    @ElementCollection
    @CollectionTable(name = "command_shortcut_tags", joinColumns = @JoinColumn(name = "shortcut_id"))
    private List<String> tags;

    @Column(name = "is_global")
    @Builder.Default
    private Boolean isGlobal = false;

    @Column(name = "is_enabled")
    @Builder.Default
    private Boolean isEnabled = true;

    @Column(name = "usage_count")
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 增加使用次数
     */
    public void incrementUsage() {
        this.usageCount = this.usageCount != null ? this.usageCount + 1 : 1;
    }
}
