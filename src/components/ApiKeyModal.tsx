import React from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Palette, Sun, Moon, Sparkles, Zap, ExternalLink, Trash2, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  showApiKeyModal: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  customGeminiKey: string;
  setCustomGeminiKey: (key: string) => void;
  customOpenAIKey: string;
  setCustomOpenAIKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  showApiKeyModal,
  setShowApiKeyModal,
  theme,
  setTheme,
  customGeminiKey,
  setCustomGeminiKey,
  customOpenAIKey,
  setCustomOpenAIKey,
}) => {
  return (
    <AnimatePresence>
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowApiKeyModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-md p-6 rounded-2xl shadow-2xl border flex flex-col gap-6",
              theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Settings & API</h3>
                  <p className="text-xs text-slate-500">Manage your preferences and keys</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Appearance
                </label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                      theme === 'light' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                      theme === 'dark' ? "bg-slate-700 text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Gemini API Key
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
                  >
                    Get Key <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={customGeminiKey}
                    onChange={(e) => setCustomGeminiKey(e.target.value)}
                    placeholder="Enter your Gemini API key..."
                    className={cn(
                      "w-full p-2.5 pr-10 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                      theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                    )}
                  />
                  {customGeminiKey && (
                    <button 
                      onClick={() => setCustomGeminiKey('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Used for JSON conversion and Gemini image models.</span>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 underline">Check Billing</a>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" /> OpenAI API Key
                  </label>
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
                  >
                    Get Key <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={customOpenAIKey}
                    onChange={(e) => setCustomOpenAIKey(e.target.value)}
                    placeholder="Enter your OpenAI API key..."
                    className={cn(
                      "w-full p-2.5 pr-10 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                      theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                    )}
                  />
                  {customOpenAIKey && (
                    <button 
                      onClick={() => setCustomOpenAIKey('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Required for DALL-E 3 (ChatGPT Render).</span>
                  <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 underline">Check Billing</a>
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                Keys are stored locally in your browser. They are never sent to our servers except for API requests.
              </p>
            </div>

            <button
              onClick={() => setShowApiKeyModal(false)}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              Save & Close
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
