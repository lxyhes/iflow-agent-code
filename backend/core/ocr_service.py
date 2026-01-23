"""
OCR 服务模块
支持多种 OCR 技术的统一接口
"""

import base64
import io
import logging
import os
import requests
from typing import Optional, Dict, Any, List
from enum import Enum

logger = logging.getLogger(__name__)


class OCRTechnology(Enum):
    """OCR 技术类型"""

    LIGHTON = "lighton"  # LightOnOCR-2-1B (Transformers)
    LIGHTON_VLLM = "lighton_vllm"  # LightOnOCR-1B-1025 (vLLM)
    TESSERACT = "tesseract"  # Tesseract OCR
    PADDLE = "paddle"  # PaddleOCR
    EASYOCR = "easyocr"  # EasyOCR
    RAPIDOCR = "rapidocr"  # RapidOCR (快速)
    ONLINE = "online"  # 在线 OCR 服务
    CNOCR = "cnocr"  # CNOCR (推荐,轻量级中文OCR)


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
            if self.technology == OCRTechnology.CNOCR:
                self._init_cnocr()
            elif self.technology == OCRTechnology.ONLINE:
                self._init_online()
            elif self.technology == OCRTechnology.LIGHTON:
                self._init_lighton()
            elif self.technology == OCRTechnology.LIGHTON_VLLM:
                self._init_lighton_vllm()
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
            default_cache_root = os.path.join(
                os.path.expanduser("~"), ".cache", "iflow-agent", "ocr_cache"
            )
            cache_root = os.getenv("IFLOW_OCR_CACHE_DIR") or default_cache_root
            try:
                os.makedirs(cache_root, exist_ok=True)
            except Exception:
                cache_root = os.path.join(base_dir, "storage", "ocr_cache")
                os.makedirs(cache_root, exist_ok=True)
            os.environ.setdefault("HF_HOME", os.path.join(cache_root, "hf_home"))
            os.environ.setdefault(
                "TRANSFORMERS_CACHE", os.path.join(cache_root, "hf_cache")
            )
            os.environ.setdefault("HF_HUB_CACHE", os.path.join(cache_root, "hf_hub"))
            os.environ.setdefault("MPLCONFIGDIR", os.path.join(cache_root, "mpl"))
            
            # 添加镜像站支持
            os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

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
                logger.info(f"尝试从 {source} 加载模型...")
                m = AutoModelForVision2Seq.from_pretrained(
                    source,
                    torch_dtype=target_dtype,
                    trust_remote_code=True,
                    low_cpu_mem_usage=True,
                    cache_dir=os.environ.get("TRANSFORMERS_CACHE"),
                    # 添加超时和重试配置
                    timeout=300,
                )
                return m.to(device)

            try:
                self.model = load_model(dtype)
            except Exception as e:
                logger.warning(f"LightOnOCR 模型加载失败: {e}")
                # 尝试使用镜像站 - 需要使用正确的模型 ID 和 HF_ENDPOINT
                if "hf-mirror" not in str(source):
                    logger.info("尝试使用 HuggingFace 镜像站...")
                    # 设置镜像站环境变量,但保持模型 ID 不变
                    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
                    source = "lightonai/LightOnOCR-2-1B"
                    self.model = load_model(dtype)
                else:
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

    def _init_online(self):
        """初始化在线 OCR 服务"""
        try:
            # 支持多种在线 OCR 服务
            self.ocr_providers = {
                "tencent": {
                    "name": "腾讯云 OCR",
                    "endpoint": "https://ocr.tencentcloudapi.com",
                    "enabled": os.getenv("TENCENT_OCR_ENABLED", "false").lower() == "true",
                },
                "aliyun": {
                    "name": "阿里云 OCR",
                    "endpoint": "https://ocr-api.cn-hangzhou.aliyuncs.com",
                    "enabled": os.getenv("ALIYUN_OCR_ENABLED", "false").lower() == "true",
                },
                "baidu": {
                    "name": "百度云 OCR",
                    "endpoint": "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic",
                    "enabled": os.getenv("BAIDU_OCR_ENABLED", "false").lower() == "true",
                },
            }

            # 默认使用百度云 OCR (免费额度)
            self.default_provider = os.getenv("ONLINE_OCR_PROVIDER", "baidu")
            
            logger.info(f"✅ 在线 OCR 服务初始化成功")
            logger.info(f"  默认提供商: {self.ocr_providers.get(self.default_provider, {}).get('name', '未知')}")
            logger.info(f"  可用提供商: {[p['name'] for p in self.ocr_providers.values() if p['enabled']]}")

        except Exception as e:
            logger.error(f"在线 OCR 初始化失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise RuntimeError(f"在线 OCR 服务不可用: {str(e)}")

    def _init_cnocr(self):
        """初始化 CNOCR (轻量级中文 OCR)"""
        try:
            from cnocr import CnOcr

            logger.info(f"正在加载 CNOCR 模型...")

            # 使用轻量级模型
            self.model = CnOcr(
                rec_model_name='densenet_lite_136-gru',
                det_model_name='db_resnet18',
                context='cpu',  # 使用 CPU
                assert_exists=False,  # 不检查模型是否存在,会自动下载
            )

            logger.info("✅ CNOCR 模型加载成功")

        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 cnocr 库: pip install cnocr")
        except Exception as e:
            logger.error(f"CNOCR 模型初始化失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise RuntimeError(f"CNOCR 模型不可用: {str(e)}")

    def _init_lighton_vllm(self):
        """初始化 LightOnOCR vLLM 服务"""
        try:
            # vLLM 服务端点配置
            self.vllm_endpoint = os.getenv(
                "VLLM_OCR_ENDPOINT", "http://localhost:8000/v1/chat/completions"
            )
            self.vllm_model = os.getenv(
                "VLLM_OCR_MODEL", "lightonai/LightOnOCR-1B-1025"
            )

            logger.info(f"使用 vLLM OCR 服务: {self.vllm_endpoint}")
            logger.info(f"模型: {self.vllm_model}")

            # 测试连接
            try:
                response = requests.get(
                    self.vllm_endpoint.replace("/v1/chat/completions", "/health"),
                    timeout=5,
                )
                logger.info(f"vLLM 服务健康检查: {response.status_code}")
            except Exception as e:
                logger.warning(f"vLLM 健康检查失败(可能服务未提供健康端点): {e}")

            logger.info("✅ LightOnOCR vLLM 服务初始化成功")

        except Exception as e:
            logger.error(f"LightOnOCR vLLM 初始化失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise RuntimeError(f"LightOnOCR vLLM 服务不可用: {str(e)}")

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
                lang="ch",
                show_log=False,  # 关闭日志输出
                use_gpu=False,  # 使用 CPU（避免 GPU 初始化开销）
                det_model_dir=None,  # 使用默认模型路径
                rec_model_dir=None,
                cls_model_dir=None,
                use_tensorrt=False,  # 不使用 TensorRT（避免编译开销）
                enable_mkldnn=True,  # 启用 MKLDNN 加速
            )
            logger.info("PaddleOCR 初始化成功（轻量模式）")
        except ImportError as e:
            logger.error(f"缺少依赖包: {e}")
            raise ImportError("请安装 paddleocr 库: pip install paddleocr")

    def _init_easyocr(self):
        """初始化 EasyOCR"""
        try:
            import easyocr

            self.model = easyocr.Reader(["ch_sim", "en"])
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
            raise ImportError(
                "请安装 rapidocr_onnxruntime 库: pip install rapidocr_onnxruntime"
            )

    async def process_image(
        self,
        image_data: str,
        max_tokens: int = 4096,
        temperature: float = 0.2,
        top_p: float = 0.9,
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

            if self.technology == OCRTechnology.CNOCR:
                return await self._process_cnocr(image)
            elif self.technology == OCRTechnology.ONLINE:
                return await self._process_online(image, max_tokens, temperature, top_p)
            elif self.technology == OCRTechnology.LIGHTON:
                return await self._process_lighton(
                    image, max_tokens, temperature, top_p
                )
            elif self.technology == OCRTechnology.LIGHTON_VLLM:
                return await self._process_lighton_vllm(
                    image, max_tokens, temperature, top_p
                )
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
                "technology": self.technology.value,
            }

    async def process_rgb_array(self, image_array: Any) -> Dict[str, Any]:
        if self.technology == OCRTechnology.RAPIDOCR:
            try:
                result, _ = self.model(image_array)
                blocks: List[Dict[str, Any]] = []
                if result:
                    for item in result:
                        if not isinstance(item, (list, tuple)) or len(item) < 2:
                            continue
                        box = item[0]
                        text_val = item[1]
                        score = item[2] if len(item) >= 3 else None
                        if isinstance(text_val, (list, tuple)) and text_val:
                            text_val = text_val[0]
                            if score is None and len(item[1]) >= 2:
                                score = item[1][1]
                        blocks.append(
                            {
                                "box": box,
                                "text": str(text_val or ""),
                                "score": float(score) if score is not None else None,
                            }
                        )
                text = "\n".join([b["text"] for b in blocks if b.get("text")])
                return {"success": True, "text": text, "blocks": blocks, "technology": "rapidocr", "format": "plain"}
            except Exception as e:
                return {"success": False, "error": str(e), "text": "", "technology": "rapidocr"}

        try:
            import base64
            from PIL import Image as PILImage

            buf = io.BytesIO()
            PILImage.fromarray(image_array).save(buf, format="JPEG", quality=90, optimize=True)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            return await self.process_image(b64)
        except Exception as e:
            return {"success": False, "error": str(e), "text": "", "technology": self.technology.value}

    async def _process_lighton(
        self, image: io.BytesIO, max_tokens: int, temperature: float, top_p: float
    ) -> Dict[str, Any]:
        """使用 LightOnOCR 处理图片"""
        # 检查模型和处理器是否已初始化
        if self.model is None or self.processor is None:
            logger.error("LightOnOCR 模型未初始化")
            return {
                "success": False,
                "error": "LightOnOCR 模型未正确初始化，请检查模型配置",
                "text": "",
                "technology": "lighton",
            }

        import torch
        from PIL import Image as PILImage

        pil_image = PILImage.open(image)

        # 确保图片是 RGB 格式
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        # 调整图片大小（如果太大）
        max_size = 1536  # LightOnOCR 推荐的最大边长
        width, height = pil_image.size
        if max(width, height) > max_size:
            ratio = max_size / max(width, height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            pil_image = pil_image.resize(
                (new_width, new_height), PILImage.Resampling.LANCZOS
            )

        logger.info(f"图片信息: 尺寸={pil_image.size}, 模式={pil_image.mode}")

        prompt = (
            os.getenv("IFLOW_OCR_PROMPT")
            or "Extract all text from this image and return in markdown. Preserve layout, tables, and formulas if present."
        )

        # LightOnOCR 使用标准的对话格式
        conversation = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": pil_image},
                    {"type": "text", "text": prompt},
                ],
            }
        ]

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
            inputs = self.processor(images=[pil_image], return_tensors="pt")
            if "input_ids" not in inputs:
                # 如果没有 input_ids，添加一个提示词
                inputs = self.processor(
                    text=["Extract all text from this image in markdown format:"],
                    images=[pil_image],
                    return_tensors="pt",
                )

        # 将输入移动到设备
        inputs = {
            k: v.to(device=self.device, dtype=self.dtype)
            if v.is_floating_point()
            else v.to(self.device)
            for k, v in inputs.items()
        }

        # 生成文本
        with torch.no_grad():
            # 尝试不同的生成策略
            tokenizer = getattr(self.processor, "tokenizer", None)
            eos_id = getattr(tokenizer, "eos_token_id", None)
            if eos_id is None:
                eos_id = getattr(
                    getattr(self.model, "config", None), "eos_token_id", None
                )
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
        logger.info(
            f"输入长度: {inputs['input_ids'].shape[1]}, 输出总长度: {output_ids.shape[1]}"
        )

        # 解码输出
        generated_ids = output_ids[0, inputs["input_ids"].shape[1] :]
        logger.info(f"生成的 token 数量: {len(generated_ids)}")

        if len(generated_ids) == 0:
            logger.warning("LightOnOCR 没有生成任何 token！")
            return {
                "success": False,
                "error": "模型未生成任何文本，可能是图片无法识别",
                "text": "",
                "technology": "lighton",
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
            "format": "markdown",
        }

    async def _process_lighton_vllm(
        self, image: io.BytesIO, max_tokens: int, temperature: float, top_p: float
    ) -> Dict[str, Any]:
        """使用 vLLM LightOnOCR 服务处理图片"""
        try:
            from PIL import Image as PILImage

            # 读取图片
            pil_image = PILImage.open(image)

            # 确保图片是 RGB 格式
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            # 转换为 base64
            buffer = io.BytesIO()
            pil_image.save(buffer, format="PNG")
            image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

            # 构建请求 payload
            payload = {
                "model": self.vllm_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{image_base64}"},
                            }
                        ],
                    }
                ],
                "max_tokens": min(int(max_tokens or 4096), 4096),
                "temperature": temperature,
                "top_p": top_p,
            }

            logger.info(f"发送请求到 vLLM 服务: {self.vllm_endpoint}")

            # 发送请求
            response = requests.post(
                self.vllm_endpoint,
                json=payload,
                timeout=60,  # 60秒超时
            )

            if response.status_code != 200:
                error_msg = response.text
                logger.error(f"vLLM 请求失败: {response.status_code} - {error_msg}")
                return {
                    "success": False,
                    "error": f"vLLM 服务错误: {response.status_code} - {error_msg}",
                    "text": "",
                    "technology": "lighton_vllm",
                }

            # 解析响应
            result = response.json()
            text = result["choices"][0]["message"]["content"]

            logger.info(f"vLLM OCR 处理完成，输出长度: {len(text)}")

            return {
                "success": True,
                "text": text,
                "technology": "lighton_vllm",
                "format": "markdown",
            }

        except requests.exceptions.Timeout:
            logger.error("vLLM 请求超时")
            return {
                "success": False,
                "error": "vLLM 服务请求超时，请检查服务是否正常运行",
                "text": "",
                "technology": "lighton_vllm",
            }
        except requests.exceptions.ConnectionError:
            logger.error("vLLM 连接失败")
            return {
                "success": False,
                "error": "无法连接到 vLLM 服务，请确认服务已启动",
                "text": "",
                "technology": "lighton_vllm",
            }
        except Exception as e:
            logger.error(f"vLLM OCR 处理失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": f"vLLM OCR 处理失败: {str(e)}",
                "text": "",
                "technology": "lighton_vllm",
            }

    async def _process_online(
        self, image: io.BytesIO, max_tokens: int, temperature: float, top_p: float
    ) -> Dict[str, Any]:
        """使用在线 OCR 服务处理图片"""
        try:
            from PIL import Image as PILImage

            # 读取图片
            pil_image = PILImage.open(image)

            # 确保图片是 RGB 格式
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            # 转换为 base64
            buffer = io.BytesIO()
            pil_image.save(buffer, format="PNG")
            image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

            # 尝试使用百度云 OCR (免费额度)
            baidu_result = await self._process_baidu_ocr(image_base64)
            if baidu_result["success"]:
                return baidu_result

            # 如果百度云失败,返回错误
            return {
                "success": False,
                "error": "所有在线 OCR 服务都不可用,请配置 API 密钥",
                "text": "",
                "technology": "online",
            }

        except Exception as e:
            logger.error(f"在线 OCR 处理失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "success": False,
                "error": f"在线 OCR 处理失败: {str(e)}",
                "text": "",
                "technology": "online",
            }

    async def _process_baidu_ocr(self, image_base64: str) -> Dict[str, Any]:
        """使用百度云 OCR"""
        try:
            # 获取 API 密钥
            api_key = os.getenv("BAIDU_OCR_API_KEY")
            secret_key = os.getenv("BAIDU_OCR_SECRET_KEY")

            if not api_key or not secret_key:
                logger.warning("百度云 OCR API 密钥未配置")
                return {
                    "success": False,
                    "error": "百度云 OCR API 密钥未配置",
                    "text": "",
                    "technology": "online",
                }

            # 获取 access token
            token_url = "https://aip.baidubce.com/oauth/2.0/token"
            token_params = {
                "grant_type": "client_credentials",
                "client_id": api_key,
                "client_secret": secret_key,
            }

            token_response = requests.post(token_url, params=token_params, timeout=10)
            if token_response.status_code != 200:
                raise Exception(f"获取百度云 access token 失败: {token_response.text}")

            access_token = token_response.json().get("access_token")
            if not access_token:
                raise Exception("无法获取百度云 access token")

            # 调用 OCR API
            ocr_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={access_token}"
            ocr_data = {"image": image_base64}

            ocr_response = requests.post(ocr_url, data=ocr_data, timeout=30)
            if ocr_response.status_code != 200:
                raise Exception(f"百度云 OCR 请求失败: {ocr_response.text}")

            result = ocr_response.json()

            # 检查错误
            if "error_code" in result:
                error_msg = result.get("error_msg", "未知错误")
                raise Exception(f"百度云 OCR 错误: {error_msg}")

            # 提取文本
            words = result.get("words_result", [])
            text = "\n".join([item.get("words", "") for item in words])

            logger.info(f"百度云 OCR 处理完成,识别到 {len(words)} 行文字")

            return {
                "success": True,
                "text": text,
                "technology": "online",
                "format": "plain",
                "provider": "baidu",
            }

        except Exception as e:
            logger.error(f"百度云 OCR 处理失败: {e}")
            return {
                "success": False,
                "error": f"百度云 OCR 失败: {str(e)}",
                "text": "",
                "technology": "online",
            }

    async def _process_cnocr(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 CNOCR 处理图片"""
        try:
            from PIL import Image as PILImage
            import numpy as np

            pil_image = PILImage.open(image)
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            image_array = np.array(pil_image)
            result = self.model.ocr(image_array)

            blocks: List[Dict[str, Any]] = []
            text_lines: List[str] = []
            if isinstance(result, list):
                for item in result:
                    if isinstance(item, dict):
                        t = str(item.get("text") or item.get("words") or "")
                        if t:
                            text_lines.append(t)
                        blocks.append(
                            {
                                "box": item.get("position") or item.get("box"),
                                "text": t,
                                "score": item.get("score"),
                            }
                        )
                    elif isinstance(item, (list, tuple)) and item:
                        t = str(item[0] or "")
                        if t:
                            text_lines.append(t)
                        blocks.append({"box": None, "text": t, "score": item[1] if len(item) > 1 else None})

            text = "\n".join(text_lines)
            return {"success": True, "text": text, "blocks": blocks, "technology": "cnocr", "format": "plain"}
        except Exception as e:
            logger.error(f"CNOCR 处理失败: {e}")
            return {"success": False, "error": f"CNOCR 处理失败: {str(e)}", "text": "", "technology": "cnocr"}

    async def _process_tesseract(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 Tesseract 处理图片"""
        pil_image = self.Image.open(image)
        text = self.pytesseract.image_to_string(pil_image, lang="chi_sim+eng")

        return {
            "success": True,
            "text": text,
            "technology": "tesseract",
            "format": "plain",
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
                    if "text" in first_result:
                        text_lines.append(first_result["text"])

        text = "\n".join(text_lines)

        return {
            "success": True,
            "text": text,
            "technology": "paddle",
            "format": "plain",
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
        text = "\n".join(text_lines)

        return {
            "success": True,
            "text": text,
            "technology": "easyocr",
            "format": "plain",
        }

    async def _process_rapidocr(self, image: io.BytesIO) -> Dict[str, Any]:
        """使用 RapidOCR 处理图片 (快速)"""
        import numpy as np
        from PIL import Image as PILImage

        pil_image = PILImage.open(image)
        image_array = np.array(pil_image)

        # RapidOCR 返回格式: [[[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence), ...], ...]
        result, _ = self.model(image_array)

        blocks: List[Dict[str, Any]] = []
        if result:
            for item in result:
                if not isinstance(item, (list, tuple)) or len(item) < 2:
                    continue
                box = item[0]
                text_val = item[1]
                score = item[2] if len(item) >= 3 else None
                if isinstance(text_val, (list, tuple)) and text_val:
                    text_val = text_val[0]
                    if score is None and len(item[1]) >= 2:
                        score = item[1][1]
                blocks.append({"box": box, "text": str(text_val or ""), "score": float(score) if score is not None else None})

        # --- 简单的格式化后处理 ---
        # 1. 按垂直坐标排序 blocks (尽量按阅读顺序)
        # RapidOCR 的 blocks 默认已经是按行排序的，但这里可以做个简单的微调
        # box: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] -> 只要取 y1 即可
        # blocks.sort(key=lambda b: b['box'][0][1] if b['box'] else 0)

        raw_lines = [b["text"] for b in blocks if b.get("text")]
        
        # 2. 识别常见的简历关键词，并强制加换行和 Markdown 标题
        # 比如 "教育经历" -> "\n\n### 教育经历\n"
        # 同时尝试合并短行（如果看起来是同一段）
        
        formatted_lines = []
        keywords = ["教育经历", "工作经历", "项目经历", "技能特长", "自我评价", "求职意向", "基本信息", "个人信息", "工作经验", "项目经验", "专业技能", "获奖情况", "证书"]
        
        for line in raw_lines:
            line = line.strip()
            if not line:
                continue
            
            # 检查是否是标题行
            is_title = False
            for kw in keywords:
                # 如果这一行只包含关键词，或者关键词占了大部分且很短
                if kw in line and len(line) < 15:
                    is_title = True
                    break
            
            if is_title:
                formatted_lines.append(f"\n\n### {line}\n")
            else:
                # 普通行：判断是否需要接在上一行后面，还是新起一段
                # 简单策略：如果上一行不是标题且这一行不是项目符号开头，可能可以合并
                # 但 OCR 经常把同一行拆成两段，或者把不同行连在一起。
                # 保守策略：每行都换行，但在前端显示时用 Markdown 渲染
                # 对于明显的列表项（如 "1. " 或 "•"），确保换行
                if line.startswith("1.") or line.startswith("2.") or line.startswith("3.") or line.startswith("•") or line.startswith("-"):
                    formatted_lines.append(f"\n- {line}")
                else:
                    formatted_lines.append(f"{line}")

        text = "\n".join(formatted_lines)
        
        # 3. 再次清理多余的换行
        import re
        text = re.sub(r'\n{3,}', '\n\n', text)

        return {
            "success": True,
            "text": text,
            "blocks": blocks,
            "technology": "rapidocr",
            "format": "markdown",
        }

    def get_supported_technologies(self) -> List[Dict[str, Any]]:
        """获取支持的 OCR 技术列表"""
        return [
            {
                "id": OCRTechnology.CNOCR.value,
                "name": "CNOCR (推荐)",
                "description": "轻量级中文 OCR,准确率高,无需 GPU",
                "features": [
                    "轻量级",
                    "中文识别优秀",
                    "准确率高",
                    "无需 GPU",
                    "离线运行",
                    "Python 3.9 兼容",
                ],
                "recommended": True,
                "requires_server": False,
                "requires_api_key": False,
            },
            {
                "id": OCRTechnology.ONLINE.value,
                "name": "在线 OCR",
                "description": "基于云端 API 的 OCR 服务,无需本地资源",
                "features": [
                    "无需本地资源",
                    "准确率高",
                    "支持多种格式",
                    "无需安装依赖",
                    "免费额度可用",
                ],
                "recommended": False,
                "requires_server": False,
                "requires_api_key": True,
            },
            {
                "id": OCRTechnology.LIGHTON_VLLM.value,
                "name": "LightOnOCR vLLM",
                "description": "基于 vLLM 的高性能 OCR 服务,支持 Markdown 输出",
                "features": [
                    "超高性能",
                    "Markdown 输出",
                    "数学公式识别",
                    "表格识别",
                    "多栏布局",
                    "批量处理",
                ],
                "recommended": False,
                "requires_server": True,
                "requires_api_key": False,
            },
            {
                "id": OCRTechnology.RAPIDOCR.value,
                "name": "RapidOCR",
                "description": "基于 ONNX 的快速 OCR，速度最快",
                "features": ["超快速度", "中文识别优秀", "轻量级", "无需 GPU"],
                "recommended": False,
                "requires_server": False,
                "requires_api_key": False,
            },
            {
                "id": OCRTechnology.PADDLE.value,
                "name": "PaddleOCR",
                "description": "百度开源 OCR 工具,中文识别优秀",
                "features": ["中文识别", "方向分类", "多语言"],
                "recommended": False,
                "requires_server": False,
                "requires_api_key": False,
            },
            {
                "id": OCRTechnology.TESSERACT.value,
                "name": "Tesseract OCR",
                "description": "开源 OCR 引擎,支持多语言",
                "features": ["多语言支持", "离线运行", "快速识别"],
                "recommended": False,
                "requires_server": False,
                "requires_api_key": False,
            },
            {
                "id": OCRTechnology.LIGHTON.value,
                "name": "LightOnOCR-2-1B (Transformers)",
                "description": "高性能 OCR 模型,支持 Markdown 输出",
                "features": ["Markdown 输出", "数学公式识别", "表格识别", "多栏布局"],
                "recommended": False,
                "requires_server": False,
                "requires_api_key": False,
            },
            {
                "id": OCRTechnology.EASYOCR.value,
                "name": "EasyOCR",
                "description": "简单易用的 OCR 库",
                "features": ["简单易用", "多语言", "GPU 加速"],
                "recommended": False,
                "requires_server": False,
                "requires_api_key": False,
            },
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
            
            # 如果其他 OCR 技术失败，尝试使用 CNOCR
            if technology in ["online", "lighton", "lighton_vllm", "rapidocr", "paddle", "tesseract", "easyocr"]:
                logger.warning(f"{technology} 不可用，尝试使用 CNOCR...")
                
                # 优先使用 CNOCR
                try:
                    logger.info("尝试使用 CNOCR...")
                    _ocr_service_cache["cnocr"] = OCRService(OCRTechnology.CNOCR)
                    logger.info("[get_ocr_service] CNOCR 后备初始化成功")
                    return _ocr_service_cache["cnocr"]
                except Exception as fallback_error:
                    logger.error(f"CNOCR 后备也失败: {fallback_error}")
                
                # 如果 CNOCR 也失败,按优先级尝试其他技术
                fallback_technologies = ["rapidocr", "paddle", "tesseract", "easyocr"]
                
                for fallback_tech in fallback_technologies:
                    try:
                        logger.info(f"尝试使用 {fallback_tech} 作为后备...")
                        _ocr_service_cache[fallback_tech] = OCRService(
                            OCRTechnology(fallback_tech)
                        )
                        logger.info(f"[get_ocr_service] {fallback_tech} 后备初始化成功")
                        return _ocr_service_cache[fallback_tech]
                    except Exception as fallback_error:
                        logger.error(f"{fallback_tech} 后备也失败: {fallback_error}")
                        continue
                
                # 所有技术都失败
                raise RuntimeError(
                    f"所有 OCR 服务都不可用。最后错误: {str(e)}\n"
                    f"建议解决方案:\n"
                    f"1. 检查网络连接\n"
                    f"2. 运行安装脚本: install_ocr_deps.bat (Windows) 或 install_ocr_deps.sh (Linux/Mac)\n"
                    f"3. 手动安装依赖: pip install torch transformers pillow pypdfium2\n"
                    f"4. 如果网络问题,可以设置代理或使用本地模型"
                )
            raise RuntimeError(f"OCR 服务初始化失败 ({technology}): {str(e)}")

    result = _ocr_service_cache.get(technology)
    logger.info(f"[get_ocr_service] 返回服务: {result is not None}")
    return result
