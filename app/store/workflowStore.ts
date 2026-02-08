import { create } from 'zustand';
import { Node, Edge, XYPosition } from '@xyflow/react';

export interface WorkflowState {
  // Workflow data
  nodes: Node[];
  edges: Edge[];
  
  // UI state
  selectedNodeIds: string[];
  isRunning: boolean;
  runningNodeIds: string[];
  
  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  
  // Selection
  selectNode: (nodeId: string) => void;
  deselectNode: (nodeId: string) => void;
  selectNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  
  // Execution
  setNodeRunning: (nodeId: string, isRunning: boolean) => void;
  setWorkflowRunning: (isRunning: boolean) => void;
  
  // Workflow operations
  resetWorkflow: () => void;
  loadWorkflow: (nodes: Node[], edges: Edge[]) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  isRunning: false,
  runningNodeIds: [],

  // Node actions
  setNodes: (nodes) => set({ nodes }),
  
  setEdges: (edges) => set({ edges }),
  
  addNode: (node) => {
    console.log('Store: addNode called with:', node);
    set((state) => ({
      nodes: [...state.nodes, node]
    }));
  },
  
  removeNode: (nodeId) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== nodeId),
    edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId),
    runningNodeIds: state.runningNodeIds.filter(id => id !== nodeId)
  })),
  
  updateNode: (nodeId, updates) => set((state) => ({
    nodes: state.nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    )
  })),
  
  addEdge: (edge) => set((state) => ({
    edges: [...state.edges, edge]
  })),
  
  removeEdge: (edgeId) => set((state) => ({
    edges: state.edges.filter(e => e.id !== edgeId)
  })),

  // Selection actions
  selectNode: (nodeId) => set((state) => ({
    selectedNodeIds: [...state.selectedNodeIds, nodeId]
  })),
  
  deselectNode: (nodeId) => set((state) => ({
    selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId)
  })),
  
  selectNodes: (nodeIds) => set({ selectedNodeIds: nodeIds }),
  
  clearSelection: () => set({ selectedNodeIds: [] }),

  // Execution actions
  setNodeRunning: (nodeId, isRunning) => set((state) => ({
    runningNodeIds: isRunning
      ? [...state.runningNodeIds, nodeId]
      : state.runningNodeIds.filter(id => id !== nodeId),
    nodes: state.nodes.map(node =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, isRunning } }
        : node
    )
  })),
  
  setWorkflowRunning: (isRunning) => set({ isRunning }),

  // Workflow operations
  resetWorkflow: () => set({
    nodes: [],
    edges: [],
    selectedNodeIds: [],
    isRunning: false,
    runningNodeIds: []
  }),
  
  loadWorkflow: (nodes, edges) => set({
    nodes,
    edges,
    selectedNodeIds: [],
    isRunning: false,
    runningNodeIds: []
  })
}));

// Selectors for common use cases
export const useWorkflowNodes = () => useWorkflowStore((state) => state.nodes);
export const useWorkflowEdges = () => useWorkflowStore((state) => state.edges);
export const useSelectedNodes = () => {
  const nodes = useWorkflowNodes();
  const selectedNodeIds = useWorkflowStore((state) => state.selectedNodeIds);
  return nodes.filter(node => selectedNodeIds.includes(node.id));
};
export const useIsNodeRunning = (nodeId: string) => 
  useWorkflowStore((state) => state.runningNodeIds.includes(nodeId));
