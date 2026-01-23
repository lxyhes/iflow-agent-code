#!/usr/bin/env python3
"""
测试 vLLM OCR 集成
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.core.ocr_service import get_ocr_service, OCRTechnology


async def test_vllm_ocr():
    """测试 vLLM OCR 服务"""
    print("=" * 60)
    print("测试 vLLM OCR 集成")
    print("=" * 60)
    print()

    # 测试 1: 获取支持的 OCR 技术
    print("1. 获取支持的 OCR 技术...")
    try:
        ocr_service = get_ocr_service("rapidocr")  # 使用快速 OCR 获取技术列表
        technologies = ocr_service.get_supported_technologies()

        print(f"\n支持的 OCR 技术 ({len(technologies)} 种):\n")
        for tech in technologies:
            recommended = " ⭐ 推荐" if tech.get("recommended") else ""
            requires_server = " [需要服务]" if tech.get("requires_server") else ""
            print(f"  • {tech['name']}{recommended}{requires_server}")
            print(f"    {tech['description']}")
            print(f"    特性: {', '.join(tech['features'])}")
            print()
    except Exception as e:
        print(f"  ❌ 失败: {e}")
        return False

    # 测试 2: 检查 vLLM OCR 服务
    print("2. 检查 vLLM OCR 服务...")
    print()

    vllm_endpoint = os.getenv(
        "VLLM_OCR_ENDPOINT", "http://localhost:8000/v1/chat/completions"
    )
    print(f"  端点: {vllm_endpoint}")

    try:
        import requests

        # 测试连接
        response = requests.get(
            vllm_endpoint.replace("/v1/chat/completions", "/health"), timeout=5
        )
        if response.status_code == 200:
            print("  ✅ vLLM 服务运行正常")
        else:
            print(f"  ⚠️  vLLM 服务响应: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("  ❌ vLLM 服务未运行")
        print()
        print("  请先启动 vLLM 服务:")
        print("    Windows: start_vllm_ocr.bat")
        print("    Linux/Mac: ./start_vllm_ocr.sh")
        print()
        return False
    except Exception as e:
        print(f"  ⚠️  健康检查失败(可能服务未提供健康端点): {e}")

    # 测试 3: 初始化 vLLM OCR 服务
    print()
    print("3. 初始化 vLLM OCR 服务...")
    try:
        vllm_ocr = get_ocr_service("lighton_vllm")
        print("  ✅ vLLM OCR 服务初始化成功")
    except Exception as e:
        print(f"  ❌ 初始化失败: {e}")
        return False

    # 测试 4: 创建测试图片
    print()
    print("4. 创建测试图片...")
    try:
        from PIL import Image, ImageDraw, ImageFont

        # 创建一个简单的测试图片
        img = Image.new("RGB", (400, 100), color="white")
        draw = ImageDraw.Draw(img)

        # 绘制文本
        text = "Hello World! 你好世界!"
        try:
            # 尝试使用系统字体
            font = ImageFont.truetype("arial.ttf", 30)
        except:
            # 如果找不到字体,使用默认字体
            font = ImageFont.load_default()

        draw.text((10, 30), text, fill="black", font=font)

        # 保存为 base64
        import io
        import base64

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        print("  ✅ 测试图片创建成功")
        print(f"     文本: {text}")
    except Exception as e:
        print(f"  ❌ 创建测试图片失败: {e}")
        return False

    # 测试 5: 处理图片
    print()
    print("5. 使用 vLLM OCR 处理图片...")
    try:
        result = await vllm_ocr.process_image(
            image_base64, max_tokens=1024, temperature=0.2, top_p=0.9
        )

        if result.get("success"):
            print("  ✅ OCR 处理成功")
            print()
            print("  识别结果:")
            print("  " + "-" * 50)
            print(f"  {result['text']}")
            print("  " + "-" * 50)
            print(f"  技术: {result['technology']}")
            print(f"  格式: {result['format']}")
        else:
            print(f"  ❌ OCR 处理失败: {result.get('error')}")
            return False
    except Exception as e:
        print(f"  ❌ 处理失败: {e}")
        import traceback

        traceback.print_exc()
        return False

    print()
    print("=" * 60)
    print("✅ 所有测试通过!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_vllm_ocr())
    sys.exit(0 if success else 1)