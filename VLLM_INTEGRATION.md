# vLLM 集成指南

## vLLM 简介

**vLLM** (virtual LLM) 是一个高性能的大语言模型推理和服务库,由 UC Berkeley 的 Sky Computing Lab 开发。

### 核心优势

1. **高吞吐量** - 通过 PagedAttention 机制,实现高达 24x 的吞吐量提升
2. **内存高效** - 优化内存管理,支持在有限资源上运行大模型
3. **OpenAI 兼容** - 提供与 OpenAI API 兼容的 HTTP 服务接口
4. **多模型支持** - 支持 LLaMA、Qwen、GLM、DeepSeek 等主流模型
5. **易于部署** - 一行命令启动服务

### 适用场景

- ✅ 本地部署大模型
- ✅ 高并发推理服务
- ✅ 私有化 AI 应用
- ✅ 成本敏感的场景
- ✅ 需要低延迟的应用

## 系统要求

### 硬件要求

**最低配置**:
- GPU: NVIDIA GPU with 20GB+ VRAM
- 内存: 16GB+ RAM
- 存储: 50GB+ SSD

**推荐配置**:
- GPU: NVIDIA RTX 4090 或 A100
- 内存: 32GB+ RAM
- 存储: 500GB+ NVMe SSD

### 软件要求

- 操作系统: Linux/macOS/Windows
- Python: 3.8 - 3.12
- CUDA: 11.8+ (如果使用 GPU)
- PyTorch: 2.0+

## 安装步骤

### 1. 创建 Python 环境

```bash
# 使用 conda 创建新环境(推荐)
conda create -n vllm_env python=3.12
conda activate vllm_env

# 或使用 uv(更快)
pip install uv
uv venv vllm_env
source vllm_env/bin/activate
```

### 2. 安装 vLLM

```bash
# 使用 pip 安装
pip install vllm

# 验证安装
vllm --version
```

**重要提示**:
- ⚠️ 建议使用全新的 conda 环境,避免 PyTorch 版本冲突
- ⚠️ vLLM 需要编译 CUDA 内核,安装时间较长(5-10分钟)
- ⚠️ Windows 支持有限,强烈建议使用 Linux 或 WSL2

### 3. 安装依赖

```bash
# 安装必要的依赖
pip install transformers accelerate huggingface_hub
pip install ipywidgets  # 如果使用 Jupyter
```

## 部署方式

### 方式 1: 命令行启动(推荐)

```bash
# 基本启动
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key token-abc123

# 带参数启动
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype auto \
  --gpu-memory-utilization 0.95 \
  --max-model-len 131072 \
  --api-key token-abc123
```

**参数说明**:
- `--host`: 服务监听地址
- `--port`: 服务端口
- `--dtype`: 数据类型(auto/bfloat16/float16)
- `--gpu-memory-utilization`: GPU 内存利用率(0-1)
- `--max-model-len`: 最大模型长度
- `--api-key`: API 密钥

### 方式 2: Python API 使用

```python
from vllm import LLM, SamplingParams
from transformers import AutoTokenizer

# 初始化模型
llm = LLM(
    model="Qwen/Qwen2.5-7B-Instruct",
    gpu_memory_utilization=0.95,
    max_model_len=131072,
    trust_remote_code=True
)

# 初始化 tokenizer
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")

# 设置采样参数
sampling_params = SamplingParams(
    temperature=0.8,
    top_p=0.95,
    max_tokens=512
)

# 生成文本
prompts = ["你好,请介绍一下你自己"]
outputs = llm.generate(prompts, sampling_params)

for output in outputs:
    print(f"Prompt: {output.prompt}")
    print(f"Generated: {output.outputs[0].text}")
```

### 方式 3: OpenAI 兼容 API

启动服务后,可以使用 OpenAI SDK 调用:

```python
from openai import OpenAI

# 初始化客户端
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="token-abc123",
)

# 调用聊天接口
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[
        {"role": "user", "content": "你好,请介绍一下你自己"}
    ],
    temperature=0.7,
    max_tokens=512
)

print(response.choices[0].message.content)
```

## 集成到项目

### 1. 后端集成

在 `backend/server.py` 中添加 vLLM 支持:

```python
from vllm import LLM, SamplingParams
import asyncio

# vLLM 服务类
class VLLMService:
    def __init__(self):
        self.llm = None
        self.tokenizer = None
        self._initialize()
    
    def _initialize(self):
        try:
            self.llm = LLM(
                model="Qwen/Qwen2.5-7B-Instruct",
                gpu_memory_utilization=0.95,
                max_model_len=131072,
                trust_remote_code=True
            )
            self.tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
            logger.info("vLLM 服务初始化成功")
        except Exception as e:
            logger.error(f"vLLM 服务初始化失败: {e}")
            self.llm = None
    
    async def generate(self, prompt: str, **kwargs):
        """生成文本"""
        if not self.llm:
            raise Exception("vLLM 服务未初始化")
        
        sampling_params = SamplingParams(
            temperature=kwargs.get('temperature', 0.7),
            top_p=kwargs.get('top_p', 0.95),
            max_tokens=kwargs.get('max_tokens', 512)
        )
        
        outputs = self.llm.generate([prompt], sampling_params)
        return outputs[0].outputs[0].text

# 创建全局实例
vllm_service = VLLMService()

# 添加 API 端点
@app.post("/api/vllm/generate")
async def vllm_generate(request: Request):
    """vLLM 生成接口"""
    try:
        data = await request.json()
        prompt = data.get("prompt")
        result = await vllm_service.generate(prompt, **data)
        return JSONResponse(content={"success": True, "text": result})
    except Exception as e:
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)
```

### 2. 前端集成

在 `frontend/src/utils/api.js` 中添加 vLLM API 调用:

```javascript
export async function vllmGenerate(prompt, options = {}) {
  const response = await authenticatedFetch('/api/vllm/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      ...options
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      return data.text;
    }
  }
  throw new Error('vLLM 生成失败');
}
```

### 3. 在 Chat 组件中使用

```jsx
import { vllmGenerate } from '../utils/api';

function ChatInterface() {
  const [useVLLM, setUseVLLM] = useState(false);
  
  const handleSendMessage = async () => {
    if (useVLLM) {
      // 使用 vLLM
      const response = await vllmGenerate(input, {
        temperature: 0.7,
        max_tokens: 512
      });
      // 处理响应...
    } else {
      // 使用原有方式
      // ...
    }
  };
  
  return (
    <div>
      <button onClick={() => setUseVLLM(!useVLLM)}>
        {useVLLM ? '使用 vLLM' : '使用 iFlow'}
      </button>
      {/* 聊天界面 */}
    </div>
  );
}
```

## 配置选项

### 模型选择

推荐模型:

1. **Qwen2.5-7B-Instruct** - 中文优秀,7B 参数
2. **GLM-4-9B-Chat** - 智谱 AI,9B 参数
3. **DeepSeek-R1** - 推理能力强
4. **Llama-3.1-8B** - Meta 开源

### 性能调优

```bash
# 高吞吐量配置
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --tensor-parallel-size 2 \
  --max-num-batched-tokens 8192 \
  --enable-chunked-prefill

# 低延迟配置
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --max-num-seqs 1 \
  --disable-log-requests

# 内存优化配置
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --gpu-memory-utilization 0.90 \
  --max-model-len 65536 \
  --dtype float16
```

## 监控和日志

### 启用 Prometheus 监控

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --metrics-port 8001
```

### 查看日志

```bash
# 启用详细日志
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --disable-log-requests \
  --log-level DEBUG
```

## 故障排除

### 1. OOM (Out of Memory)

解决方案:
- 减少 `max_model_len`
- 减少 `gpu-memory-utilization`
- 使用更小的模型
- 增加 GPU 数量(`--tensor-parallel-size`)

### 2. CUDA 版本不兼容

解决方案:
- 使用全新的 conda 环境
- 从源代码编译安装 vLLM
- 检查 CUDA 版本是否匹配

### 3. 模型下载失败

解决方案:
- 使用 ModelScope(国内)
- 手动下载模型并指定本地路径
- 设置代理

### 4. Windows 兼容性

解决方案:
- 使用 WSL2
- 使用 Linux 服务器
- 使用 Docker 容器

## 性能对比

根据基准测试:

| 场景 | vLLM | HuggingFace TGI | 提升倍数 |
|------|------|-----------------|---------|
| 高并发吞吐 | 24x | 1x | 24x |
| 单用户延迟 | 1x | 0.8x | 0.8x |
| GPU 内存利用率 | 95% | 70% | 1.36x |

## 最佳实践

1. **环境隔离**: 使用独立的 conda 环境
2. **模型缓存**: 提前下载模型到本地
3. **批量处理**: 利用 vLLM 的批处理能力
4. **监控**: 启用 Prometheus 监控
5. **日志**: 记录详细的推理日志
6. **备份**: 定期备份模型和配置

## 总结

vLLM 是一个强大的 LLM 推理引擎,特别适合:

- ✅ 需要高吞吐量的场景
- ✅ 成本敏感的部署
- ✅ 私有化需求
- ✅ 多模型切换

通过集成 vLLM,你的系统可以获得:
- 🚀 更快的推理速度
- 💰 更低的成本
- 🔒 更好的隐私保护
- 🎯 更灵活的部署选项