#!/usr/bin/env python3
"""
测试在线 OCR 服务
"""

import asyncio
import sys
import os
import base64
from PIL import Image, ImageDraw, ImageFont

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.core.ocr_service import get_ocr_service


async def test_online_ocr():
    """测试在线 OCR 服务"""
    print("=" * 60)
    print("测试在线 OCR 服务")
    print("=" * 60)
    print()

    # 检查环境变量
    api_key = os.getenv("BAIDU_OCR_API_KEY")
    secret_key = os.getenv("BAIDU_OCR_SECRET_KEY")

    if not api_key or not secret_key:
        print("❌ 百度云 OCR API 密钥未配置")
        print()
        print("请先配置环境变量:")
        print("  BAIDU_OCR_API_KEY=your_api_key")
        print("  BAIDU_OCR_SECRET_KEY=your_secret_key")
        print()
        print("获取方式:")
        print("  1. 访问 https://console.bce.baidu.com/ai/#/ai/ocr/overview/index")
        print("  2. 创建应用获取 API Key 和 Secret Key")
        print("  3. 复制 .env.ocr.example 为 .env 并填写密钥")
        print()
        return False

    print("✅ 百度云 OCR API 密钥已配置")
    print()

    # 初始化在线 OCR 服务
    print("1. 初始化在线 OCR 服务...")
    try:
        ocr_service = get_ocr_service("online")
        print("  ✅ 在线 OCR 服务初始化成功")
    except Exception as e:
        print(f"  ❌ 初始化失败: {e}")
        return False

    # 创建测试图片
    print()
    print("2. 创建测试图片...")
    try:
        # 创建一个简单的测试图片
        img = Image.new("RGB", (600, 200), color="white")
        draw = ImageDraw.Draw(img)

        # 绘制文本
        text1 = "Hello World!"
        text2 = "你好世界!"
        text3 = "This is a test for online OCR."

        try:
            # 尝试使用系统字体
            font_large = ImageFont.truetype("arial.ttf", 40)
            font_small = ImageFont.truetype("arial.ttf", 24)
        except:
            # 如果找不到字体,使用默认字体
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

        draw.text((50, 30), text1, fill="black", font=font_large)
        draw.text((50, 90), text2, fill="black", font=font_large)
        draw.text((50, 150), text3, fill="black", font=font_small)

        # 保存为 base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        print("  ✅ 测试图片创建成功")
        print(f"     文本: {text1} | {text2} | {text3}")
    except Exception as e:
        print(f"  ❌ 创建测试图片失败: {e}")
        return False

    # 处理图片
    print()
    print("3. 使用在线 OCR 处理图片...")
    try:
        result = await ocr_service.process_image(
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
            if 'provider' in result:
                print(f"  提供商: {result['provider']}")
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
    print("✅ 在线 OCR 测试通过!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_online_ocr())
    sys.exit(0 if success else 1)