// Helper function to track node execution in workflow history
export async function trackNodeExecution(params: {
    workflowId: string;
    nodeId: string;
    nodeType: string;
    status: 'SUCCESS' | 'FAILED';
    inputs?: any;
    outputs?: any;
    error?: string;
    duration?: number;
}) {
    try {
        await fetch('/api/workflows/track-node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
    } catch (error) {
        console.error('Failed to track node execution:', error);
        // Don't throw - tracking is optional
    }
}
