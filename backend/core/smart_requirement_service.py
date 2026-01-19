import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from .agent import Agent
from .schema import Message, Role

import re

class SmartRequirementService:
    def __init__(self):
        self.agent = Agent(name="SmartReqAnalyst", persona="architect")

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Robustly extracts JSON object from a string, handling markdown code blocks
        and extraneous text.
        """
        try:
            # 1. Try direct parsing
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2. Try removing markdown code blocks
        clean_text = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass

        # 3. Try finding the first '{' and last '}'
        try:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                json_str = match.group(0)
                return json.loads(json_str)
        except:
            pass
            
        return None

    async def analyze_requirement(self, text: str, image_path: Optional[str] = None, project_root: str = ".") -> Dict[str, Any]:
        """
        Analyzes the requirement text and optional image to extract structured info.
        """
        
        # 1. Process Image (Mock/Placeholder for Vision Model)
        image_context = ""
        if image_path:
            # TODO: Integrate with actual Vision Model (e.g. GPT-4V, Claude 3 Opus)
            # For now, we simulate this or ask the LLM to infer from filename/context if possible,
            # or simply note that an image was provided.
            image_context = f"\n[System Note: User uploaded an image at {image_path}. Assume it contains UI wireframes or architecture diagrams relevant to the text.]"

        # 2. Build Prompt for LLM
        prompt = f"""
        You are an expert System Architect. Analyze the following requirement description{image_context}.
        
        User Requirement:
        "{text}"

        Please extract the following information and return it in valid JSON format ONLY (no markdown code blocks).
        
        Strictly follow these language requirements:
        1. "summary", "key_features", and "tech_constraints" MUST be in Chinese.
        2. "type" MUST be one of [Web, Mobile, Backend, Data, Infrastructure, Other] (keep in English).
        3. "keywords" MUST be in English/Technical terms (e.g. "React", "API").
        
        JSON Structure:
        {{
            "summary": "Brief summary of the requirement in Chinese (1-2 sentences)",
            "type": "One of [Web, Mobile, Backend, Data, Infrastructure, Other]",
            "keywords": ["List", "of", "key", "technical", "terms"],
            "complexity_score": 1-10 (integer),
            "key_features": ["List", "of", "functional", "requirements", "in", "Chinese"],
            "tech_constraints": ["List", "of", "implied", "constraints", "in", "Chinese"]
        }}
        """

        # 3. Call LLM
        response_text = await self.agent.chat(prompt)
        
        # 4. Parse JSON
        analysis_result = self._extract_json(response_text)
        
        if not analysis_result:
            # Fallback if LLM fails to return valid JSON
            analysis_result = {
                "summary": text[:100] + "...",
                "type": "Other",
                "keywords": [],
                "complexity_score": 5,
                "key_features": [],
                "tech_constraints": [],
                "raw_response": response_text
            }

        return analysis_result

    async def match_modules(self, keywords: List[str], project_root: str) -> List[Dict[str, Any]]:
        """
        Matches requirement keywords against the project's directory structure.
        """
        modules = self._scan_project_modules(project_root)
        
        if not modules:
            return []

        # Prepare context for LLM to match
        modules_str = json.dumps([m['path'] for m in modules])
        keywords_str = ", ".join(keywords)

        prompt = f"""
        You are a Codebase Expert. 
        I have a list of project modules (directories/files): {modules_str}
        And a list of requirement keywords: {keywords_str}

        Please identify which modules are most relevant to these keywords.
        Return a JSON list of objects:
        [
            {{ "path": "module/path", "relevance_score": 85, "reason": "Why it matches" }}
        ]
        Only include modules with relevance > 50.
        Return valid JSON ONLY.
        """

        response_text = await self.agent.chat(prompt)
        
        matches = self._extract_json(response_text)
        if matches is None or not isinstance(matches, list):
             # Try to see if it's wrapped in an object like {"matches": [...]}
             if isinstance(matches, dict) and "matches" in matches:
                 matches = matches["matches"]
             else:
                 matches = []

        return matches

    def _scan_project_modules(self, root_path: str) -> List[Dict[str, str]]:
        """
        Scans top-level directories and key files to identify 'modules'.
        """
        modules = []
        try:
            # Scan top level
            with os.scandir(root_path) as entries:
                for entry in entries:
                    if entry.name.startswith('.') or entry.name in ['node_modules', '__pycache__', 'dist', 'build']:
                        continue
                    
                    if entry.is_dir():
                        modules.append({"path": entry.name, "type": "dir"})
                        # Optional: Go one level deeper for 'src' or 'backend'
                        if entry.name in ['src', 'backend', 'frontend', 'core', 'lib']:
                            try:
                                with os.scandir(entry.path) as sub_entries:
                                    for sub in sub_entries:
                                        if sub.is_dir() and not sub.name.startswith('.'):
                                            modules.append({"path": f"{entry.name}/{sub.name}", "type": "dir"})
                            except:
                                pass
                    elif entry.is_file() and entry.name.endswith(('.py', '.js', '.ts', '.jsx', '.tsx')):
                         modules.append({"path": entry.name, "type": "file"})
        except Exception as e:
            print(f"Error scanning modules: {e}")
            
        return modules

    async def generate_business_context(self, matched_modules: List[Dict[str, Any]], project_root: str) -> Dict[str, Any]:
        """
        Analyzes the content of matched modules to explain current business logic.
        """
        # 1. Read content of top 3 relevant modules
        top_modules = sorted(matched_modules, key=lambda x: x.get('relevance_score', 0), reverse=True)[:3]
        code_context = ""
        
        for mod in top_modules:
            path = mod['path']
            full_path = os.path.join(project_root, path)
            try:
                # Basic safety check
                if os.path.exists(full_path) and os.path.isfile(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read(2000) # Read first 2000 chars
                        code_context += f"\n--- File: {path} ---\n{content}\n"
            except Exception as e:
                print(f"Error reading file {path}: {e}")

        if not code_context:
            return {
                "current_logic": "无法读取关联模块代码，请检查文件路径。",
                "domain_terms": [],
                "sequence_diagram": ""
            }

        # 2. Prompt LLM
        prompt = f"""
        You are a Senior Business Analyst and Code Expert.
        Based on the following code snippets from the existing project:

        {code_context}

        Please analyze the CURRENT business logic and domain context.
        
        Return a JSON object with:
        1. "current_logic": A clear, natural language summary (in Chinese) of how the business logic currently works in these files. Focus on the flow of data and key operations.
        2. "domain_terms": A list of key domain terms found (e.g. variable names, classes) with their Chinese definitions. Format: [{{"term": "SKU", "definition": "Stock Keeping Unit..."}}]
        3. "sequence_diagram": A Mermaid JS sequence diagram string (starting with 'sequenceDiagram') that visualizes the current interaction flow found in the code.
        4. "existing_apis": A list of EXISTING API endpoints found in the code snippets. Format:
           [{{"method": "GET/POST", "path": "/api/...", "summary": "Business purpose", "logic_flow": "Step-by-step logic description (Chinese)", "related_file": "filename"}}]
           If no explicit API routes are found, infer them from function names if they look like controllers.

        IMPORTANT:
        - Return valid JSON ONLY.
        """

        response_text = await self.agent.chat(prompt)
        result = self._extract_json(response_text)

        if not result:
            result = {
                "current_logic": "AI 分析失败，无法生成业务上下文。",
                "domain_terms": [],
                "sequence_diagram": "",
                "existing_apis": []
            }
            
        return result

    async def optimize_requirement(self, text: str, project_name: str = "") -> Dict[str, Any]:
        """
        Optimizes the raw requirement text to be more professional and complete.
        """
        prompt = f"""
        You are a Senior Product Manager and Requirements Analyst.
        Please help me OPTIMIZE the following requirement description for a software project (Project: {project_name}).

        [Original Requirement]
        {text}

        [Optimization Goals]
        1. Professionalize: Use standard software engineering terminology.
        2. Clarify: Remove ambiguity (e.g., change "fast" to specific latency targets if possible, or mark as TBD).
        3. Complete: Add missing implicit requirements like "Error Handling", "Security", "Logging" if relevant.
        4. Structure: Organize into clear sections (Background, Functional, Non-functional, Constraints).

        [Output Format]
        Return a JSON object with:
        1. "optimized_text": The fully rewritten, professional requirement description (Markdown supported).
        2. "changes": A list of strings describing what specific improvements were made (e.g., "Added error handling section", "Clarified API response time").
        3. "suggestions": A list of questions or suggestions for the user to further clarify (e.g., "What is the expected QPS?").
        
        IMPORTANT:
        - Keep the original INTENT. Do not invent features not implied by the context.
        - Return valid JSON ONLY.
        """
        
        response_text = await self.agent.chat(prompt)
        result = self._extract_json(response_text)
        
        if not result:
            return {
                "optimized_text": text,
                "changes": ["Optimization failed, returning original text."],
                "suggestions": []
            }
            
        return result

    async def analyze_project_optimization(self, focus: str, project_root: str) -> Dict[str, Any]:
        """
        Analyzes the project structure and code to provide optimization suggestions.
        """
        # 1. Match modules based on focus (or general scan if empty)
        search_query = focus if focus else "core architecture performance main business logic"
        matched_modules = await self.match_modules([search_query], project_root)
        
        # 2. Read content of top modules (limit to 5 for context window)
        top_modules = sorted(matched_modules, key=lambda x: x.get('relevance_score', 0), reverse=True)[:5]
        code_context = ""
        for mod in top_modules:
            path = mod['path']
            full_path = os.path.join(project_root, path)
            try:
                if os.path.exists(full_path) and os.path.isfile(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read(3000) # Read first 3000 chars
                        code_context += f"\n--- File: {path} ---\n{content}\n"
            except Exception:
                pass

        # 3. Prompt LLM for Optimization Report
        prompt = f"""
        You are a Principal Software Architect and Code Optimization Expert.
        I need a deep analysis and optimization report for the following project code snippets.
        
        [Focus Area]
        {focus if focus else "General Project Optimization (Performance, Readability, Architecture)"}

        [Project Code Context]
        {code_context}

        [Requirements]
        1. Deeply analyze code structure and tech stack.
        2. Provide concrete optimization suggestions (Performance, Readability, Architecture).
        3. Suggest business logic enhancements (extending functional boundaries).
        4. Generate code snippets for recommended changes.
        5. Suggest test plans and performance benchmarks.
        6. Propose a progressive improvement plan suitable for CI/CD.

        [Output Format]
        Return a JSON object with:
        1. "summary": A high-level executive summary of the project health and key opportunities.
        2. "optimizations": A list of objects [{{"title": "...", "type": "Performance/Architecture/Readability", "severity": "High/Medium/Low", "description": "...", "code_suggestion": "..."}}].
        3. "enhancements": A list of business logic enhancement ideas [{{"title": "...", "description": "..."}}].
        4. "test_plan": A markdown string describing testing strategy and benchmarks.
        5. "ci_plan": A markdown string describing how to integrate these checks into CI.
        6. "report_doc": A comprehensive Markdown report combining all above for display.

        IMPORTANT:
        - Return valid JSON ONLY.
        """

        response_text = await self.agent.chat(prompt)
        result = self._extract_json(response_text)

        if not result:
            result = {
                "summary": "分析失败，无法生成优化报告。",
                "optimizations": [],
                "enhancements": [],
                "test_plan": "",
                "ci_plan": "",
                "report_doc": "# 分析失败\n\nAI 未能生成有效的 JSON 响应。"
            }
            
        return {
            "analysis": {
                "type": "Project Optimization",
                "summary": result.get("summary", ""),
                "complexity_score": 0, # Not applicable
                "keywords": focus.split() if focus else ["Optimization", "Refactoring"],
                "key_features": [opt["title"] for opt in result.get("optimizations", [])][:5],
                "tech_constraints": []
            },
            "matched_modules": top_modules,
            "solution_doc": result.get("report_doc", ""),
            "optimization_data": result # Raw data for structured view
        }

    async def generate_solution(self, analysis: Dict[str, Any], matched_modules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates a solution proposal and execution plan.
        """
        
        context = {
            "requirement": analysis,
            "existing_modules": matched_modules
        }
        
        prompt = f"""
        基于以下上下文，生成详细的解决方案建议书和执行计划。
        
        Context:
        {json.dumps(context, indent=2)}

        请严格遵守以下要求：
        1. 所有分析结果和响应内容必须以中文呈现。
        2. 确保技术术语和专有名词保持其原始英文形式（如 API、JSON、React 等）。
        3. 方案文档 (solution_doc) 必须包含：
           - 需求背景说明
           - 核心功能点拆解
           - 技术实现方案建议（包含具体的代码结构或配置建议，并为所有示例代码添加中文注释）
           - 潜在风险与应对措施
        4. 格式要求：
           - 使用标准的中文技术文档格式
           - 段落清晰，逻辑严谨，避免口语化
           - 针对复杂需求，提供分步骤的实施方案

        请返回一个 JSON 对象，包含以下字段：
        1. "solution_doc": 一个 Markdown 格式的字符串，包含上述要求的完整技术方案。
        2. "execution_plan": 一个 JSON 对象，包含 "milestones" (列表 {{name, date, tasks}}) 和 "risks" (列表 {{risk, mitigation}})。
        3. "api_design": 一个 JSON 列表，描述建议的 API 接口。每个对象包含：
           - "name": 接口名称 (中文)
           - "method": "GET" | "POST" | "PUT" | "DELETE"
           - "path": URL 路径 (如 /api/v1/users)
           - "description": 接口描述
           - "params": 参数列表 ({{name, type, required, desc}})
           - "response_mock": 返回的 JSON 数据示例 (字符串或对象)
        4. "effort_estimation": 一个 JSON 对象，包含：
           - "total_days": 预估总工时（人天）
           - "roles": 涉及角色列表 (e.g. ["Backend", "Frontend"])
           - "breakdown": 任务分解列表 [{{ "task": "...", "days": 1, "role": "Backend" }}]
        5. "test_scenarios": 一个 JSON 列表，包含建议的测试用例：
           - "name": 用例名称
           - "type": "Functional" | "Security" | "Performance" | "Edge Case"
           - "description": 测试场景描述
           - "acceptance_criteria": 验收标准

        IMPORTANT:
        - Return valid JSON ONLY.
        - Do not include any text before or after the JSON object.
        - Verify that the "solution_doc" field is a properly escaped string within the JSON.
        """

        response_text = await self.agent.chat(prompt)

        result = self._extract_json(response_text)
        
        if not result:
            result = {
                "solution_doc": "# Error generating solution\nAI response was not valid JSON.",
                "execution_plan": {"milestones": [], "risks": []},
                "api_design": [],
                "effort_estimation": {"total_days": 0, "roles": [], "breakdown": []},
                "test_scenarios": [],
                "raw": response_text
            }
            
        return result

    async def refine_solution(self, previous_solution: Dict[str, Any], feedback: str) -> Dict[str, Any]:
        """
        Refines the solution based on user feedback.
        """
        prompt = f"""
        You are a helpful System Architect assisting a user.
        
        Previous Solution:
        {json.dumps(previous_solution, indent=2)}
        
        User Feedback/Request:
        "{feedback}"
        
        Please update the solution document and execution plan based on the user's feedback.
        
        Return the same JSON structure as before:
        1. "solution_doc": Updated Markdown string.
        2. "execution_plan": Updated JSON object with "milestones" and "risks".
        
        IMPORTANT:
        - Keep the same format.
        - Only modify parts relevant to the feedback.
        - Return valid JSON ONLY.
        """
        
        response_text = await self.agent.chat(prompt)
        
        result = self._extract_json(response_text)
        
        if not result:
            # If refinement fails, return original with error note
            result = previous_solution
            result["error"] = "Failed to parse refinement response"
            
        return result

# Singleton instance
smart_requirement_service = SmartRequirementService()
