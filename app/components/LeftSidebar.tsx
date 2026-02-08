'use client';

import React, { useState } from 'react';
import {
  Search,
  History,
  Briefcase,
  Type,
  Image as ImageIcon,
  Video,
  Brain,
  Crop,
  Film,
  HelpCircle,
  MessageSquare,
  Upload,
  Download,
  Eye,
  Box,
  Sparkles
} from 'lucide-react';

interface NodeType {
  id: string;
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function LeftSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentTools');
      return saved ? JSON.parse(saved) : ['text', 'uploadImage', 'uploadVideo', 'llm', 'cropImage', 'extractFrame'];
    }
    return ['text', 'uploadImage', 'uploadVideo', 'llm', 'cropImage', 'extractFrame'];
  });

  const allNodes: NodeType[] = [
    { id: 'text', type: 'text', label: 'Prompt', icon: <Type className="w-5 h-5 text-[#CDCDCE]" />, description: 'Text input' },
    { id: 'uploadImage', type: 'uploadImage', label: 'Image', icon: <ImageIcon className="w-5 h-5 text-[#CDCDCE]" />, description: 'Image upload' },
    { id: 'uploadVideo', type: 'uploadVideo', label: 'Video', icon: <Video className="w-5 h-5 text-[#CDCDCE]" />, description: 'Video upload' },
    { id: 'llm', type: 'llm', label: 'Any LLM', icon: <Sparkles className="w-5 h-5 text-[#CDCDCE]" />, description: 'Run LLM' },
    { id: 'cropImage', type: 'cropImage', label: 'Crop', icon: <Crop className="w-5 h-5 text-[#CDCDCE]" />, description: 'Crop' },
    { id: 'extractFrame', type: 'extractFrame', label: 'Frame', icon: <Film className="w-5 h-5 text-[#CDCDCE]" />, description: 'Frame' },
  ];

  const trackTool = (id: string) => {
    const newRecent = [id, ...recentToolIds.filter(t => t !== id)].slice(0, 4);
    setRecentToolIds(newRecent);
    localStorage.setItem('recentTools', JSON.stringify(newRecent));
  };

  const quickAccessNodes = allNodes.filter(n => recentToolIds.includes(n.id));
  const toolboxNodes = allNodes;

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: string }) => (
    <div className="relative flex items-center group">
      <button
        onClick={() => {
          if (activeTab === id) {
            setIsOpen(!isOpen);
          } else {
            setActiveTab(id);
            setIsOpen(true);
          }
        }}
        className={`p-3 rounded-md transition-all duration-200 ${activeTab === id && isOpen
          ? 'bg-[#f7ffa8] hover:bg-[#FCFFDC] text-black'
          : 'text-[#CDCDCE] hover:bg-white/5 hover:text-white'
          }`}
      >
        <Icon className="w-4.5 h-4.5" />
      </button>

      {/* Tooltip */}
      <div className="absolute left-[70px] px-1 py-1 bg-[#2B2B2F] text-white text-xs font-medium rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/5 shadow-xl translate-x-1 group-hover:translate-x-0">
        {label}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden font-sans">
      {/* Level 1: Narrow Navigation Strip */}
      <div className="w-[56px] flex flex-col items-center py-6 gap-6 border-r border-white/5 bg-[var(--bg-secondary)] z-20">
        <div className="mb-2">
          <div className="w-6 h-6 flex items-center justify-center bg-white rounded-md">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black fill-current">
              <path d="M4 4h4v16H4V4zm6 0h4v16h-4V4zm6 0h4v16h-4V4z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <NavItem icon={Search} label="Search" id="search" />
          <NavItem icon={History} label="History" id="history" />
          <NavItem icon={Briefcase} label="Image Models" id="portfolio" />
          <NavItem icon={ImageIcon} label="Assets" id="assets" />
          <NavItem icon={Video} label="Video" id="video" />
          <NavItem icon={Box} label="Components" id="components" />
          <NavItem icon={Sparkles} label="Presets" id="presets" />
        </div>

      </div>

      {/* Level 2: Wide Palette */}
      <div
        className={`bg-[var(--bg-secondary)] flex flex-col border-r border-white/5 transition-all duration-300 ease-in-out z-10 overflow-hidden ${isOpen ? 'w-[240px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-10 pointer-events-none'
          }`}
      >
        <div className="p-6 border-b border-white/5">
          <h1 className="text-white text-md tracking-tight">Workflow AI</h1>
        </div>

        <div className={`p-4 pt-6 -mt-2 transition-all duration-300 ${activeTab === 'search' ? 'opacity-100' : 'opacity-0 h-0 p-0 pointer-events-none'}`}>
          <div className="flex items-center bg-transparent border border-[#CDCDCE]/10 rounded-sm px-2 py-0.5 group focus-within:border-[#CDCDCE]/50 transition-all">
            <Search className="w-4 h-4 text-white/40 mr-2 group-focus-within:text-[#CDCDCE] transition-colors" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm text-white/40 focus:outline-none w-full placeholder:text-white/40 font-normal mt-0.5"
              autoFocus={activeTab === 'search'}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 px-4 custom-scrollbar pb-10">
          {(activeTab === 'portfolio' || activeTab === 'search') && (
            <section className="mb-8">
              <h2 className="text-white text-base mb-4 tracking-tight">
                {activeTab === 'search' ? 'Search results' : 'Quick access'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(activeTab === 'search'
                  ? allNodes.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  : quickAccessNodes
                ).map((node) => (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow', node.type);
                      e.dataTransfer.effectAllowed = 'move';
                      trackTool(node.id);
                    }}
                    className="aspect-square bg-[var(--bg-card)] border border-white/15 rounded-sm flex flex-col items-center justify-center p-4 hover:bg-[var(--bg-card-hover)] cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden"
                  >
                    <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                      {node.icon}
                    </div>
                    <span className="text-[11px] text-[#CDCDCE] text-center leading-tight">
                      {node.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'portfolio' && (
            <section className="mt-2 mb-8">
              <h2 className="text-white text-base mb-1 tracking-tight">Toolbox</h2>
              <p className="text-[10px] uppercase font-bold text-[#4F5BFF] tracking-widest mb-4">Editing</p>

              <div className="grid grid-cols-2 gap-3">
                {toolboxNodes.map((node) => (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow', node.type);
                      e.dataTransfer.effectAllowed = 'move';
                      trackTool(node.id);
                    }}
                    className="aspect-square bg-[var(--bg-card)] border border-white/15 rounded-md flex flex-col items-center justify-center p-4 hover:bg-[var(--bg-card-hover)] cursor-grab transition-all group"
                  >
                    <div className="mb-3 text-[#CDCDCE] group-hover:text-white transition-colors transform group-hover:scale-110 duration-300">
                      {node.icon}
                    </div>
                    <span className="text-[11px] font-medium text-[#CDCDCE]">{node.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
