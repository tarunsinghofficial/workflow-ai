'use client';

import React, { useState } from 'react';
import { X, Settings, GripVertical, Loader2, MoreHorizontal } from 'lucide-react';

interface BaseNodeData extends Record<string, unknown> {
  label: string;
  isRunning?: boolean;
  onDelete?: (nodeId: string) => void;
}

interface BaseNodeProps {
  id: string;
  data: BaseNodeData;
  children: React.ReactNode;
  deletable?: boolean;
  selected?: boolean;
  color?: string;
}

export function BaseNode({ id, data, children, deletable = true, selected = false, color = 'indigo' }: BaseNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isRunning = data.isRunning || false;

  const colorMap: Record<string, { border: string; glow: string; header: string }> = {
    blue: { border: 'border-blue-500/50', glow: 'shadow-blue-500/20', header: 'from-blue-500/20 to-blue-600/10' },
    emerald: { border: 'border-emerald-500/50', glow: 'shadow-emerald-500/20', header: 'from-emerald-500/20 to-emerald-600/10' },
    amber: { border: 'border-amber-500/50', glow: 'shadow-amber-500/20', header: 'from-amber-500/20 to-amber-600/10' },
    violet: { border: 'border-violet-500/50', glow: 'shadow-violet-500/20', header: 'from-violet-500/20 to-violet-600/10' },
    rose: { border: 'border-rose-500/50', glow: 'shadow-rose-500/20', header: 'from-rose-500/20 to-rose-600/10' },
    cyan: { border: 'border-cyan-500/50', glow: 'shadow-cyan-500/20', header: 'from-cyan-500/20 to-cyan-600/10' },
    indigo: { border: 'border-indigo-500/50', glow: 'shadow-indigo-500/20', header: 'from-indigo-500/20 to-indigo-600/10' },
  };

  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div
      className={`
        relative bg-[#212126] 
        border rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[200px] 
        transition-all duration-300 ease-in-out
        ${isRunning ? 'border-white/5 shadow-[0_0_20px_rgba(235,255,132,0.15)]' : selected ? 'border-[#212126]/30 ring-1 ring-[#212126]/10 bg-[#353539]' : 'border-white/10'}
        ${isHovered && !selected && !isRunning ? 'border-white/10' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Running State Indicator - Suburban Glow */}
      {isRunning && (
        <div className="absolute inset-0 rounded-md bg-cyan-500/5 animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2`}>
        <div className="flex items-center">
          <h3 className="text-[12px] font-medium text-slate-300 tracking-tight">{data.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="w-3 h-3 text-[#ebff84] animate-spin" />}
          <div className="flex items-center gap-0.5 opacity-40 hover:opacity-100 transition-opacity">
            <button className="p-1 rounded-md hover:bg-white/5 transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}
