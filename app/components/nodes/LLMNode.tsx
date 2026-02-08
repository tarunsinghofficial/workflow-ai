import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Brain, Loader2, Sparkles } from 'lucide-react';

interface LLMNodeData extends Record<string, unknown> {
  label: string;
  model?: string;
  userMessage?: string;
  result?: string;
  isRunning?: boolean;
}

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Ultra-fast, next-gen' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable next-gen' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Superior flash performance' },
  { id: 'gemini-flash-latest', name: 'Gemini 1.5 Flash (Legacy)', description: 'Classic fast model' },
];

export function LLMNode({ id, data, selected }: NodeProps) {
  const nodeData = data as LLMNodeData;
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();

  const [model, setModel] = useState(nodeData.model || MODELS[0].id);
  const [systemPrompt, setSystemPrompt] = useState(nodeData.systemPrompt || '');
  const [userMessage, setUserMessage] = useState(nodeData.userMessage || '');
  const [result, setResult] = useState(nodeData.result || '');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  // Reactive connection checks
  const connectedInputs = useMemo(() => {
    const inputs: { systemPrompt?: string; userMessage?: string; images: string[] } = { images: [] };

    edges.forEach((edge) => {
      if (edge.target === id) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          const sourceData = sourceNode.data as any;
          if (edge.targetHandle === 'system_prompt') {
            inputs.systemPrompt = sourceData.text || sourceData.result || '';
          } else if (edge.targetHandle === 'user_message') {
            inputs.userMessage = sourceData.text || sourceData.result || '';
          } else if (edge.targetHandle === 'images_1' || edge.targetHandle === 'images_2' || edge.targetHandle === 'images') {
            const imageUrl = sourceData.imageUrl || sourceData.result;
            if (imageUrl) {
              const isGif = typeof imageUrl === 'string' && (imageUrl.includes('image/gif') || imageUrl.toLowerCase().endsWith('.gif'));
              if (!isGif) inputs.images.push(imageUrl);
            }
          }
        }
      }
    });
    return inputs;
  }, [edges, nodes, id]);

  const activeSystem = connectedInputs.systemPrompt ?? systemPrompt;
  const activeUser = connectedInputs.userMessage ?? userMessage;

  // Sync to node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, model, systemPrompt: activeSystem, userMessage: activeUser, result, isRunning } } : node
      )
    );
  }, [model, activeSystem, activeUser, result, isRunning, id, setNodes]);

  const handleRun = async () => {
    setIsRunning(true);
    setError('');

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          systemPrompt: activeSystem,
          userMessage: activeUser,
          images: connectedInputs.images
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.response);
      } else {
        setError(data.error || 'Failed');
      }
    } catch (err) {
      setError('Error occurred during generation');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <BaseNode id={id} data={{ ...nodeData, label: 'Any LLM' }} selected={selected}>
      <div className="space-y-4 min-w-[320px]">
        {/* Output/Input Area */}
        <div className="bg-[#1a1a1c] rounded-xl border border-white/[0.03] p-4 min-h-[200px] relative">
          {result ? (
            <p className="text-slate-300 text-[13px] leading-relaxed whitespace-pre-wrap">{result}</p>
          ) : (
            <div className="text-slate-600 text-[13px] leading-relaxed">
              {activeUser || 'The generated text will appear here'}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors">
            <span className="text-lg leading-none">+</span>
            Add another image input
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning || !activeUser.trim()}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1c] hover:bg-[#252528] border border-white/5 rounded-lg text-[11px] font-medium text-slate-300 transition-all hover:border-white/10"
          >
            {isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#ebff84]" />
            ) : (
              <span className="text-slate-500 group-hover:text-slate-300 mr-0.5">→</span>
            )}
            Run Model
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="user_message" className="pink" style={{ top: '60px' }} data-port-type="target" data-type="text">
        <span className="handle-label handle-label-left">Prompt*</span>
      </Handle>
      <Handle type="target" position={Position.Left} id="system_prompt" className="pink" style={{ top: '85px' }} data-port-type="target" data-type="text">
        <span className="handle-label handle-label-left">System Prompt</span>
      </Handle>
      <Handle type="target" position={Position.Left} id="images_1" className="mint" style={{ top: '110px' }} data-port-type="target" data-type="image">
        <span className="handle-label handle-label-left">Image 1</span>
      </Handle>
      <Handle type="target" position={Position.Left} id="images_2" className="mint" style={{ top: '135px' }} data-port-type="target" data-type="image">
        <span className="handle-label handle-label-left">Image 2</span>
      </Handle>

      <Handle type="source" position={Position.Right} id="output" className="pink" style={{ top: '60px' }} data-port-type="source" data-type="text">
        <span className="handle-label handle-label-right">Text</span>
      </Handle>
    </BaseNode>
  );
}
