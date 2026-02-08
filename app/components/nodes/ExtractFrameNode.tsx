'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Video, Loader2, Scissors, RotateCcw, Clock } from 'lucide-react';

interface ExtractFrameData extends Record<string, unknown> {
  label: string;
  timestamp?: string;
  result?: string;
  isRunning?: boolean;
}

export function ExtractFrameNode({ id, data, selected }: NodeProps) {
  const nodeData = data as ExtractFrameData;
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();

  const [timestamp, setTimestamp] = useState(nodeData.timestamp || '50%');
  const [result, setResult] = useState(nodeData.result || '');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  // Reactive video URL
  const videoUrl = useMemo(() => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === 'video_url');
    if (edge) {
      const source = nodes.find((n) => n.id === edge.source);
      return (source?.data as any)?.imageUrl || (source?.data as any)?.result || '';
    }
    return '';
  }, [edges, nodes, id]);

  // Reactive manual timestamp override
  const connectedTimestamp = useMemo(() => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === 'timestamp');
    if (edge) {
      const source = nodes.find((n) => n.id === edge.source);
      return (source?.data as any)?.text || (source?.data as any)?.result || '';
    }
    return '';
  }, [edges, nodes, id]);

  const activeTimestamp = connectedTimestamp || timestamp;

  // Sync to node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
            ...node,
            data: { ...node.data, timestamp: activeTimestamp, result, isRunning },
          }
          : node
      )
    );
  }, [activeTimestamp, result, isRunning, id, setNodes]);

  const handleRun = async () => {
    if (!videoUrl) {
      setError('No video source');
      return;
    }

    setIsRunning(true);
    setError('');

    try {
      const response = await fetch('/api/video/extract-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          timestamp: activeTimestamp,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.frameUrl);
      } else {
        throw new Error(data.error || 'Extraction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <BaseNode id={id} data={{ ...nodeData, label: 'Extract Video Frame' }} selected={selected}>
      <div className="space-y-4 min-w-[280px]">
        {/* Video Preview */}
        <div className="relative rounded-lg overflow-hidden border border-white/5 bg-[#0f0f11] aspect-[4/3] flex items-center justify-center checkerboard">
          {videoUrl ? (
            <video src={videoUrl} className="w-full h-full object-cover relative z-10" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-700">
              <Video className="w-6 h-6 opacity-30" />
            </div>
          )}
        </div>

        {/* Parameters */}
        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Frame</span>
            <div className="flex items-center bg-[#1a1a1c] border border-white/[0.03] rounded px-2 py-0.5 gap-1">
              <input
                type="text"
                value={activeTimestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="bg-transparent border-none text-[11px] text-slate-300 w-8 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Timecode</span>
            <div className="flex items-center bg-[#1a1a1c] border border-white/[0.03] rounded px-2 py-0.5 min-w-[80px]">
              <span className="text-[11px] text-slate-300">00:00:00</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRun}
            disabled={isRunning || !videoUrl}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-md text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Extracting...
              </>
            ) : (
              'Extract Frame'
            )}
          </button>
          <button
            onClick={() => { setTimestamp('0'); setResult(''); setError(''); }}
            className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-md text-[10px] uppercase font-bold tracking-widest transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest leading-none">{error}</span>
          </div>
        )}

        {result && (
          <div className="pt-2 border-t border-white/5">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">EXTRACTED FRAME</span>
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
              <img src={result} alt="Frame" className="w-full h-auto max-h-48 object-contain" />
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="video_url" className="red" style={{ top: '60px' }} data-type="video" data-port-type="target">
        <span className="handle-label handle-label-left">File*</span>
      </Handle>
      <Handle type="source" position={Position.Right} id="output" className="mint" style={{ top: '60px' }} data-type="image" data-port-type="source">
        <span className="handle-label handle-label-right">File*</span>
      </Handle>

      {/* Hidden legacy port */}
      <Handle type="target" position={Position.Left} id="timestamp" className="!invisible" style={{ top: '70px' }} data-type="number" />
    </BaseNode >
  );
}
