/*
 * MainContent.jsx - Main Content Area with Session Protection Props Passthrough
 * 
 * SESSION PROTECTION PASSTHROUGH:
 * ===============================
 * 
 * This component serves as a passthrough layer for Session Protection functions:
 * - Receives session management functions from App.jsx
 * - Passes them down to ChatInterface.jsx
 * 
 * No session protection logic is implemented here - it's purely a props bridge.
 */

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import ChatInterface from './ChatInterfaceMinimal';
import ErrorBoundary from './ErrorBoundary';
import IFlowLogo from './IFlowLogo';
import CursorLogo from './CursorLogo';
import TaskList from './TaskList';
import Tooltip from './Tooltip';
import IFlowModeSelector from './IFlowModeSelector';
import IFlowModelSelector from './IFlowModelSelector';
import SmartTabBar from './SmartTabBar';
import { useTaskMaster } from '../contexts/TaskMasterContext';
import { useTasksSettings } from '../contexts/TasksSettingsContext';
import { api } from '../utils/api';

const ProjectFileExplorer = lazy(() => import('./ProjectFileExplorer'));
const CodeEditor = lazy(() => import('./CodeEditor'));
const StandaloneShell = lazy(() => import('./StandaloneShell'));
const GitPanel = lazy(() => import('./GitPanel'));
const RAGPanel = lazy(() => import('./RAGPanel'));
const SmartRequirementAnalysis = lazy(() => import('./SmartRequirementAnalysis'));
const TaskDetail = lazy(() => import('./TaskDetail'));
const PRDEditor = lazy(() => import('./PRDEditor'));
const DatabaseQuery = lazy(() => import('./DatabaseQuery'));
const WorkflowEditor = lazy(() => import('./WorkflowEditor'));
const InterviewPreparation = lazy(() => import('./InterviewPreparation'));

function MainContent({
                       selectedProject,
                       selectedSession,
                       activeTab,
                       setActiveTab,
                       ws,
                       sendMessage,
                       messages,
                       isMobile,
                       isPWA,
                       onMenuClick,
                       isLoading,
                       onInputFocusChange,
                       // Session Protection Props: Functions passed down from App.jsx to manage active session state
                       // These functions control when project updates are paused during active conversations
                       onSessionActive,        // Mark session as active when user sends message
                       onSessionInactive,      // Mark session as inactive when conversation completes/aborts
                       onSessionProcessing,    // Mark session as processing (thinking/working)
                       onSessionNotProcessing, // Mark session as not processing (finished thinking)
                       processingSessions,     // Set of session IDs currently processing
                       onReplaceTemporarySession, // Replace temporary session ID with real session ID from WebSocket
                       onNavigateToSession,    // Navigate to a specific session (for Claude CLI session duplication workaround)
                       onShowSettings,         // Show tools settings panel
                       autoExpandTools,        // Auto-expand tool accordions
                       showRawParameters,      // Show raw parameters in tool accordions
                       showThinking,           // Show thinking/reasoning sections
                       autoScrollToBottom,     // Auto-scroll to bottom when new messages arrive
                       sendByCtrlEnter,        // Send by Ctrl+Enter mode for East Asian language input
                       externalMessageUpdate,  // Trigger for external CLI updates to current session
                       onShowAllTasks,
                       aiPersona,
                       editingFile,
                       onFileOpen,
                       onCloseEditor,
                     }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [editorWidth, setEditorWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const resizeRef = useRef(null);

  // PRD Editor state
  const [showPRDEditor, setShowPRDEditor] = useState(false);
  const [selectedPRD, setSelectedPRD] = useState(null);
  const [existingPRDs, setExistingPRDs] = useState([]);
  const [prdNotification, setPRDNotification] = useState(null);

  // TaskMaster context
  const { tasks, currentProject, refreshTasks, setCurrentProject } = useTaskMaster();
  const { tasksEnabled, isTaskMasterInstalled, isTaskMasterReady } = useTasksSettings();

  // Only show tasks tab if TaskMaster is installed and enabled
  const shouldShowTasksTab = tasksEnabled && isTaskMasterInstalled;

  // Sync selectedProject with TaskMaster context
  useEffect(() => {
    if (selectedProject && selectedProject !== currentProject) {
      setCurrentProject(selectedProject);
    }
  }, [selectedProject, currentProject, setCurrentProject]);

  // Switch away from tasks tab when tasks are disabled or TaskMaster is not installed
  useEffect(() => {
    if (!shouldShowTasksTab && activeTab === 'tasks') {
      setActiveTab('chat');
    }
  }, [shouldShowTasksTab, activeTab, setActiveTab]);

  // Load existing PRDs when current project changes
  useEffect(() => {
    const loadExistingPRDs = async () => {
      if (!currentProject?.name) {
        setExistingPRDs([]);
        return;
      }

      try {
        const response = await api.get(`/taskmaster/prd/${encodeURIComponent(currentProject.name)}`);
        if (response.ok) {
          const data = await response.json();
          setExistingPRDs(data.prdFiles || []);
        } else {
          setExistingPRDs([]);
        }
      } catch (error) {
        console.error('Failed to load existing PRDs:', error);
        setExistingPRDs([]);
      }
    };

    loadExistingPRDs();
  }, [currentProject?.name]);

  const handleFileOpenLocal = (filePath, diffInfo = null) => {
    // Create a file object that CodeEditor expects
    const file = {
      name: filePath.split('/').pop(),
      path: filePath,
      projectName: selectedProject?.name,
      diffInfo: diffInfo // Pass along diff information if available
    };
    if (onFileOpen) {
      onFileOpen(file);
    }
  };

  const handleCloseEditorLocal = () => {
    if (onCloseEditor) {
      onCloseEditor();
    }
    setEditorExpanded(false);
  };

  const handleToggleEditorExpand = () => {
    setEditorExpanded(!editorExpanded);
  };

  const handleTaskClick = (task) => {
    // If task is just an ID (from dependency click), find the full task object
    if (typeof task === 'object' && task.id && !task.title) {
      const fullTask = tasks?.find(t => t.id === task.id);
      if (fullTask) {
        setSelectedTask(fullTask);
        setShowTaskDetail(true);
      }
    } else {
      setSelectedTask(task);
      setShowTaskDetail(true);
    }
  };

  const handleTaskDetailClose = () => {
    setShowTaskDetail(false);
    setSelectedTask(null);
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    // This would integrate with TaskMaster API to update task status
    console.log('Update task status:', taskId, newStatus);
    refreshTasks?.();
  };

  // Handle resize functionality
  const handleMouseDown = (e) => {
    if (isMobile) return; // Disable resize on mobile
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const container = resizeRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;

      // Min width: 300px, Max width: 80% of container
      const minWidth = 300;
      const maxWidth = containerRect.width * 0.8;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setEditorWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (isLoading) {
    return (
        <div className="h-full flex flex-col">
          {/* Header with menu button for mobile */}
          {isMobile && (
              <div
                  className="bg-background border-b border-border p-2 sm:p-3 pwa-header-safe flex-shrink-0"
              >
                <button
                    onClick={onMenuClick}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 pwa-menu-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
          )}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="w-12 h-12 mx-auto mb-4">
                <div
                    className="w-full h-full rounded-full border-4 border-gray-200 border-t-blue-500"
                    style={{
                      animation: 'spin 1s linear infinite',
                      WebkitAnimation: 'spin 1s linear infinite',
                      MozAnimation: 'spin 1s linear infinite'
                    }}
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">Loading IFlow UI</h2>
              <p>Setting up your workspace...</p>
            </div>
          </div>
        </div>
    );
  }

  if (!selectedProject) {
    return (
        <div className="h-full flex flex-col">
          {/* Header with menu button for mobile */}
          {isMobile && (
              <div
                  className="bg-background border-b border-border p-2 sm:p-3 pwa-header-safe flex-shrink-0"
              >
                <button
                    onClick={onMenuClick}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 pwa-menu-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
          )}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400 max-w-md mx-auto px-6">
              <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">Choose Your Project</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                Select a project from the sidebar to start coding with Claude. Each project contains your chat sessions and file history.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> {isMobile ? 'Tap the menu button above to access projects' : 'Create a new project by clicking the folder icon in the sidebar'}
                </p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="h-full flex flex-col">
        {/* Header with tabs */}
        <div
            className="bg-background border-b border-border p-2 sm:p-3 pwa-header-safe flex-shrink-0"
        >
          <div className="flex items-center justify-between relative">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              {isMobile && (
                  <button
                      onClick={onMenuClick}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        onMenuClick();
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation active:scale-95 pwa-menu-button flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
              )}
              <div className="min-w-0 flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
                {activeTab === 'chat' && selectedSession && (
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                      {selectedSession.__provider === 'cursor' ? (
                          <CursorLogo className="w-4 h-4" />
                      ) : (
                          <IFlowLogo className="w-4 h-4" />
                      )}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                  {activeTab === 'chat' && selectedSession ? (
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap overflow-x-auto scrollbar-hide">
                          {selectedSession.__provider === 'cursor' ? (selectedSession.name || 'Untitled Session') : (selectedSession.summary || 'New Session')}
                        </h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {selectedProject.displayName}
                        </div>
                      </div>
                  ) : activeTab === 'chat' && !selectedSession ? (
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          New Session
                        </h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {selectedProject.displayName}
                        </div>
                      </div>
                  ) : (
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          {activeTab === 'files' ? 'Project Files' :
                              activeTab === 'git' ? 'Source Control' :
                                  (activeTab === 'tasks' && shouldShowTasksTab) ? 'TaskMaster' :
                                      activeTab === 'rag' ? 'RAG Knowledge Base' :
                                          activeTab === 'database' ? 'Database Query' :
                                              activeTab === 'workflow' ? 'Workflow Editor' :
                                                  activeTab === 'interview' ? 'Interview Preparation' :
                                                      activeTab === 'smart-req' ? 'Smart Requirement Analysis' :
                                                          'Project'}
                        </h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {selectedProject.displayName}
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modern Tab Navigation - Right Side */}
            <div className="flex-shrink-0 hidden sm:flex items-center">
              {activeTab === 'chat' && (
                  <>
                    <IFlowModelSelector />
                    <IFlowModeSelector />
                  </>
              )}
              <SmartTabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                shouldShowTasksTab={shouldShowTasksTab}
                showModelSelector={activeTab === 'chat'}
              />
            </div>
          </div>
        </div>

        {/* Content Area with Right Sidebar */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main Content */}
          <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${editingFile ? 'mr-0' : ''} ${editorExpanded ? 'hidden' : ''}`}>
            <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
              <ErrorBoundary showDetails={true}>
                <ChatInterface
                    selectedProject={selectedProject}
                    selectedSession={selectedSession}
                    ws={ws}
                    sendMessage={sendMessage}
                    messages={messages}
                    onFileOpen={handleFileOpenLocal}
                    onInputFocusChange={onInputFocusChange}
                    onSessionActive={onSessionActive}
                    onSessionInactive={onSessionInactive}
                    onSessionProcessing={onSessionProcessing}
                    onSessionNotProcessing={onSessionNotProcessing}
                    processingSessions={processingSessions}
                    onReplaceTemporarySession={onReplaceTemporarySession}
                    onNavigateToSession={onNavigateToSession}
                    onShowSettings={onShowSettings}
                    autoExpandTools={autoExpandTools}
                    showRawParameters={showRawParameters}
                    showThinking={showThinking}
                    autoScrollToBottom={autoScrollToBottom}
                    sendByCtrlEnter={sendByCtrlEnter}
                    externalMessageUpdate={externalMessageUpdate}
                    onShowAllTasks={tasksEnabled ? () => setActiveTab('tasks') : null}
                    aiPersona={aiPersona}
                />
              </ErrorBoundary>
            </div>
            {activeTab === 'files' && (
                <div className="h-full overflow-hidden">
                  <Suspense fallback={null}>
                    <ProjectFileExplorer project={selectedProject} />
                  </Suspense>
                </div>
            )}
            {activeTab === 'shell' && (
                <div className="h-full w-full overflow-hidden">
                  <Suspense fallback={null}>
                    <StandaloneShell
                        project={selectedProject}
                        session={selectedSession}
                        showHeader={false}
                        onErrorDetected={(error) => {
                          console.log('Shell error detected:', error);
                        }}
                    />
                  </Suspense>
                </div>
            )}
            {activeTab === 'git' && (
                <div className="h-full overflow-hidden">
                  <Suspense fallback={null}>
                    <GitPanel selectedProject={selectedProject} isMobile={isMobile} onFileOpen={handleFileOpenLocal} />
                  </Suspense>
                </div>
            )}
            {shouldShowTasksTab && (
                <div className={`h-full ${activeTab === 'tasks' ? 'block' : 'hidden'}`}>
                  <div className="h-full flex flex-col overflow-hidden">
                    <TaskList
                        tasks={tasks || []}
                        onTaskClick={handleTaskClick}
                        showParentTasks={true}
                        className="flex-1 overflow-y-auto p-4"
                        currentProject={currentProject}
                        onTaskCreated={refreshTasks}
                        onShowPRDEditor={(prd = null) => {
                          setSelectedPRD(prd);
                          setShowPRDEditor(true);
                        }}
                        existingPRDs={existingPRDs}
                        onRefreshPRDs={(showNotification = false) => {
                          // Reload existing PRDs
                          if (currentProject?.name) {
                            api.get(`/taskmaster/prd/${encodeURIComponent(currentProject.name)}`)
                                .then(response => response.ok ? response.json() : Promise.reject())
                                .then(data => {
                                  setExistingPRDs(data.prdFiles || []);
                                  if (showNotification) {
                                    setPRDNotification('PRD saved successfully!');
                                    setTimeout(() => setPRDNotification(null), 3000);
                                  }
                                })
                                .catch(error => console.error('Failed to refresh PRDs:', error));
                          }
                        }}
                    />
                  </div>
                </div>
            )}
            <div className={`h-full ${activeTab === 'rag' ? 'block' : 'hidden'}`}>
              <ErrorBoundary showDetails={true}>
                <Suspense fallback={null}>
                  <RAGPanel
                      projectName={selectedProject?.name}
                      projectPath={selectedProject?.fullPath}
                      visible={activeTab === 'rag'}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
            <div className={`h-full ${activeTab === 'smart-req' ? 'block' : 'hidden'}`}>
              <ErrorBoundary showDetails={true}>
                <Suspense fallback={null}>
                  <SmartRequirementAnalysis
                      project={selectedProject}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
            <div className={`h-full overflow-hidden ${activeTab === 'preview' ? 'block' : 'hidden'}`}>
              {/* <LivePreviewPanel
            selectedProject={selectedProject}
            serverStatus={serverStatus}
            serverUrl={serverUrl}
            availableScripts={availableScripts}
            onStartServer={(script) => {
              sendMessage({
                type: 'server:start',
                projectPath: selectedProject?.fullPath,
                script: script
              });
            }}
            onStopServer={() => {
              sendMessage({
                type: 'server:stop',
                projectPath: selectedProject?.fullPath
              });
            }}
            onScriptSelect={setCurrentScript}
            currentScript={currentScript}
            isMobile={isMobile}
            serverLogs={serverLogs}
            onClearLogs={() => setServerLogs([])}
          /> */}
            </div>
            {activeTab === 'database' && (
                <div className="h-full w-full overflow-hidden">
                  <ErrorBoundary showDetails={true}>
                    <Suspense fallback={null}>
                      <DatabaseQuery selectedProject={selectedProject} />
                    </Suspense>
                  </ErrorBoundary>
                </div>          )}
            {activeTab === 'interview' && (
                            <div className="h-full w-full overflow-visible">
                              <ErrorBoundary showDetails={true}>
                                <Suspense fallback={null}>
                                  <InterviewPreparation selectedProject={selectedProject} />
                                </Suspense>
                              </ErrorBoundary>
                            </div>
                      )}
            {activeTab === 'workflow' && (
                <div className="h-full w-full overflow-hidden">
                  <ErrorBoundary showDetails={true}>
                    <Suspense fallback={null}>
                      <WorkflowEditor
                          selectedProject={selectedProject}
                          visible={activeTab === 'workflow'}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </div>
            )}
          </div>

          {/* Code Editor Right Sidebar - Desktop only, Mobile uses modal */}
          {editingFile && !isMobile && (
              <>
                {/* Resize Handle - Hidden when expanded */}
                {!editorExpanded && (
                    <div
                        ref={resizeRef}
                        onMouseDown={handleMouseDown}
                        className="flex-shrink-0 w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-600 cursor-col-resize transition-colors relative group"
                        title="Drag to resize"
                    >
                      {/* Visual indicator on hover */}
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-blue-500 dark:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {/* Editor Sidebar */}
                <div
                    className={`flex-shrink-0 border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden ${editorExpanded ? 'flex-1' : ''}`}
                    style={editorExpanded ? {} : { width: `${editorWidth}px` }}
                >
                  <Suspense fallback={null}>
                    <CodeEditor
                        file={editingFile}
                        onClose={handleCloseEditorLocal}
                        projectPath={selectedProject?.path}
                        isSidebar={true}
                        isExpanded={editorExpanded}
                        onToggleExpand={handleToggleEditorExpand}
                    />
                  </Suspense>
                </div>
              </>
          )}
        </div>

        {/* Code Editor Modal for Mobile */}
        {editingFile && isMobile && (
            <Suspense fallback={null}>
              <CodeEditor
                  file={editingFile}
                  onClose={handleCloseEditorLocal}
                  projectPath={selectedProject?.path}
                  isSidebar={false}
              />
            </Suspense>
        )}

        {/* Task Detail Modal */}
        {shouldShowTasksTab && showTaskDetail && selectedTask && (
            <Suspense fallback={null}>
              <TaskDetail
                  task={selectedTask}
                  isOpen={showTaskDetail}
                  onClose={handleTaskDetailClose}
                  onStatusChange={handleTaskStatusChange}
                  onTaskClick={handleTaskClick}
              />
            </Suspense>
        )}
        {/* PRD Editor Modal */}
        {showPRDEditor && (
            <Suspense fallback={null}>
              <PRDEditor
                  project={currentProject}
                  projectPath={currentProject?.fullPath || currentProject?.path}
                  onClose={() => {
                    setShowPRDEditor(false);
                    setSelectedPRD(null);
                  }}
                  isNewFile={!selectedPRD?.isExisting}
                  file={{
                    name: selectedPRD?.name || 'prd.txt',
                    content: selectedPRD?.content || ''
                  }}
                  onSave={async () => {
                    try {
                      const response = await api.get(`/taskmaster/prd/${encodeURIComponent(currentProject.name)}`);
                      if (response.ok) {
                        const data = await response.json();
                        setExistingPRDs(data.prdFiles || []);
                        setPRDNotification('PRD saved successfully!');
                        setTimeout(() => setPRDNotification(null), 3000);

                        const fileName = selectedPRD?.name || 'prd.txt';
                        const filePath = `${currentProject.path}/${fileName}`;
                        handleFileOpenLocal(filePath);
                      }
                    } catch (error) {
                      console.error('Failed to refresh PRDs:', error);
                    }

                    refreshTasks?.();
                  }}
              />
            </Suspense>
        )}
        {/* PRD Notification */}
        {prdNotification && (
            <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
              <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{prdNotification}</span>
              </div>
            </div>
        )}
      </div>
  );
}

export default React.memo(MainContent);
