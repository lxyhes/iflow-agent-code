import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, FolderPlus, GitBranch, Key, ChevronRight, ChevronLeft, Check, Loader2, AlertCircle, Folder, Settings, Search, CheckCircle2, AlertTriangle, Eye, FileText, Lock, LayoutList, TextCursorInput } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { api } from '../utils/api';
import FileBrowser from './FileBrowser';

// Simple debounce utility hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const ProjectCreationWizard = ({ onClose, onProjectCreated }) => {
  // Wizard state
  const [step, setStep] = useState(1); // 1: Choose type, 2: Configure, 3: Confirm
  const [workspaceType, setWorkspaceType] = useState(null); // 'existing' or 'new'

  // Form state
  const [workspacePath, setWorkspacePath] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedGithubToken, setSelectedGithubToken] = useState('');
  const [tokenMode, setTokenMode] = useState('stored'); // 'stored' | 'new' | 'none'
  const [newGithubToken, setNewGithubToken] = useState('');

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [availableTokens, setAvailableTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [pathSuggestions, setPathSuggestions] = useState([]);
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  
  // New UI state for directory selection
  const [selectionMode, setSelectionMode] = useState('browser'); // 'browser' | 'input'
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Path validation state
  const debouncedPath = useDebounce(workspacePath, 500);
  const [pathStatus, setPathStatus] = useState('idle'); // 'idle' | 'checking' | 'valid' | 'warning' | 'error'
  const [pathMessage, setPathMessage] = useState('');
  const [pathMetadata, setPathMetadata] = useState(null); // info about the path if it exists

  // Load user's home directory as default base path
  const [userHome, setUserHome] = useState('');

  // Load available GitHub tokens when needed
  useEffect(() => {
    if (step === 2 && workspaceType === 'new' && githubUrl) {
      loadGithubTokens();
    }
  }, [step, workspaceType, githubUrl]);

  // Load initial path suggestions to identify home dir
  useEffect(() => {
    const fetchHome = async () => {
      try {
        const res = await api.browseFilesystem('~');
        const data = await res.json();
        if (data.currentPath) {
          setUserHome(data.currentPath);
        }
      } catch (e) {
        console.error("Failed to fetch home dir", e);
      }
    };
    fetchHome();
  }, []);

  // Load path suggestions
  useEffect(() => {
    if (workspacePath.length > 2 && selectionMode === 'input') {
      loadPathSuggestions(workspacePath);
    } else {
      setPathSuggestions([]);
      setShowPathDropdown(false);
    }
  }, [workspacePath, selectionMode]);

  // Real-time path validation
  useEffect(() => {
    if (!debouncedPath || debouncedPath.length < 2) {
      setPathStatus('idle');
      setPathMessage('');
      setPathMetadata(null);
      setPreviewData(null);
      return;
    }

    const validatePath = async () => {
      setPathStatus('checking');
      try {
        const res = await api.validatePath(debouncedPath);
        const data = await res.json();

        setPathMetadata(data);

        if (workspaceType === 'existing') {
          // Existing workspace: Must exist and be a directory
          if (!data.exists) {
            setPathStatus('error');
            setPathMessage('Path does not exist');
            setPreviewData(null);
          } else if (!data.isDirectory) {
            setPathStatus('error');
            setPathMessage('Path is not a directory');
            setPreviewData(null);
          } else {
            setPathStatus('valid');
            const details = [];
            if (data.isGit) details.push('Git repository');
            else details.push('No Git found');
            if (data.isEmpty) details.push('Empty folder');
            else details.push(`${details.length ? ', ' : ''}Contains files`);
            setPathMessage(`Valid workspace found (${details.join(', ')})`);
            
            // Load preview if valid
            loadPreview(debouncedPath);
          }
        } else {
          // New workspace: Should not exist, or be empty
          if (data.exists) {
            if (!data.isDirectory) {
              setPathStatus('error');
              setPathMessage('A file already exists at this path');
              setPreviewData(null);
            } else if (!data.isEmpty) {
              setPathStatus('warning');
              setPathMessage('Directory exists and is not empty. Contents might be overwritten.');
              loadPreview(debouncedPath);
            } else {
              setPathStatus('valid');
              setPathMessage('Directory exists and is empty');
              setPreviewData({ empty: true });
            }
          } else {
            if (data.parentExists) {
              setPathStatus('valid');
              setPathMessage('Path is available (will be created)');
              setPreviewData(null);
            } else {
              setPathStatus('warning');
              setPathMessage('Parent directory does not exist (will verify on creation)');
              setPreviewData(null);
            }
          }
        }
      } catch (error) {
        console.error('Validation error:', error);
        setPathStatus('error');
        setPathMessage('Failed to validate path');
        setPreviewData(null);
      }
    };

    validatePath();
  }, [debouncedPath, workspaceType]);

  const loadPreview = async (path) => {
    setPreviewLoading(true);
    try {
      const res = await api.browseFilesystem(path, { includeFiles: true, limit: 20 });
      const data = await res.json();
      if (data.suggestions) {
        setPreviewData({
          files: data.suggestions.slice(0, 5),
          total: data.suggestions.length,
          path: data.currentPath
        });
      }
    } catch (e) {
      console.error("Failed to load preview:", e);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // GitHub URL Smart Logic
  const handleGithubUrlChange = (e) => {
    const url = e.target.value;
    setGithubUrl(url);

    // Auto-fill path if user hasn't typed a custom path or if path matches a previous auto-fill
    // Extract repo name from URL (e.g. github.com/user/repo -> repo)
    if (url && workspaceType === 'new') {
      try {
        const parts = url.split('/');
        let repoName = parts[parts.length - 1];
        if (repoName.endsWith('.git')) repoName = repoName.slice(0, -4);

        if (repoName && /^[a-zA-Z0-9-_.]+$/.test(repoName)) {
          // Only update if workspacePath is empty or looks like a default path
          const baseDir = userHome ? `${userHome}${userHome.includes('\\') ? '\\' : '/'}Projects` : '';
          if (!workspacePath || (userHome && workspacePath.startsWith(userHome))) {
            // Try to construct a smart path
            // If we know home dir, use ~/Projects/RepoName
            if (userHome) {
              const sep = userHome.includes('\\') ? '\\' : '/';
              setWorkspacePath(`${userHome}${sep}Projects${sep}${repoName}`);
              setSelectionMode('input'); // Switch to input for auto-filled path
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  };

  const loadGithubTokens = async () => {
    try {
      setLoadingTokens(true);
      const response = await api.get('/settings/credentials?type=github_token');
      const data = await response.json();

      const activeTokens = (data.credentials || []).filter(t => t.is_active);
      setAvailableTokens(activeTokens);

      // Auto-select first token if available
      if (activeTokens.length > 0 && !selectedGithubToken) {
        setSelectedGithubToken(activeTokens[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading GitHub tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const loadPathSuggestions = async (inputPath) => {
    try {
      // Extract the directory to browse (parent of input)
      const lastSlash = inputPath.lastIndexOf('/');
      const lastBackSlash = inputPath.lastIndexOf('\\');
      const slashIndex = Math.max(lastSlash, lastBackSlash);

      const dirPath = slashIndex > 0 ? inputPath.substring(0, slashIndex) : '~';

      const response = await api.browseFilesystem(dirPath, { limit: 1000 });
      const data = await response.json();

      if (data.suggestions) {
        // Filter suggestions based on the input
        const filtered = data.suggestions.filter(s =>
          s.path.toLowerCase().startsWith(inputPath.toLowerCase())
        );
        setPathSuggestions(filtered.slice(0, 10)); // Show more suggestions
        setShowPathDropdown(filtered.length > 0);
      }
    } catch (error) {
      console.error('Error loading path suggestions:', error);
    }
  };

  const handleNext = () => {
    setError(null);

    if (step === 1) {
      if (!workspaceType) {
        setError('Please select a workspace type');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!workspacePath.trim()) {
        setError('Please provide a workspace path');
        return;
      }

      if (pathStatus === 'error') {
        setError('Please fix the path errors before proceeding');
        return;
      }

      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        workspaceType,
        path: workspacePath.trim(),
      };

      if (workspaceType === 'new' && githubUrl) {
        payload.githubUrl = githubUrl.trim();
        if (tokenMode === 'stored' && selectedGithubToken) {
          payload.githubTokenId = parseInt(selectedGithubToken);
        } else if (tokenMode === 'new' && newGithubToken) {
          payload.newGithubToken = newGithubToken.trim();
        }
      }

      const response = await api.createWorkspace(payload);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      if (onProjectCreated) {
        onProjectCreated(data.project);
      }

      onClose();
    } catch (error) {
      console.error('Error creating workspace:', error);
      setError(error.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const selectPathSuggestion = (suggestion) => {
    setWorkspacePath(suggestion.path);
    setShowPathDropdown(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl border-0 sm:border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                Create Project
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Setup your development environment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:px-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Get Started</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">How would you like to set up your project?</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => { setWorkspaceType('existing'); handleNext(); }}
                  className={`group relative p-6 border-2 rounded-xl text-left transition-all hover:shadow-lg ${workspaceType === 'existing'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 ring-1 ring-blue-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                    }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <Folder className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        Existing Folder
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Import a local project folder from your computer.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { setWorkspaceType('new'); handleNext(); }}
                  className={`group relative p-6 border-2 rounded-xl text-left transition-all hover:shadow-lg ${workspaceType === 'new'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 ring-1 ring-blue-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                    }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                      <GitBranch className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        New Project
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Create an empty folder or clone a repository from GitHub.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {workspaceType === 'new' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    GitHub Repository (Optional)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <GitBranch className="h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                    </div>
                    <Input
                      type="text"
                      value={githubUrl}
                      onChange={handleGithubUrlChange}
                      placeholder="https://github.com/username/repository"
                      className="pl-10 w-full transition-shadow focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Entering a URL will auto-suggest a project path below.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {workspaceType === 'existing' ? 'Project Location' : 'Where to create the project?'}
                  </label>
                  
                  {/* Selection Mode Toggle */}
                  <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setSelectionMode('browser')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        selectionMode === 'browser' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      Browse
                    </button>
                    <button
                      onClick={() => setSelectionMode('input')}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        selectionMode === 'input' 
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <TextCursorInput className="w-3.5 h-3.5" />
                      Input
                    </button>
                  </div>
                </div>

                {selectionMode === 'input' ? (
                  <div className="relative group z-20">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Folder className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <Input
                      type="text"
                      value={workspacePath}
                      onChange={(e) => setWorkspacePath(e.target.value)}
                      placeholder={userHome ? `${userHome}/MyProject` : "/path/to/project"}
                      className={`pl-10 w-full transition-all ${pathStatus === 'error' ? 'border-red-300 focus:border-red-500 focus:ring-red-200' :
                          pathStatus === 'valid' ? 'border-green-300 focus:border-green-500 focus:ring-green-200' :
                            pathStatus === 'warning' ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200' : ''
                        }`}
                      onFocus={() => setShowPathDropdown(true)}
                    />

                    {/* Validation Icon */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {pathStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                      {pathStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {pathStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {pathStatus === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showPathDropdown && pathSuggestions.length > 0 && (
                      <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {pathSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => selectPathSuggestion(suggestion)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 transition-colors"
                          >
                            <Folder className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{suggestion.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate opacity-70">{suggestion.path}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <FileBrowser 
                    initialPath={workspacePath || userHome}
                    onPathSelect={(path) => setWorkspacePath(path)}
                    selectedPath={workspacePath}
                    className="h-64"
                  />
                )}

                {/* Validation Message & Preview */}
                <div className="space-y-3">
                  {pathMessage && (
                    <div className={`text-xs flex items-center gap-1.5 p-2 rounded-md ${pathStatus === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' :
                        pathStatus === 'valid' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' :
                          pathStatus === 'warning' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/10 dark:text-yellow-400' :
                            'bg-gray-50 text-gray-500 dark:bg-gray-900/50'
                      }`}>
                      {pathStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {pathStatus === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                      {pathStatus === 'error' && <AlertCircle className="w-3 h-3" />}
                      {pathStatus === 'warning' && <AlertTriangle className="w-3 h-3" />}
                      {pathMessage}
                    </div>
                  )}

                  {/* Directory Preview */}
                  {pathStatus !== 'error' && pathStatus !== 'idle' && (
                     <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
                       <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Eye className="w-3.5 h-3.5 text-gray-500" />
                           <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Directory Preview</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            {pathStatus === 'valid' ? (
                              <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
                                <Check className="w-3 h-3" />
                                Writable
                              </span>
                            ) : (
                               <span className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800">
                                <Lock className="w-3 h-3" />
                                Verify
                              </span>
                            )}
                         </div>
                       </div>
                       <div className="p-3 bg-white dark:bg-gray-900/30">
                         {previewLoading ? (
                           <div className="flex items-center gap-2 text-xs text-gray-500">
                             <Loader2 className="w-3 h-3 animate-spin" />
                             Loading contents...
                           </div>
                         ) : previewData?.empty ? (
                            <div className="text-xs text-gray-400 italic pl-1">Directory is empty</div>
                         ) : previewData?.files?.length > 0 ? (
                           <div className="space-y-1">
                             {previewData.files.map((file, i) => (
                               <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                 <FileText className="w-3 h-3 opacity-70" />
                                 <span className="truncate">{file.name}</span>
                               </div>
                             ))}
                             {previewData.total > 5 && (
                               <div className="text-[10px] text-gray-400 pl-5 pt-1">
                                 + {previewData.total - 5} more items
                               </div>
                             )}
                           </div>
                         ) : (
                           <div className="text-xs text-gray-400 italic pl-1">
                             {pathStatus === 'valid' ? 'No readable files found' : 'Select a valid path to view contents'}
                           </div>
                         )}
                       </div>
                     </div>
                  )}
                </div>
              </div>

              {workspaceType === 'new' && githubUrl && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Private Repository Access</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <button
                        onClick={() => setTokenMode('none')}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${tokenMode === 'none'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                      >
                        Public Repo
                      </button>
                      <button
                        onClick={() => setTokenMode('stored')}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${tokenMode === 'stored'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                      >
                        Stored Token
                      </button>
                      <button
                        onClick={() => setTokenMode('new')}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${tokenMode === 'new'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                      >
                        New Token
                      </button>
                    </div>

                    {tokenMode === 'stored' && (
                      <div className="pt-1 animate-in fade-in">
                        <select
                          value={selectedGithubToken}
                          onChange={(e) => setSelectedGithubToken(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="">-- Select a stored token --</option>
                          {availableTokens.map((token) => (
                            <option key={token.id} value={token.id}>
                              {token.credential_name}
                            </option>
                          ))}
                        </select>
                        {availableTokens.length === 0 && !loadingTokens && (
                          <p className="mt-2 text-xs text-orange-500">No tokens found. Please use 'New Token' or add one in Settings.</p>
                        )}
                      </div>
                    )}

                    {tokenMode === 'new' && (
                      <div className="pt-1 animate-in fade-in">
                        <Input
                          type="password"
                          value={newGithubToken}
                          onChange={(e) => setNewGithubToken(e.target.value)}
                          placeholder="ghp_..."
                          className="w-full"
                        />
                        <p className="mt-1.5 text-xs text-gray-500">Token is used once for cloning and not saved.</p>
                      </div>
                    )}

                    {tokenMode === 'none' && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                          No authentication will be used. This works for all public repositories.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                  Configuration Summary
                </h4>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center gap-3">
                      {workspaceType === 'existing' ? (
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Folder className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {workspaceType === 'existing' ? 'Import Local Project' : 'Create New Project'}
                        </p>
                        {githubUrl && <p className="text-xs text-gray-500">{githubUrl}</p>}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      Ready to Create
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">LOCAL PATH</p>
                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
                      {workspacePath}
                    </div>
                    {/* Final Preview for Confirmation */}
                     <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-2">
                       <p className="text-[10px] text-gray-400 uppercase mb-1">Preview</p>
                       <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          {pathMetadata?.exists ? (
                             <>
                                <Folder className="w-3 h-3" />
                                <span>{pathMetadata.isEmpty ? 'Empty Directory' : 'Directory with files'}</span>
                                {pathMetadata.isGit && <span className="text-[10px] bg-gray-100 px-1 rounded ml-1">GIT</span>}
                             </>
                          ) : (
                             <>
                                <FolderPlus className="w-3 h-3" />
                                <span>Will create new directory</span>
                             </>
                          )}
                       </div>
                     </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {workspaceType === 'new' && githubUrl
                  ? "We'll clone the repository and set up the environment."
                  : "The project will be added to your workspace list instantly."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isCreating}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={step === 3 ? handleCreate : handleNext}
            disabled={isCreating || (step === 1 && !workspaceType) || (step === 2 && !debouncedPath)}
            className={`min-w-[120px] transition-all duration-300 ${isCreating ? 'opacity-80' : ''
              }`}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {workspaceType === 'new' && githubUrl ? 'Cloning...' : 'Creating...'}
              </>
            ) : step === 3 ? (
              <>
                {workspaceType === 'existing' ? 'Open Project' : 'Create Project'}
                <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCreationWizard;
