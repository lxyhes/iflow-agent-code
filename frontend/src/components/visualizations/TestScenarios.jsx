import React from 'react';
import { ClipboardList, CheckCircle, AlertTriangle, Shield, Zap, Bug } from 'lucide-react';

const TestScenarios = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
        <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无测试用例数据。</p>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'security': return <Shield className="w-4 h-4 text-red-500" />;
      case 'performance': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'edge case': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getTypeStyle = (type) => {
    switch (type?.toLowerCase()) {
      case 'security': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'performance': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'edge case': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      default: return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-500" />
          测试用例与验收标准
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          共 {scenarios.length} 个测试场景
        </span>
      </div>

      <div className="grid gap-4">
        {scenarios.map((scenario, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 ${getTypeStyle(scenario.type)}`}>
                  {getTypeIcon(scenario.type)}
                  {scenario.type}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {scenario.name}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                TC-{String(i + 1).padStart(3, '0')}
              </span>
            </div>
            
            <div className="p-4 grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">测试场景描述</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {scenario.description}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3 border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">验收标准 (Acceptance Criteria)</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {scenario.acceptance_criteria}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestScenarios;
