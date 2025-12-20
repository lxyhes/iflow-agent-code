from ..core.agent import Agent
import os

def create_code_review_agent(api_key: str = None, cwd: str = None) -> Agent:
    """
    创建一个具备代码审查能力的 IFlow Agent。
    """
    # 默认使用当前工作目录，审批模式设为默认(需确认)以保证安全
    return Agent(name="CodeReviewer", cwd=cwd or os.getcwd(), mode="default")
