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
    from iflow_sdk import IFlowClient, AssistantMessage
except ImportError:
    logger.warning("iflow-cli-sdk not found. LLM service will not work.")
    IFlowClient = None
    AssistantMessage = None


class LLMService:
    """LLM服务适配器"""

    def __init__(self):
        self.api_key = os.getenv("IFLOW_API_KEY", "")

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
        if IFlowClient is None:
            logger.error("IFlowClient not available")
            return {"content": "Error: IFlow SDK not installed"}

        if not self.api_key:
            logger.error("IFLOW_API_KEY not set")
            return {"content": "Error: API key not configured"}

        try:
            # 构建提示词
            prompt = self._build_prompt(messages)

            # 使用 IFlowClient
            full_content = ""
            async with IFlowClient() as client:
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


def get_llm_service() -> LLMService:
    """获取LLM服务实例"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
