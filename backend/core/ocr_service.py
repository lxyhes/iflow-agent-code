"""
OCR 服务模块
支持多种 OCR 技术的统一接口
"""

import base64
import io
import logging
from typing import Optional, Dict, Any, List
from enum import Enum

logger = logging.getLogger(__name__)


class OCRTechnology(Enum):
    """OCR 技术类型"""
    LIGHTON = "lighton"  # LightOnOCR-2-1B
    TESSERACT = "tesseract"  # Tesseract OCR
    PADDLE = "paddle"  # PaddleOCR
    EASYOCR = "easyocr"  # EasyOCR


class OCRService:
    """OCR 服务类"""
    
    def __init__(self, technology: OCRTechnology = OCRTechnology.LIGHTON):
        """
        初始化 OCR 服务
        
        Args:
            technology: OCR 技术类型
        """
        self.technology = technology
        self.model = None
        self.processor = None
        self._initialize_model()
    
    def _initialize_model(self):
        """初始化 OCR 模型"""
        try:
            if self.technology == OCRTechnology.LIGHTON:
                self._init_lighton()
            elif self.technology == OCRTechnology.TESSERACT:
                self._init_tesseract()
            elif self.technology == OCRTechnology.PADDLE:
                self._init_paddle()
            elif self.technology == OCRTechnology.EASYOCR:
                self._init_easyocr()
            logger.info(f"OCR 模型初始化成功: {self.technology.value}")
        except Exception as e:
            logger.error(f"OCR 模型初始化失败: {e}")
            raise
    
    def _init_lighton(self):
        """初始化 LightOnOCR-2-1B"""
        try:
            import torch
            from transformers import LightOnOcrForConditionalGeneration, LightOnOcrProcessor
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            
            logger.info(f"正在加载 LightOnOCR-2-1B 模型到 {device}...")
            self.model = LightOnOcrForConditionalGeneration.from_pretrained(
                "lightonai/LightOnOCR-2-1B",
                torch_dtype=dtype
            ).to(device)
            self.processor = LightOnOcrProcessor.from_pretrained("lightonai/LightOnOCR-2-1B")
            self.device = device
            self.dtype = dtype
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 transformers 库: pip install transformers")
    
    def _init_tesseract(self):
        """初始化 Tesseract OCR"""
        try:
            import pytesseract
            from PIL import Image
            self.pytesseract = pytesseract
            self.Image = Image
            logger.info("Tesseract OCR 初始化成功")
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 pytesseract 库: pip install pytesseract")
    
    def _init_paddle(self):
        """初始化 PaddleOCR"""
        try:
            from paddleocr import PaddleOCR
            self.model = PaddleOCR(use_angle_cls=True, lang='ch')
            logger.info("PaddleOCR 初始化成功")
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 paddleocr 库: pip install paddleocr")
    
    def _init_easyocr(self):
        """初始化 EasyOCR"""
        try:
            import easyocr
            self.model = easyocr.Reader(['ch_sim', 'en'])
            logger.info("EasyOCR 初始化成功")
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 easyocr 库: pip install easyocr")
    
    async def process_image(
        self,
        image_data: str,
        max_tokens: int = 4096,
        temperature: float = 0.2,
        top_p: float = 0.9
    ) -> Dict[str, Any]:
        """
        处理图片并返回 OCR 结果
        
        Args:
            image_data: Base64 编码的图片数据
            max_tokens: 最大生成 token 数
            temperature: 温度参数
            top_p: Top-p 采样参数
            
        Returns:
            包含 OCR 结果的字典
        """
        try:
            # 解码 base64 图片
            image_bytes = base64.b64decode(image_data)
            image = io.BytesIO(image_bytes)
            
            if self.technology == OCRTechnology.LIGHTON:
                return await self._process_lighton(image, max_tokens, temperature, top_p)
            elif self.technology == OCRTechnology.TESSERACT:
                return await self._process_tesseract(image)
            elif self.technology == OCRTechnology.PADDLE:
                return await self._process_paddle(image)
            elif self.technology == OCRTechnology.EASYOCR:
                return await self._process_easyocr(image)
        except Exception as e:
            logger.error(f"OCR 处理失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "technology": self.technology.value
            }
    
    async def _process_lighton(
        self,
        image: io.BytesIO,
        max_tokens: int,
        temperature: float,
        top_p: float
    ) -> Dict[str, Any]:
        """使用 LightOnOCR 处理图片"""
        from PIL import Image as PILImage
        
        pil_image = PILImage.open(image)
        
        conversation = [{
            "role": "user",
            "content": [{"type": "image", "image": pil_image}]
        }]
        
        inputs = self.processor.apply_chat_template(
            conversation,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        )
        
        inputs = {
            k: v.to(device=self.device, dtype=self.dtype) if v.is_floating_point() else v.to(self.device)
            for k, v in inputs.items()
        }
        
        output_ids = self.model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p
        )
        
        generated_ids = output_ids[0, inputs["input_ids"].shape[1]:]
        output_text = self.processor.decode(generated_ids, skip_special_tokens=True)
        
        return {
            "success": True,
            "text": output_text,
            "technology": "lighton",
            "format": "markdown"
        }
    
    async def _process_tesseract(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 Tesseract 处理图片"""
        pil_image = self.Image.open(image)
        text = self.pytesseract.image_to_string(pil_image, lang='chi_sim+eng')
        
        return {
            "success": True,
            "text": text,
            "technology": "tesseract",
            "format": "plain"
        }
    
    async def _process_paddle(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 PaddleOCR 处理图片"""
        import numpy as np
        from PIL import Image as PILImage
        
        pil_image = PILImage.open(image)
        image_array = np.array(pil_image)
        
        result = self.model.ocr(image_array, cls=True)
        
        # 提取文本
        text_lines = []
        if result and result[0]:
            for line in result[0]:
                if line[1]:
                    text_lines.append(line[1][0])
        
        text = '\n'.join(text_lines)
        
        return {
            "success": True,
            "text": text,
            "technology": "paddle",
            "format": "plain"
        }
    
    async def _process_easyocr(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 EasyOCR 处理图片"""
        import numpy as np
        from PIL import Image as PILImage
        
        pil_image = PILImage.open(image)
        image_array = np.array(pil_image)
        
        result = self.model.readtext(image_array)
        
        # 提取文本
        text_lines = [item[1] for item in result]
        text = '\n'.join(text_lines)
        
        return {
            "success": True,
            "text": text,
            "technology": "easyocr",
            "format": "plain"
        }
    
    def get_supported_technologies(self) -> List[Dict[str, Any]]:
        """获取支持的 OCR 技术列表"""
        return [
            {
                "id": OCRTechnology.LIGHTON.value,
                "name": "LightOnOCR-2-1B",
                "description": "高性能 OCR 模型,支持 Markdown 输出",
                "features": ["Markdown 输出", "数学公式识别", "表格识别", "多栏布局"],
                "recommended": True
            },
            {
                "id": OCRTechnology.TESSERACT.value,
                "name": "Tesseract OCR",
                "description": "开源 OCR 引擎,支持多语言",
                "features": ["多语言支持", "离线运行", "快速识别"],
                "recommended": False
            },
            {
                "id": OCRTechnology.PADDLE.value,
                "name": "PaddleOCR",
                "description": "百度开源 OCR 工具,中文识别优秀",
                "features": ["中文识别", "方向分类", "多语言"],
                "recommended": False
            },
            {
                "id": OCRTechnology.EASYOCR.value,
                "name": "EasyOCR",
                "description": "简单易用的 OCR 库",
                "features": ["简单易用", "多语言", "GPU 加速"],
                "recommended": False
            }
        ]


# 全局 OCR 服务实例缓存
_ocr_service_cache: Dict[str, OCRService] = {}


def get_ocr_service(technology: str = "lighton") -> OCRService:
    """
    获取 OCR 服务实例(单例模式)
    
    Args:
        technology: OCR 技术类型
        
    Returns:
        OCR 服务实例
    """
    if technology not in _ocr_service_cache:
        tech_enum = OCRTechnology(technology)
        _ocr_service_cache[technology] = OCRService(tech_enum)
    return _ocr_service_cache[technology]
