import React, { useState } from 'react';
import { Download, Copy, Zap, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function TechnicalSpecSidebar({ theme, onInjectPrompt }: { theme: 'dark' | 'light', onInjectPrompt: (prompt: string) => void }) {
  const [text, setText] = useState('');
  const [promptType, setPromptType] = useState<'Exterior' | 'Interior' | 'Product'>('Exterior');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const exportText = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.txt';
    a.click();
  };

  const generatePrompt = () => {
    const prompts = {
      Exterior: ["Modern house in the forest", "Futuristic skyscraper", "Cozy cottage"],
      Interior: ["Minimalist living room", "Industrial kitchen", "Scandinavian bedroom"],
      Product: ["Sleek smartphone", "Ergonomic chair", "Minimalist watch"]
    };
    const randomPrompt = prompts[promptType][Math.floor(Math.random() * prompts[promptType].length)];
    setGeneratedPrompt(randomPrompt);
  };

  const translatePrompt = async () => {
    if (!generatedPrompt) return;
    setIsTranslating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following prompt into English: "${generatedPrompt}"`,
      });
      if (response.text) {
        setGeneratedPrompt(response.text.trim());
      }
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleInject = () => {
    if (!generatedPrompt) return;
    const newText = text ? `${text}\n${generatedPrompt}` : generatedPrompt;
    setText(newText);
    onInjectPrompt(newText);
  };

  return (
    <div className={cn(
      "h-full flex flex-col transition-colors min-w-[280px]",
      theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
    )}>
      {/* Main Editor Container */}
      <div className="flex-1 flex flex-col p-4">
        <h2 className="text-sm font-bold mb-2">Main Editor</h2>
        <div className={cn(
          "flex-1 w-full rounded-lg border overflow-auto",
          theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
        )}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={cn(
              "w-full h-full p-2 text-sm font-mono outline-none resize-none bg-transparent",
              theme === 'dark' ? "text-slate-200" : "text-slate-700"
            )}
            placeholder="Infinite buffer..."
          />
        </div>
        <button onClick={exportText} className="mt-2 p-2 rounded bg-indigo-600 text-white flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Prompt Generation Engine */}
      <div className={cn(
        "p-4 border-t",
        theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
      )}>
        <h2 className="text-sm font-bold mb-2">Prompt Engine</h2>
        <select 
          value={promptType} 
          onChange={(e) => setPromptType(e.target.value as any)}
          className="w-full p-2 mb-2 rounded border"
        >
          <option>Exterior</option>
          <option>Interior</option>
          <option>Product</option>
        </select>
        <button onClick={generatePrompt} className="w-full p-2 mb-2 rounded bg-indigo-600 text-white flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" /> Generate
        </button>
        <div className="text-xs mb-2 p-2 bg-slate-200 dark:bg-slate-700 rounded h-[13em] overflow-y-auto">
          {generatedPrompt || "No prompt generated"}
        </div>
        <div className="flex gap-2">
          <button onClick={translatePrompt} disabled={isTranslating} className="flex-1 p-2 rounded bg-slate-600 text-white flex items-center justify-center gap-2">
            <Languages className="w-4 h-4" /> {isTranslating ? 'Translating...' : 'Translate'}
          </button>
          <button onClick={handleInject} className="flex-1 p-2 rounded bg-emerald-600 text-white flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> Inject
          </button>
        </div>
      </div>
    </div>
  );
}
