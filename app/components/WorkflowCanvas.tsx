'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import custom node types
import { TextNode } from './nodes/TextNode';
import { UploadImageNode } from './nodes/UploadImageNode';
import { UploadVideoNode } from './nodes/UploadVideoNode';
import { LLMNode } from './nodes/LLMNode';
import { CropImageNode } from './nodes/CropImageNode';
import { ExtractFrameNode } from './nodes/ExtractFrameNode';
import { CustomControls } from './CustomControls';
import { WorkflowManager } from './WorkflowManager';
import { Workflow } from '../lib/workflowService';
import { Play, Loader2 } from 'lucide-react';
import { WorkflowProvider } from '../contexts/WorkflowContext';

// Define custom node types
const nodeTypes = {
  text: TextNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

interface WorkflowCanvasProps {
  onWorkflowChange?: (workflowId: string | null) => void;
}

export function WorkflowCanvas({ onWorkflowChange }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Use React Flow's built-in hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [viewport, setViewport] = useState(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleLoadWorkflow = (workflow: Workflow) => {
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    if (workflow.viewport) {
      setViewport(workflow.viewport);
    }
    setCurrentWorkflowId(workflow.id);
    onWorkflowChange?.(workflow.id);
  };

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setCurrentWorkflowId(null);
    onWorkflowChange?.(null);
  };

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      alert('No nodes to execute. Add some nodes first!');
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: currentWorkflowId,
          nodes,
          edges,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update nodes with results
        setNodes((nds) =>
          nds.map((node) => {
            const nodeResult = result.nodeResults?.[node.id];
            if (nodeResult) {
              return {
                ...node,
                data: {
                  ...node.data,
                  result: nodeResult.output,
                  error: nodeResult.error,
                },
              };
            }
            return node;
          })
        );
      } else {
        alert('Workflow execution failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Execution error:', error);
      alert('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
    },
    [edges, setEdges]
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false;

      // Selectors for React Flow handles
      const sSel = `[data-nodeid="${connection.source}"][data-handleid="${connection.sourceHandle}"]`;
      const tSel = `[data-nodeid="${connection.target}"][data-handleid="${connection.targetHandle}"]`;

      const sourceHandle = document.querySelector(sSel);
      const targetHandle = document.querySelector(tSel);

      const sourceType = sourceHandle?.getAttribute('data-type');
      const targetType = targetHandle?.getAttribute('data-type');

      // Debug log (optional, but helpful for the connection issue)
      // console.log('Conn:', { source: connection.sourceHandle, target: connection.targetHandle, sourceType, targetType });

      if (!sourceType || !targetType) return true; // Fallback
      return sourceType === targetType;
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        return;
      }

      const nodeLabels: Record<string, string> = {
        text: 'Text Node',
        uploadImage: 'Upload Image',
        uploadVideo: 'Upload Video',
        llm: 'Run Any LLM',
        cropImage: 'Crop Image',
        extractFrame: 'Extract Frame',
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: {
          x: event.clientX - reactFlowBounds.left - 75,
          y: event.clientY - reactFlowBounds.top - 25,
        },
        data: {
          label: nodeLabels[type] || `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  return (
    <div className="flex-1 flex flex-col relative">

      {/* Run Workflow button removed - not required per assignment */}

      <div className="flex-1 flex">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            panOnDrag={isPanning}
            selectionMode={isPanning ? SelectionMode.Partial : SelectionMode.Full}
            attributionPosition="bottom-left"
            className="bg-[#0E0E13]"
            defaultEdgeOptions={{
              style: { stroke: '#ebff84', strokeWidth: 2, opacity: 0.5 },
              type: 'smoothstep',
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#212126"
            />
            <CustomControls isPanning={isPanning} setIsPanning={setIsPanning} />
            <MiniMap
              className="!bg-[var(--bg-card)] !border-white/10 !rounded-md !shadow-xl"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'text': return '#3b82f6';
                  case 'uploadImage': return '#10b981';
                  case 'uploadVideo': return '#f59e0b';
                  case 'llm': return '#8b5cf6';
                  case 'cropImage': return '#ef4444';
                  case 'extractFrame': return '#06b6d4';
                  default: return '#6b7280';
                }
              }}
              position="bottom-right"
              maskColor="rgba(15, 23, 42, 0.8)"
            />
          </ReactFlow>
        </div>

        {/* Workflow Manager Panel */}
        <div className="w-72 bg-[var(--bg-secondary)] border-l border-white/5 flex flex-col">
          <WorkflowManager
            currentNodes={nodes}
            currentEdges={edges}
            currentViewport={viewport}
            onLoadWorkflow={handleLoadWorkflow}
            onClearCanvas={handleClearCanvas}
          />
        </div>
      </div>
    </div>
  );
}
