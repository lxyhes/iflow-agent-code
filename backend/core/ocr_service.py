"""
OCR 服务模块
支持多种 OCR 技术的统一接口
"""

import base64
import io
import logging
import os
from typing import Optional, Dict, Any, List
from enum import Enum

logger = logging.getLogger(__name__)


class OCRTechnology(Enum):
    """OCR 技术类型"""
    LIGHTON = "lighton"  # LightOnOCR-2-1B
    TESSERACT = "tesseract"  # Tesseract OCR
    PADDLE = "paddle"  # PaddleOCR
    EASYOCR = "easyocr"  # EasyOCR
    RAPIDOCR = "rapidocr"  # RapidOCR (快速)


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
        self.device = None
        self.dtype = None
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
            elif self.technology == OCRTechnology.RAPIDOCR:
                self._init_rapidocr()
            logger.info(f"OCR 模型初始化成功: {self.technology.value}")
        except Exception as e:
            logger.error(f"OCR 模型初始化失败: {e}")
            raise
    
    def _init_lighton(self):
        """初始化 LightOnOCR-2-1B"""
        try:
            import torch
            from transformers import AutoModelForVision2Seq, AutoProcessor
            
            logger.info(f"正在加载 LightOnOCR-2-1B 模型...")
            
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            default_cache_root = os.path.join(os.path.expanduser("~"), ".cache", "iflow-agent", "ocr_cache")
            cache_root = os.getenv("IFLOW_OCR_CACHE_DIR") or default_cache_root
            try:
                os.makedirs(cache_root, exist_ok=True)
            except Exception:
                cache_root = os.path.join(base_dir, "storage", "ocr_cache")
                os.makedirs(cache_root, exist_ok=True)
            os.environ.setdefault("HF_HOME", os.path.join(cache_root, "hf_home"))
            os.environ.setdefault("TRANSFORMERS_CACHE", os.path.join(cache_root, "hf_cache"))
            os.environ.setdefault("HF_HUB_CACHE", os.path.join(cache_root, "hf_hub"))
            os.environ.setdefault("MPLCONFIGDIR", os.path.join(cache_root, "mpl"))
            os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

            device = "cuda" if torch.cuda.is_available() else "cpu"
            # macOS 使用 MPS 加速
            if device == "cpu" and torch.backends.mps.is_available():
                device = "mps"
                dtype = torch.float16
            elif device == "cuda":
                dtype = torch.float16
            else:
                dtype = torch.float32
            
            logger.info(f"使用设备: {device}, 数据类型: {dtype}")
            
            model_id = os.getenv("LIGHTON_OCR_MODEL_ID") or "lightonai/LightOnOCR-2-1B"
            model_path = os.getenv("LIGHTON_OCR_MODEL_PATH")
            source = model_path or model_id

            def load_model(target_dtype):
                m = AutoModelForVision2Seq.from_pretrained(
                    source,
                    torch_dtype=target_dtype,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True,
                    cache_dir=os.environ.get("TRANSFORMERS_CACHE"),
                )
                return m.to(device)

            try:
                self.model = load_model(dtype)
            except Exception:
                if device == "mps" and dtype == torch.float16:
                    logger.warning("MPS float16 加载失败，回退到 float32")
                    dtype = torch.float32
                    self.model = load_model(dtype)
                else:
                    raise
            
            self.processor = AutoProcessor.from_pretrained(
                source,
                trust_remote_code=True,
                cache_dir=os.environ.get("TRANSFORMERS_CACHE"),
            )
            
            self.device = device
            self.dtype = dtype
            
            logger.info(f"✅ LightOnOCR 模型加载成功到 {device}")
                
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装依赖: pip install 'torch>=2' transformers pillow")
        except Exception as e:
            logger.error(f"LightOnOCR 模型初始化失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # 设置为 None 以便后续检查
            self.model = None
            self.processor = None
            raise RuntimeError(f"LightOnOCR 模型不可用: {str(e)}")
    
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
            # 使用更轻量的模型配置，只初始化必要的模型
            self.model = PaddleOCR(
                use_angle_cls=True, 
                lang='ch',
                show_log=False,  # 关闭日志输出
                use_gpu=False,   # 使用 CPU（避免 GPU 初始化开销）
                det_model_dir=None,  # 使用默认模型路径
                rec_model_dir=None,
                cls_model_dir=None,
                use_tensorrt=False,  # 不使用 TensorRT（避免编译开销）
                enable_mkldnn=True   # 启用 MKLDNN 加速
            )
            logger.info("PaddleOCR 初始化成功（轻量模式）")
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
    
    def _init_rapidocr(self):
        """初始化 RapidOCR (快速 OCR)"""
        try:
            from rapidocr_onnxruntime import RapidOCR
            self.model = RapidOCR()
            logger.info("RapidOCR 初始化成功")
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 rapidocr_onnxruntime 库: pip install rapidocr_onnxruntime")
    
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
            elif self.technology == OCRTechnology.RAPIDOCR:
                return await self._process_rapidocr(image)
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
        # 检查模型和处理器是否已初始化
        if self.model is None or self.processor is None:
            logger.error("LightOnOCR 模型未初始化")
            return {
                "success": False,
                "error": "LightOnOCR 模型未正确初始化，请检查模型配置",
                "text": "",
                "technology": "lighton"
            }
        
        import torch
        from PIL import Image as PILImage
        
        pil_image = PILImage.open(image)
        
        # 确保图片是 RGB 格式
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # 调整图片大小（如果太大）
        max_size = 1536  # LightOnOCR 推荐的最大边长
        width, height = pil_image.size
        if max(width, height) > max_size:
            ratio = max_size / max(width, height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            pil_image = pil_image.resize((new_width, new_height), PILImage.Resampling.LANCZOS)
        
        logger.info(f"图片信息: 尺寸={pil_image.size}, 模式={pil_image.mode}")
        
        prompt = os.getenv("IFLOW_OCR_PROMPT") or "Extract all text from this image and return in markdown. Preserve layout, tables, and formulas if present."

        # LightOnOCR 使用标准的对话格式
        conversation = [{
            "role": "user",
            "content": [{"type": "image", "image": pil_image}, {"type": "text", "text": prompt}]
        }]
        
        # 应用聊天模板
        try:
            inputs = self.processor.apply_chat_template(
                conversation,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            )
            logger.info(f"使用 apply_chat_template 成功")
        except Exception as e:
            logger.warning(f"apply_chat_template 失败: {e}，尝试直接处理图片")
            # 备用方案：直接处理图片
            inputs = self.processor(
                images=[pil_image],
                return_tensors="pt"
            )
            if "input_ids" not in inputs:
                # 如果没有 input_ids，添加一个提示词
                inputs = self.processor(
                    text=["Extract all text from this image in markdown format:"],
                    images=[pil_image],
                    return_tensors="pt"
                )
        
        # 将输入移动到设备
        inputs = {
            k: v.to(device=self.device, dtype=self.dtype) if v.is_floating_point() else v.to(self.device)
            for k, v in inputs.items()
        }
        
        # 生成文本
        with torch.no_grad():
            # 尝试不同的生成策略
            tokenizer = getattr(self.processor, "tokenizer", None)
            eos_id = getattr(tokenizer, "eos_token_id", None)
            if eos_id is None:
                eos_id = getattr(getattr(self.model, "config", None), "eos_token_id", None)
            gen_kwargs = {
                "max_new_tokens": min(int(max_tokens or 4096), 4096),
                "do_sample": False,
                "use_cache": True,
            }
            if eos_id is not None:
                gen_kwargs["pad_token_id"] = eos_id
                gen_kwargs["eos_token_id"] = eos_id

            output_ids = self.model.generate(**inputs, **gen_kwargs)
        
        logger.info(f"LightOnOCR 生成完成，output_ids shape: {output_ids.shape}")
        logger.info(f"输入长度: {inputs['input_ids'].shape[1]}, 输出总长度: {output_ids.shape[1]}")
        
        # 解码输出
        generated_ids = output_ids[0, inputs["input_ids"].shape[1]:]
        logger.info(f"生成的 token 数量: {len(generated_ids)}")
        
        if len(generated_ids) == 0:
            logger.warning("LightOnOCR 没有生成任何 token！")
            return {
                "success": False,
                "error": "模型未生成任何文本，可能是图片无法识别",
                "text": "",
                "technology": "lighton"
            }
        
        decode_fn = getattr(self.processor, "decode", None)
        tokenizer = getattr(self.processor, "tokenizer", None)
        if decode_fn is None and tokenizer is not None:
            decode_fn = getattr(tokenizer, "decode", None)
        if decode_fn is None:
            output_text = ""
        else:
            output_text = decode_fn(generated_ids, skip_special_tokens=True)
        logger.info(f"LightOnOCR 处理完成，输出长度: {len(output_text)}")
        
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
        
        # PaddleOCR 新版本 API
        try:
            # 尝试新版本 API
            result = self.model.predict(image_array)
        except TypeError:
            # 如果失败，使用旧版本 API
            result = self.model.ocr(image_array)
        
        # 提取文本
        text_lines = []
        if result and len(result) > 0:
            # 处理不同版本的返回格式
            if isinstance(result, list) and len(result) > 0:
                first_result = result[0]
                if isinstance(first_result, list):
                    # 旧版本格式: [[[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence), ...], ...]
                    for line in first_result:
                        if isinstance(line, list) and len(line) > 1:
                            if isinstance(line[1], tuple) and len(line[1]) > 0:
                                text_lines.append(line[1][0])
                            elif isinstance(line[1], str):
                                text_lines.append(line[1])
                elif isinstance(first_result, dict):
                    # 新版本格式: [{'text': '...', 'confidence': 0.99, ...}, ...]
                    if 'text' in first_result:
                        text_lines.append(first_result['text'])
        
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
    
    async def _process_rapidocr(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 RapidOCR 处理图片 (快速)"""
        import numpy as np
        from PIL import Image as PILImage
        
        pil_image = PILImage.open(image)
        image_array = np.array(pil_image)
        
        # RapidOCR 返回格式: [[[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence), ...], ...]
        result, _ = self.model(image_array)
        
        # 提取文本
        text_lines = []
        if result and len(result) > 0:
            for line in result:
                if isinstance(line, list) and len(line) > 1:
                    text_lines.append(line[1])
        
        text = '\n'.join(text_lines)
        
        return {
            "success": True,
            "text": text,
            "technology": "rapidocr",
            "format": "plain"
        }
    
    def get_supported_technologies(self) -> List[Dict[str, Any]]:
        """获取支持的 OCR 技术列表"""
        return [
            {
                "id": OCRTechnology.RAPIDOCR.value,
                "name": "RapidOCR (推荐)",
                "description": "基于 ONNX 的快速 OCR，速度最快",
                "features": ["超快速度", "中文识别优秀", "轻量级", "无需 GPU"],
                "recommended": True
            },
            {
                "id": OCRTechnology.PADDLE.value,
                "name": "PaddleOCR",
                "description": "百度开源 OCR 工具,中文识别优秀",
                "features": ["中文识别", "方向分类", "多语言"],
                "recommended": False
            },
            {
                "id": OCRTechnology.TESSERACT.value,
                "name": "Tesseract OCR",
                "description": "开源 OCR 引擎,支持多语言",
                "features": ["多语言支持", "离线运行", "快速识别"],
                "recommended": False
            },
            {
                "id": OCRTechnology.LIGHTON.value,
                "name": "LightOnOCR-2-1B",
                "description": "高性能 OCR 模型,支持 Markdown 输出",
                "features": ["Markdown 输出", "数学公式识别", "表格识别", "多栏布局"],
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
    logger.info(f"[get_ocr_service] 请求技术: {technology}")
    logger.info(f"[get_ocr_service] 当前缓存: {list(_ocr_service_cache.keys())}")
    
    if technology not in _ocr_service_cache:
        logger.info(f"[get_ocr_service] {technology} 不在缓存中，开始初始化...")
        tech_enum = OCRTechnology(technology)
        try:
            _ocr_service_cache[technology] = OCRService(tech_enum)
            logger.info(f"[get_ocr_service] {technology} 初始化成功")
        except Exception as e:
            logger.error(f"OCR 服务初始化失败 ({technology}): {e}")
            import traceback
            logger.error(f"详细错误: {traceback.format_exc()}")
            # 如果 LightOnOCR 失败，尝试使用 Tesseract 作为后备
            if technology == "lighton":
                logger.warning("LightOnOCR 不可用，尝试使用 Tesseract 作为后备")
                try:
                    _ocr_service_cache["tesseract"] = OCRService(OCRTechnology.TESSERACT)
                    logger.info("[get_ocr_service] Tesseract 后备初始化成功")
                    return _ocr_service_cache["tesseract"]
                except Exception as fallback_error:
                    logger.error(f"Tesseract 后备也失败: {fallback_error}")
                    # 尝试使用 RapidOCR 作为最后的后备
                    try:
                        _ocr_service_cache["rapidocr"] = OCRService(OCRTechnology.RAPIDOCR)
                        logger.info("[get_ocr_service] RapidOCR 后备初始化成功")
                        return _ocr_service_cache["rapidocr"]
                    except Exception as final_fallback:
                        logger.error(f"所有 OCR 服务都不可用: {final_fallback}")
                        raise RuntimeError(f"所有 OCR 服务都不可用: {str(e)}")
            raise RuntimeError(f"OCR 服务初始化失败 ({technology}): {str(e)}")
    
    result = _ocr_service_cache.get(technology)
    logger.info(f"[get_ocr_service] 返回服务: {result is not None}")
    return result
