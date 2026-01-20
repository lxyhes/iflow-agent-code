import React from 'react';
import { GitBranch, Wifi, WifiOff, Clock, FileCode, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

const GlobalStatusBar = ({ selectedProject, isConnected, activeTab }) => {
  const [time, setTime] = React.useState(new Date());
  const [currentBranch, setCurrentBranch] = React.useState('main');
  const [branchLoading, setBranchLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取当前 Git 分支
  React.useEffect(() => {
    if (selectedProject) {
      fetchCurrentBranch();
    }
  }, [selectedProject]);

  const fetchCurrentBranch = async () => {
    if (!selectedProject) return;

    setBranchLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/git/branches?project=${encodeURIComponent(selectedProject.name)}`
      );

      if (response.ok) {
        const data = await response.json();
        const branches = data.branches || [];
        const current = branches.find(b => b.current);
        setCurrentBranch(current ? current.name : 'main');
      }
    } catch (error) {
      console.error('Failed to fetch current branch:', error);
      // 保持默认值 'main'
    } finally {
      setBranchLoading(false);
    }
  };

  return (
    <div className="h-6 bg-blue-600 text-white flex items-center justify-between px-3 text-xs select-none flex-shrink-0 z-40">
      {/* Left Section: Project & Git */}
      <div className="flex items-center gap-4">
        {isConnected ? (
           <div className="flex items-center gap-1.5" title="Connected to Server">
             <Wifi className="w-3 h-3" />
             <span>Remote</span>
           </div>
        ) : (
           <div className="flex items-center gap-1.5 text-red-300" title="Disconnected">
             <WifiOff className="w-3 h-3" />
             <span>Disconnected</span>
           </div>
        )}

        {selectedProject && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-blue-500/50">
            <span className="font-semibold opacity-90">{selectedProject.displayName || selectedProject.name}</span>
          </div>
        )}

        {/* 显示当前 Git 分支 */}
        {selectedProject && (
          <div
            className="flex items-center gap-1.5 opacity-80 hover:opacity-100 cursor-pointer transition-opacity"
            onClick={fetchCurrentBranch}
            title="当前分支（点击刷新）"
          >
            <GitBranch className="w-3 h-3" />
            {branchLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <span>{currentBranch}</span>
            )}
          </div>
        )}
      </div>

      {/* Right Section: Context Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 opacity-80">
          <FileCode className="w-3 h-3" />
          <span>{activeTab === 'chat' ? 'Chat Mode' : activeTab === 'files' ? 'File Explorer' : activeTab === 'shell' ? 'Terminal' : activeTab === 'git' ? 'Git' : activeTab === 'rag' ? 'RAG' : activeTab === 'workflow' ? 'Workflow' : activeTab === 'database' ? 'Database' : activeTab}</span>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-blue-500/50 opacity-90">
          <Clock className="w-3 h-3" />
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div className="pl-2 border-l border-blue-500/50 opacity-80 hover:opacity-100 cursor-pointer" title="Feedback">
          <span>Feedback</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalStatusBar;
