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
    
    prompt = f"""你是一位顶级公众号爆款文章写手，擅长写出10万+阅读量的技术文章。你的文章特点是：标题抓人、开头勾人、内容扎心、结尾引人行动。

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

【写作要求 - 必须严格遵守】

1. **标题**（必须带emoji，制造强烈好奇心）
   - 使用数字、悬念、对比、痛点、利益点
   - 示例："🚀 3天斩获10K Star！这个项目让{repo.language}开发者疯狂了"
   - 示例："💔 用了{repo.name}后，我把之前的工具全卸载了"
   - 示例："⚠️ 警告：看完这个项目，你可能会想重构所有代码"

2. **开头钩子**（3秒内必须抓住读者，200字以内）
   - 方式A - 反转型："说实话，第一次看到...我是不屑的...但当我真正用起来..."
   - 方式B - 痛点型："你有没有遇到过...我曾经为此加班到深夜，直到..."
   - 方式C - 权威型："昨天，我那个在大厂做架构师的朋友突然问我..."
   - 必须包含情绪词：卧槽、绝了、真香、崩溃、拯救、逆天

3. **情绪价值段落**（建立共鸣，150字左右）
   - 描述使用前的痛苦（具体、真实、让人感同身受）
   - 转折到使用后的爽感（效率提升、问题解决、心情愉悦）
   - 加入金句："这才是工具应该有的样子"、"让我重新燃起了对编程的热爱"

4. **核心亮点**（3-4个，每个都要有emoji和具体数据）
   - 不要泛泛而谈，要具体到技术细节
   - 示例：不是"性能好"，而是"比传统方案快10倍，内存占用减少80%"
   - 结合{repo.language}语言特性说明优势

5. **实战案例**（2个，前后对比必须强烈）
   - 场景要具体：不是"开发项目"，而是"处理10万条数据清洗"
   - Before：具体痛点 + 情绪描述（崩溃、抓狂、想辞职）
   - After：具体改善 + 数据支撑（节省3小时、代码减少200行）
   - Improvement：量化效果（效率提升300%、bug减少90%）

6. **快速上手**（真实可用的代码）
   - 安装命令必须准确
   - 使用示例要简洁但有实际意义
   - 代码注释说明关键步骤

7. **用户评价**（2-3个，要有真实感）
   - 不同角色：大厂工程师、独立开发者、技术负责人
   - 包含具体收益："团队效率提升50%"、"省了我3天工作量"
   - 语言口语化，像真实对话

8. **标签**（6-8个，覆盖搜索关键词）
   - 包含：技术栈、场景、特性、热度标签

【返回格式 - 必须是合法JSON】
{{
  "title": "带emoji的爆款标题，15-25字",
  "hook": "开头钩子，\\n\\n分段，制造强烈情绪反差",
  "emotion": "情绪价值段落，\\n\\n描述痛点+转折+爽感",
  "highlights": [
    {{"title": "⚡ 核心优势标题", "desc": "具体技术细节和数据支撑的优势描述，不要泛泛而谈", "emoji": "⚡"}},
    {{"title": "🚀 性能突破", "desc": "具体的性能数据对比，如比XX快X倍", "emoji": "🚀"}},
    {{"title": "💡 开发体验", "desc": "开发者使用时的具体体验改善", "emoji": "💡"}}
  ],
  "cases": [
    {{
      "title": "场景1：具体使用场景",
      "before": "😫 使用前的具体痛点描述，带情绪词，让人感同身受",
      "after": "😊 使用后的具体改善，带数据支撑",
      "improvement": "🎉 量化效果：效率提升X%、时间节省X小时、代码减少X行",
      "emoji": "😫"
    }},
    {{
      "title": "场景2：另一个具体场景",
      "before": "😤 另一个痛点的具体描述",
      "after": "✨ 改善后的状态",
      "improvement": "🚀 具体收益数据",
      "emoji": "😤"
    }}
  ],
  "quickStart": {{
    "install": "准确的安装命令",
    "usage": "简洁但有意义的代码示例"
  }},
  "testimonials": [
    {{"role": "大厂高级工程师 @某互联网大厂", "content": "用了{repo.name}后，我们团队效率提升了50%，已经全面推广", "verified": true}},
    {{"role": "独立开发者", "content": "这个项目拯救了我的 side project，省了我整整一周时间", "verified": false}},
    {{"role": "{repo.language}开发者", "content": "代码质量很高，API设计优雅，值得学习", "verified": true}}
  ],
  "tags": ["{repo.language}", "GitHub热门", "开源项目", "效率工具", "程序员必备", "技术分享"]
}}

【重要提醒】
1. 直接返回JSON字符串，不要加markdown代码块
2. 所有内容必须基于项目真实信息，不要编造
3. 语言要有感染力，像朋友强烈推荐好东西
4. 多用短句，适合手机阅读
5. 每个部分都要有情绪价值，让读者产生共鸣
6. 数据要具体，不要泛泛而谈"""

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
                logger.error(f"Failed to parse SDK response as JSON: {e}")
                # 返回原始内容
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
    try:
        prompt = build_article_prompt(request.repo, request.style)
        article = await call_ai_api(prompt)
        return article
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate article failed: {e}")
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
