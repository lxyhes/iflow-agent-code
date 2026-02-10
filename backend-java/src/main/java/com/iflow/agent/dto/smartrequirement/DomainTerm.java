package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 领域术语
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DomainTerm {
    /** 术语 */
    private String term;
    /** 定义 */
    private String definition;
}