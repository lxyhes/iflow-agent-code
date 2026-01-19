import React from 'react';
import { Timer, Users, CalendarClock, TrendingUp } from 'lucide-react';

const EffortEstimation = ({ estimation }) => {
  if (!estimation) return null;

  const { total_days, roles = [], breakdown = [] } = estimation;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Card */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">预估总工时</div>
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {total_days} <span className="text-lg text-gray-500 font-normal">人天</span>
          </div>
          <div className="flex justify-center gap-2 mt-4">
             {roles.map((role, i) => (
               <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded-full">
                 {role}
               </span>
             ))}
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
          <p className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
            该评估仅供参考，实际工时受开发人员熟练度、需求变更等因素影响，建议预留 20% 的缓冲时间。
          </p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-gray-500" />
            任务工时分解
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-3 font-medium">具体任务</th>
                <th className="p-3 font-medium w-24">角色</th>
                <th className="p-3 font-medium w-24 text-right">预估(天)</th>
                <th className="p-3 font-medium w-32">占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {breakdown.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-3 text-gray-700 dark:text-gray-300">{item.task}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      item.role === 'Backend' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      item.role === 'Frontend' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {item.role}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-gray-900 dark:text-white">{item.days}</td>
                  <td className="p-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full" 
                        style={{ width: `${Math.min((item.days / total_days) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900/50 font-semibold text-gray-900 dark:text-white">
              <tr>
                <td className="p-3" colSpan="2">总计</td>
                <td className="p-3 text-right">{total_days}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EffortEstimation;
