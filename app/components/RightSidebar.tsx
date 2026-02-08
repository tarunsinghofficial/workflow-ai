'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Play, History, Loader2, RefreshCw } from 'lucide-react';

interface NodeExecution {
  id: string;
  nodeId: string;
  nodeType: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  inputs: any;
  outputs: any;
  error: string | null;
  duration: number | null;
  startedAt: string;
  completedAt: string | null;
}

interface WorkflowRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  scope: 'FULL' | 'PARTIAL' | 'SINGLE';
  duration: number | null;
  startedAt: string;
  completedAt: string | null;
  workflow: {
    id: string;
    name: string;
  };
  nodeExecutions: NodeExecution[];
}

interface RightSidebarProps {
  workflowId?: string | null;
}

export function RightSidebar({ workflowId }: RightSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkflowRuns = async () => {
    setIsLoading(true);
    try {
      const url = workflowId
        ? `/api/workflows/runs?workflowId=${workflowId}`
        : '/api/workflows/runs';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWorkflowRuns(data.runs || []);
      }
    } catch (error) {
      console.error('Failed to fetch workflow runs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowRuns();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchWorkflowRuns, 5000);
    return () => clearInterval(interval);
  }, [workflowId]);

  const getStatusIcon = (status: WorkflowRun['status'] | 'PARTIAL') => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'PARTIAL':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: WorkflowRun['status'] | 'PARTIAL') => {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'FAILED': return 'text-rose-400';
      case 'RUNNING': return 'text-indigo-400';
      case 'PENDING': return 'text-slate-400';
      case 'PARTIAL': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const formatDuration = (duration: number | null) => {
    if (duration === null || duration === 0) return 'Running...';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScopeBadge = (scope: WorkflowRun['scope']) => {
    const styles = {
      FULL: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      PARTIAL: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      SINGLE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    };

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[scope]}`}>
        {scope}
      </span>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-80'} bg-[var(--bg-secondary)] border-l border-white/5 flex flex-col transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {!isCollapsed && (
          <div className="flex items-center gap-2 flex-1 ml-2">
            <History className="w-4 h-4 text-[#ebff84]" />
            <div>
              <h2 className="font-semibold text-white text-sm">Workflow History</h2>
              <p className="text-xs text-[#CDCDCE]">Recent executions</p>
            </div>
            <button
              onClick={fetchWorkflowRuns}
              className="ml-auto p-1.5 rounded-md hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Workflow Runs List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && workflowRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Loading history...</p>
            </div>
          ) : workflowRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <History className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 text-center">No workflow runs yet</p>
              <p className="text-xs text-slate-500 text-center mt-1">Run a workflow to see history here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflowRuns.map((run) => (
                <div
                  key={run.id}
                  onClick={() => setSelectedRun(selectedRun === run.id ? null : run.id)}
                  className="bg-[var(--bg-card)] border border-white/5 rounded-md p-4 hover:bg-[var(--bg-card-hover)] hover:border-[#ebff84]/20 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <h3 className="text-sm font-medium text-white truncate max-w-[140px]">
                        {run.workflow?.name || 'Unnamed Workflow'}
                      </h3>
                    </div>
                    {getScopeBadge(run.scope)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{formatTimestamp(run.startedAt)}</span>
                    <span className={getStatusColor(run.status)}>{formatDuration(run.duration)}</span>
                  </div>

                  {/* Expanded Details */}
                  {selectedRun === run.id && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Status:</span>
                        <span className={`font-medium ${getStatusColor(run.status)}`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Duration:</span>
                        <span className="text-slate-300 font-medium">{formatDuration(run.duration)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Scope:</span>
                        <span className="text-slate-300 font-medium">{run.scope}</span>
                      </div>

                      {/* Node-level execution details */}
                      {run.nodeExecutions && run.nodeExecutions.length > 0 && (
                        <div className="mt-3 p-3 bg-[var(--bg-primary)] rounded-md border border-white/5">
                          <p className="text-xs font-medium text-slate-400 mb-2">Node Executions:</p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {run.nodeExecutions.map((exec) => (
                              <div key={exec.id} className="flex items-center gap-2 text-xs">
                                {getStatusIcon(exec.status)}
                                <span className="text-slate-300 flex-1 truncate">
                                  {exec.nodeType} ({exec.nodeId.slice(0, 8)}...)
                                </span>
                                <span className="text-slate-500">
                                  {formatDuration(exec.duration)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed State - Icon Only */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-4">
          <div className="w-10 h-10 bg-[#ebff84]/10 rounded-md flex items-center justify-center">
            <History className="w-5 h-5 text-[#ebff84]" />
          </div>
          {workflowRuns.length > 0 && (
            <span className="mt-2 text-xs text-slate-400">{workflowRuns.length}</span>
          )}
        </div>
      )}
    </div>
  );
}
