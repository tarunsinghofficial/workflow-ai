interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: any;
  edges: any;
  viewport: any;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    workflowRuns: number;
  };
}

interface WorkflowData {
  name: string;
  description?: string;
  nodes: any;
  edges: any;
  viewport?: any;
}

class WorkflowService {
  private baseUrl = '/api/workflows';

  async getWorkflows(): Promise<{ workflows: Workflow[] }> {
    const response = await fetch(this.baseUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }
    
    return response.json();
  }

  async getWorkflow(id: string): Promise<{ workflow: Workflow }> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch workflow');
    }
    
    return response.json();
  }

  async createWorkflow(workflowData: WorkflowData): Promise<{ workflow: Workflow }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create workflow');
    }
    
    return response.json();
  }

  async updateWorkflow(id: string, workflowData: WorkflowData): Promise<{ workflow: Workflow }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update workflow');
    }
    
    return response.json();
  }

  async deleteWorkflow(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete workflow');
    }
    
    return response.json();
  }
}

export const workflowService = new WorkflowService();
export type { Workflow, WorkflowData };
