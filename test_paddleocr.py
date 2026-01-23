#!/usr/bin/env python3
"""
测试 PaddleOCR
"""

import os
import base64
from PIL import Image, ImageDraw, ImageFont

def test_paddleocr():
    """测试 PaddleOCR"""
    print("=" * 60)
    print("测试 PaddleOCR")
    print("=" * 60)
    print()

    # 初始化 PaddleOCR
    print("1. 初始化 PaddleOCR...")
    try:
        from paddleocr import PaddleOCR

        ocr = PaddleOCR(
            use_angle_cls=True,
            lang='ch',
            use_gpu=False,
            show_log=False,
        )
        print("  ✅ PaddleOCR 初始化成功")
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
        text3 = "This is a test for PaddleOCR."

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

        # 保存图片
        test_image_path = "test_ocr_image.png"
        img.save(test_image_path)
        print(f"  ✅ 测试图片创建成功: {test_image_path}")
        print(f"     文本: {text1} | {text2} | {text3}")
    except Exception as e:
        print(f"  ❌ 创建测试图片失败: {e}")
        return False

    # 处理图片
    print()
    print("3. 使用 PaddleOCR 处理图片...")
    try:
        result = ocr.ocr(test_image_path, cls=True)

        if result and len(result) > 0 and result[0]:
            print("  ✅ OCR 处理成功")
            print()
            print("  识别结果:")
            print("  " + "-" * 50)

            text_lines = []
            for line in result[0]:
                if line and len(line) > 0:
                    text = line[1][0]  # 提取文本
                    confidence = line[1][1]  # 提取置信度
                    text_lines.append(text)
                    print(f"  {text} (置信度: {confidence:.2%})")

            print("  " + "-" * 50)
            print(f"  识别到 {len(text_lines)} 行文字")
            print()
            print("  完整文本:")
            print("  " + "-" * 50)
            print("  " + "\n  ".join(text_lines))
            print("  " + "-" * 50)
        else:
            print("  ⚠️  OCR 处理完成,但未识别到文字")
            return False
    except Exception as e:
        print(f"  ❌ 处理失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    # 清理测试图片
    if os.path.exists(test_image_path):
        os.remove(test_image_path)
        print()
        print("  ✅ 测试图片已删除")

    print()
    print("=" * 60)
    print("✅ PaddleOCR 测试通过!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    import sys
    success = test_paddleocr()
    sys.exit(0 if success else 1)