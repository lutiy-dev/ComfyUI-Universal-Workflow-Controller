import React, { useState, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  Copy, 
  Download, 
  Trash2, 
  FileJson, 
  Code, 
  AlertCircle, 
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Save,
  Image as ImageIcon,
  ExternalLink,
  Key,
  Upload,
  Settings2,
  Search,
  Layers,
  X,
  Info,
  History,
  Clock,
  FolderPlus,
  Folder,
  MoreVertical,
  Edit2,
  Plus,
  LayoutGrid,
  Zap,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from 'openai';
import { cn } from './lib/utils';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const highlightJson = (json: string) => {
  if (!json) return "";
  
  // Basic regex-based syntax highlighting
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-amber-400'; // numbers & booleans
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-indigo-400 font-semibold'; // keys
        } else {
          cls = 'text-emerald-400'; // strings
        }
      } else if (/null/.test(match)) {
        cls = 'text-rose-400'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    });
};

interface HistoryItem {
  id: string;
  type: 'json' | 'image';
  prompt: string;
  output: string; // JSON string or base64 image
  timestamp: number;
  model?: string;
}

interface Project {
  id: string;
  name: string;
  mode: 'studio' | 'gallery';
  prompt: string;
  jsonOutput: string;
  generatedImage: string | null;
  history: HistoryItem[];
  updatedAt: number;
}

export default function App() {
  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('p2j_projects');
    if (saved) return JSON.parse(saved);
    
    // Default initial project
    return [{
      id: 'default',
      name: 'New Project',
      mode: 'studio',
      prompt: '',
      jsonOutput: '',
      generatedImage: null,
      history: [],
      updatedAt: Date.now()
    }];
  });
  const [activeProjectId, setActiveProjectId] = useState(() => 
    localStorage.getItem('p2j_active_project_id') || 'default'
  );
  const [showProjects, setShowProjects] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [tempProjectName, setTempProjectName] = useState('');

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const [mode, setMode] = useState<'studio' | 'gallery'>('studio');
  const [prompt, setPrompt] = useState(activeProject.prompt);
  const [jsonOutput, setJsonOutput] = useState(activeProject.jsonOutput);
  const [generatedImage, setGeneratedImage] = useState<string | null>(activeProject.generatedImage);
  const [history, setHistory] = useState<HistoryItem[]>(activeProject.history);
  
  const [isJsonLoading, setIsJsonLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonErrorMsg, setJsonErrorMsg] = useState<string | null>(null);
  const [imageErrorMsg, setImageErrorMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isValidJson, setIsValidJson] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem('p2j_theme') as 'light' | 'dark') || 'light'
  );

  const [showHistory, setShowHistory] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // API Keys State
  const [customGeminiKey, setCustomGeminiKey] = useState(() => 
    localStorage.getItem('p2j_custom_gemini_key') || ''
  );
  const [customOpenAIKey, setCustomOpenAIKey] = useState(() => 
    localStorage.getItem('p2j_custom_openai_key') || ''
  );

  // Advanced Image Generation State
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-image-preview');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [imageSize, setImageSize] = useState<string>('1K');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  const [useImageSearch, setUseImageSearch] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // DALL-E 3 Specific State
  const [dalleQuality, setDalleQuality] = useState<'standard' | 'hd'>('standard');
  const [dalleStyle, setDalleStyle] = useState<'vivid' | 'natural'>('vivid');
  const [dalleSize, setDalleSize] = useState<string>('1024x1024');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API key on mount
  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const openKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const examples = [
    "List of 5 fruits with their color and calories",
    "A user profile for a developer with skills and experience",
    "Weekly weather forecast for London",
    "Product catalog with 3 items, including price and stock"
  ];

  // Sync scroll between textarea and highlighted pre
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Persist Projects
  React.useEffect(() => {
    localStorage.setItem('p2j_projects', JSON.stringify(projects));
  }, [projects]);

  React.useEffect(() => {
    localStorage.setItem('p2j_active_project_id', activeProjectId);
  }, [activeProjectId]);

  // Update active project data when local state changes
  React.useEffect(() => {
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId 
        ? { ...p, mode, prompt, jsonOutput, generatedImage, history, updatedAt: Date.now() }
        : p
    ));
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 1000);
    return () => clearTimeout(timer);
  }, [mode, prompt, jsonOutput, generatedImage, history, activeProjectId]);

  const createProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substring(2, 11),
      name: `Project ${projects.length + 1}`,
      mode: 'studio',
      prompt: '',
      jsonOutput: '',
      generatedImage: null,
      history: [],
      updatedAt: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
    switchProject(newProject.id);
  };

  const switchProject = (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    
    setActiveProjectId(id);
    setMode(target.mode);
    setPrompt(target.prompt);
    setJsonOutput(target.jsonOutput);
    setGeneratedImage(target.generatedImage);
    setHistory(target.history);
    setShowProjects(false);
  };

  const deleteProject = (id: string) => {
    if (projects.length === 1) {
      // Don't delete the last project, just clear it
      setProjects([{
        id: 'default',
        name: 'New Project',
        mode: 'studio',
        prompt: '',
        jsonOutput: '',
        generatedImage: null,
        history: [],
        updatedAt: Date.now()
      }]);
      switchProject('default');
      return;
    }

    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      switchProject(newProjects[0].id);
    }
  };

  const renameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  React.useEffect(() => {
    localStorage.setItem('p2j_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  React.useEffect(() => {
    localStorage.setItem('p2j_custom_gemini_key', customGeminiKey);
  }, [customGeminiKey]);

  React.useEffect(() => {
    localStorage.setItem('p2j_custom_openai_key', customOpenAIKey);
  }, [customOpenAIKey]);

  const addToHistory = (type: 'json' | 'image', prompt: string, output: string, model?: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      prompt,
      output,
      timestamp: Date.now(),
      model
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50 items
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setMode('studio');
    setPrompt(item.prompt);
    if (item.type === 'json') {
      setJsonOutput(item.output);
      setGeneratedImage(null);
      setIsValidJson(true);
      setJsonError(null);
    } else {
      setGeneratedImage(item.output);
      setJsonOutput('');
    }
    setShowHistory(false);
  };

  const validateAndSetJson = (value: string) => {
    setJsonOutput(value);
    if (value.trim() === '') {
      setIsValidJson(true);
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(value);
      setIsValidJson(true);
      setJsonError(null);
    } catch (e: any) {
      setIsValidJson(false);
      setJsonError(e.message);
    }
  };

  const beautifyJson = () => {
    try {
      const parsed = JSON.parse(jsonOutput);
      setJsonOutput(JSON.stringify(parsed, null, 2));
      setIsValidJson(true);
      setJsonErrorMsg(null);
    } catch (e) {
      setJsonErrorMsg("Cannot beautify: Invalid JSON structure");
      setTimeout(() => setJsonErrorMsg(null), 3000);
    }
  };

  const convertToJSON = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;
    if (customPrompt) setPrompt(customPrompt);

    setIsJsonLoading(true);
    setJsonErrorMsg(null);

    try {
      const convertAi = new GoogleGenAI({ apiKey: customGeminiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "" });
      const response = await convertAi.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Convert the following prompt into a clean, valid JSON object. 
        If the prompt describes a list, return an array of objects. 
        If it describes a single entity, return an object.
        Ensure all keys are camelCase.
        Prompt: "${activePrompt}"`,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = response.text;
      if (result) {
        // Try to format it nicely
        try {
          const parsed = JSON.parse(result);
          const formatted = JSON.stringify(parsed, null, 2);
          setJsonOutput(formatted);
          setIsValidJson(true);
          addToHistory('json', activePrompt, formatted, "gemini-3-flash-preview");
        } catch (e) {
          setJsonOutput(result);
          setIsValidJson(false);
          addToHistory('json', activePrompt, result, "gemini-3-flash-preview");
        }
      }
    } catch (err: any) {
      console.error(err);
      setJsonErrorMsg(err.message || 'Failed to convert prompt to JSON. Please try again.');
    } finally {
      setIsJsonLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const [mime, data] = base64.split(';base64,');
        setUploadedImages(prev => [...prev, { data, mimeType: mime.split(':')[1] }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateImage = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) return;
    
    if (selectedModel.startsWith('gemini') && !hasApiKey && !customGeminiKey) {
      await openKeySelector();
    }

    if (selectedModel === 'dall-e-3' && !customOpenAIKey && !import.meta.env.VITE_OPENAI_API_KEY) {
      setShowApiKeyModal(true);
      setImageErrorMsg("OpenAI API Key is required for DALL-E 3. Please set it in the settings.");
      return;
    }

    setIsImageLoading(true);
    setImageErrorMsg(null);
    setGeneratedImage(null);

    try {
      if (selectedModel === 'dall-e-3') {
        const apiKey = customOpenAIKey || import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OpenAI API key is missing. Please provide it in the API Keys settings.");
        }

        const openai = new OpenAI({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true
        });

        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: dalleSize as any,
          quality: dalleQuality,
          style: dalleStyle,
        });

        const imageUrl = response.data[0].url;
        if (imageUrl) {
          setGeneratedImage(imageUrl);
          addToHistory('image', prompt, imageUrl, 'dall-e-3');
        } else {
          throw new Error("No image URL returned from OpenAI.");
        }
      } else {
        // Create a fresh instance to ensure it uses the latest selected key
        const imageAi = new GoogleGenAI({ apiKey: customGeminiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "" });
        
        const contents: any = {
          parts: [
            { text: prompt || "Generate an image based on the provided context." },
            ...uploadedImages.map(img => ({
              inlineData: {
                data: img.data,
                mimeType: img.mimeType
              }
            }))
          ]
        };

        const config: any = {
          imageConfig: {
            aspectRatio,
            imageSize: (selectedModel === 'gemini-2.5-flash-image') ? undefined : imageSize
          }
        };

        if (useGoogleSearch || useImageSearch) {
          config.tools = [{
            googleSearch: {
              searchTypes: {
                webSearch: {},
                ...(useImageSearch && selectedModel === 'gemini-3.1-flash-image-preview' ? { imageSearch: {} } : {})
              }
            }
          }];
        }

        const response = await imageAi.models.generateContent({
          model: selectedModel,
          contents,
          config,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64EncodeString}`;
            setGeneratedImage(imageUrl);
            addToHistory('image', prompt, imageUrl, selectedModel);
            break;
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'Failed to generate image. Please try again.';
      
      if (errorMessage.includes("Requested entity was not found")) {
        setHasApiKey(false);
        errorMessage = "API Key error. Please re-select your key.";
      } else if (errorMessage.includes("Billing hard limit")) {
        errorMessage = "OpenAI Billing hard limit reached. Please check your billing settings and credits at platform.openai.com.";
      } else if (errorMessage.includes("insufficient_quota")) {
        errorMessage = "OpenAI quota exceeded. Please check your plan and usage limits.";
      } else if (errorMessage.includes("API key not valid")) {
        errorMessage = "Invalid API key. Please check your API configuration in the settings.";
      }
      
      setImageErrorMsg(errorMessage);
    } finally {
      setIsImageLoading(false);
    }
  };

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(jsonOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [jsonOutput]);

  const downloadJSON = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setPrompt('');
    setJsonOutput('');
    setGeneratedImage(null);
    setJsonErrorMsg(null);
    setImageErrorMsg(null);
    setUploadedImages([]);
    setError(null);
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      theme === 'dark' ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className={cn(
        "border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors",
        theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowProjects(true)}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-lg transition-all",
                theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
              )}
            >
              <div className="bg-indigo-600 p-2 rounded-lg">
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
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                mode === 'studio' 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Zap className="w-4 h-4" />
              Studio
            </button>
            <button
              onClick={() => setMode('gallery')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                mode === 'gallery' 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Gallery
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
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

      <main className={cn(
        "flex-1 p-6 max-w-7xl mx-auto w-full",
        mode === 'gallery' ? "block" : "grid grid-cols-1 lg:grid-cols-2 gap-6"
      )}>
        {mode === 'gallery' ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Image Gallery</h2>
                <p className="text-slate-500 text-sm">All images generated in this project</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                  {history.filter(item => item.type === 'image').length} Images
                </span>
              </div>
            </div>

            {history.filter(item => item.type === 'image').length === 0 ? (
              <div className={cn(
                "flex flex-col items-center justify-center py-32 rounded-3xl border-2 border-dashed",
                theme === 'dark' ? "border-slate-800 bg-slate-900/20" : "border-slate-200 bg-slate-50"
              )}>
                <ImageIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium">No images generated yet</p>
                <button 
                  onClick={() => setMode('studio')}
                  className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
                >
                  Go to Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {history.filter(item => item.type === 'image').map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "group relative aspect-square rounded-2xl overflow-hidden border shadow-sm transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer",
                      theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                    )}
                    onClick={() => {
                      setGeneratedImage(item.output);
                      setPrompt(item.prompt);
                      setMode('studio');
                    }}
                  >
                    <img 
                      src={item.output} 
                      alt={item.prompt} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                      <p className="text-white text-xs font-medium line-clamp-2 mb-2">
                        {item.prompt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/60">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const a = document.createElement('a');
                              a.href = item.output;
                              a.download = `generated-${item.id}.png`;
                              a.click();
                            }}
                            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(item.id);
                            }}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-200 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Left Column: Input */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  Your Prompt
                </h2>
                <div className="flex flex-wrap gap-2">
                  {examples.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(ex)}
                      className={cn(
                        "text-xs px-3 py-1.5 border rounded-full transition-all",
                        theme === 'dark' 
                          ? "bg-slate-900 border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                      )}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex flex-col gap-4">
                <div className="relative flex flex-col">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to generate or convert..."
                    className={cn(
                      "w-full h-[250px] p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none shadow-sm transition-all text-lg leading-relaxed",
                      theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                        theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                      title="Upload Image Context"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadedImages.length > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {uploadedImages.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                        showSettings 
                          ? "bg-indigo-600 text-white" 
                          : (theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                      )}
                      title="Image Settings"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {uploadedImages.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                    >
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={`data:${img.mimeType};base64,${img.data}`} 
                            alt="Context" 
                            className="w-16 h-16 object-cover rounded-md border border-slate-300 dark:border-slate-700"
                          />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={cn(
                        "p-4 rounded-xl border shadow-xl flex flex-col gap-4",
                        theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Model</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className={cn(
                            "w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500",
                            theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                          )}
                        >
                          <optgroup label="Gemini Models">
                            <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image</option>
                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image</option>
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                          </optgroup>
                          <optgroup label="ChatGPT Models">
                            <option value="dall-e-3">DALL-E 3 (ChatGPT Render)</option>
                          </optgroup>
                        </select>
                      </div>

                      {selectedModel === 'dall-e-3' ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Quality
                            </label>
                            <select
                              value={dalleQuality}
                              onChange={(e) => setDalleQuality(e.target.value as any)}
                              className={cn(
                                "w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500",
                                theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                              )}
                            >
                              <option value="standard">Standard</option>
                              <option value="hd">HD (High Definition)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Palette className="w-3 h-3" /> Style
                            </label>
                            <select
                              value={dalleStyle}
                              onChange={(e) => setDalleStyle(e.target.value as any)}
                              className={cn(
                                "w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500",
                                theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                              )}
                            >
                              <option value="vivid">Vivid (Hyper-realistic)</option>
                              <option value="natural">Natural (Softer)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5 col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Resolution
                            </label>
                            <select
                              value={dalleSize}
                              onChange={(e) => setDalleSize(e.target.value)}
                              className={cn(
                                "w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500",
                                theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                              )}
                            >
                              <option value="1024x1024">1024x1024 (Square)</option>
                              <option value="1024x1792">1024x1792 (Vertical)</option>
                              <option value="1792x1024">1792x1024 (Landscape)</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aspect Ratio</label>
                              <select
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className={cn(
                                  "w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500",
                                  theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                                )}
                              >
                                <option value="1:1">1:1 (Square)</option>
                                <option value="4:3">4:3 (Landscape)</option>
                                <option value="3:4">3:4 (Portrait)</option>
                                <option value="16:9">16:9 (Widescreen)</option>
                                <option value="9:16">9:16 (Vertical)</option>
                                {selectedModel === 'gemini-3.1-flash-image-preview' && (
                                  <>
                                    <option value="1:4">1:4 (Tall)</option>
                                    <option value="4:1">4:1 (Wide)</option>
                                  </>
                                )}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Image Size</label>
                              <select
                                value={imageSize}
                                onChange={(e) => setImageSize(e.target.value)}
                                disabled={selectedModel === 'gemini-2.5-flash-image'}
                                className={cn(
                                  "w-full p-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50",
                                  theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                                )}
                              >
                                {selectedModel === 'gemini-3.1-flash-image-preview' && <option value="512px">512px</option>}
                                <option value="1K">1K (Standard)</option>
                                <option value="2K">2K (High)</option>
                                <option value="4K">4K (Ultra)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="googleSearch"
                                checked={useGoogleSearch}
                                onChange={(e) => setUseGoogleSearch(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <label htmlFor="googleSearch" className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Search className="w-3 h-3" /> Google Search
                              </label>
                            </div>
                            {selectedModel === 'gemini-3.1-flash-image-preview' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="imageSearch"
                                  checked={useImageSearch}
                                  onChange={(e) => setUseImageSearch(e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="imageSearch" className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" /> Image Search
                                </label>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={cn(
                "p-4 rounded-xl border flex flex-col gap-3",
                theme === 'dark' ? "bg-slate-900/50 border-slate-800" : "bg-indigo-50 border-indigo-100"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    <Key className="w-4 h-4" />
                    API Key Status
                  </div>
                  <a 
                    href={selectedModel === 'dall-e-3' ? "https://platform.openai.com/api-keys" : "https://ai.google.dev/gemini-api/docs/billing"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                  >
                    {selectedModel === 'dall-e-3' ? 'OpenAI Keys' : 'Billing Info'} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Gemini API</span>
                    {customGeminiKey || hasApiKey ? (
                      <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Not Set
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">OpenAI API</span>
                    {customOpenAIKey ? (
                      <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Not Set
                      </span>
                    )}
                  </div>
                </div>
                {!customGeminiKey && !hasApiKey && selectedModel.startsWith('gemini') && (
                  <button
                    onClick={openKeySelector}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors mt-2"
                  >
                    Select Google Key
                  </button>
                )}
              </div>
            </div>

        {/* Right Column: Output blocks */}
        <div className="flex flex-col gap-6">
              {/* JSON Block */}
              <div className={cn(
                "flex flex-col gap-3 p-4 rounded-2xl border shadow-sm transition-all",
                theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                      <FileJson className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">JSON Studio</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {jsonOutput && (
                      <>
                        <button
                          onClick={beautifyJson}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Beautify"
                        >
                          <Sparkles className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={copyToClipboard}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Copy"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => convertToJSON()}
                      disabled={isJsonLoading || !prompt.trim()}
                      className={cn(
                        "ml-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                        isJsonLoading || !prompt.trim()
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                      )}
                    >
                      {isJsonLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
                      {isJsonLoading ? 'CONVERTING...' : 'CONVERT JSON'}
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "relative h-[250px] rounded-xl border overflow-hidden",
                  theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-200"
                )}>
                  {jsonErrorMsg ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                      <p className="text-xs text-red-400">{jsonErrorMsg}</p>
                    </div>
                  ) : !jsonOutput && !isJsonLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                      <Code className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">JSON Output</p>
                    </div>
                  ) : (
                    <div className="relative h-full overflow-hidden">
                      <pre
                        ref={preRef}
                        className="absolute inset-0 p-4 font-mono text-xs leading-relaxed overflow-auto whitespace-pre-wrap break-words custom-scrollbar"
                        dangerouslySetInnerHTML={{ __html: highlightJson(jsonOutput) }}
                      />
                      <textarea
                        value={jsonOutput}
                        onChange={(e) => validateAndSetJson(e.target.value)}
                        onScroll={handleScroll}
                        spellCheck={false}
                        className="absolute inset-0 w-full h-full p-4 bg-transparent font-mono text-xs leading-relaxed outline-none resize-none custom-scrollbar text-transparent caret-white selection:bg-indigo-500/30"
                      />
                    </div>
                  )}
                  {isJsonLoading && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Image Block */}
              <div className={cn(
                "flex flex-col gap-3 p-4 rounded-2xl border shadow-sm transition-all",
                theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                      <ImageIcon className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Image Studio</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {generatedImage && (
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = generatedImage;
                          a.download = 'generated-image.png';
                          a.click();
                        }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    <button
                      onClick={() => generateImage()}
                      disabled={isImageLoading || (!prompt.trim() && uploadedImages.length === 0)}
                      className={cn(
                        "ml-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                        isImageLoading || (!prompt.trim() && uploadedImages.length === 0)
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                      )}
                    >
                      {isImageLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {isImageLoading ? 'GENERATING...' : 'GENERATE IMAGE'}
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "relative h-[350px] rounded-xl border overflow-hidden flex items-center justify-center",
                  theme === 'dark' ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                  {!hasApiKey && !customGeminiKey && selectedModel.startsWith('gemini') ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
                      <div className="p-3 bg-indigo-500/10 rounded-full">
                        <Key className="w-8 h-8 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">API Key Required</h4>
                        <p className="text-xs text-slate-500 max-w-[250px]">
                          Select a paid Google Cloud API key to use <span className="font-semibold">{selectedModel}</span>.
                        </p>
                      </div>
                      <button
                        onClick={openKeySelector}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        Select Google Key
                      </button>
                      <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors"
                      >
                        Learn about billing
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  ) : imageErrorMsg ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                      <p className="text-xs text-red-400 max-w-[200px]">{imageErrorMsg}</p>
                    </div>
                  ) : !generatedImage && !isImageLoading ? (
                    <div className="flex flex-col items-center text-slate-400">
                      <Palette className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">Image Output</p>
                    </div>
                  ) : generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="max-w-full max-h-full object-contain shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  {isImageLoading && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-[10px] text-indigo-400 font-bold animate-pulse">RENDERING...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className={cn(
        "border-t px-6 py-3 text-center text-xs transition-colors",
        theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400"
      )}>
        Powered by Gemini & OpenAI • AI Studio Build
      </footer>

      {/* Projects Sidebar */}
      <AnimatePresence>
        {showProjects && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProjects(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 left-0 bottom-0 w-full max-w-xs z-50 shadow-2xl flex flex-col",
                theme === 'dark' ? "bg-slate-900 border-r border-slate-800" : "bg-white border-r border-slate-200"
              )}
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-semibold">Projects</h2>
                </div>
                <button
                  onClick={() => setShowProjects(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <button
                  onClick={createProject}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer",
                      activeProjectId === project.id 
                        ? (theme === 'dark' ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600")
                        : (theme === 'dark' ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")
                    )}
                    onClick={() => switchProject(project.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Folder className={cn(
                        "w-4 h-4 flex-shrink-0",
                        activeProjectId === project.id ? "text-indigo-500" : "text-slate-400"
                      )} />
                      <div className="flex flex-col overflow-hidden">
                        {renamingProjectId === project.id ? (
                          <input
                            autoFocus
                            value={tempProjectName}
                            onChange={(e) => setTempProjectName(e.target.value)}
                            onBlur={() => {
                              if (tempProjectName.trim()) renameProject(project.id, tempProjectName);
                              setRenamingProjectId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (tempProjectName.trim()) renameProject(project.id, tempProjectName);
                                setRenamingProjectId(null);
                              }
                              if (e.key === 'Escape') setRenamingProjectId(null);
                            }}
                            className="text-sm font-medium bg-white dark:bg-slate-700 border border-indigo-500 rounded px-1 outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <span className="text-sm font-medium truncate">{project.name}</span>
                            <span className="text-[10px] opacity-50">
                              {project.history.length} items • {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingProjectId(project.id);
                          setTempProjectName(project.name);
                        }}
                        className="p-1 hover:text-indigo-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(project.id);
                        }}
                        className="p-1 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Sidebar */}
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

      {/* API Key Modal */}
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
                    <Key className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">API Configuration</h3>
                    <p className="text-xs text-slate-500">Manage your custom API keys</p>
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
}
