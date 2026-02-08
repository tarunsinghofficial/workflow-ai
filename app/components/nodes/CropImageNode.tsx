import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Crop, Loader2, CheckCircle, XCircle, Scissors, X, RotateCcw, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';

interface CropImageData extends Record<string, unknown> {
  label: string;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  result?: string;
  isRunning?: boolean;
  error?: string;
}

export function CropImageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CropImageData;
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();

  const [xPercent, setXPercent] = useState(nodeData.xPercent?.toString() || '0');
  const [yPercent, setYPercent] = useState(nodeData.yPercent?.toString() || '0');
  const [widthPercent, setWidthPercent] = useState(nodeData.widthPercent?.toString() || '100');
  const [heightPercent, setHeightPercent] = useState(nodeData.heightPercent?.toString() || '100');
  const [result, setResult] = useState(nodeData.result || '');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  // Reactive source image URL
  const sourceImageUrl = useMemo(() => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === 'image_url');
    if (edge) {
      const source = nodes.find((n) => n.id === edge.source);
      return (source?.data as any)?.imageUrl || (source?.data as any)?.result || '';
    }
    return '';
  }, [edges, nodes, id]);

  // Sync to node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
            ...node,
            data: {
              ...node.data,
              xPercent: parseFloat(xPercent),
              yPercent: parseFloat(yPercent),
              widthPercent: parseFloat(widthPercent),
              heightPercent: parseFloat(heightPercent),
              result,
            },
          }
          : node
      )
    );
  }, [xPercent, yPercent, widthPercent, heightPercent, result, id, setNodes]);

  const handleRun = async () => {
    if (!sourceImageUrl) {
      setError('No source image');
      return;
    }

    setIsRunning(true);
    setError('');

    try {
      const response = await fetch('/api/image/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: sourceImageUrl,
          x: parseFloat(xPercent),
          y: parseFloat(yPercent),
          width: parseFloat(widthPercent),
          height: parseFloat(heightPercent),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server Error (${response.status}): ${text.slice(0, 100)}...`);
      }

      const data = await response.json();
      if (data.success) {
        const croppedUrl = data.croppedUrl;
        setResult(croppedUrl);

        console.log("croppedUrl:", croppedUrl)
        // Immediately update node data so downstream nodes can access it
        setNodes((nds) =>
          nds.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, result: croppedUrl, imageUrl: croppedUrl } }
              : node
          )
        );
      } else {
        throw new Error(data.error || 'Crop failed');
      }
    } catch (err) {
      console.error('Crop Error:', err);
      setError(err instanceof Error ? err.message : 'Crop failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <BaseNode id={id} data={{ ...nodeData, label: 'Crop' }} selected={selected}>
      <div className="space-y-3 min-w-[280px]">
        {/* Source/Preview Area */}
        <div className="relative rounded-lg overflow-hidden border border-white/5 bg-[#0f0f11] aspect-[4/3] flex items-center justify-center checkerboard">
          {sourceImageUrl ? (
            <div className="relative w-96 h-96 z-10">
              <img src={sourceImageUrl} alt="Source" className="w-full h-full object-cover" />
              {/* Grid Overlay */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-20 pointer-events-none">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="border-[0.5px] border-white/30" />
                ))}
              </div>
              {/* Crop Rect */}
              <div
                className="absolute border border-white/40 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300"
                style={{
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                }}
              >
                <div className="absolute top-0 left-0 w-1 h-1 bg-white" />
                <div className="absolute top-0 right-0 w-1 h-1 bg-white" />
                <div className="absolute bottom-0 left-0 w-1 h-1 bg-white" />
                <div className="absolute bottom-0 right-0 w-1 h-1 bg-white" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-700">
              <Scissors className="w-6 h-6 opacity-30" />
            </div>
          )}
        </div>

        {/* Parameters */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Aspect ratio</span>
            <div className="flex items-center bg-[#1a1a1c] border border-white/[0.03] rounded px-2 py-1 gap-2 min-w-[120px]">
              <span className="text-[11px] text-slate-300 flex-1">Custom</span>
              <div className="w-0 h-3 border-r border-white/5" />
              <MoreHorizontal className="w-3 h-3 text-slate-500" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Dimensions</span>
            <div className="flex items-center gap-1.5 font-sans">
              <div className="flex items-center bg-[#1a1a1c] border border-white/[0.03] rounded px-1.5 py-0.5 gap-1">
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">W</span>
                <input
                  type="text"
                  value={widthPercent}
                  onChange={(e) => setWidthPercent(e.target.value)}
                  className="bg-transparent border-none text-[11px] text-slate-300 w-8 focus:outline-none"
                />
              </div>
              <div className="flex items-center bg-[#1a1a1c] border border-white/[0.03] rounded px-1.5 py-0.5 gap-1">
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">H</span>
                <input
                  type="text"
                  value={heightPercent}
                  onChange={(e) => setHeightPercent(e.target.value)}
                  className="bg-transparent border-none text-[11px] text-slate-300 w-8 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRun}
            disabled={isRunning || !sourceImageUrl}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-md text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Crop'
            )}
          </button>
          <button
            onClick={() => {
              setXPercent('0');
              setYPercent('0');
              setWidthPercent('100');
              setHeightPercent('100');
              setResult('');
              setError('');
            }}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md text-[10px] uppercase font-bold tracking-widest transition-all"
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
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">RESULT</span>
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
              <Image src={result} alt="Cropped" className="w-full h-auto max-h-48 object-contain" width={100} height={100} />
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} id="image_url" className="slate" style={{ top: '35px' }} data-type="image" data-port-type="target">
        <span className="handle-label handle-label-left">File*</span>
      </Handle>
      <Handle type="target" position={Position.Left} id="x_percent" className="white" style={{ top: '60px' }} data-type="number" data-port-type="target">
        <span className="handle-label handle-label-left">Number</span>
      </Handle>
      <Handle type="source" position={Position.Right} id="output" className="white" style={{ top: '35px' }} data-type="image" data-port-type="source">
        <span className="handle-label handle-label-right">File*</span>
      </Handle>

      {/* Hidden legacy ports for compatibility with existing executions */}
      <Handle type="target" position={Position.Left} id="y_percent" className="!invisible" style={{ top: '50%' }} data-type="number" />
      <Handle type="target" position={Position.Left} id="width_percent" className="!invisible" style={{ top: '60%' }} data-type="number" />
      <Handle type="target" position={Position.Left} id="height_percent" className="!invisible" style={{ top: '70%' }} data-type="number" />
    </BaseNode>
  );
}
