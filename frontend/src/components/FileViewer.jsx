import React, { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { Loader2, Copy, Check, Eye, Code, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '../utils/api';
import MarkdownRenderer from './markdown/MarkdownRenderer';

const getLanguageExtension = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'py':
      return python();
    case 'json':
      return json();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'md':
      return markdown();
    default:
      return null;
  }
};

const isImageFile = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
};

const FileViewer = ({ file, projectPath }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('code'); // 'code' or 'preview'
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (!file || !projectPath) return;

    const ext = file.name.split('.').pop().toLowerCase();
    let imageObjectUrl = null;
    
    // Default to preview mode for markdown
    if (ext === 'md') {
      setViewMode('preview');
    } else {
      setViewMode('code');
    }

    if (isImageFile(file.name)) {
      setImageSrc(null);
      setContent('');

      const fetchImage = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await api.readFileRaw(projectPath, file.path);
          if (!response.ok) throw new Error('Failed to load image');
          const blob = await response.blob();
          imageObjectUrl = URL.createObjectURL(blob);
          setImageSrc(imageObjectUrl);
        } catch (err) {
          console.error("Failed to load image:", err);
          setError("Failed to load image preview.");
          setImageSrc(null);
        } finally {
          setLoading(false);
        }
      };

      fetchImage();
      return () => {
        if (imageObjectUrl) {
          URL.revokeObjectURL(imageObjectUrl);
        }
      };
    }
    setImageSrc(null);

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.readFile(projectPath, file.path);
        if (!response.ok) throw new Error('Failed to read file');
        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        console.error("Failed to read file:", err);
        setError("Failed to load file content.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
    };
  }, [file, projectPath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-900/50">
        <p>Select a file to view its content</p>
      </div>
    );
  }

  const languageExt = getLanguageExtension(file.name);
  const isImage = isImageFile(file.name);
  const isMarkdown = file.name.toLowerCase().endsWith('.md');

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-medium truncate text-sm">{file.name}</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isMarkdown && (
            <div className="flex bg-gray-200 dark:bg-gray-800 rounded-md p-0.5 mr-2">
              <button
                onClick={() => setViewMode('code')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'code' 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Code View"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'preview' 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )}
          
           {!isImage && !loading && !error && (
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 w-8 p-0">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative bg-white dark:bg-gray-950">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-950/50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            {error}
          </div>
        ) : isImage ? (
          <div className="h-full flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={file.name}
                className="max-h-full max-w-full object-contain rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-950"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm border dark:border-gray-700">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 text-center">No image preview</p>
              </div>
            )}
          </div>
        ) : isMarkdown && viewMode === 'preview' ? (
          <div className="h-full overflow-auto p-8 max-w-4xl mx-auto">
            <MarkdownRenderer className="prose dark:prose-invert max-w-none">
              {content}
            </MarkdownRenderer>
          </div>
        ) : (
          <CodeMirror
            value={content}
            height="100%"
            theme={oneDark}
            extensions={languageExt ? [languageExt] : []}
            editable={false}
            className="h-full text-base"
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FileViewer;
