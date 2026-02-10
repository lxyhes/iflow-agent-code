package com.iflow.agent.dto.smartrequirement;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 业务上下文
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessContext {
    /** 现有业务逻辑说明 */
    private String currentLogic;
    /** 时序图 */
    private String sequenceDiagram;
    /** 关键业务术语表 */
    private List<DomainTerm> domainTerms;
}