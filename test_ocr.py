#!/usr/bin/env python3
"""
OCR 功能测试脚本
用于测试 OCR 服务是否正常工作
"""

import sys
import os
import base64
import asyncio

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_ocr_service():
    """测试 OCR 服务"""
    print("=" * 50)
    print("OCR 功能测试")
    print("=" * 50)
    print()
    
    try:
        from backend.core.ocr_service import get_ocr_service, OCRTechnology
        
        print("✅ OCR 服务导入成功")
        print()
        
        # 测试不同的 OCR 技术
        technologies = [
            ("lighton", "LightOnOCR-2-1B (推荐)"),
            ("rapidocr", "RapidOCR (快速)"),
            ("paddle", "PaddleOCR"),
            ("tesseract", "Tesseract OCR"),
            ("easyocr", "EasyOCR")
        ]
        
        results = {}
        
        for tech_id, tech_name in technologies:
            print(f"测试 {tech_name}...")
            try:
                service = get_ocr_service(tech_id)
                if service is not None:
                    results[tech_id] = "✅ 可用"
                    print(f"  ✅ {tech_name} 可用")
                else:
                    results[tech_id] = "❌ 不可用"
                    print(f"  ❌ {tech_name} 不可用")
            except Exception as e:
                results[tech_id] = f"❌ 错误: {str(e)[:50]}"
                print(f"  ❌ {tech_name} 错误: {str(e)[:50]}")
            print()
        
        print("=" * 50)
        print("测试结果汇总")
        print("=" * 50)
        print()
        
        for tech_id, tech_name in technologies:
            status = results.get(tech_id, "❓ 未测试")
            print(f"{tech_name:30} {status}")
        
        print()
        
        # 检查是否有可用的 OCR 技术
        available = [tech_id for tech_id, tech_name in technologies if "✅" in results.get(tech_id, "")]
        
        if available:
            print("✅ 可用的 OCR 技术:")
            for tech_id in available:
                tech_name = next(name for tid, name in technologies if tid == tech_id)
                print(f"  - {tech_name}")
            print()
            print("🎉 OCR 功能正常,可以正常使用!")
        else:
            print("❌ 没有可用的 OCR 技术")
            print()
            print("💡 解决方案:")
            print("  1. 运行安装脚本: install_ocr_deps.bat (Windows) 或 install_ocr_deps.sh (Linux/Mac)")
            print("  2. 手动安装依赖: pip install torch transformers pillow pypdfium2")
            print("  3. 检查网络连接和代理设置")
            print("  4. 参考 OCR_CONFIG.md 文档")
        
    except ImportError as e:
        print(f"❌ OCR 服务导入失败: {e}")
        print()
        print("💡 解决方案:")
        print("  1. 检查 Python 环境: python --version")
        print("  2. 安装依赖: pip install torch transformers")
        print("  3. 确保 backend 目录在 Python 路径中")
        print("  4. 参考 OCR_CONFIG.md 文档")
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        print()
        print("详细错误:")
        print(traceback.format_exc())


if __name__ == "__main__":
    test_ocr_service()