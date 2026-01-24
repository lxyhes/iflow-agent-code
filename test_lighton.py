#!/usr/bin/env python3
"""测试 LightOnOCR 集成"""
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def test_lighton_ocr():
    """测试 LightOnOCR"""
    logger.info("=" * 60)
    logger.info("开始测试 LightOnOCR 集成")
    logger.info("=" * 60)
    
    # 1. 测试导入
    logger.info("\n[步骤 1] 测试 transformers 导入...")
    try:
        import transformers
        logger.info(f"✅ transformers 版本: {transformers.__version__}")
    except Exception as e:
        logger.error(f"❌ transformers 导入失败: {e}")
        return False
    
    # 2. 测试 torch
    logger.info("\n[步骤 2] 测试 PyTorch...")
    try:
        import torch
        logger.info(f"✅ torch 版本: {torch.__version__}")
        logger.info(f"✅ CUDA 可用: {torch.cuda.is_available()}")
        logger.info(f"✅ MPS 可用: {torch.backends.mps.is_available()}")
    except Exception as e:
        logger.error(f"❌ torch 导入失败: {e}")
        return False
    
    # 3. 测试 AutoModel 导入
    logger.info("\n[步骤 3] 测试 AutoModel 导入...")
    try:
        from transformers import AutoModelForVision2Seq, AutoProcessor
        logger.info("✅ AutoModelForVision2Seq 和 AutoProcessor 导入成功")
    except Exception as e:
        logger.error(f"❌ AutoModel 导入失败: {e}")
        return False
    
    # 4. 测试 OCR 服务
    logger.info("\n[步骤 4] 测试 OCR 服务初始化...")
    try:
        from backend.core.ocr_service import get_ocr_service, OCRTechnology
        logger.info("✅ OCR 服务模块导入成功")
        
        # 获取 LightOnOCR 服务
        logger.info("\n正在初始化 LightOnOCR 服务...")
        service = get_ocr_service('lighton')
        
        if service.model is None:
            logger.error("❌ LightOnOCR 模型未加载")
            return False
        
        if service.processor is None:
            logger.error("❌ LightOnOCR 处理器未加载")
            return False
        
        logger.info("✅ LightOnOCR 模型加载成功")
        logger.info(f"✅ LightOnOCR 处理器加载成功")
        logger.info(f"✅ 设备: {service.device}")
        logger.info(f"✅ 数据类型: {service.dtype}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ OCR 服务初始化失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_lighton_ocr()
    
    logger.info("\n" + "=" * 60)
    if success:
        logger.info("✅ LightOnOCR 集成测试通过！")
        logger.info("=" * 60)
        sys.exit(0)
    else:
        logger.error("❌ LightOnOCR 集成测试失败！")
        logger.error("=" * 60)
        sys.exit(1)