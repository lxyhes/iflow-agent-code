# AI 文章生成 Router
# 提供 AI 驱动的公众号文章生成功能

import os
import json
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Article Generation"])

# 加载 .env 文件
def load_env_file():
    """加载 .env 文件"""
    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'),
        '/Users/hb/Downloads/iflow-agent/iflow-agent-code/.env',
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            logger.info(f"Loading .env from: {env_path}")
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ.setdefault(key, value)
            break

# 加载环境变量
load_env_file()

# 获取环境变量中的 API Key
IFLOW_API_KEY = os.getenv("IFLOW_API_KEY", "")
logger.info(f"IFLOW_API_KEY loaded: {'Yes' if IFLOW_API_KEY else 'No'}")

# 尝试导入 iflow_sdk
try:
    from iflow_sdk import IFlowClient, AssistantMessage
    IFLOW_SDK_AVAILABLE = True
    logger.info("iflow_sdk imported successfully")
except ImportError as e:
    logger.warning(f"iflow_sdk not available: {e}")
    IFLOW_SDK_AVAILABLE = False
    IFlowClient = None
    AssistantMessage = None


class RepoData(BaseModel):
    name: str
    fullName: str
    description: str
    stars: int
    forks: int
    language: str
    htmlUrl: str
    topics: List[str] = []
    license: Optional[str] = None
    createdAt: Optional[str] = None
    pushedAt: Optional[str] = None
    topContributors: List[Dict[str, Any]] = []
    readmePreview: str = ""
    readmeContent: str = ""


class GenerateArticleRequest(BaseModel):
    repo: RepoData
    style: str = "viral"  # viral, professional, casual
    timestamp: int = 0


class OptimizeArticleRequest(BaseModel):
    article: Dict[str, Any]
    optimizationType: str = "viral"


class GenerateTitlesRequest(BaseModel):
    repo: Dict[str, Any]
    count: int = 5


def build_article_prompt(repo: RepoData, style: str = "viral") -> str:
    """构建文章生成 Prompt - 爆款文章专家模式"""
    
    # 格式化数字
    stars_str = f"{repo.stars / 1000:.1f}K" if repo.stars >= 1000 else str(repo.stars)
    forks_str = f"{repo.forks / 1000:.1f}K" if repo.forks >= 1000 else str(repo.forks)
    
    # 判断项目热度
    popularity = ""
    if repo.stars > 50000:
        popularity = "🔥🔥🔥 超级热门项目"
    elif repo.stars > 10000:
        popularity = "⭐⭐⭐ 非常受欢迎"
    elif repo.stars > 5000:
        popularity = "⭐⭐ 广受好评"
    elif repo.stars > 1000:
        popularity = "⭐ 值得关注"
    
    prompt = f"""你是一位顶级公众号爆款文章写手，擅长写出10万+阅读量的技术文章。

【项目信息】
- 项目名称：{repo.name}
- 项目描述：{repo.description}
- 编程语言：{repo.language}
- GitHub Star：{stars_str} {popularity}
- GitHub Fork：{forks_str}
- 项目地址：{repo.htmlUrl}
- 开源协议：{repo.license or '未知'}
- 技术标签：{', '.join(repo.topics[:5]) if repo.topics else '无'}

【README核心内容】
{repo.readmePreview[:1500] if repo.readmePreview else '暂无'}

【任务】
请基于以上项目信息，生成一篇公众号爆款文章。

【写作风格】
1. 标题：带emoji，制造强烈好奇心，使用数字、悬念、对比、痛点、利益点（15-25字）
2. 开头钩子：3秒内抓住读者，200字以内，使用反转型/痛点型/权威型钩子，包含情绪词（卧槽、绝了、真香、崩溃、拯救、逆天）
3. 情绪价值：描述使用前痛苦+转折+使用后爽感（150字左右）
4. 核心亮点：3-4个，每个带emoji和具体数据，不要泛泛而谈
5. 实战案例：2个，Before（痛点+情绪）+ After（改善+数据）+ Improvement（量化效果）
6. 快速上手：真实可用的安装命令和使用示例
7. 用户评价：2-3个，不同角色，包含具体收益
8. 标签：6-8个技术相关标签

【严格要求 - 必须遵守】
1. 必须返回有效的JSON格式
2. 不要添加任何markdown代码块标记（如 ```json）
3. 不要添加任何解释性文字
4. 只返回JSON对象本身
5. 确保JSON格式正确，可以被解析
6. 所有字符串值使用双引号
7. 不要包含换行符在字符串中（使用\\n代替）

【返回格式】
必须返回以下格式的JSON对象：

{{
  "title": "带emoji的爆款标题",
  "hook": "开头钩子文本",
  "emotion": "情绪价值段落",
  "highlights": [
    {{"title": "亮点标题带emoji", "desc": "具体描述", "emoji": "emoji"}},
    {{"title": "亮点标题带emoji", "desc": "具体描述", "emoji": "emoji"}},
    {{"title": "亮点标题带emoji", "desc": "具体描述", "emoji": "emoji"}}
  ],
  "cases": [
    {{"title": "场景标题", "before": "使用前痛点", "after": "使用后改善", "improvement": "量化效果", "emoji": "emoji"}},
    {{"title": "场景标题", "before": "使用前痛点", "after": "使用后改善", "improvement": "量化效果", "emoji": "emoji"}}
  ],
  "quickStart": {{
    "install": "安装命令",
    "usage": "使用示例代码"
  }},
  "testimonials": [
    {{"role": "评价者身份", "content": "评价内容", "verified": true}},
    {{"role": "评价者身份", "content": "评价内容", "verified": false}}
  ],
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5", "标签6"]
}}"""

    return prompt


async def call_ai_with_sdk(prompt: str) -> str:
    """使用 iflow_sdk 调用 AI"""
    if not IFLOW_SDK_AVAILABLE:
        raise Exception("iflow_sdk not available")
    
    if not IFLOW_API_KEY:
        raise Exception("IFLOW_API_KEY not set")
    
    try:
        full_content = ""
        async with IFlowClient() as client:
            await client.send_message(prompt)
            
            async for msg in client.receive_messages():
                if AssistantMessage and isinstance(msg, AssistantMessage):
                    if msg.chunk and msg.chunk.text:
                        full_content += msg.chunk.text
                # 检查是否完成
                if hasattr(msg, '__class__') and 'Finish' in msg.__class__.__name__:
                    break
        
        return full_content
    except Exception as e:
        logger.error(f"IFlow SDK call failed: {e}")
        raise


async def call_ai_api(prompt: str) -> Dict[str, Any]:
    """调用 AI API 生成内容"""
    
    if not IFLOW_API_KEY:
        logger.warning("IFLOW_API_KEY not set, using fallback")
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    # 首先尝试使用 iflow_sdk
    if IFLOW_SDK_AVAILABLE:
        try:
            logger.info("Trying to use iflow_sdk...")
            content = await call_ai_with_sdk(prompt)
            logger.info(f"iflow_sdk returned content length: {len(content)}")
            
            # 尝试解析 JSON
            try:
                # 清理可能的 markdown 代码块
                content = content.strip()
                
                # 移除可能的 markdown 代码块标记
                if content.startswith("```json"):
                    content = content[7:]
                elif content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                
                content = content.strip()
                
                # 尝试解析 JSON
                article_data = json.loads(content)
                
                # 验证必要字段
                if not isinstance(article_data, dict):
                    raise ValueError("AI 返回的不是 JSON 对象")
                
                # 确保必要字段存在
                required_fields = ['title', 'hook', 'emotion']
                for field in required_fields:
                    if field not in article_data:
                        article_data[field] = ""
                
                # 确保数组字段存在
                if 'highlights' not in article_data or not isinstance(article_data['highlights'], list):
                    article_data['highlights'] = []
                if 'cases' not in article_data or not isinstance(article_data['cases'], list):
                    article_data['cases'] = []
                if 'testimonials' not in article_data or not isinstance(article_data['testimonials'], list):
                    article_data['testimonials'] = []
                if 'tags' not in article_data or not isinstance(article_data['tags'], list):
                    article_data['tags'] = []
                if 'quickStart' not in article_data or not isinstance(article_data['quickStart'], dict):
                    article_data['quickStart'] = {"install": "", "usage": ""}
                
                logger.info(f"✅ Successfully parsed AI response, title: {article_data.get('title', 'N/A')[:30]}...")
                return article_data
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to parse SDK response as JSON: {e}")
                logger.error(f"Raw content preview: {content[:500]}")
                # 尝试提取 JSON 部分
                try:
                    # 查找 JSON 对象的开始和结束
                    start_idx = content.find('{')
                    end_idx = content.rfind('}')
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        json_str = content[start_idx:end_idx+1]
                        article_data = json.loads(json_str)
                        logger.info("✅ Successfully extracted and parsed JSON from response")
                        return article_data
                except Exception as extract_error:
                    logger.error(f"Failed to extract JSON: {extract_error}")
                
                # 返回原始内容作为后备
                return {
                    "title": f"📝 {repo.name} - AI生成内容",
                    "hook": content[:500] if len(content) > 100 else "AI 生成内容解析失败，请查看原始内容",
                    "emotion": "",
                    "highlights": [],
                    "cases": [],
                    "quickStart": {"install": "", "usage": ""},
                    "testimonials": [],
                    "tags": [repo.language, "AI生成", "开源项目"],
                    "raw_content": content
                }
        except Exception as e:
            logger.error(f"iflow_sdk failed: {e}, falling back to HTTP API")
    
    # 回退到 HTTP API
    logger.info("Using HTTP API fallback...")
    
    # 尝试多个 API 端点
    api_endpoints = [
        {"url": "https://api.iflow.cn/v1/chat/completions", "model": "gpt-4o"},
        {"url": "https://api.iflow.cn/v1/chat/completions", "model": "gpt-4"},
    ]
    
    last_error = None
    
    for endpoint in api_endpoints:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                logger.info(f"Calling AI API: {endpoint['url']} with model {endpoint['model']}")
                
                response = await client.post(
                    endpoint["url"],
                    headers={
                        "Authorization": f"Bearer {IFLOW_API_KEY}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json={
                        "model": endpoint["model"],
                        "messages": [
                            {"role": "system", "content": "你是一个专业的公众号爆款文章写手，擅长写出高传播力的技术文章。"},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.8,
                        "max_tokens": 4000,
                    }
                )
                
                logger.info(f"AI API response status: {response.status_code}")
                
                if response.status_code != 200:
                    logger.error(f"AI API error: {response.status_code} - {response.text[:500]}")
                    last_error = f"HTTP {response.status_code}"
                    continue
                
                # 检查 content-type
                content_type = response.headers.get('content-type', '')
                if 'text/html' in content_type:
                    logger.error(f"API returned HTML instead of JSON")
                    last_error = "API returned HTML"
                    continue
                
                try:
                    result = response.json()
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse AI API response as JSON: {e}")
                    last_error = "JSON parse error"
                    continue
                
                # 检查响应结构
                if "choices" not in result or not result["choices"]:
                    logger.error(f"AI API response missing choices")
                    last_error = "Invalid response format"
                    continue
                
                content = result["choices"][0]["message"]["content"]
                logger.info(f"AI content length: {len(content)}")
                
                # 解析 JSON
                try:
                    content = content.strip()
                    if content.startswith("```json"):
                        content = content[7:]
                    elif content.startswith("```"):
                        content = content[3:]
                    if content.endswith("```"):
                        content = content[:-3]
                    
                    content = content.strip()
                    article_data = json.loads(content)
                    return article_data
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse content as JSON: {e}")
                    return {
                        "title": "AI 生成内容",
                        "hook": content[:500],
                        "emotion": "",
                        "highlights": [],
                        "cases": [],
                        "quickStart": {"install": "", "usage": ""},
                        "testimonials": [],
                        "tags": [],
                        "raw_content": content
                    }
                    
        except httpx.TimeoutException:
            logger.error("AI API timeout")
            last_error = "Timeout"
            continue
        except Exception as e:
            logger.error(f"AI API call failed: {type(e).__name__}: {e}")
            last_error = str(e)
            continue
    
    # 所有端点都失败了
    logger.error(f"All AI API endpoints failed. Last error: {last_error}")
    raise HTTPException(status_code=500, detail=f"AI service error: {last_error}")


@router.post("/generate-article")
async def generate_article(request: GenerateArticleRequest):
    """生成公众号文章"""
    logger.info(f"🎯 /generate-article API 被调用，项目: {request.repo.name}")
    logger.info(f"📊 SDK 可用: {IFLOW_SDK_AVAILABLE}, API Key 配置: {bool(IFLOW_API_KEY)}")
    try:
        prompt = build_article_prompt(request.repo, request.style)
        logger.info(f"📝 Prompt 构建完成，长度: {len(prompt)}")
        article = await call_ai_api(prompt)
        logger.info(f"✅ AI 生成完成，返回文章: {article.get('title', '无标题')}")
        return article
    except HTTPException as he:
        logger.error(f"❌ HTTP 错误: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Generate article failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-article")
async def optimize_article(request: OptimizeArticleRequest):
    """优化现有文章"""
    try:
        prompt = f"""请优化以下公众号文章，使其更具传播力和吸引力：

原文章：
{json.dumps(request.article, ensure_ascii=False, indent=2)}

优化要求：
1. 标题更吸引人，增加点击率
2. 开头更有冲击力，3秒抓住读者
3. 语言更有感染力，增加情绪价值
4. 保持原有结构和关键信息
5. 返回 JSON 格式
"""
        
        optimized = await call_ai_api(prompt)
        return optimized
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Optimize article failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-titles")
async def generate_titles(request: GenerateTitlesRequest):
    """生成文章标题变体"""
    try:
        prompt = f"""基于以下项目信息，生成{request.count}个爆款公众号文章标题：

项目：{request.repo.get('name', '')}
描述：{request.repo.get('description', '')}
语言：{request.repo.get('language', '')}
Star 数：{request.repo.get('stars', 0)}

要求：
1. 每个标题都要带 emoji
2. 制造好奇心或紧迫感
3. 适合技术类公众号
4. 返回 JSON 数组格式

示例输出：
["🚀 标题1", "🔥 标题2", "💡 标题3"]"""

        result = await call_ai_api(prompt)
        if isinstance(result, list):
            return {"titles": result}
        elif isinstance(result, dict) and "titles" in result:
            return result
        else:
            return {"titles": [str(result)]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate titles failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status():
    """获取 AI 服务状态"""
    return {
        "status": "ok" if IFLOW_API_KEY else "not_configured",
        "api_key_configured": bool(IFLOW_API_KEY),
        "sdk_available": IFLOW_SDK_AVAILABLE,
    }
