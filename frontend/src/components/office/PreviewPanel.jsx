import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Presentation,
  Upload,
  X,
  Maximize2,
  Download,
  Loader
} from 'lucide-react';

/**
 * 预览面板组件
 * 支持多种文件格式的预览
 */
const PreviewPanel = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // 处理文件选择
  const handleFileSelect = useCallback(async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('生成预览失败');
      
      const data = await response.json();
      setPreview(data);

    } catch (error) {
      alert('生成预览失败：' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 关闭预览
  const handleClose = () => {
    setFile(null);
    setPreview(null);
  };

  // 获取文件类型图标
  const getFileTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-8 h-8 text-orange-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-8 h-8 text-purple-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className={`p-6 ${fullscreen ? 'fixed inset-0 bg-white dark:bg-gray-900 z-50' : ''}`}>
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            文件预览
          </h1>
          {fullscreen && (
            <button
              onClick={() => setFullscreen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* 文件选择 */}
        {!file && (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-12">
            <label className="flex flex-col items-center cursor-pointer">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  点击或拖拽文件到此处
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  支持 PDF、Word、Excel、PPT、图片、文本等格式
                </div>
              </div>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* 加载中 */}
        {file && loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                正在生成预览...
              </p>
            </div>
          </div>
        )}

        {/* 预览内容 */}
        {file && preview && !loading && (
          <div className="space-y-6">
            {/* 文件信息 */}
            <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              {getFileTypeIcon(preview.fileType)}
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  {preview.fileName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {(preview.fileSize / 1024).toFixed(2)} KB · {preview.fileType?.toUpperCase()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFullscreen(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="全屏查看"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 预览内容 */}
            {preview.supported ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
                {/* 图片预览 */}
                {preview.thumbnailUrl && (
                  <div className="p-4">
                    <img 
                      src={preview.thumbnailUrl} 
                      alt="预览" 
                      className="max-w-full h-auto rounded-lg"
                    />
                    {preview.width && preview.height && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        尺寸：{preview.width} x {preview.height}
                      </div>
                    )}
                  </div>
                )}

                {/* 文本预览 */}
                {preview.content && !preview.thumbnailUrl && (
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono max-h-96 overflow-y-auto">
                      {preview.content}
                    </pre>
                    {preview.lineCount && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        行数：{preview.lineCount} | 字符数：{preview.charCount}
                      </div>
                    )}
                  </div>
                )}

                {/* PDF 预览 */}
                {preview.pageCount && (
                  <div className="p-4">
                    {preview.thumbnailUrl && (
                      <img 
                        src={preview.thumbnailUrl} 
                        alt="PDF 预览" 
                        className="max-w-full h-auto rounded-lg border"
                      />
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      PDF 文档 - {preview.pageCount} 页
                    </div>
                  </div>
                )}

                {/* HTML 预览 */}
                {preview.isHtml && (
                  <div className="p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      HTML 文件预览（纯文本）：
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono max-h-96 overflow-y-auto">
                      {preview.content}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{preview.message || '不支持此文件类型的预览'}</p>
              </div>
            )}

            {/* 支持的类型 */}
            <SupportedTypes />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 支持的预览类型组件
 */
const SupportedTypes = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900 dark:text-white">
          支持的预览类型
        </span>
        <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          <TypeItem icon={<FileText className="w-4 h-4" />} name="PDF" exts=".pdf" />
          <TypeItem icon={<FileText className="w-4 h-4" />} name="Word" exts=".doc, .docx" />
          <TypeItem icon={<FileSpreadsheet className="w-4 h-4" />} name="Excel" exts=".xls, .xlsx" />
          <TypeItem icon={<Presentation className="w-4 h-4" />} name="PowerPoint" exts=".ppt, .pptx" />
          <TypeItem icon={<Image className="w-4 h-4" />} name="图片" exts=".jpg, .png, .gif" />
          <TypeItem icon={<FileText className="w-4 h-4" />} name="文本" exts=".txt, .md" />
          <TypeItem icon={<FileText className="w-4 h-4" />} name="HTML" exts=".html, .htm" />
          <TypeItem icon={<FileText className="w-4 h-4" />} name="数据" exts=".json, .xml, .csv" />
          <TypeItem icon={<FileText className="w-4 h-4" />} name="差异" exts=".diff, .patch" />
        </div>
      )}
    </div>
  );
};

const TypeItem = ({ icon, name, exts }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-gray-400">{icon}</span>
    <div>
      <div className="text-gray-900 dark:text-white">{name}</div>
      <div className="text-gray-500 dark:text-gray-400 text-xs">{exts}</div>
    </div>
  </div>
);

export default PreviewPanel;
