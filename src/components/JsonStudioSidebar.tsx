import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-json';
import { cn } from '../lib/utils';
import { Activity, Key, Server, Play } from 'lucide-react';

interface JsonStudioSidebarProps {
  theme: 'light' | 'dark';
  jsonOutput: string;
  isJsonLoading: boolean;
  onConvert: (text: string) => void;
  hasApiKey: boolean;
}

export function JsonStudioSidebar({ theme, jsonOutput, isJsonLoading, onConvert, hasApiKey }: JsonStudioSidebarProps) {
  const [inputText, setInputText] = React.useState('');

  useEffect(() => {
    Prism.highlightAll();
  }, [jsonOutput, theme]);

  return (
    <div className={cn(
      "h-full flex flex-col border-l",
      theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
    )}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold mb-1">JSON Studio</h2>
        <p className="text-xs text-slate-500">Technical Control & Payload</p>
      </div>

      {/* Input Converter */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Input Converter</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text commands to convert to JSON..."
          className={cn(
            "w-full h-24 p-2 text-sm rounded border resize-none focus:ring-2 focus:ring-indigo-500 outline-none",
            theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
          )}
        />
        <button
          onClick={() => onConvert(inputText)}
          disabled={isJsonLoading || !inputText.trim()}
          className="w-full p-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {isJsonLoading ? 'Converting...' : 'Convert to JSON'}
        </button>
      </div>

      {/* JSON Viewer */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-2 flex justify-between items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payload Viewer</label>
        </div>
        <div className="flex-1 overflow-auto p-4 pt-0 custom-scrollbar">
          <pre className="!m-0 !p-4 rounded-lg !bg-slate-950 !text-sm h-full">
            <code className="language-json">
              {jsonOutput || '{\n  "status": "waiting for input"\n}'}
            </code>
          </pre>
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn(
        "p-3 border-t text-xs flex items-center justify-between",
        theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
      )}>
        <div className="flex items-center gap-1.5" title="API Key Status">
          <Key className={cn("w-3.5 h-3.5", hasApiKey ? "text-emerald-500" : "text-rose-500")} />
          <span className={hasApiKey ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
            {hasApiKey ? 'Ready' : 'Missing'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500" title="Latency">
          <Activity className="w-3.5 h-3.5" />
          <span>24ms</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-500" title="Server Status">
          <Server className="w-3.5 h-3.5" />
          <span>Online</span>
        </div>
      </div>
    </div>
  );
}
