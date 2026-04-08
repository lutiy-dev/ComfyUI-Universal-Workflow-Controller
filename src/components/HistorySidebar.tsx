import React from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Clock, FileJson, ImageIcon, Trash2 } from 'lucide-react';

interface HistorySidebarProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  theme: 'light' | 'dark';
  history: any[];
  loadFromHistory: (item: any) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  showHistory,
  setShowHistory,
  theme,
  history,
  loadFromHistory,
  deleteHistoryItem,
  clearHistory,
}) => {
  return (
    <AnimatePresence>
      {showHistory && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 right-0 bottom-0 w-full max-w-md z-50 shadow-2xl flex flex-col",
              theme === 'dark' ? "bg-slate-900 border-l border-slate-800" : "bg-white border-l border-slate-200"
            )}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold">Generation History</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                  <Clock className="w-12 h-12 opacity-20" />
                  <p>No history yet</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all group relative cursor-pointer",
                      theme === 'dark' 
                        ? "bg-slate-800/50 border-slate-700 hover:border-indigo-500" 
                        : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                    )}
                    onClick={() => loadFromHistory(item)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'json' ? (
                          <FileJson className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {item.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-medium line-clamp-2 mb-2 text-slate-700 dark:text-slate-300">
                      {item.prompt}
                    </p>
                    {item.type === 'image' && (
                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mb-2">
                        <img src={item.output} alt="History" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 italic">
                        {item.model}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={clearHistory}
                  className="w-full py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
