/**
 * OCR 技术选择器组件
 * 可嵌入到其他组件中使用
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronDown, Sparkles, BookOpen, Zap, Eye, Image as ImageIcon,
  CheckCircle2, Loader2
} from 'lucide-react';

const OCRTechnologySelector = ({ 
  selectedTechnology, 
  onTechnologyChange,
  disabled = false,
  showDescription = true,
  compact = false 
}) => {
  const [technologies, setTechnologies] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTechnologies();
  }, []);

  const loadTechnologies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ocr/technologies');
      if (response.ok) {
        const data = await response.json();
        setTechnologies(data.technologies || []);
      }
    } catch (err) {
      console.error('加载 OCR 技术失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTechnologyIcon = (techId) => {
    switch (techId) {
      case 'lighton':
        return <Sparkles className="w-4 h-4" />;
      case 'tesseract':
        return <BookOpen className="w-4 h-4" />;
      case 'paddle':
        return <Zap className="w-4 h-4" />;
      case 'easyocr':
        return <Eye className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const selectedTech = technologies.find(t => t.id === selectedTechnology);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : selectedTech ? (
            <>
              {getTechnologyIcon(selectedTech.id)}
              <span className="text-sm text-gray-900 dark:text-white">
                {selectedTech.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-500">选择技术</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && !disabled && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {technologies.map(tech => (
                <button
                  key={tech.id}
                  onClick={() => {
                    onTechnologyChange(tech.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {getTechnologyIcon(tech.id)}
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {tech.name}
                      {tech.recommended && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          (推荐)
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedTechnology === tech.id && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        OCR 技术
      </label>
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : selectedTech ? (
              <>
                {getTechnologyIcon(selectedTech.id)}
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedTech.name}
                  </div>
                  {showDescription && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedTech.description}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500">选择 OCR 技术</span>
            )}
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </button>

        {isOpen && !disabled && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              {technologies.map(tech => (
                <button
                  key={tech.id}
                  onClick={() => {
                    onTechnologyChange(tech.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                    selectedTechnology === tech.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {getTechnologyIcon(tech.id)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {tech.name}
                      </span>
                      {tech.recommended && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                          推荐
                        </span>
                      )}
                    </div>
                    {showDescription && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {tech.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tech.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedTechnology === tech.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OCRTechnologySelector;