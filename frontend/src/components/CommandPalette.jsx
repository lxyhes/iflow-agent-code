import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, File, Terminal, MessageSquare, Moon, Sun, RefreshCw, Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommandPalette = ({ isOpen, onClose, projects, selectedProject, onSelectProject, onToggleTheme, isDarkMode }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const groups = [
    {
      name: 'Navigation',
      items: [
        { id: 'nav-chat', icon: <MessageSquare className="w-4 h-4" />, label: 'Go to Chat', action: () => navigate('/') },
        { id: 'nav-files', icon: <File className="w-4 h-4" />, label: 'Go to Files', action: () => document.querySelector('[title="Files"]')?.click() },
        { id: 'nav-shell', icon: <Terminal className="w-4 h-4" />, label: 'Go to Shell', action: () => document.querySelector('[title="Shell"]')?.click() },
        { id: 'nav-git', icon: <Github className="w-4 h-4" />, label: 'Go to Source Control', action: () => document.querySelector('[title="Source Control"]')?.click() },
      ]
    },
    {
      name: 'System',
      items: [
        { id: 'sys-theme', icon: isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, label: `Toggle ${isDarkMode ? 'Light' : 'Dark'} Mode`, action: onToggleTheme },
        { id: 'sys-reload', icon: <RefreshCw className="w-4 h-4" />, label: 'Reload Window', action: () => window.location.reload() },
      ]
    }
  ];

  if (projects && projects.length > 0) {
    groups.push({
      name: 'Switch Project',
      items: projects.map(p => ({
        id: `proj-${p.name}`,
        icon: <File className="w-4 h-4" />, // Folder icon would be better
        label: p.displayName || p.name,
        action: () => onSelectProject(p)
      }))
    });
  }

  // Filter items
  const filteredGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
  })).filter(group => group.items.length > 0);

  const flatItems = filteredGroups.flatMap(g => g.items);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[60vh] animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">ESC</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {flatItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No matching commands found</div>
          ) : (
            filteredGroups.map((group, groupIndex) => (
              <div key={group.name} className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.name}
                </div>
                {group.items.map((item) => {
                  // Calculate global index for selection highlight
                  const itemGlobalIndex = flatItems.indexOf(item);
                  const isSelected = itemGlobalIndex === selectedIndex;
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                    >
                      <div className={`mr-3 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                        {item.icon}
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {isSelected && <span className="text-xs opacity-80">↵</span>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <span><strong>↑↓</strong> to navigate</span>
          <span><strong>↵</strong> to select</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
