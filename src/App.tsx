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
import TechnicalSpecSidebar from './components/TechnicalSpecSidebar';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { JsonStudioSidebar } from './components/JsonStudioSidebar';
import { CenterPanel } from './components/CenterPanel';
import { Header } from './components/Header';
import { ProjectsSidebar } from './components/ProjectsSidebar';
import { HistorySidebar } from './components/HistorySidebar';
import { ApiKeyModal } from './components/ApiKeyModal';

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
  jsonPrompt: string;
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
      jsonPrompt: '',
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
  const [jsonPrompt, setJsonPrompt] = useState(activeProject.jsonPrompt || '');
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('p2j_theme') as 'light' | 'dark' | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('p2j_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const [showHistory, setShowHistory] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [showPromptsPanel, setShowPromptsPanel] = useState(false);

  const PromptsPanel = () => {
    const downloadPrompts = () => {
        const blob = new Blob([savedPrompts.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompts.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={cn(
            "w-80 border-l p-4 flex flex-col gap-4 transition-colors",
            theme === 'dark' ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}>
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Saved Prompts</h3>
                <button onClick={downloadPrompts} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
                    <Download className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                {savedPrompts.map((p, i) => (
                    <div key={i} className={cn(
                        "p-3 rounded-lg text-sm",
                        theme === 'dark' ? "bg-slate-800" : "bg-slate-100"
                    )}>
                        {p}
                    </div>
                ))}
            </div>
        </div>
    );
  };

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
        ? { ...p, mode, prompt, jsonPrompt, jsonOutput, generatedImage, history, updatedAt: Date.now() }
        : p
    ));
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 1000);
    return () => clearTimeout(timer);
  }, [mode, prompt, jsonPrompt, jsonOutput, generatedImage, history, activeProjectId]);

  const createProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substring(2, 11),
      name: `Project ${projects.length + 1}`,
      mode: 'studio',
      prompt: '',
      jsonPrompt: '',
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
        jsonPrompt: '',
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
    const activePrompt = customPrompt || jsonPrompt || prompt;
    if (!activePrompt.trim()) return;
    if (customPrompt) setJsonPrompt(customPrompt);

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
      "h-screen w-screen overflow-hidden flex flex-col transition-colors duration-300",
      theme === 'dark' ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      <Group 
        id="main-layout"
        orientation="horizontal" 
        className="flex-1"
        resizeTargetMinimumSize={{ coarse: 20, fine: 10 }}
      >
        <Panel id="left-panel" defaultSize="30" minSize="20" maxSize="45">
          <TechnicalSpecSidebar theme={theme} onInjectPrompt={(p) => setPrompt(p)} />
        </Panel>
        
        <Separator 
          id="separator-1"
          className="w-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 transition-colors cursor-col-resize flex items-center justify-center"
        >
          <div className="w-px h-8 bg-slate-400/30 dark:bg-slate-600/30 rounded-full pointer-events-none" />
        </Separator>
        
        <Panel id="center-panel" defaultSize="40" minSize="30">
          <div className="h-full flex flex-col overflow-hidden">
            <Header
              theme={theme}
              mode={mode}
              setMode={setMode}
              setShowProjects={setShowProjects}
              activeProject={activeProject}
              isSaved={isSaved}
              setShowApiKeyModal={setShowApiKeyModal}
              setShowHistory={setShowHistory}
              showPromptsPanel={showPromptsPanel}
              setShowPromptsPanel={setShowPromptsPanel}
              setTheme={setTheme}
              clearAll={clearAll}
            />
            <main className={cn(
              "flex-1 w-full overflow-y-auto custom-scrollbar",
              mode === 'gallery' ? "block p-6" : "flex flex-col p-4"
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
          <CenterPanel
            theme={theme}
            prompt={prompt}
            uploadedImages={uploadedImages}
            isImageLoading={isImageLoading}
            imageErrorMsg={imageErrorMsg}
            generatedImage={generatedImage}
            generateImage={generateImage}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
          />
        )}
      {showPromptsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cn(
            "w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4 max-h-[80vh]",
            theme === 'dark' ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
          )}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Saved Prompts</h3>
              <button onClick={() => setShowPromptsPanel(false)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {savedPrompts.map((p, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg text-sm",
                  theme === 'dark' ? "bg-slate-800" : "bg-slate-100"
                )}>
                  {p}
                </div>
              ))}
            </div>
            <button onClick={() => {
                const blob = new Blob([savedPrompts.join('\n\n')], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'prompts.txt';
                a.click();
                URL.revokeObjectURL(url);
            }} className="w-full p-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
              Download Prompts
            </button>
          </div>
        </div>
      )}
      </main>
      </div>
      </Panel>

      <Separator 
        id="separator-2"
        className="w-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 transition-colors cursor-col-resize flex items-center justify-center"
      >
        <div className="w-px h-8 bg-slate-400/30 dark:bg-slate-600/30 rounded-full pointer-events-none" />
      </Separator>
      
      <Panel id="right-panel" defaultSize="30" minSize="20" maxSize="45">
        <JsonStudioSidebar 
          theme={theme} 
          jsonOutput={jsonOutput} 
          isJsonLoading={isJsonLoading} 
          onConvert={convertToJSON} 
          hasApiKey={hasApiKey} 
        />
      </Panel>
    </Group>

      <footer className={cn(
        "border-t px-6 py-3 text-center text-xs transition-colors",
        theme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400"
      )}>
        Powered by Gemini & OpenAI • AI Studio Build
      </footer>

      <ProjectsSidebar
        showProjects={showProjects}
        setShowProjects={setShowProjects}
        theme={theme}
        projects={projects}
        activeProjectId={activeProjectId}
        switchProject={switchProject}
        renamingProjectId={renamingProjectId}
        setRenamingProjectId={setRenamingProjectId}
        tempProjectName={tempProjectName}
        setTempProjectName={setTempProjectName}
        renameProject={renameProject}
        deleteProject={deleteProject}
        createProject={createProject}
      />

      <HistorySidebar
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        theme={theme}
        history={history}
        loadFromHistory={loadFromHistory}
        deleteHistoryItem={deleteHistoryItem}
        clearHistory={clearHistory}
      />

      <ApiKeyModal
        showApiKeyModal={showApiKeyModal}
        setShowApiKeyModal={setShowApiKeyModal}
        theme={theme}
        setTheme={setTheme}
        customGeminiKey={customGeminiKey}
        setCustomGeminiKey={setCustomGeminiKey}
        customOpenAIKey={customOpenAIKey}
        setCustomOpenAIKey={setCustomOpenAIKey}
      />

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
