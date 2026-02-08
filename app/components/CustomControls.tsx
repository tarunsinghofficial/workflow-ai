'use client';

import React, { useState } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import { MousePointer2, Hand, Undo2, Redo2, ChevronDown } from 'lucide-react';

interface CustomControlsProps {
    isPanning: boolean;
    setIsPanning: (panning: boolean) => void;
}

export function CustomControls({ isPanning, setIsPanning }: CustomControlsProps) {
    const { zoomIn, zoomOut, setViewport } = useReactFlow();
    const [zoomLevel, setZoomLevel] = useState(61);
    const [showZoomMenu, setShowZoomMenu] = useState(false);

    const handleZoomSelect = (percent: number) => {
        const zoom = percent / 100;
        setViewport({ x: 0, y: 0, zoom }, { duration: 400 });
        setZoomLevel(percent);
        setShowZoomMenu(false);
    };

    return (
        <Panel position="bottom-center" className="mb-6 rounded-md">
            <div className="flex items-center gap-1 p-1.5 glass-controls">
                {/* Selection / Pan Toggle */}
                <div className="flex items-center gap-1 px-1">
                    <button
                        onClick={() => setIsPanning(false)}
                        className={`p-2 rounded-md transition-all ${!isPanning ? 'bg-[#f7ffa8] hover:bg-[#FCFFDC] text-black' : 'text-white hover:text-slate-200'}`}
                    >
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsPanning(true)}
                        className={`p-2 rounded-md transition-all ${isPanning ? 'bg-[#f7ffa8] hover:bg-[#FCFFDC] text-black' : 'text-white hover:text-slate-200'}`}
                    >
                        <Hand className="w-4 h-4" />
                    </button>
                </div>

                <div className="w-[0.5px] h-6 bg-white/20 mx-1" />

                {/* Undo / Redo */}
                <div className="flex items-center    px-1">
                    <button className="p-2 text-white hover:text-slate-200 transition-colors">
                        <Undo2 className="w-6 h-6" />
                    </button>
                    <button className="p-2 text-white hover:text-slate-200 transition-colors opacity-30 cursor-not-allowed">
                        <Redo2 className="w-6 h-6" />
                    </button>
                </div>

                <div className="w-[0.5px] h-6 bg-white/20 mx-1" />

                {/* Zoom Controls */}
                <div className="relative px-1">
                    <button
                        onClick={() => setShowZoomMenu(!showZoomMenu)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-white hover:text-slate-200 hover:bg-white/5 transition-all text-[13px] font-medium"
                    >
                        {zoomLevel}%
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showZoomMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showZoomMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a1c] border border-white/5 rounded-md shadow-2xl p-1 z-50 overflow-hidden">
                            {[
                                { label: 'Zoom in', shortcut: 'Ctrl +', action: () => zoomIn() },
                                { label: 'Zoom out', shortcut: 'Ctrl -', action: () => zoomOut() },
                                { label: 'Zoom to 100%', shortcut: 'Ctrl 0', action: () => handleZoomSelect(100) },
                                { label: 'Zoom to fit', shortcut: 'Ctrl 1', action: () => { } },
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { item.action(); setShowZoomMenu(false); }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-white hover:text-slate-200 hover:bg-white/5 rounded-md transition-colors group"
                                >
                                    <span>{item.label}</span>
                                    <span className="text-[10px] text-slate-600 font-mono">{item.shortcut}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
}
