import React from 'react';
import { Sparkles, AlertCircle, Palette, Maximize2, Minimize2, Check, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface CenterPanelProps {
  theme: 'light' | 'dark';
  prompt: string;
  uploadedImages: any[];
  isImageLoading: boolean;
  imageErrorMsg: string | null;
  generatedImage: string | null;
  generateImage: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
}

export function CenterPanel({
  theme,
  prompt,
  uploadedImages,
  isImageLoading,
  imageErrorMsg,
  generatedImage,
  generateImage,
  isFullscreen,
  setIsFullscreen
}: CenterPanelProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header / Control Panel */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border shadow-sm",
        theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Session</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-indigo-500">Image Studio</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={generateImage}
            disabled={isImageLoading || (!prompt.trim() && uploadedImages.length === 0)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              isImageLoading || (!prompt.trim() && uploadedImages.length === 0)
                ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            )}
          >
            {isImageLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isImageLoading ? 'GENERATING...' : 'GENERATE IMAGE'}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className={cn(
        "flex-1 relative rounded-xl border overflow-hidden flex items-center justify-center min-h-[400px]",
        theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
      )}>
        {imageErrorMsg ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-xs text-red-400 max-w-[200px]">{imageErrorMsg}</p>
          </div>
        ) : !generatedImage && !isImageLoading ? (
          <div className="flex flex-col items-center text-slate-400">
            <Palette className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm uppercase font-bold tracking-widest">Viewport Ready</p>
          </div>
        ) : generatedImage ? (
          <div className="relative w-full h-full overflow-auto custom-scrollbar flex items-center justify-center p-4">
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300"
              style={{ transform: isFullscreen ? 'scale(1.5)' : 'scale(1)' }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ) : null}
        {isImageLoading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs text-indigo-400 font-bold animate-pulse tracking-widest">RENDERING...</span>
            </div>
          </div>
        )}
      </div>

      {/* Render Settings */}
      <div className={cn(
        "p-4 rounded-xl border shadow-sm grid grid-cols-4 gap-4",
        theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resolution</span>
          <span className="text-sm font-medium">Max (Longest Edge)</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perspective</span>
          <span className="text-sm font-medium text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> Locked</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Structure (ControlNet)</span>
          <span className="text-sm font-medium text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> Blocked</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auto-Injections</span>
          <span className="text-sm font-medium text-indigo-500">Road Markings</span>
        </div>
      </div>
    </div>
  );
}
