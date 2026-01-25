/**
 * SQL Query Editor Component
 * 强大的 SQL 查询编辑器，支持语法高亮、自动补全等
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { autocompletion } from '@codemirror/autocomplete';
import { Play, Save, History, Trash2, ChevronDown, ChevronRight, Sparkles, X, Loader2, Wand2, Info, Gauge, Bug, IndentIncrease, PlayCircle } from 'lucide-react';
import { scopedKey } from '../../utils/projectScope';

const SqlEditor = ({
  value,
  onChange,
  onExecute,
  onSave,
  templates,
  history,
  onTemplateSelect,
  onHistorySelect,
  placeholder = "输入 SQL 查询语句...",
  aiContext
}) => {
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiMode, setAiMode] = useState('generate');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showSave, setShowSave] = useState(false);
  const [saveSql, setSaveSql] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('自定义');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState(null);
  const editorRef = useRef(null);
  const aiAbortRef = useRef(null);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1, selection: 0 });
  const [draftRestored, setDraftRestored] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const getView = () => editorRef.current?.view || editorRef.current?.editor?.view || null;

  const insertTemplate = (template) => {
    onChange(template.sql);
    setIsTemplatesOpen(false);
    setTimeout(() => getView()?.focus?.(), 0);
  };

  const insertHistory = (historyItem) => {
    onChange(historyItem.sql);
    setIsHistoryOpen(false);
    setTimeout(() => getView()?.focus?.(), 0);
  };

  const clearEditor = () => {
    onChange('');
    setTimeout(() => getView()?.focus?.(), 0);
  };

  const draftKey = useMemo(() => {
    const db = String(aiContext?.dbType || 'db');
    const conn = String(aiContext?.selectedConnection || 'default');
    const project = { path: aiContext?.projectPath, name: aiContext?.projectName };
    return scopedKey(project, `iflow:db:sqlDraft:${db}:${conn}`);
  }, [aiContext?.dbType, aiContext?.selectedConnection, aiContext?.projectName, aiContext?.projectPath]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey) || '';
      if (saved && (!value || !String(value).trim())) {
        onChange(saved);
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 1800);
      }
    } catch {
    }
  }, [draftKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, String(value || ''));
      } catch {
      }
    }, 400);
    return () => clearTimeout(t);
  }, [draftKey, value]);

  const extractTemplateParams = (sql) => {
    const s = String(sql || '');
    const params = [];
    const re = /\{([a-zA-Z0-9_]+)\}/g;
    let m;
    while ((m = re.exec(s))) {
      const p = String(m[1] || '').trim();
      if (!p) continue;
      if (!params.includes(p)) params.push(p);
      if (params.length >= 30) break;
    }
    return params;
  };

  const openSaveDialog = (sql) => {
    const s = String(sql || '').trim();
    if (!s) return;
    setSaveSql(s);
    setTemplateSaveError(null);
    setTemplateSaving(false);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('自定义');
    setShowSave(true);
  };

  const submitSaveTemplate = async () => {
    if (!onSave) {
      setTemplateSaveError('当前环境未配置模板保存');
      return;
    }
    const sql = String(saveSql || '').trim();
    if (!sql) {
      setTemplateSaveError('SQL 不能为空');
      return;
    }
    const name = templateName.trim();
    if (!name) {
      setTemplateSaveError('模板名称不能为空');
      return;
    }
    setTemplateSaving(true);
    setTemplateSaveError(null);
    try {
      await onSave({
        name,
        sql,
        description: templateDescription.trim(),
        category: templateCategory.trim() || '自定义',
        params: extractTemplateParams(sql)
      });
      setShowSave(false);
    } catch (e) {
      setTemplateSaveError(String(e?.message || e));
    } finally {
      setTemplateSaving(false);
    }
  };

  const schemaText = useMemo(() => {
    const info = aiContext?.tableInfo;
    if (!info || !Array.isArray(info.columns)) return '';
    const cols = info.columns
      .map((c) => {
        const parts = [String(c.name || '')];
        if (c.type) parts.push(String(c.type));
        if (c.pk) parts.push('PK');
        if (c.notnull) parts.push('NOT NULL');
        if (c.default_value !== null && c.default_value !== undefined && c.default_value !== '') parts.push(`DEFAULT ${String(c.default_value)}`);
        return parts.filter(Boolean).join(' ');
      })
      .slice(0, 80)
      .join('\n');
    return `TABLE ${String(info.name || aiContext?.selectedTable || '')}\n${cols}`.trim();
  }, [aiContext?.selectedTable, aiContext?.tableInfo]);

  const resultText = useMemo(() => {
    const r = aiContext?.queryResult;
    if (!r) return '';
    if (r.success === false) return `LAST_ERROR\n${String(r.error || '').slice(0, 800)}`.trim();
    if (!Array.isArray(r.columns) || !Array.isArray(r.rows)) return '';
    const cols = r.columns.slice(0, 30);
    const rows = r.rows.slice(0, 15).map((row) => row.slice(0, 30));
    return `LAST_RESULT\ncolumns: ${cols.join(', ')}\nrows_sample:\n${rows.map((row) => JSON.stringify(row)).join('\n')}`.trim();
  }, [aiContext?.queryResult]);

  const completionSources = useMemo(() => {
    const keywords = [
      'SELECT',
      'FROM',
      'WHERE',
      'GROUP BY',
      'HAVING',
      'ORDER BY',
      'LIMIT',
      'OFFSET',
      'JOIN',
      'LEFT JOIN',
      'RIGHT JOIN',
      'INNER JOIN',
      'FULL JOIN',
      'ON',
      'AS',
      'DISTINCT',
      'AND',
      'OR',
      'IN',
      'NOT IN',
      'IS NULL',
      'IS NOT NULL',
      'BETWEEN',
      'LIKE',
      'EXISTS',
      'UNION',
      'UNION ALL',
      'WITH',
      'INSERT',
      'INTO',
      'VALUES',
      'UPDATE',
      'SET',
      'DELETE',
      'CREATE',
      'ALTER',
      'DROP',
      'TRUNCATE',
      'EXPLAIN'
    ];

    const functions = [
      'COUNT()',
      'SUM()',
      'AVG()',
      'MIN()',
      'MAX()',
      'COALESCE()',
      'CAST()',
      'DATE()',
      'DATETIME()',
      'STRFTIME()'
    ];

    const tables = Array.isArray(aiContext?.tables) ? aiContext.tables.map(String).filter(Boolean) : [];
    const selectedTable = String(aiContext?.selectedTable || aiContext?.tableInfo?.name || '');
    const columns = Array.isArray(aiContext?.tableInfo?.columns)
      ? aiContext.tableInfo.columns.map((c) => String(c?.name || '')).filter(Boolean)
      : [];

    const keywordOptions = keywords.map((k) => ({
      label: k,
      type: 'keyword',
      apply: k + ' ',
      boost: 1
    }));

    const functionOptions = functions.map((f) => ({
      label: f,
      type: 'function',
      apply: f,
      boost: 0
    }));

    const tableOptions = tables.map((t) => ({
      label: t,
      type: 'variable',
      detail: 'table',
      apply: t,
      boost: 6
    }));

    const columnOptions = columns.map((c) => ({
      label: c,
      type: 'property',
      detail: selectedTable ? `column · ${selectedTable}` : 'column',
      apply: c,
      boost: 7
    }));

    const listOptions = [...keywordOptions, ...functionOptions, ...tableOptions, ...columnOptions];

    const normalizeIdent = (s) => String(s || '').replace(/^[`"\[]|[`"\]]$/g, '');

    const parseAliasMap = (text) => {
      const map = new Map();
      const src = String(text || '');
      const re = /\b(from|join)\s+([`"\[]?[A-Za-z_][\w$]*[`"\]]?)(?:\s+(?:as\s+)?([A-Za-z_][\w$]*))?/gi;
      let m;
      while ((m = re.exec(src))) {
        const table = normalizeIdent(m[2]);
        const alias = normalizeIdent(m[3]);
        if (alias) map.set(alias, table);
        map.set(table, table);
      }
      return map;
    };

    const getContextKind = (view) => {
      const docText = view.state.doc.toString();
      const pos = view.state.selection.main.from;
      const before = docText.slice(Math.max(0, pos - 260), pos).toLowerCase().replace(/\s+/g, ' ');

      if (/\b(from|join)\s+[a-z0-9_"`\[]*$/i.test(before)) return 'table';

      const keys = [
        { key: 'group by', kind: 'group' },
        { key: 'order by', kind: 'order' },
        { key: 'select', kind: 'select' },
        { key: 'from', kind: 'from' },
        { key: 'join', kind: 'join' },
        { key: 'where', kind: 'where' },
        { key: 'on', kind: 'on' },
        { key: 'having', kind: 'having' }
      ];

      let best = { idx: -1, kind: 'general' };
      for (const k of keys) {
        const idx = before.lastIndexOf(k.key);
        if (idx > best.idx) best = { idx, kind: k.kind };
      }
      if (best.kind === 'from' || best.kind === 'join') return 'table';
      if (best.kind === 'select') return 'select';
      if (best.kind === 'where' || best.kind === 'on' || best.kind === 'having') return 'condition';
      return 'general';
    };

    const makeSnippetOptions = () => {
      if (!selectedTable) return [];
      const col = columns[0] ? columns[0] : '*';
      const basic = `SELECT *\nFROM ${selectedTable}\nLIMIT 100;`;
      const withWhere = `SELECT ${col}\nFROM ${selectedTable}\nWHERE 1=1\nLIMIT 100;`;
      const agg = `SELECT ${col}, COUNT(*) AS cnt\nFROM ${selectedTable}\nGROUP BY ${col}\nORDER BY cnt DESC\nLIMIT 50;`;
      return [
        { label: 'SELECT * FROM … LIMIT …', type: 'text', detail: 'snippet', apply: basic, boost: 9 },
        { label: 'SELECT … WHERE … LIMIT …', type: 'text', detail: 'snippet', apply: withWhere, boost: 9 },
        { label: 'GROUP BY + COUNT(*)', type: 'text', detail: 'snippet', apply: agg, boost: 8 }
      ];
    };

    const columnSource = (context) => {
      const beforeDot = context.matchBefore(/[A-Za-z_][A-Za-z_0-9]*\.[A-Za-z_0-9]*$/);
      if (!beforeDot && !context.explicit) return null;
      if (!beforeDot) return null;

      const raw = beforeDot.text;
      const parts = raw.split('.');
      if (parts.length < 2) return null;
      const alias = parts[0];
      const prefix = parts[1].toLowerCase();

      const view = context.view;
      const aliasMap = parseAliasMap(view.state.doc.toString());
      const mappedTable = aliasMap.get(alias) || '';

      const canUseColumns = selectedTable && (mappedTable === selectedTable || alias === selectedTable);
      const baseOptions = canUseColumns ? columnOptions : columnOptions.map((o) => ({ ...o, boost: Math.max(1, (o.boost || 1) - 4) }));
      const options = prefix ? baseOptions.filter((o) => o.label.toLowerCase().startsWith(prefix)) : baseOptions;
      if (options.length === 0) return null;
      return { from: beforeDot.from + alias.length + 1, options: options.slice(0, 80), validFor: /^[A-Za-z_0-9]*$/ };
    };

    const mainSource = (context) => {
      const word = context.matchBefore(/[A-Za-z_][A-Za-z_0-9]*/);
      if (!word && !context.explicit) return null;
      const from = word ? word.from : context.pos;
      const prefix = word ? word.text.toLowerCase() : '';
      const view = context.view;
      const kind = getContextKind(view);

      const snippetOptions = makeSnippetOptions();
      const base =
        kind === 'table'
          ? [...tableOptions, ...keywordOptions.filter((o) => ['AS', 'ON'].includes(o.label))]
          : kind === 'select'
            ? [...snippetOptions, ...columnOptions, ...functionOptions, ...keywordOptions.filter((o) => ['FROM', 'AS', 'DISTINCT'].includes(o.label))]
            : kind === 'condition'
              ? [
                  ...columnOptions,
                  ...functionOptions,
                  ...keywordOptions.filter((o) => ['AND', 'OR', 'IN', 'NOT IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'EXISTS'].includes(o.label))
                ]
              : [...snippetOptions, ...listOptions];

      const options = prefix ? base.filter((o) => o.label.toLowerCase().startsWith(prefix)) : base;
      return {
        from,
        options: options.slice(0, 80),
        validFor: /^[A-Za-z_0-9]*$/
      };
    };

    return { columnSource, mainSource };
  }, [aiContext?.tables, aiContext?.tableInfo]);

  const buildAiMessage = (mode, prompt) => {
    const dbType = String(aiContext?.dbType || '');
    const conn = String(aiContext?.selectedConnection || '');
    const selectedTable = String(aiContext?.selectedTable || '');
    const ctx = [
      dbType ? `DB: ${dbType}` : null,
      conn ? `CONNECTION: ${conn}` : null,
      selectedTable ? `SELECTED_TABLE: ${selectedTable}` : null,
      schemaText ? `SCHEMA\n${schemaText}` : null,
      resultText ? resultText : null,
      value?.trim?.() ? `CURRENT_SQL\n${String(value).slice(0, 6000)}` : null
    ]
      .filter(Boolean)
      .join('\n\n');

    const userNeed = String(prompt || '').trim();
    const base = `你是资深数据库工程师与SQL助手。`;
    const rules =
      mode === 'generate'
        ? `请根据需求生成可执行的 SQL。只输出一个 SQL 代码块（\`\`\`sql ...\`\`\`），不要额外解释。`
        : mode === 'explain'
          ? `请解释 CURRENT_SQL 的含义、可能的风险与边界条件，用简短要点输出。`
          : mode === 'optimize'
            ? `请优化 CURRENT_SQL 的性能与可读性，并给出优化后的 SQL（\`\`\`sql\`\`\`）与要点说明。`
            : `请根据 LAST_ERROR 修复 CURRENT_SQL，并输出修复后的 SQL（\`\`\`sql\`\`\`）与简短原因。`;

    return [base, rules, ctx ? `CONTEXT\n${ctx}` : null, userNeed ? `USER_REQUEST\n${userNeed}` : null].filter(Boolean).join('\n\n');
  };

  const extractSqlFromReply = (text) => {
    const s = String(text || '');
    const m = s.match(/```sql\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/);
    if (m && m[1]) return m[1].trim();
    const lines = s.split('\n').map((x) => x.trim()).filter(Boolean);
    const start = lines.findIndex((l) => /^(select|with|insert|update|delete|create|alter|drop|explain)\b/i.test(l));
    if (start >= 0) return lines.slice(start).join('\n').trim();
    return '';
  };

  const runAi = async (mode) => {
    if (aiStreaming) return;
    setAiError(null);
    setAiReply('');
    setAiStreaming(true);
    const abort = new AbortController();
    aiAbortRef.current = abort;

    try {
      const message = buildAiMessage(mode, aiPrompt);
      const url = `/stream?message=${encodeURIComponent(message)}&persona=partner`;
      const res = await fetch(url, { method: 'GET', signal: abort.signal });
      if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
      if (!res.body) throw new Error('AI stream not supported');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          let evt;
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type === 'content') {
            const content = String(evt.content || '');
            setAiReply((prev) => prev + content);
          } else if (evt.type === 'error') {
            setAiError(String(evt.content || 'AI error'));
          } else if (evt.type === 'done') {
            break;
          }
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setAiError(String(e?.message || e));
      }
    } finally {
      setAiStreaming(false);
      aiAbortRef.current = null;
    }
  };

  const openAi = (mode) => {
    setAiMode(mode);
    setShowAi(true);
    setIsTemplatesOpen(false);
    setIsHistoryOpen(false);
    setAiError(null);
    setAiReply('');
    setAiPrompt('');
  };

  const formatSql = (input) => {
    const raw = String(input || '');
    if (!raw.trim()) return raw;
    let s = raw.replace(/\r\n/g, '\n').trim();
    s = s.replace(/[ \t]+/g, ' ');
    s = s.replace(/\s*,\s*/g, ', ');
    const keywords = [
      'select',
      'from',
      'where',
      'group by',
      'having',
      'order by',
      'limit',
      'offset',
      'inner join',
      'left join',
      'right join',
      'full join',
      'join',
      'on',
      'union',
      'union all'
    ];
    for (const kw of keywords) {
      const re = new RegExp(`\\s+${kw.replace(' ', '\\\\s+')}\\s+`, 'ig');
      s = s.replace(re, `\n${kw.toUpperCase()} `);
    }
    s = s.replace(/\s+and\s+/gi, '\n  AND ');
    s = s.replace(/\s+or\s+/gi, '\n  OR ');
    s = s.replace(/\n{3,}/g, '\n\n');
    return s;
  };

  const toggleLineComment = (view) => {
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc;
    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;
    const lines = [];
    for (let i = startLine; i <= endLine; i += 1) {
      const line = doc.line(i);
      lines.push(line);
    }

    const isCommented = (text) => {
      const m = text.match(/^\s*/);
      const idx = m ? m[0].length : 0;
      return text.slice(idx).startsWith('--');
    };

    const shouldUncomment = lines.every((l) => isCommented(l.text));
    const changes = [];
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      const m = line.text.match(/^\s*/);
      const idx = m ? m[0].length : 0;
      if (shouldUncomment) {
        const rest = line.text.slice(idx);
        if (rest.startsWith('-- ')) {
          changes.push({ from: line.from + idx, to: line.from + idx + 3, insert: '' });
        } else if (rest.startsWith('--')) {
          changes.push({ from: line.from + idx, to: line.from + idx + 2, insert: '' });
        }
      } else {
        changes.push({ from: line.from + idx, to: line.from + idx, insert: '-- ' });
      }
    }
    if (changes.length > 0) {
      view.dispatch({ changes });
      return true;
    }
    return false;
  };

  const cmExtensions = useMemo(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged && !update.selectionSet) return;
      const sel = update.state.selection.main;
      const from = sel.from;
      const to = sel.to;
      const line = update.state.doc.lineAt(from);
      const col = from - line.from + 1;
      setCursorInfo({ line: line.number, col, selection: Math.max(0, to - from) });
    });

    const km = keymap.of([
      {
        key: 'Mod-Enter',
        run: (view) => {
          const sel = view.state.selection.main;
          const selected = sel.from !== sel.to ? view.state.sliceDoc(sel.from, sel.to) : '';
          const sql = selected.trim() ? selected : view.state.doc.toString();
          onExecute?.(sql);
          return true;
        }
      },
      {
        key: 'Shift-Mod-F',
        run: (view) => {
          const next = formatSql(view.state.doc.toString());
          if (next === view.state.doc.toString()) return true;
          view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
          return true;
        }
      },
      {
        key: 'Mod-/',
        run: (view) => toggleLineComment(view)
      }
    ]);

    return [
      updateListener,
      km,
      EditorView.lineWrapping,
      autocompletion({
        activateOnTyping: true,
        override: [completionSources.columnSource, completionSources.mainSource]
      })
    ];
  }, [completionSources, onExecute]);

  const runSelectedOrAll = () => {
    const view = getView();
    if (!view) return;
    const sel = view.state.selection.main;
    const selected = sel.from !== sel.to ? view.state.sliceDoc(sel.from, sel.to) : '';
    const sql = selected.trim() ? selected : view.state.doc.toString();
    onExecute?.(sql);
  };

  const formatCurrent = () => {
    const view = getView();
    const next = formatSql(value);
    onChange(next);
    setTimeout(() => view?.focus?.(), 0);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onExecute?.(value)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
            title="执行查询 (Ctrl+Enter)"
          >
            <Play className="w-4 h-4" />
            <span>执行</span>
          </button>

          <button
            onClick={() => openSaveDialog(value)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
            title="保存为模板"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>

          <button
            onClick={() => openAi('generate')}
            className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
            title="AI 生成 SQL"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI</span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setIsTemplatesOpen(!isTemplatesOpen);
                setIsHistoryOpen(false);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white border border-gray-300 dark:border-transparent rounded text-sm transition-colors shadow-sm"
              title="查询模板"
            >
              <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>模板</span>
              {isTemplatesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {isTemplatesOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">查询模板</h3>
                </div>
                {templates.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    暂无模板
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => insertTemplate(template)}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.description}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                          {template.category}
                        </span>
                      </div>
                      {template.params && template.params.length > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          参数: {template.params.join(', ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsHistoryOpen(!isHistoryOpen);
                setIsTemplatesOpen(false);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white border border-gray-300 dark:border-transparent rounded text-sm transition-colors shadow-sm"
              title="查询历史"
            >
              <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>历史</span>
              {isHistoryOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {isHistoryOpen && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">查询历史</h3>
                </div>
                {history.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    暂无历史记录
                  </div>
                ) : (
                  history.slice().reverse().map((item, index) => (
                    <div
                      key={index}
                      onClick={() => insertHistory(item)}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white font-mono truncate">
                        {item.sql}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <span className={item.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {item.success ? '✓ 成功' : '✗ 失败'}
                        </span>
                        {item.row_count !== undefined && (
                          <span className="text-gray-500 dark:text-gray-400">{item.row_count} 行</span>
                        )}
                        {item.execution_time && (
                          <span className="text-gray-500 dark:text-gray-400">{item.execution_time.toFixed(3)}s</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={runSelectedOrAll}
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
            title="执行选中内容 (Ctrl/Cmd+Enter)"
          >
            <PlayCircle className="w-4 h-4" />
            <span>选中执行</span>
          </button>
          <button
            onClick={formatCurrent}
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white border border-gray-300 dark:border-transparent rounded text-sm transition-colors shadow-sm"
            title="格式化 (Ctrl/Cmd+Shift+F)"
          >
            <IndentIncrease className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span>格式化</span>
          </button>
          <button
            onClick={clearEditor}
            className="flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white border border-gray-300 dark:border-transparent rounded text-sm transition-colors shadow-sm"
            title="清空编辑器"
          >
            <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span>清空</span>
          </button>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          theme={isDarkMode ? oneDark : 'light'}
          height="100%"
          style={{ height: '100%' }}
          extensions={cmExtensions}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightSelectionMatches: true,
            searchKeymap: true
          }}
        />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>行数: {value.split('\n').length}</span>
          <span>字符数: {value.length}</span>
          <span>Ln {cursorInfo.line}, Col {cursorInfo.col}</span>
          {cursorInfo.selection > 0 && <span>选中: {cursorInfo.selection}</span>}
          {draftRestored && <span className="text-emerald-600 dark:text-emerald-400 font-medium">已恢复草稿</span>}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">Ctrl+Enter</kbd>
            <span>执行</span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">Ctrl+/</kbd>
            <span>注释</span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">Ctrl+Shift+F</kbd>
            <span>格式化</span>
          </div>
        </div>
      </div>

      {showAi && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div className="text-sm font-semibold text-white">数据库 AI 助手</div>
                <div className="text-xs text-gray-400">
                  {aiContext?.dbType ? String(aiContext.dbType).toUpperCase() : 'SQL'}
                  {aiContext?.selectedTable ? ` · ${aiContext.selectedTable}` : ''}
                </div>
              </div>
              <button
                onClick={() => {
                  aiAbortRef.current?.abort?.();
                  setShowAi(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-2">
                <div className="text-xs font-semibold text-gray-300">快捷操作</div>
                <button
                  type="button"
                  onClick={() => setAiMode('generate')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    aiMode === 'generate'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  生成 SQL
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('explain')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    aiMode === 'explain'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  解释当前 SQL
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('optimize')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    aiMode === 'optimize'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <Gauge className="w-4 h-4" />
                  优化当前 SQL
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('fix')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    aiMode === 'fix'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                  }`}
                  disabled={!aiContext?.queryResult || aiContext?.queryResult?.success !== false}
                >
                  <Bug className="w-4 h-4" />
                  修复上次报错
                </button>

                <div className="pt-2 text-xs text-gray-400">
                  {schemaText ? '已附带表结构' : '未选择表结构'}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-gray-300">你的需求</div>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={aiMode === 'generate' ? '例如：统计最近7天每个用户的订单数，按订单数降序' : '可选：补充你想关注的点'}
                    className="w-full h-24 bg-gray-800 text-gray-100 text-sm rounded-lg border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        aiAbortRef.current?.abort?.();
                        setAiReply('');
                        setAiError(null);
                      }}
                      disabled={aiStreaming && !aiAbortRef.current}
                      className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      清空输出
                    </button>
                    {aiStreaming ? (
                      <button
                        type="button"
                        onClick={() => aiAbortRef.current?.abort?.()}
                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm"
                      >
                        停止
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => runAi(aiMode)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors text-sm"
                      >
                        <Sparkles className="w-4 h-4" />
                        运行
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <div className="text-xs font-semibold text-gray-300 mb-2">AI 输出</div>
                  <div className="h-64 bg-gray-800 border border-gray-700 rounded-lg p-3 overflow-auto text-sm text-gray-100 font-mono whitespace-pre-wrap">
                    {aiStreaming && !aiReply && !aiError ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中...
                      </div>
                    ) : aiError ? (
                      <div className="text-red-400">{aiError}</div>
                    ) : (
                      aiReply || <div className="text-gray-500">暂无输出</div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sql = extractSqlFromReply(aiReply);
                        if (!sql) return;
                        onChange(sql);
                        setShowAi(false);
                        setTimeout(() => {
                          textareaRef.current?.focus?.();
                          aiContext?.executeSql?.(sql);
                        }, 0);
                      }}
                      disabled={!aiContext?.executeSql || !extractSqlFromReply(aiReply)}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      插入并执行
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sql = extractSqlFromReply(aiReply);
                        if (!sql) return;
                        onChange(sql);
                        setShowAi(false);
                        setTimeout(() => textareaRef.current?.focus?.(), 0);
                      }}
                      disabled={!extractSqlFromReply(aiReply)}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      插入到编辑器
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sql = extractSqlFromReply(aiReply);
                        if (!sql) return;
                        onChange(sql);
                        setShowAi(false);
                        setTimeout(() => openSaveDialog(sql), 0);
                      }}
                      disabled={!onSave || !extractSqlFromReply(aiReply)}
                      className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      保存为模板
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        aiAbortRef.current?.abort?.();
                        setShowAi(false);
                      }}
                      className="px-3 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors text-sm"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSave && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-blue-400" />
                <div className="text-sm font-semibold text-white">保存查询模板</div>
              </div>
              <button
                onClick={() => setShowSave(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs font-semibold text-gray-300 mb-2">模板名称</div>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="例如：用户活跃统计（近7天）"
                  className="w-full bg-gray-800 text-gray-100 text-sm rounded-lg border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-300 mb-2">分类</div>
                  <input
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    placeholder="自定义"
                    className="w-full bg-gray-800 text-gray-100 text-sm rounded-lg border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-300 mb-2">参数（自动识别）</div>
                  <div className="w-full bg-gray-800 text-gray-100 text-sm rounded-lg border border-gray-700 px-3 py-2">
                    {extractTemplateParams(saveSql).length > 0 ? extractTemplateParams(saveSql).join(', ') : <span className="text-gray-500">无</span>}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-300 mb-2">描述（可选）</div>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="这条查询用于……"
                  className="w-full h-20 bg-gray-800 text-gray-100 text-sm rounded-lg border border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {templateSaveError && <div className="text-sm text-red-400">{templateSaveError}</div>}
            </div>

            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSave(false)}
                className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitSaveTemplate}
                disabled={templateSaving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {templateSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SqlEditor;
