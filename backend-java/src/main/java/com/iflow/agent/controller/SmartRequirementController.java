package com.iflow.agent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.dto.smartrequirement.*;
import com.iflow.agent.service.ai.SmartRequirementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 智能需求分析 API
 */
@Slf4j
@RestController
@RequestMapping("/api/smart-requirement")
@RequiredArgsConstructor
public class SmartRequirementController {

    private final SmartRequirementService smartRequirementService;
    private final ObjectMapper objectMapper;

    /**
     * 步骤1: 分析需求
     */
    @PostMapping("/step1-analyze")
    public ResponseEntity<Map<String, Object>> step1Analyze(@RequestBody Step1AnalyzeRequest request) {
        log.info("智能需求分析 - 步骤1: 分析需求, text length: {}", request.getText().length());
        Step1AnalyzeResponse response = smartRequirementService.step1Analyze(request);
        return ResponseEntity.ok(Map.of("analysis", response));
    }

    /**

         * 步骤2: 匹配模块

         */

        @PostMapping("/step2-match")

        public ResponseEntity<Map<String, Object>> step2Match(@RequestBody Step2MatchRequest request) {

            log.info("智能需求分析 - 步骤2: 匹配模块, keywords: {}", request.getKeywords());

            Step2MatchResponse response = smartRequirementService.step2Match(request);

            return ResponseEntity.ok(Map.of("matched_modules", response.getMatchedModules()));

        }

    

        /**

         * 步骤2.5: 分析上下文

         */

        @PostMapping("/step2-5-context")

        public ResponseEntity<Map<String, Object>> step25Context(@RequestBody Map<String, Object> request) {

            log.info("智能需求分析 - 步骤2.5: 分析上下文");

            @SuppressWarnings("unchecked")

            List<Map<String, Object>> modulesList = (List<Map<String, Object>>) request.get("matched_modules");

            

            // 转换为 MatchedModule 对象列表

            List<MatchedModule> matchedModules = modulesList.stream()

                    .map(m -> new MatchedModule(

                            (String) m.get("name"),

                            (String) m.get("path"),

                            ((Number) m.get("relevanceScore")).doubleValue(),

                            (String) m.get("description")

                    ))

                    .collect(java.util.stream.Collectors.toList());

            

            Step25ContextRequest req = new Step25ContextRequest(matchedModules);

            Step25ContextResponse response = smartRequirementService.step25Context(req);

            return ResponseEntity.ok(Map.of("context", response.getContext()));

        }

    

        /**

         * 步骤3: 生成解决方案

         */

        @PostMapping("/step3-solution")

        public ResponseEntity<Map<String, Object>> step3Solution(@RequestBody Map<String, Object> request) {

            log.info("智能需求分析 - 步骤3: 生成解决方案");

            

            // 解析 analysis

            @SuppressWarnings("unchecked")

            Map<String, Object> analysisMap = (Map<String, Object>) request.get("analysis");

            Step1AnalyzeResponse analysis = objectMapper.convertValue(analysisMap, Step1AnalyzeResponse.class);

            

            // 解析 matched_modules

            @SuppressWarnings("unchecked")

            List<Map<String, Object>> modulesList = (List<Map<String, Object>>) request.get("matched_modules");

            List<MatchedModule> matchedModules = modulesList.stream()

                    .map(m -> new MatchedModule(

                            (String) m.get("name"),

                            (String) m.get("path"),

                            ((Number) m.get("relevanceScore")).doubleValue(),

                            (String) m.get("description")

                    ))

                    .collect(java.util.stream.Collectors.toList());

            

            Step3SolutionRequest req = new Step3SolutionRequest(analysis, matchedModules);

            Step3SolutionResponse response = smartRequirementService.step3Solution(req);

            

            return ResponseEntity.ok(Map.of(

                    "solution_doc", response.getSolutionDoc(),

                    "execution_plan", response.getExecutionPlan(),

                    "api_design", response.getApiDesign(),

                    "effort_estimation", response.getEffortEstimation(),

                    "test_scenarios", response.getTestScenarios()

            ));

        }

    /**
     * 优化需求
     */
    @PostMapping("/optimize")
    public ResponseEntity<Map<String, Object>> optimize(@RequestBody OptimizeRequest request) {
        log.info("智能需求分析: 优化需求");
        OptimizeResponse response = smartRequirementService.optimize(request);
        return ResponseEntity.ok(Map.of("result", response));
    }

    /**
     * 优化项目
     */
    @PostMapping("/optimize-project")
    public ResponseEntity<Map<String, Object>> optimizeProject(@RequestBody OptimizeProjectRequest request) {
        log.info("智能需求分析: 优化项目, focus: {}, project: {}",
                request.getFocus(), request.getProjectName());
        OptimizeProjectResponse response = smartRequirementService.optimizeProject(request);
        return ResponseEntity.ok(Map.of("result", response));
    }

    /**
     * 细化需求
     */
    @PostMapping("/refine")
    public ResponseEntity<Map<String, Object>> refine(@RequestBody RefineRequest request) {
        log.info("智能需求分析: 细化需求");
        RefineResponse response = smartRequirementService.refine(request);
        return ResponseEntity.ok(Map.of("updated_solution", response.getUpdatedSolution()));
    }

    /**
     * 保存需求分析结果
     */
    @PostMapping("/save")
    public ResponseEntity<SaveResponse> save(@RequestBody SaveRequest request) {
        log.info("智能需求分析: 保存结果, project: {}, title: {}",
                request.getProjectName(), request.getTitle());
        SaveResponse response = smartRequirementService.save(request);
        return ResponseEntity.ok(response);
    }
}
