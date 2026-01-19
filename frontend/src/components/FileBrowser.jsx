import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, Loader2, AlertCircle, Search, X } from 'lucide-react';
import { api } from '../utils/api';

const FileTreeNode = ({ path, name, level = 0, onSelect, selectedPath }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isSelected = selectedPath === path;

  const handleExpand = async (e) => {
    if (e) e.stopPropagation();
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsExpanded(true);
    if (hasLoaded) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.browseFilesystem(path, { limit: 1000 });
      const data = await res.json();
      if (data.suggestions) {
        // Sort: directories first (API only returns dirs anyway), then alphabetical
        const sorted = data.suggestions
          .map(s => ({
            name: s.name || s.path.split(/[/\\]/).pop(),
            path: s.path
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setChildren(sorted);
      }
      setHasLoaded(true);
    } catch (err) {
      console.error("Failed to load directory:", err);
      setError("Failed to access");
      setIsExpanded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect(path);
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <button 
          onClick={handleExpand}
          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          )}
        </button>
        <Folder className={`w-4 h-4 ${isSelected ? 'text-blue-500 fill-blue-500/20' : 'text-blue-400 dark:text-blue-500'}`} />
        <span className="text-sm truncate flex-1">{name}</span>
        {error && <AlertCircle className="w-3 h-3 text-red-500 ml-2" title={error} />}
      </div>
      
      {isExpanded && (
        <div className="flex flex-col">
          {children.length > 0 ? (
            children.map((child) => (
              <FileTreeNode
                key={child.path}
                path={child.path}
                name={child.name}
                level={level + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))
          ) : hasLoaded && !isLoading ? (
            <div className="py-1 px-2 text-xs text-gray-400 italic" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
              Empty
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const FileBrowser = ({ initialPath, onPathSelect, selectedPath, className = "" }) => {
  const [root, setRoot] = useState(null);
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [filter, setFilter] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize root
  useEffect(() => {
    const initRoot = async () => {
      setLoadingRoot(true);
      try {
        const homeRes = await api.browseFilesystem('~', { limit: 1000 });
        const homeData = await homeRes.json();
        
        if (homeData.currentPath) {
          setRoot({
            path: homeData.currentPath,
            name: 'Home'
          });
          
          if (!selectedPath) {
            onPathSelect(homeData.currentPath);
          }
        }
      } catch (e) {
        console.error("Failed to init file browser:", e);
      } finally {
        setLoadingRoot(false);
      }
    };
    initRoot();
  }, []);

  // Search Effect
  useEffect(() => {
    if (!filter.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const searchRoot = root ? root.path : '~';
        const res = await api.searchFilesystem(filter, searchRoot);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [filter, root]);

  if (loadingRoot) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!root) {
    return (
      <div className={`p-4 text-red-500 text-sm ${className}`}>
        Failed to load file system.
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Search Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search directories..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 h-6 p-0"
        />
        {filter && (
          <button 
            onClick={() => setFilter('')}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1 border-b border-gray-200 dark:border-gray-700 text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate opacity-80">
        {selectedPath || "Select a folder..."}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 min-h-[200px] max-h-[300px]">
        {filter.trim() ? (
            // Search Results View
            <div className="space-y-1">
                {isSearching && searchResults.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Searching...</span>
                    </div>
                ) : searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                        <button
                            key={idx}
                            onClick={() => onPathSelect(result.path)}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                selectedPath === result.path ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <Folder className="w-4 h-4 text-blue-400 dark:text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate">{result.name}</div>
                                <div className="text-[10px] text-gray-400 truncate opacity-70" title={result.path}>{result.path}</div>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="text-center py-8 text-xs text-gray-400 italic">
                        No directories found matching "{filter}"
                    </div>
                )}
            </div>
        ) : (
            // Tree View
            <FileTreeNode
              path={root.path}
              name={root.name}
              onSelect={onPathSelect}
              selectedPath={selectedPath}
            />
        )}
      </div>
    </div>
  );
};

export default FileBrowser;
