"""
LLM服务适配器

提供统一的LLM调用接口。
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Try importing real SDK, fallback to Mock
try:
    from iflow_sdk import IFlowClient, AssistantMessage, IFlowOptions
except ImportError:
    logger.warning("iflow-cli-sdk not found. LLM service will not work.")
    IFlowClient = None
    AssistantMessage = None
    IFlowOptions = None


class LLMService:
    """LLM服务适配器"""

    def __init__(self, api_key: Optional[str] = None):
        """
        初始化LLM服务
        
        Args:
            api_key: API Key，如果为None则从环境变量读取
        """
        self._api_key = api_key

    @property
    def api_key(self) -> str:
        """获取API Key，优先使用传入的，否则从环境变量读取"""
        if self._api_key:
            return self._api_key
        return os.getenv("IFLOW_API_KEY", "")

    def with_api_key(self, api_key: Optional[str]) -> "LLMService":
        """
        创建一个新的LLMService实例，使用指定的API Key
        
        Args:
            api_key: API Key
            
        Returns:
            新的LLMService实例
        """
        return LLMService(api_key=api_key)

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        model: str = "glm-4",
    ) -> Dict[str, Any]:
        """
        调用LLM完成请求

        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            model: 模型名称

        Returns:
            包含content的响应字典
        """
        if IFlowClient is None or IFlowOptions is None:
            logger.error("IFlowClient not available")
            return {"content": "Error: IFlow SDK not installed"}

        key = self.api_key
        if not key:
            logger.error("IFLOW_API_KEY not set")
            return {"content": "Error: API key not configured"}

        try:
            # 构建提示词
            prompt = self._build_prompt(messages)

            # 使用 IFlowOptions 配置 API Key
            # 需要设置 url 和 auto_start_process=False
            # auth_method_info 需要包含 base_url，确保使用完整的 URL
            base_url = os.getenv("IFLOW_API_BASE_URL", "https://api.iflow.cn/v1")
            
            options = IFlowOptions(
                url="ws://localhost:8090/acp",
                auto_start_process=False,
                auth_method_id="iflow",
                auth_method_info={
                    "api_key": key,
                    "base_url": base_url
                }
            )

            # 使用 IFlowClient
            full_content = ""
            async with IFlowClient(options) as client:
                await client.send_message(prompt)

                async for msg in client.receive_messages():
                    if AssistantMessage and isinstance(msg, AssistantMessage):
                        if msg.chunk and msg.chunk.text:
                            full_content += msg.chunk.text
                    # 检查是否完成
                    if hasattr(msg, "__class__") and "Finish" in msg.__class__.__name__:
                        break

            return {"content": full_content}

        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            return {"content": f"Error: {str(e)}"}

    def _build_prompt(self, messages: List[Dict[str, str]]) -> str:
        """将消息列表构建为提示词"""
        prompt_parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        return "\n\n".join(prompt_parts)

    async def generate(
        self, prompt: str, temperature: float = 0.7, max_tokens: Optional[int] = None
    ) -> str:
        """
        简单的文本生成方法

        Args:
            prompt: 提示词文本
            temperature: 温度参数
            max_tokens: 最大token数

        Returns:
            生成的文本内容
        """
        messages = [{"role": "user", "content": prompt}]
        result = await self.complete(messages, temperature, max_tokens)
        return result.get("content", "")


# 全局实例
_llm_service = None


def get_llm_service(api_key: Optional[str] = None) -> LLMService:
    """
    获取LLM服务实例
    
    Args:
        api_key: 可选的API Key，如果提供则使用该Key
        
    Returns:
        LLMService实例
    """
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    
    # 如果提供了API Key，返回一个使用新Key的实例
    if api_key:
        return _llm_service.with_api_key(api_key)
    
    return _llm_service
