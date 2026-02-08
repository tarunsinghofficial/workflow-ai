import { Node, Edge } from '@xyflow/react';
import { tasks, runs } from "@trigger.dev/sdk";
import type { geminiTask } from "@/bg-tasks/llm.trigger";
import type { cropTask } from "@/bg-tasks/crop.trigger";
import type { extractFrameTask } from "@/bg-tasks/extractFrame.trigger";

interface ExecutionResult {
    nodeId: string;
    success: boolean;
    output?: any;
    error?: string;
    duration: number;
}

interface NodeOutput {
    [nodeId: string]: any;
}

/**
 * Workflow Execution Engine
 * Handles DAG validation, topological sorting, and parallel execution
 */
export class WorkflowExecutionEngine {
    private nodes: Node[];
    private edges: Edge[];
    private outputs: NodeOutput = {};
    private results: Map<string, ExecutionResult> = new Map();

    constructor(nodes: Node[], edges: Edge[]) {
        this.nodes = nodes;
        this.edges = edges;
    }

    /**
     * Check if the workflow has cycles (invalid DAG)
     */
    hasCycle(): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const dfs = (nodeId: string): boolean => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const outgoingEdges = this.edges.filter((e) => e.source === nodeId);
            for (const edge of outgoingEdges) {
                if (!visited.has(edge.target)) {
                    if (dfs(edge.target)) return true;
                } else if (recursionStack.has(edge.target)) {
                    return true;
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        for (const node of this.nodes) {
            if (!visited.has(node.id)) {
                if (dfs(node.id)) return true;
            }
        }

        return false;
    }

    /**
     * Get topological order of nodes for execution
     */
    getTopologicalOrder(): string[] {
        const inDegree: Map<string, number> = new Map();
        const adjacencyList: Map<string, string[]> = new Map();

        // Initialize
        for (const node of this.nodes) {
            inDegree.set(node.id, 0);
            adjacencyList.set(node.id, []);
        }

        // Build adjacency list and in-degree count
        for (const edge of this.edges) {
            adjacencyList.get(edge.source)?.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }

        // Find all nodes with no incoming edges
        const queue: string[] = [];
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }

        const order: string[] = [];
        while (queue.length > 0) {
            const current = queue.shift()!;
            order.push(current);

            for (const neighbor of adjacencyList.get(current) || []) {
                const newDegree = (inDegree.get(neighbor) || 1) - 1;
                inDegree.set(neighbor, newDegree);
                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            }
        }

        return order;
    }

    /**
     * Get nodes that can be executed in parallel (same level in DAG)
     */
    getParallelExecutionGroups(): string[][] {
        const inDegree: Map<string, number> = new Map();
        const adjacencyList: Map<string, string[]> = new Map();

        // Initialize
        for (const node of this.nodes) {
            inDegree.set(node.id, 0);
            adjacencyList.set(node.id, []);
        }

        // Build adjacency list and in-degree count
        for (const edge of this.edges) {
            adjacencyList.get(edge.source)?.push(edge.target);
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        }

        const groups: string[][] = [];
        const remaining = new Set(this.nodes.map((n) => n.id));

        while (remaining.size > 0) {
            // Find all nodes with in-degree 0 (can run in parallel)
            const group: string[] = [];
            for (const nodeId of remaining) {
                if (inDegree.get(nodeId) === 0) {
                    group.push(nodeId);
                }
            }

            if (group.length === 0) {
                // Cycle detected or error
                break;
            }

            groups.push(group);

            // Remove nodes from remaining and update in-degrees
            for (const nodeId of group) {
                remaining.delete(nodeId);
                for (const neighbor of adjacencyList.get(nodeId) || []) {
                    inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
                }
            }
        }

        return groups;
    }

    /**
     * Get inputs for a node from connected source nodes
     */
    getNodeInputs(nodeId: string): Record<string, any> {
        const inputs: Record<string, any> = {};

        const incomingEdges = this.edges.filter((e) => e.target === nodeId);

        for (const edge of incomingEdges) {
            const sourceOutput = this.outputs[edge.source];
            const handleId = edge.targetHandle || 'input';

            if (sourceOutput !== undefined) {
                // Map source output to target input handle
                if (handleId === 'images') {
                    // Collect multiple images
                    if (!inputs.images) inputs.images = [];
                    inputs.images.push(sourceOutput);
                } else {
                    inputs[handleId] = sourceOutput;
                }
            }
        }

        return inputs;
    }

    /**
     * Set output for a node
     */
    setNodeOutput(nodeId: string, output: any): void {
        this.outputs[nodeId] = output;
    }

    /**
     * Get all node outputs
     */
    getOutputs(): NodeOutput {
        return this.outputs;
    }

    /**
     * Get execution results
     */
    getResults(): Map<string, ExecutionResult> {
        return this.results;
    }

    /**
     * Add execution result
     */
    addResult(result: ExecutionResult): void {
        this.results.set(result.nodeId, result);
    }
}

/**
 * Execute a single node
 */
export async function executeNode(
    node: Node,
    inputs: Record<string, any>
): Promise<{ output: any; error?: string }> {
    const startTime = Date.now();

    try {
        switch (node.type) {
            case 'text':
                // Text node just passes through its text content
                return { output: (node.data as any).text || '' };

            case 'uploadImage':
                // Return the uploaded image URL
                return { output: (node.data as any).imageUrl || '' };

            case 'uploadVideo':
                // Return the uploaded video URL
                return { output: (node.data as any).videoUrl || '' };

            case 'llm': {
                const { system_prompt, user_message, images } = inputs;
                const model = (node.data as any).model || 'gemini-1.5-flash';

                const handle = await tasks.trigger<typeof geminiTask>("gemini-llm", {
                    model,
                    systemPrompt: system_prompt || (node.data as any).systemPrompt || '',
                    userMessage: user_message || (node.data as any).userMessage || '',
                    images: images || []
                });

                const result = await runs.poll(handle, { pollIntervalMs: 1000 });
                if (result.status === "COMPLETED" && result.output) {
                    return { output: result.output.response };
                }
                return { output: null, error: `LLM generation failed: ${result.status}` };
            }

            case 'cropImage': {
                const imageUrl = inputs.image_url || (node.data as any).imageUrl || '';
                if (!imageUrl) return { output: null, error: 'No image URL' };

                const handle = await tasks.trigger<typeof cropTask>("crop-image", {
                    imageUrl,
                    x: Number(inputs.x_percent ?? (node.data as any).xPercent ?? 0),
                    y: Number(inputs.y_percent ?? (node.data as any).yPercent ?? 0),
                    width: Number(inputs.width_percent ?? (node.data as any).widthPercent ?? 100),
                    height: Number(inputs.height_percent ?? (node.data as any).heightPercent ?? 100)
                });

                const result = await runs.poll(handle, { pollIntervalMs: 1000 });
                if (result.status === "COMPLETED" && result.output) {
                    return { output: result.output.croppedUrl };
                }
                return { output: null, error: `Crop failed: ${result.status}` };
            }

            case 'extractFrame': {
                const videoUrl = inputs.video_url || (node.data as any).videoUrl || '';
                if (!videoUrl) return { output: null, error: 'No video URL' };

                const handle = await tasks.trigger<typeof extractFrameTask>("extract-frame", {
                    videoUrl,
                    timestamp: Number(inputs.timestamp ?? (node.data as any).timestamp ?? 0)
                });

                const result = await runs.poll(handle, { pollIntervalMs: 1000 });
                if (result.status === "COMPLETED" && result.output) {
                    return { output: result.output.frameUrl };
                }
                return { output: null, error: `Frame extraction failed: ${result.status}` };
            }

            default:
                return { output: null, error: `Unknown node type: ${node.type}` };
        }
    } catch (error) {
        return {
            output: null,
            error: error instanceof Error ? error.message : 'Execution failed',
        };
    }
}
