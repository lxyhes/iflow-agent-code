import React, { useMemo } from 'react';

const normalizePoints = (box) => {
  if (!Array.isArray(box)) return null;
  if (box.length === 4 && Array.isArray(box[0])) {
    const pts = box
      .map((p) => (Array.isArray(p) && p.length >= 2 ? [Number(p[0]), Number(p[1])] : null))
      .filter(Boolean);
    return pts.length === 4 ? pts : null;
  }
  return null;
};

const toPolygonString = (pts) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');

export default function OCRBlocksOverlay({
  imageSrc,
  imageWidth,
  imageHeight,
  blocks = [],
  activeIndex = null,
  onSelect = null,
  className = '',
}) {
  const polygons = useMemo(() => {
    const out = [];
    for (let i = 0; i < (blocks || []).length; i += 1) {
      const b = blocks[i];
      const pts = normalizePoints(b?.box);
      if (!pts) continue;
      out.push({
        index: i,
        pts,
        text: b?.text || '',
        score: b?.score,
      });
    }
    return out;
  }, [blocks]);

  if (!imageSrc || !imageWidth || !imageHeight) return null;

  return (
    <div className={`relative w-full ${className}`}>
      <img src={imageSrc} alt="" className="w-full h-auto block rounded-lg" />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        preserveAspectRatio="none"
      >
        {polygons.map((p) => {
          const isActive = activeIndex === p.index;
          return (
            <polygon
              key={p.index}
              points={toPolygonString(p.pts)}
              fill={isActive ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.10)'}
              stroke={isActive ? 'rgba(59,130,246,0.95)' : 'rgba(16,185,129,0.85)'}
              strokeWidth={isActive ? 3 : 2}
              vectorEffect="non-scaling-stroke"
              onClick={() => onSelect && onSelect(p.index)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <title>{p.text}</title>
            </polygon>
          );
        })}
      </svg>
    </div>
  );
}

