/**
 * AttachedImagesPreview Component
 * 附件图片预览组件
 */

import React from 'react';

const AttachedImagesPreview = ({ images, onRemove }) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
      {images.map((image, index) => (
        <div key={index} className="relative group">
          <img
            src={image.data}
            alt={image.name}
            className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
          />
          <button
            onClick={() => onRemove(index)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          >
            ×
          </button>
        </div>
      ))}
      <div className="text-xs text-gray-500 dark:text-gray-400 self-center">
        {images.length} image{images.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default AttachedImagesPreview;