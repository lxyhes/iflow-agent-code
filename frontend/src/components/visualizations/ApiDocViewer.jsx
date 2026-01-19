import React from 'react';
import { 
  Server, 
  Database, 
  Shield, 
  Clock, 
  Activity,
  ChevronDown,
  ChevronRight,
  GitMerge,
  GitPullRequest
} from 'lucide-react';

const ApiDocViewer = ({ modules, apiDesign, existingApis }) => {
  const [activeTab, setActiveTab] = React.useState('proposed'); // 'proposed' | 'existing'

  // Proposed APIs (New Design)
  const proposedDocs = (apiDesign && apiDesign.length > 0) ? apiDesign.map((api, i) => ({
    id: `api-ai-${i}`,
    name: api.name,
    path: api.path,
    method: api.method,
    description: api.description,
    // Add business logic explanation if available in description or separate field
    logic_flow: null, 
    params: api.params || [],
    response_mock: api.response_mock,
    type: 'proposed'
  })) : [];

  // Existing APIs (From Context Analysis)
  const existingDocs = (existingApis && existingApis.length > 0) ? existingApis.map((api, i) => ({
    id: `api-exist-${i}`,
    name: api.summary || '未命名接口',
    path: api.path,
    method: api.method || 'GET',
    description: `File: ${api.related_file || 'Unknown'}`,
    logic_flow: api.logic_flow,
    params: [], // Existing APIs usually don't have params parsed yet in this lightweight version
    response_mock: null,
    type: 'existing'
  })) : [];

  const currentDocs = activeTab === 'proposed' ? proposedDocs : existingDocs;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4 w-fit">
        <button
          onClick={() => setActiveTab('proposed')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
            activeTab === 'proposed'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          新方案接口 ({proposedDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('existing')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
            activeTab === 'existing'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          现有业务接口 ({existingDocs.length})
        </button>
      </div>

      {currentDocs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{activeTab === 'proposed' ? '暂无新接口设计。' : '未检测到相关现有接口。'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentDocs.map((api, i) => (
            <ApiCard key={api.id} api={api} />
          ))}
        </div>
      )}
    </div>
  );
};

const ApiCard = ({ api }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden shadow-sm transition-all hover:shadow-md">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
            api.method === 'GET' ? 'bg-blue-100 text-blue-700' : 
            api.method === 'POST' ? 'bg-green-100 text-green-700' :
            api.method === 'DELETE' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {api.method}
          </span>
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate" title={api.path}>
            {api.path}
          </span>
          <span className="text-sm text-gray-500 truncate hidden sm:inline-block">
            - {api.name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
           {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Definition */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">接口定义</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{api.description}</p>
              
              {api.params.length > 0 ? (
                <>
                  <h5 className="text-xs font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-3 h-3 text-gray-500" />
                    请求参数
                  </h5>
                  <table className="w-full text-xs text-left mb-4 border border-gray-100 dark:border-gray-700 rounded">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500">
                      <tr>
                        <th className="p-2">参数</th>
                        <th className="p-2">类型</th>
                        <th className="p-2">必填</th>
                        <th className="p-2">描述</th>
                      </tr>
                    </thead>
                    <tbody>
                      {api.params.map((param, j) => (
                        <tr key={j} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <td className="p-2 font-mono text-blue-600">{param.name}</td>
                          <td className="p-2 text-purple-600">{param.type}</td>
                          <td className="p-2">
                            {param.required ? <span className="text-red-500">Yes</span> : <span className="text-gray-400">No</span>}
                          </td>
                          <td className="p-2 text-gray-600">{param.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic mb-4">无参数定义</div>
              )}

              {api.response_mock && (
                <>
                  <h5 className="text-xs font-semibold mb-2">响应示例</h5>
                  <div className="bg-gray-900 rounded p-3 font-mono text-xs text-green-400 overflow-x-auto max-h-40">
                    <pre>{typeof api.response_mock === 'string' ? api.response_mock : JSON.stringify(api.response_mock || {}, null, 2)}</pre>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Business Logic */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                业务逻辑说明
              </h4>
              {api.logic_flow ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {api.logic_flow}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  暂无详细业务逻辑描述。
                  {api.type === 'proposed' && " (这是新建议的接口，具体逻辑请参考技术方案文档)"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiDocViewer;
