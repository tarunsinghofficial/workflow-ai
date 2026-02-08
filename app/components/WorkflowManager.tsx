'use client';

import React, { useState, useEffect } from 'react';
import { workflowService, Workflow, WorkflowData } from '../lib/workflowService';
import { Save, FolderOpen, Plus, Trash2, Edit3, X, Loader2, Clock } from 'lucide-react';

interface WorkflowManagerProps {
  currentNodes: any[];
  currentEdges: any[];
  currentViewport: any;
  onLoadWorkflow: (workflow: Workflow) => void;
  onClearCanvas: () => void;
}

export function WorkflowManager({
  currentNodes,
  currentEdges,
  currentViewport,
  onLoadWorkflow,
  onClearCanvas
}: WorkflowManagerProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const response = await workflowService.getWorkflows();
      setWorkflows(response.workflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!saveForm.name.trim()) return;

    try {
      setIsSaving(true);
      const workflowData: WorkflowData = {
        name: saveForm.name,
        description: saveForm.description,
        nodes: currentNodes,
        edges: currentEdges,
        viewport: currentViewport,
      };

      if (editingWorkflow) {
        await workflowService.updateWorkflow(editingWorkflow.id, workflowData);
      } else {
        await workflowService.createWorkflow(workflowData);
      }

      setShowSaveDialog(false);
      setSaveForm({ name: '', description: '' });
      setEditingWorkflow(null);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadWorkflow = async (workflow: Workflow) => {
    try {
      onLoadWorkflow(workflow);
      setShowLoadDialog(false);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await workflowService.deleteWorkflow(id);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const openSaveDialog = (workflow?: Workflow) => {
    if (workflow) {
      setEditingWorkflow(workflow);
      setSaveForm({
        name: workflow.name,
        description: workflow.description
      });
    } else {
      setEditingWorkflow(null);
      setSaveForm({ name: '', description: '' });
    }
    setShowSaveDialog(true);
  };

  return (
    <div className="bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="font-semibold text-white text-lg">Workflow Manager</h2>
        <p className="text-xs text-[#CDCDCE] mt-0.5">Save & load workflows</p>
      </div>

      {/* Save/Load Buttons */}
      <div className="p-4 border-b border-white/5 space-y-2">
        <button
          onClick={() => openSaveDialog()}
          disabled={currentNodes.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ebff84] text-black rounded-md font-semibold hover:bg-[#ebff84]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(235,255,132,0.1)]"
        >
          <Save className="w-4 h-4" />
          <span>Save Workflow</span>
        </button>
        <button
          onClick={() => setShowLoadDialog(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 text-white rounded-md font-medium hover:bg-white/10 transition-all border border-white/5"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Load Workflow</span>
        </button>
        <button
          onClick={onClearCanvas}
          disabled={currentNodes.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 rounded-md font-medium hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-rose-500/30 font-sans"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Canvas</span>
        </button>
      </div>

      {/* Recent Workflows */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Workflows</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No saved workflows</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workflows.slice(0, 5).map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => handleLoadWorkflow(workflow)}
                className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-md hover:bg-slate-700/30 hover:border-indigo-500/30 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white truncate">{workflow.name}</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkflow(workflow.id);
                    }}
                    className="p-1 rounded hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#CDCDCE]/60 font-sans">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-md p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingWorkflow ? 'Edit Workflow' : 'Save Workflow'}
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="Enter workflow name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={saveForm.description}
                  onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-md text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  rows={3}
                  placeholder="Enter workflow description..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700/50 text-white rounded-md font-medium hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkflow}
                disabled={!saveForm.name.trim() || isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingWorkflow ? 'Update' : 'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-md p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Load Workflow</h3>
              <button
                onClick={() => setShowLoadDialog(false)}
                className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-400">Loading workflows...</p>
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No saved workflows found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="bg-slate-900/50 border border-slate-700/50 rounded-md p-4 hover:bg-slate-700/30 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{workflow.name}</h4>
                          {workflow.description && (
                            <p className="text-sm text-slate-400 mt-1">{workflow.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                            {workflow._count && (
                              <span>{workflow._count.workflowRuns} runs</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleLoadWorkflow(workflow)}
                            className="px-4 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded-md hover:bg-indigo-600 transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => openSaveDialog(workflow)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
