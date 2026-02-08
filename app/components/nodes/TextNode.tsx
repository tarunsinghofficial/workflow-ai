'use client';

import React, { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Type } from 'lucide-react';

interface TextNodeData extends Record<string, unknown> {
  label: string;
  text?: string;
  isRunning?: boolean;
}

export function TextNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TextNodeData;
  const { setNodes } = useReactFlow();
  const [text, setText] = useState(nodeData.text || '');

  // Sync local state to node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, text } } : node
      )
    );
  }, [text, id, setNodes]);

  return (
    <BaseNode id={id} data={{ ...nodeData, label: 'Prompt' }} selected={selected}>
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="slate"
        title="Text Input (optional)"
        data-port-type="target"
        data-type="text"
      >
        <span className="handle-label handle-label-left">Text</span>
      </Handle>

      {/* Text Input */}
      <div className="space-y-2 min-w-[240px]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your prompt goes here..."
          className="w-full p-3 text-[13px] bg-[#353539] border border-white/[0.03] rounded-lg text-slate-300 placeholder:text-[#5c5c5f] resize-none focus:outline-none focus:border-[#ebff84]/20 transition-all leading-normal"
          rows={3}
        />
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="pink"
        title="Text Output"
        data-type="text"
        data-port-type="source"
      >
        <span className="handle-label handle-label-right">Text</span>
      </Handle>
    </BaseNode>
  );
}
