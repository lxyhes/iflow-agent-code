import React from 'react';

const SimpleRadarChart = ({ data, size = 300 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 40;
  const levels = 5;
  const angleSlice = (Math.PI * 2) / data.length;

  // Helper to calculate coordinates
  const getCoordinates = (value, index, maxVal = 100) => {
    const angle = index * angleSlice - Math.PI / 2;
    const r = (value / maxVal) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  // Generate grid points
  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const levelRadius = (radius / levels) * (i + 1);
    const points = data.map((_, index) => {
      const angle = index * angleSlice - Math.PI / 2;
      const x = centerX + levelRadius * Math.cos(angle);
      const y = centerY + levelRadius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    return points;
  });

  // Generate data points
  const dataPoints = data.map((d, i) => getCoordinates(d.value, i)).map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid Lines */}
      {gridLevels.map((points, i) => (
        <polygon 
          key={i} 
          points={points} 
          fill="none" 
          stroke="#e5e7eb" 
          strokeWidth="1" 
          className="dark:stroke-gray-700"
        />
      ))}
      
      {/* Axis Lines */}
      {data.map((_, i) => {
        const { x, y } = getCoordinates(100, i);
        return (
          <line 
            key={i} 
            x1={centerX} 
            y1={centerY} 
            x2={x} 
            y2={y} 
            stroke="#e5e7eb" 
            strokeWidth="1" 
            className="dark:stroke-gray-700"
          />
        );
      })}

      {/* Data Polygon */}
      <polygon 
        points={dataPoints} 
        fill="rgba(59, 130, 246, 0.2)" 
        stroke="#3b82f6" 
        strokeWidth="2" 
      />

      {/* Data Points and Labels */}
      {data.map((d, i) => {
        const { x, y } = getCoordinates(d.value, i);
        const labelPos = getCoordinates(120, i); // Labels slightly outside
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#3b82f6" />
            <text 
              x={labelPos.x} 
              y={labelPos.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="text-xs fill-gray-600 dark:fill-gray-400 font-medium"
            >
              {d.subject}
            </text>
            <text 
              x={x} 
              y={y - 10} 
              textAnchor="middle" 
              className="text-[10px] fill-blue-600 dark:fill-blue-400 font-bold opacity-0 hover:opacity-100 transition-opacity"
            >
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const ImpactMatrix = ({ risks, complexity = 5, matchedModules = [] }) => {
  // Simulate multi-dimensional metrics based on complexity
  const radarData = [
    { subject: '开发成本', value: Math.min(complexity * 10 + 20, 95) },
    { subject: '维护性', value: Math.max(100 - complexity * 8, 40) },
    { subject: '性能影响', value: Math.min(complexity * 8 + 10, 90) },
    { subject: '安全性', value: 85 }, // Usually high priority
    { subject: '扩展性', value: Math.max(90 - complexity * 5, 50) },
  ];

  // Calculate stability score (inverse of complexity)
  const stabilityScore = (5 - (complexity / 10) * 2).toFixed(1);
  const stabilityPercentage = (stabilityScore / 5) * 100;

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 w-full text-left">综合评估维度</h3>
          <SimpleRadarChart data={radarData} />
        </div>

        <div className="space-y-6">
          {/* Stability Score */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-2">系统稳定性评分</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-4xl font-bold ${stabilityScore >= 4 ? 'text-green-600' : stabilityScore >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {stabilityScore}
              </span>
              <span className="text-gray-500 mb-1">/ 5.0</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${stabilityScore >= 4 ? 'bg-green-600' : stabilityScore >= 3 ? 'bg-yellow-600' : 'bg-red-600'}`} 
                style={{ width: `${stabilityPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              基于复杂度评分 ({complexity}/10) 和依赖分析，
              {stabilityScore >= 4 ? '该变更对系统核心稳定性影响较小。' : 
               stabilityScore >= 3 ? '该变更可能会对系统稳定性产生一定影响，建议加强测试。' : 
               '该变更对系统稳定性有较大风险，请谨慎实施。'}
            </p>
          </div>

          {/* Risk Heatmap (Simplified Legend) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
             <h3 className="text-lg font-semibold mb-4">风险分布热力图</h3>
             <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded text-center">
                   <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                     {risks?.filter(r => r.risk.includes('高') || r.risk.includes('High')).length || 0}
                   </div>
                   <div className="text-xs text-red-800 dark:text-red-300">高风险项</div>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded text-center">
                   <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                     {risks?.filter(r => !r.risk.includes('高') && !r.risk.includes('High')).length || 0}
                   </div>
                   <div className="text-xs text-yellow-800 dark:text-yellow-300">中/低风险项</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Dependency Matrix (Dynamic) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">模块依赖矩阵 (基于匹配结果)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="p-3 text-left">涉及模块</th>
                <th className="p-3 text-left">路径</th>
                <th className="p-3 text-left">匹配度</th>
                <th className="p-3 text-left">影响等级 (预估)</th>
              </tr>
            </thead>
            <tbody>
              {matchedModules.length > 0 ? matchedModules.map((mod, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="p-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                    {mod.path.split('/').pop()}
                  </td>
                  <td className="p-3 text-gray-500">{mod.path}</td>
                  <td className="p-3">{mod.relevance_score}%</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      mod.relevance_score > 85 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      mod.relevance_score > 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {mod.relevance_score > 85 ? 'High' : mod.relevance_score > 70 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </tr>
              )) : (
                 <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">暂无匹配模块数据</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImpactMatrix;
