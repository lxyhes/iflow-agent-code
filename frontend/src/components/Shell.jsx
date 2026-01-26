import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as TerminalIcon, Power, RotateCw, Play, Loader2, AlertCircle, Settings, Palette, Type, Eraser, Download, Check, Zap, Maximize2, Minimize2, Copy, Search, Command, ChevronRight, X, History, Star, Plus, FileText, Trash2, Save, Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

const xtermStyles = `
  .xterm .xterm-screen {
    outline: none !important;
  }
  .xterm:focus .xterm-screen {
    outline: none !important;
  }
  .xterm-screen:focus {
    outline: none !important;
  }
  .xterm-link-layer {
    pointer-events: none !important;
  }
  .xterm-viewport {
    overflow: hidden !important;
  }
  .xterm-cursor-layer {
    pointer-events: none !important;
  }
  .terminal-container {
    outline: none !important;
  }
  .terminal-container:focus {
    outline: none !important;
  }
  /* Custom scrollbar for xterm viewport if needed */
  .xterm-viewport::-webkit-scrollbar {
    width: 8px;
  }
  .xterm-viewport::-webkit-scrollbar-track {
    background: transparent;
  }
  .xterm-viewport::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  .xterm-viewport::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.4);
  }
`;

const THEMES = {
  default: {
    name: 'Default',
    theme: {
      background: '#09090b',
      foreground: '#e4e4e7',
      cursor: '#ffffff',
      cursorAccent: '#09090b',
      selection: 'rgba(71, 85, 105, 0.4)',
      black: '#18181b',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#d946ef',
      cyan: '#06b6d4',
      white: '#e4e4e7',
      brightBlack: '#71717a',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#facc15',
      brightBlue: '#60a5fa',
      brightMagenta: '#e879f9',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff',
    }
  },
  dracula: {
    name: 'Dracula',
    theme: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      cursorAccent: '#282a36',
      selection: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    }
  },
  solarized: {
    name: 'Solarized Dark',
    theme: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#93a1a1',
      cursorAccent: '#002b36',
      selection: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#586e75',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
    }
  }
};

const FONT_SIZES = [12, 14, 16, 18, 20];

const SMART_COMMANDS = [
  { 
    id: 'git', 
    name: 'Git Controls', 
    commands: [
      { label: 'Status Check', cmd: 'git status', desc: 'Show working tree status' },
      { label: 'Log Graph', cmd: 'git log --graph --oneline --all -n 20', desc: 'Visual commit history' },
      { label: 'Diff (Staged)', cmd: 'git diff --staged', desc: 'Show changes to be committed' },
      { label: 'Pull (Rebase)', cmd: 'git pull --rebase', desc: 'Update & reapply local commits' },
      { label: 'Stash Changes', cmd: 'git stash', desc: 'Save uncommitted changes' },
      { label: 'Pop Stash', cmd: 'git stash pop', desc: 'Restore stashed changes' },
    ]
  },
  { 
    id: 'npm', 
    name: 'Node / NPM', 
    commands: [
      { label: 'Install Deps', cmd: 'npm install', desc: 'Install dependencies' },
      { label: 'Run Dev', cmd: 'npm run dev', desc: 'Start development server' },
      { label: 'Run Build', cmd: 'npm run build', desc: 'Build for production' },
      { label: 'Type Check', cmd: 'npm run type-check', desc: 'Run TypeScript validation' },
      { label: 'Lint Fix', cmd: 'npm run lint -- --fix', desc: 'Auto-fix linting issues' },
    ]
  },
  { 
    id: 'sys', 
    name: 'System / Utils', 
    commands: [
      { label: 'List Files (All)', cmd: 'ls -la', desc: 'List all files with details' },
      { label: 'Current Path', cmd: 'pwd', desc: 'Print working directory' },
      { label: 'Disk Usage', cmd: 'df -h', desc: 'Show disk space usage' },
      { label: 'Node Version', cmd: 'node -v', desc: 'Check Node.js version' },
    ]
  }
];

// Keys for LocalStorage
const STORAGE_KEYS = {
  CUSTOM_COMMANDS: 'iflow_shell_custom_commands',
  RECENT_COMMANDS: 'iflow_shell_recent_commands',
  THEME: 'iflow_shell_theme',
  FONT_SIZE: 'iflow_shell_font_size'
};

if (typeof document !== 'undefined') {  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = xtermStyles;
  document.head.appendChild(styleSheet);
}

function Shell({ selectedProject, selectedSession, initialCommand, isPlainShell = false, onProcessComplete, minimal = false, autoConnect = false, onErrorDetected }) {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddon = useRef(null);
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [lastSessionId, setLastSessionId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [fontSize, setFontSize] = useState(14);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [connectionWarning, setConnectionWarning] = useState(null);
  const searchInputRef = useRef(null);
  
  // Persistent State
  const [customCommands, setCustomCommands] = useState([]);
  const [recentCommands, setRecentCommands] = useState([]);
  const [newCommandForm, setNewCommandForm] = useState(null); // { label: '', cmd: '', desc: '' }
  
  // AI Copilot State
  const [aiSuggestion, setAiSuggestion] = useState(null); // { cmd: '', explanation: '' }
  const [isGeneratingCommand, setIsGeneratingCommand] = useState(false);

  useEffect(() => {
    if (showQuickActions) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showQuickActions]);

  // Load saved state
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_COMMANDS);
      if (savedCustom) setCustomCommands(JSON.parse(savedCustom));

      const savedRecent = localStorage.getItem(STORAGE_KEYS.RECENT_COMMANDS);
      if (savedRecent) setRecentCommands(JSON.parse(savedRecent));
      
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme && THEMES[savedTheme]) setCurrentTheme(savedTheme);

      const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
      if (savedFontSize) setFontSize(parseInt(savedFontSize));
    } catch (e) {
      console.error('Failed to load shell settings', e);
    }
  }, []);

  // Save helpers
  const saveCustomCommands = (cmds) => {
    setCustomCommands(cmds);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_COMMANDS, JSON.stringify(cmds));
  };

  const saveRecentCommands = (cmd) => {
    const newItem = { ...cmd, timestamp: Date.now() };
    const newRecent = [newItem, ...recentCommands.filter(c => c.cmd !== cmd.cmd)].slice(0, 5);
    setRecentCommands(newRecent);
    localStorage.setItem(STORAGE_KEYS.RECENT_COMMANDS, JSON.stringify(newRecent));
  };

  const generateAiCommand = async (input) => {
    if (!input.trim()) return;
    setIsGeneratingCommand(true);
    setAiSuggestion(null);

    try {
      // Determine OS context (simple heuristic)
      const isWin = navigator.platform.toLowerCase().includes('win');
      const osName = isWin ? 'Windows PowerShell' : 'Linux/MacOS Bash';

      const prompt = `Translate this natural language request into a single, executable ${osName} command. 
      Request: "${input}"
      Rules:
      1. Output ONLY the command code. No markdown, no explanation.
      2. If it requires multiple steps, join them with && or ;.
      3. Be safe and idiomatic.`;

      // Call backend API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model: 'GLM-4.7', // Or use default
          system_prompt: "You are a command line expert. Output only the raw command string."
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.response) {
            let cmd = data.response.trim();
            // Clean up any markdown code blocks if the LLM adds them despite instructions
            cmd = cmd.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
            setAiSuggestion({ cmd, explanation: 'AI Generated Command' });
        } else {
             throw new Error("Invalid API response");
        }
      } else {
        throw new Error("API call failed");
      }
    } catch (error) {
      console.error("AI Command Generation failed:", error);
      // Fallback: Simple keyword matching simulation for demo/offline
      // This ensures the feature "works" even if the backend LLM isn't connected
      let fallbackCmd = "";
      const lower = input.toLowerCase();
      if (lower.includes("port") || lower.includes("kill")) fallbackCmd = "netstat -ano | findstr :8080";
      else if (lower.includes("file") || lower.includes("find")) fallbackCmd = "Get-ChildItem -Recurse | Where-Object { $_.Length -gt 100MB }";
      else if (lower.includes("git")) fallbackCmd = "git status";
      else fallbackCmd = `echo "Could not generate command for: ${input}"`;
      
      setAiSuggestion({ cmd: fallbackCmd, explanation: 'Offline / Fallback Mode' });
    } finally {
      setIsGeneratingCommand(false);
    }
  };

  const selectedProjectRef = useRef(selectedProject);
  const selectedSessionRef = useRef(selectedSession);
  const initialCommandRef = useRef(initialCommand);
  const isPlainShellRef = useRef(isPlainShell);
  const onProcessCompleteRef = useRef(onProcessComplete);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
    selectedSessionRef.current = selectedSession;
    initialCommandRef.current = initialCommand;
    isPlainShellRef.current = isPlainShell;
    onProcessCompleteRef.current = onProcessComplete;
  });

  // Connection timeout monitor
  useEffect(() => {
    let timeoutId;
    if (isConnecting) {
      setConnectionWarning(null);
      timeoutId = setTimeout(() => {
        setConnectionWarning("Connection is taking longer than expected. The backend might be busy or starting up.");
      }, 5000);
    } else {
      setConnectionWarning(null);
    }
    return () => clearTimeout(timeoutId);
  }, [isConnecting]);

  const connectWebSocket = useCallback(async () => {
    if (isConnecting || isConnected) return;

    try {
      const isPlatform = import.meta.env.VITE_IS_PLATFORM === 'true';
      let wsUrl;

      if (isPlatform) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/shell`;
      } else {
        // 本地开发模式：通过 Vite 代理连接 (会转发到 3001)
        const token = localStorage.getItem('auth-token') || 'mock-token';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const cols = terminal.current ? terminal.current.cols : 80;
        const rows = terminal.current ? terminal.current.rows : 24;
        wsUrl = `${protocol}//${window.location.host}/shell?token=${encodeURIComponent(token)}&cols=${cols}&rows=${rows}`;
      }

      console.log('[Shell] Connecting to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[Shell] WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);

        // Send init message immediately, though backend already has dims
        if (fitAddon.current && terminal.current) {
            fitAddon.current.fit();

            ws.current.send(JSON.stringify({
              type: 'init',
              projectPath: selectedProjectRef.current.fullPath || selectedProjectRef.current.path,
              sessionId: isPlainShellRef.current ? null : selectedSessionRef.current?.id,
              hasSession: isPlainShellRef.current ? false : !!selectedSessionRef.current,
              provider: isPlainShellRef.current ? 'plain-shell' : (selectedSessionRef.current?.__provider || 'claude'),
              cols: terminal.current.cols,
              rows: terminal.current.rows,
              initialCommand: initialCommandRef.current,
              isPlainShell: isPlainShellRef.current
            }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'output') {
            let output = data.data;

            // 检测错误模式
            const errorPatterns = [
              /Error:/i,
              /Exception:/i,
              /Traceback/i,
              /TypeError:/i,
              /ReferenceError:/i,
              /SyntaxError:/i,
              /ModuleNotFoundError/i,
              /ImportError/i,
              /NameError/i,
              /AttributeError/i,
              /KeyError/i,
              /IndexError/i,
              /ValueError/i,
              /PermissionError/i,
              /FileNotFoundError/i,
              /ConnectionRefusedError/i,
              /TimeoutError/i
            ];

            const hasError = errorPatterns.some(pattern => pattern.test(output));

            if (hasError && onErrorDetected) {
              // 触发错误检测回调
              onErrorDetected(output, selectedProject);
            }

            if (isPlainShellRef.current && onProcessCompleteRef.current) {
              const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
              if (cleanOutput.includes('Process exited with code 0')) {
                onProcessCompleteRef.current(0);
              } else if (cleanOutput.match(/Process exited with code (\d+)/)) {
                const exitCode = parseInt(cleanOutput.match(/Process exited with code (\d+)/)[1]);
                if (exitCode !== 0) {
                  onProcessCompleteRef.current(exitCode);
                }
              }
            }

            if (terminal.current) {
              terminal.current.write(output);
            }
          } else if (data.type === 'url_open') {
            window.open(data.url, '_blank');
          }
        } catch (error) {
          console.error('[Shell] Error handling WebSocket message:', error, event.data);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);

        if (terminal.current) {
          terminal.current.clear();
          terminal.current.write('\x1b[2J\x1b[H');
        }
      };

      ws.current.onerror = (error) => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (error) {
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  const connectToShell = useCallback(() => {
    if (!isInitialized || isConnected || isConnecting) return;
    setIsConnecting(true);
    connectWebSocket();
  }, [isInitialized, isConnected, isConnecting, connectWebSocket]);

  const disconnectFromShell = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    if (terminal.current) {
      terminal.current.clear();
      terminal.current.write('\x1b[2J\x1b[H');
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sessionDisplayName = useMemo(() => {
    if (!selectedSession) return null;
    return selectedSession.__provider === 'cursor'
      ? (selectedSession.name || 'Untitled Session')
      : (selectedSession.summary || 'New Session');
  }, [selectedSession]);

  const sessionDisplayNameShort = useMemo(() => {
    if (!sessionDisplayName) return null;
    return sessionDisplayName.slice(0, 30);
  }, [sessionDisplayName]);

  const sessionDisplayNameLong = useMemo(() => {
    if (!sessionDisplayName) return null;
    return sessionDisplayName.slice(0, 50);
  }, [sessionDisplayName]);

  const changeTheme = (themeKey) => {
    setCurrentTheme(themeKey);
    localStorage.setItem(STORAGE_KEYS.THEME, themeKey);
    if (terminal.current) {
      terminal.current.options.theme = THEMES[themeKey].theme;
    }
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size.toString());
    if (terminal.current) {
      terminal.current.options.fontSize = size;
      setTimeout(() => fitAddon.current?.fit(), 100);
    }
  };

  const clearTerminal = () => {
    if (terminal.current) {
      terminal.current.clear();
      // Optionally send a clear command to the shell if needed, but xterm clear is usually visual
      // terminal.current.write('\x1b[2J\x1b[H'); 
    }
  };

  const downloadOutput = () => {
    if (!terminal.current) return;
    
    // Select all to get content (basic approach)
    terminal.current.selectAll();
    const content = terminal.current.getSelection();
    terminal.current.clearSelection();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySelection = () => {
    if (!terminal.current) return;
    const selection = terminal.current.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection);
    } else {
      // If nothing selected, maybe copy the last few lines or just notify?
      // For now, let's just focus on selection to avoid confusion
    }
  };

  const openLogViewer = () => {
    if (!terminal.current) return;
    // Select all to capture content
    terminal.current.selectAll();
    const content = terminal.current.getSelection();
    terminal.current.clearSelection();
    
    // Fallback if empty (sometimes selection is tricky programmatically if not focused)
    setLogContent(content || 'No output captured or terminal is empty.');
    setShowLogViewer(true);
  };

  const insertCommand = (cmd) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'input',
        data: cmd + '\r'
      }));
      // Save to recent
      const cmdObj = SMART_COMMANDS.flatMap(g => g.commands).find(c => c.cmd === cmd) || 
                     customCommands.find(c => c.cmd === cmd) || 
                     { label: cmd, cmd, desc: 'Recent command' };
      saveRecentCommands(cmdObj);
      
      setShowQuickActions(false);
      terminal.current?.focus();
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    // Give transition time to finish before resizing terminal
    setTimeout(() => {
      fitAddon.current?.fit();
    }, 300);
  };

  const filteredCommands = useMemo(() => {
    let groups = [];

    // 1. Recent (Only if no search or searching matches)
    if (recentCommands.length > 0 && !searchQuery) {
      groups.push({ id: 'recent', name: 'Recent', commands: recentCommands });
    }

    // 2. Custom
    if (customCommands.length > 0) {
       groups.push({ id: 'custom', name: 'My Shortcuts', commands: customCommands });
    }

    // 3. Built-in
    groups = [...groups, ...SMART_COMMANDS];

    if (!searchQuery) return groups;
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return groups.map(group => ({
      ...group,
      commands: group.commands.filter(c => 
        c.label.toLowerCase().includes(lowerQuery) || 
        c.cmd.toLowerCase().includes(lowerQuery) ||
        (c.desc && c.desc.toLowerCase().includes(lowerQuery))
      )
    })).filter(group => group.commands.length > 0);
  }, [searchQuery, customCommands, recentCommands]);

  const restartShell = () => {
    setIsRestarting(true);

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    if (terminal.current) {
      terminal.current.dispose();
      terminal.current = null;
      fitAddon.current = null;
    }

    setIsConnected(false);
    setIsInitialized(false);

    setTimeout(() => {
      setIsRestarting(false);
    }, 200);
  };

  useEffect(() => {
    const currentSessionId = selectedSession?.id || null;

    if (lastSessionId !== null && lastSessionId !== currentSessionId && isInitialized) {
      disconnectFromShell();
    }

    setLastSessionId(currentSessionId);
  }, [selectedSession?.id, isInitialized, disconnectFromShell]);

  useEffect(() => {
    if (!terminalRef.current || !selectedProject || isRestarting || terminal.current) {
      return;
    }

    console.log('[Shell] Terminal initializing, mounting component');

    terminal.current = new Terminal({
      cursorBlink: true,
      fontSize: fontSize, // Use state
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      allowProposedApi: true,
      allowTransparency: true,
      convertEol: true,
      scrollback: 10000,
      tabStopWidth: 4,
      windowsMode: false,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: false,
      logLevel: 'off',
      theme: THEMES[currentTheme].theme // Use state
    });

    fitAddon.current = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(webLinksAddon);

    terminal.current.open(terminalRef.current);

    setTimeout(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        terminal.current?.focus();
      }
    }, 100);

    terminal.current.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && terminal.current.hasSelection()) {
        return false;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        return false;
      }
      return true;
    });

    terminal.current.onData((data) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    setTimeout(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
        if (terminal.current && ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'resize',
            cols: terminal.current.cols,
            rows: terminal.current.rows
          }));
        }
      }
    }, 100);

    setIsInitialized(true);

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon.current && terminal.current) {
        setTimeout(() => {
          fitAddon.current.fit();
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'resize',
              cols: terminal.current.cols,
              rows: terminal.current.rows
            }));
          }
        }, 50);
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      console.log('[Shell] Terminal cleanup, unmounting component');
      resizeObserver.disconnect();

      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        ws.current.close();
      }
      ws.current = null;

      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
    };
  }, [selectedProject?.name, isRestarting]);

  useEffect(() => {
    if (!autoConnect || !isInitialized || isConnecting || isConnected) return;
    connectToShell();
  }, [autoConnect, isInitialized, isConnecting, isConnected, connectToShell]);

  if (!selectedProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-muted/20">
        <div className="bg-card p-8 rounded-xl shadow-lg border border-border max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center animate-pulse">
            <TerminalIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Select a Project</h3>
          <p className="text-muted-foreground">
            Choose a project from the sidebar to open an interactive shell session.
          </p>
        </div>
      </div>
    );
  }

  if (minimal) {
    return (
      <div 
        className="h-full w-full bg-zinc-950 cursor-text terminal-container"
        tabIndex="0"
        onClick={() => terminal.current?.focus()}
        onFocus={() => terminal.current?.focus()}
      >
        <div ref={terminalRef} className="h-full w-full focus:outline-none" style={{ outline: 'none' }} />
      </div>
    );
  }

  return (
    <div 
      className={`h-full flex flex-col bg-zinc-950 w-full terminal-container relative overflow-hidden transition-all duration-300 ${isMaximized ? 'fixed inset-0 z-50' : ''}`}
      tabIndex="0"
      onClick={(e) => {
        // Only focus terminal if clicking the container itself or non-input elements
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          terminal.current?.focus();
        }
      }}
      onFocus={(e) => {
        // Prevent focus stealing if an input inside the shell is being focused
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          terminal.current?.focus();
        }
      }}
    >
      {/* Modern Header */}
      <div className="flex-shrink-0 bg-zinc-900/50 border-b border-white/10 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Status Indicator */}
            <div className={`relative flex h-2.5 w-2.5`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>

            {/* Session Info */}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-100 flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-zinc-400" />
                {isPlainShell ? selectedProject.displayName : (sessionDisplayNameShort || 'Terminal')}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toolbar */}
            <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
              
              {/* Smart Commands Trigger */}
              <button
                onClick={() => setShowQuickActions(true)}
                className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-white/10 rounded-md transition-colors animate-pulse"
                title="Smart Commands (Cmd+K)"
              >
                <Zap className="w-4 h-4 fill-current" />
              </button>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <div className="relative group">
                <button
                  onClick={() => changeFontSize(fontSize === 20 ? 12 : fontSize + 2)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                  title={`Font Size: ${fontSize}px`}
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={copySelection}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Copy Selection"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={openLogViewer}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Open Log Explorer (Search & Analyze)"
              >
                <FileText className="w-4 h-4" />
              </button>

              <button
                onClick={clearTerminal}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Clear Terminal"
              >
                <Eraser className="w-4 h-4" />
              </button>

              <button
                onClick={downloadOutput}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Download Log"
              >
                <Download className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors ${showSettings ? 'text-white bg-white/10' : ''}`}
                  title="Theme Settings"
                >
                  <Palette className="w-4 h-4" />
                </button>
                
                {/* Theme Dropdown */}
                {showSettings && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowSettings(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-md">
                      <div className="p-2 space-y-1">
                        <div className="text-xs font-semibold text-zinc-500 px-2 py-1 uppercase tracking-wider">Theme</div>
                        {Object.entries(THEMES).map(([key, value]) => (
                          <button
                            key={key}
                            onClick={() => {
                              changeTheme(key);
                              setShowSettings(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between group ${currentTheme === key ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-white/5'}`}
                          >
                            <span>{value.name}</span>
                            {currentTheme === key && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="w-px h-4 bg-white/10 mx-1" />

              <button
                onClick={toggleMaximize}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {isConnected && (
              <button
                onClick={disconnectFromShell}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
                title="Disconnect from shell"
              >
                <Power className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={restartShell}
              disabled={isRestarting || isConnected}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Restart Shell"
            >
              <RotateCw className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 p-3 overflow-hidden relative">
        <div 
          ref={terminalRef} 
          className="h-full w-full focus:outline-none" 
          style={{ outline: 'none' }} 
        />

        {/* Loading/Initializing Overlay */}
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-sm text-zinc-400">Initializing Environment...</span>
            </div>
          </div>
        )}

        {/* Connect Prompt Overlay */}
        {isInitialized && !isConnected && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10 p-4">
            <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
              <div className="w-12 h-12 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-4 ring-1 ring-white/10">
                <TerminalIcon className="w-6 h-6 text-zinc-300" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">Ready to Connect</h3>
              
              <p className="text-sm text-zinc-400 mb-6">
                {isPlainShell ?
                  `Establish connection to ${selectedProject.displayName}` :
                  selectedSession ?
                    `Resume session "${sessionDisplayNameShort}"` :
                    'Start a new terminal session'
                }
              </p>

              <button
                onClick={connectToShell}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-primary/20"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                <span>Connect Terminal</span>
              </button>
            </div>
          </div>
        )}

        {/* Connecting Overlay */}
        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10 p-4">
             <div className="bg-zinc-900 border border-white/10 py-3 px-6 rounded-full shadow-xl flex items-center gap-3 mb-4">
               <Loader2 className="w-4 h-4 text-primary animate-spin" />
               <span className="text-sm font-medium text-zinc-200">Connecting to shell...</span>
             </div>
             {connectionWarning && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2 max-w-sm text-center animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{connectionWarning}</span>
                </div>
             )}
          </div>
        )}

        {/* Smart Commands Palette */}
        {showQuickActions && (
          <div 
            className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-start justify-center pt-16 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80%] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Search Header */}
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <Search className="w-5 h-5 text-zinc-400" />
                <input 
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  placeholder="Search commands or add new..."
                  className="bg-transparent border-none outline-none text-zinc-100 flex-1 placeholder:text-zinc-600 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setShowQuickActions(false);
                        setAiSuggestion(null);
                    }
                  }}
                />
                
                {/* Add Custom Command Button */}
                <button 
                  onClick={() => setNewCommandForm({ label: searchQuery, cmd: '', desc: '' })}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded hover:bg-primary/20 transition-colors"
                  title="Create new shortcut"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>

                <button 
                  onClick={() => {
                    setShowQuickActions(false);
                    setAiSuggestion(null);
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add New Command Form */}
              {newCommandForm && (
                <div className="p-4 bg-zinc-950/50 border-b border-white/5 space-y-3">
                  <h4 className="text-sm font-medium text-white">New Shortcut</h4>
                  <input 
                    className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary outline-none"
                    placeholder="Label (e.g. 'Deploy Prod')"
                    value={newCommandForm.label}
                    onChange={e => setNewCommandForm({...newCommandForm, label: e.target.value})}
                  />
                  <input 
                    className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 font-mono focus:border-primary outline-none"
                    placeholder="Command (e.g. 'npm run deploy')"
                    value={newCommandForm.cmd}
                    onChange={e => setNewCommandForm({...newCommandForm, cmd: e.target.value})}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setNewCommandForm(null)}
                      className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (newCommandForm.label && newCommandForm.cmd) {
                          saveCustomCommands([...customCommands, { ...newCommandForm, desc: 'Custom shortcut' }]);
                          setNewCommandForm(null);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                    >
                      Save Shortcut
                    </button>
                  </div>
                </div>
              )}

              {/* Commands List */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {/* AI Copilot Section - Always visible or when no results */}
                {searchQuery && (
                    <div className="mb-4 px-2">
                        <div className={`rounded-lg border p-3 transition-all ${aiSuggestion ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5'}`}>
                            {!aiSuggestion ? (
                                <button 
                                    onClick={() => generateAiCommand(searchQuery)}
                                    disabled={isGeneratingCommand}
                                    className="w-full flex items-center gap-3 text-left group"
                                >
                                    <div className="p-2 rounded-md bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30 transition-colors">
                                        {isGeneratingCommand ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors">
                                            {isGeneratingCommand ? 'Asking AI to generate command...' : `Ask AI to write command for "{searchQuery}"`}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            Translates natural language to Shell commands
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                                </button>
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                                            <Sparkles className="w-3 h-3" />
                                            AI Suggestion
                                        </div>
                                        <button onClick={() => setAiSuggestion(null)} className="text-zinc-500 hover:text-zinc-300">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    
                                    <div className="bg-black/30 rounded p-3 font-mono text-sm text-green-400 border border-white/5 break-all">
                                        {aiSuggestion.cmd}
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            onClick={() => {
                                                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                                                     ws.current.send(JSON.stringify({ type: 'input', data: aiSuggestion.cmd })); // Just Type
                                                     setShowQuickActions(false);
                                                     terminal.current?.focus();
                                                }
                                            }}
                                            className="px-3 py-1.5 text-xs text-zinc-300 bg-white/5 hover:bg-white/10 rounded flex items-center gap-1.5 transition-colors"
                                        >
                                            <Type className="w-3.5 h-3.5" />
                                            Insert
                                        </button>
                                        <button 
                                            onClick={() => insertCommand(aiSuggestion.cmd)}
                                            className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-500/20"
                                        >
                                            <Play className="w-3.5 h-3.5" />
                                            Execute
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No stored commands found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="space-y-4 p-2">
                    {filteredCommands.map((group) => (
                      <div key={group.id}>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {group.id === 'git' && <Zap className="w-3 h-3" />}
                            {group.id === 'recent' && <History className="w-3 h-3" />}
                            {group.id === 'custom' && <Star className="w-3 h-3 text-yellow-500" />}
                            {group.name}
                          </span>
                          {group.id === 'custom' && (
                            <span className="text-[10px] opacity-50">{group.commands.length} saved</span>
                          )}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.commands.map((cmd) => (
                            <div
                              key={cmd.label + cmd.cmd}
                              className="group relative flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 hover:border-primary/30 border border-transparent transition-all cursor-pointer"
                              onClick={() => insertCommand(cmd.cmd)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-zinc-200 group-hover:text-primary transition-colors flex items-center gap-2">
                                  {cmd.label}
                                  {group.id === 'custom' && <Star className="w-3 h-3 text-yellow-500/50" />}
                                </div>
                                <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate" title={cmd.cmd}>
                                  $ {cmd.cmd}
                                </div>
                              </div>
                              
                              {group.id === 'custom' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newCmds = customCommands.filter(c => c.cmd !== cmd.cmd);
                                    saveCustomCommands(newCmds);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                                  title="Remove shortcut"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Hint */}
              <div className="p-3 bg-zinc-950/50 border-t border-white/5 text-[10px] text-zinc-500 flex justify-between px-4">
                <span>Press <kbd className="bg-white/10 px-1 rounded text-zinc-300">Esc</kbd> to close</span>
                <span>Select to execute immediately</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Log Viewer Overlay */}
        {showLogViewer && (
          <div className="absolute inset-0 z-40 bg-zinc-950 flex flex-col animate-in fade-in duration-200">
             {/* Log Viewer Header */}
             <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900">
               <div className="flex items-center gap-2">
                 <FileText className="w-5 h-5 text-primary" />
                 <span className="font-semibold text-zinc-200">Log Explorer</span>
                 <span className="text-xs text-zinc-500 ml-2 px-2 py-0.5 bg-white/5 rounded">ReadOnly</span>
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(logContent);
                     // Could add toast here
                   }}
                   className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded flex items-center gap-1.5 transition-colors"
                 >
                   <Copy className="w-3.5 h-3.5" /> Copy All
                 </button>
                 <button 
                   onClick={() => setShowLogViewer(false)}
                   className="p-1.5 text-zinc-400 hover:text-white hover:bg-red-500/20 rounded transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
             </div>
             
             {/* Log Content */}
             <div className="flex-1 overflow-auto p-4 bg-zinc-950 selection:bg-primary/30">
               <pre className="font-mono text-sm text-zinc-300 whitespace-pre-wrap break-all leading-relaxed max-w-full">
                 {logContent}
               </pre>
             </div>
             
             {/* Search Hint Bar */}
             <div className="px-4 py-2 bg-zinc-900 border-t border-white/10 text-xs text-zinc-500 flex justify-between">
                <span>Tip: Use browser search (<kbd className="bg-white/10 px-1 rounded">Ctrl+F</kbd>) to find text in logs.</span>
                <span>{logContent.length} chars captured</span>
             </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="flex-shrink-0 bg-zinc-950 border-t border-white/5 px-3 py-1 flex items-center justify-between text-[10px] text-zinc-600 font-mono select-none">
         <div className="flex items-center gap-3">
           <span className="flex items-center gap-1">
             <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
             {isConnected ? 'Online' : 'Offline'}
           </span>
           <span>{terminal.current ? `${terminal.current.cols}x${terminal.current.rows}` : '0x0'}</span>
         </div>
         <div className="flex items-center gap-3">
           <span>Font: {fontSize}px</span>
           <span>{currentTheme}</span>
           <span className="hover:text-zinc-400 cursor-pointer" onClick={() => setShowQuickActions(true)}>CMD+K</span>
         </div>
      </div>
    </div>
  );
}

export default Shell;