import React from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Plus, Edit2, Trash2 } from 'lucide-react';

interface ProjectsSidebarProps {
  showProjects: boolean;
  setShowProjects: (show: boolean) => void;
  theme: 'light' | 'dark';
  projects: any[];
  activeProjectId: string | null;
  switchProject: (id: string) => void;
  renamingProjectId: string | null;
  setRenamingProjectId: (id: string | null) => void;
  tempProjectName: string;
  setTempProjectName: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createProject: () => void;
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  showProjects,
  setShowProjects,
  theme,
  projects,
  activeProjectId,
  switchProject,
  renamingProjectId,
  setRenamingProjectId,
  tempProjectName,
  setTempProjectName,
  renameProject,
  deleteProject,
  createProject,
}) => {
  return (
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
  );
};
