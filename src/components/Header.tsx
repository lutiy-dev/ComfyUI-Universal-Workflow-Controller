import React from 'react';
import { cn } from '../lib/utils';
import { FileJson, Zap, LayoutGrid, Save, Key, History, Layers, Moon, Sun, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface HeaderProps {
  theme: 'light' | 'dark';
  mode: 'studio' | 'gallery';
  setMode: (mode: 'studio' | 'gallery') => void;
  setShowProjects: (show: boolean) => void;
  activeProject: { name: string };
  isSaved: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  setShowHistory: (show: boolean) => void;
  showPromptsPanel: boolean;
  setShowPromptsPanel: (show: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  clearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  mode,
  setMode,
  setShowProjects,
  activeProject,
  isSaved,
  setShowApiKeyModal,
  setShowHistory,
  showPromptsPanel,
  setShowPromptsPanel,
  setTheme,
  clearAll,
}) => {
  return (
    <header className={cn(
      "border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10 transition-colors",
      theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
    )}>
      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowProjects(true)}
            className={cn(
              "flex items-center gap-2 p-1 rounded-lg transition-all",
              theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
            )}
          >
            <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg">
              <FileJson className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <h1 className="text-sm font-bold leading-none mb-1">Prompt2JSON</h1>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                {activeProject.name}
              </p>
            </div>
          </button>
        </div>
        
        <nav className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setMode('studio')}
            className={cn(
              "px-2 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              mode === 'studio' 
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Studio</span>
          </button>
          <button
            onClick={() => setMode('gallery')}
            className={cn(
              "px-2 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              mode === 'gallery' 
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Gallery</span>
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <AnimatePresence>
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full"
            >
              <Save className="w-3 h-3" />
              SAVED
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setShowApiKeyModal(true)}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === 'dark' ? "text-slate-400 hover:bg-slate-800 hover:text-indigo-400" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          )}
          title="API Keys Settings"
        >
          <Key className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === 'dark' ? "text-slate-400 hover:bg-slate-800 hover:text-indigo-400" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          )}
          title="View History"
        >
          <History className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowPromptsPanel(!showPromptsPanel)}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === 'dark' ? "text-slate-400 hover:bg-slate-800 hover:text-indigo-400" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600",
            showPromptsPanel && (theme === 'dark' ? "text-indigo-400 bg-slate-800" : "text-indigo-600 bg-slate-100")
          )}
          title="Toggle Prompts Panel"
        >
          <Layers className="w-5 h-5" />
        </button>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === 'dark' ? "text-slate-400 hover:bg-slate-800 hover:text-yellow-400" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          )}
          title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        <button
          onClick={clearAll}
          className={cn(
            "p-2 rounded-md transition-colors",
            theme === 'dark' ? "text-slate-400 hover:bg-slate-800 hover:text-red-400" : "text-slate-500 hover:bg-slate-100 hover:text-red-600"
          )}
          title="Clear all"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
