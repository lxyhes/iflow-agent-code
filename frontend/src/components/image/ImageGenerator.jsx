import React, { useState } from 'react';
import { 
  Image, 
  Upload, 
  Sparkles, 
  Download, 
  Loader,
  CheckCircle,
  XCircle,
  Palette,
  Wand2
} from 'lucide-react';

/**
 * 图像生成器组件
 * 支持文生图、图生图等功能
 */
const ImageGenerator = () => {
  const [activeTab, setActiveTab] = useState('text-to-image');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [image, setImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [options, setOptions] = useState({
    model: 'wanx-v1',
    size: '1024x1024',
    numImages: 1
  });

  // 文生图
  const handleTextToImage = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/image/generate/text-to-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          config: {
            model: options.model,
            size: options.size,
            num_images: options.numImages
          }
        })
      });

      if (!response.ok) throw new Error('生成失败');
      
      const data = await response.json();
      
      // 轮询任务状态
      pollGenerationStatus(data.id);

    } catch (error) {
      alert('生成失败：' + error.message);
      setGenerating(false);
    }
  };

  // 图生图
  const handleImageToImage = async () => {
    if (!image || !prompt.trim()) {
      alert('请选择图片并输入提示词');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('prompt', prompt);

      const response = await fetch('/api/image/generate/image-to-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('生成失败');
      
      const data = await response.json();
      pollGenerationStatus(data.id);

    } catch (error) {
      alert('生成失败：' + error.message);
      setGenerating(false);
    }
  };

  // 轮询生成状态
  const pollGenerationStatus = async (id) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/image/generation/${id}`);
        if (!response.ok) throw new Error('获取状态失败');
        
        const data = await response.json();
        setResult(data);

        if (data.status === 'completed' || data.status === 'failed') {
          setGenerating(false);
        } else {
          setTimeout(poll, 2000);
        }
      } catch (error) {
        alert('获取状态失败：' + error.message);
        setGenerating(false);
      }
    };
    poll();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        AI 图像生成
      </h1>

      {/* 选项卡 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('text-to-image')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'text-to-image'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          文生图
        </button>
        <button
          onClick={() => setActiveTab('image-to-image')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'image-to-image'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400'
          }`}
        >
          <Image className="w-4 h-4" />
          图生图
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：输入区域 */}
        <div className="space-y-4">
          {/* 提示词输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              提示词
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要生成的图像..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
            />
          </div>

          {/* 负向提示词 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              负向提示词 (可选)
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="不希望出现在图像中的内容..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
            />
          </div>

          {/* 图生图 - 图片上传 */}
          {activeTab === 'image-to-image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                输入图片
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    点击或拖拽上传图片
                  </span>
                </label>
                {image && (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    已选择：{image.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 选项 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                模型
              </label>
              <select
                value={options.model}
                onChange={(e) => setOptions({ ...options, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="wanx-v1">通义万相 v1</option>
                <option value="wanx-v2">通义万相 v2</option>
                <option value="dall-e-3">DALL-E 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                尺寸
              </label>
              <select
                value={options.size}
                onChange={(e) => setOptions({ ...options, size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="512x512">512x512</option>
                <option value="1024x1024">1024x1024</option>
                <option value="1024x768">1024x768</option>
                <option value="768x1024">768x1024</option>
              </select>
            </div>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={activeTab === 'text-to-image' ? handleTextToImage : handleImageToImage}
            disabled={generating || !prompt.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {generating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Palette className="w-5 h-5" />
                生成图像
              </>
            )}
          </button>
        </div>

        {/* 右侧：结果区域 */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            生成结果
          </h3>

          {!result && !generating && (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无生成结果</p>
                <p className="text-sm mt-2">输入提示词并点击生成</p>
              </div>
            </div>
          )}

          {generating && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">正在生成图像...</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.status === 'completed' ? (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">生成成功</span>
                    </div>
                  </div>
                  
                  {result.outputImagePath && (
                    <div>
                      <img
                        src={`/api/image/download/${encodeURIComponent(result.outputImagePath)}`}
                        alt="生成结果"
                        className="w-full rounded-lg shadow-lg"
                      />
                      <button
                        onClick={() => window.open(`/api/image/download/${encodeURIComponent(result.outputImagePath)}`, '_blank')}
                        className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        下载图片
                      </button>
                    </div>
                  )}
                </>
              ) : result.status === 'failed' ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">生成失败</span>
                  </div>
                  <p className="text-sm mt-2 text-red-600 dark:text-red-400">{result.errorMessage}</p>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  处理中...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
