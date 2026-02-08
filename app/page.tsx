'use client';

import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { LeftSidebar } from './components/LeftSidebar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { RightSidebar } from './components/RightSidebar';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';

export default function Home() {
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  
  return (
    <KeyboardShortcuts>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <ReactFlowProvider>
          {/* Left Sidebar - Collapsible Node Palette */}
          <LeftSidebar />
          
          {/* Central Workflow Canvas with integrated workflow management */}
          <WorkflowCanvas onWorkflowChange={setCurrentWorkflowId} />
          
          {/* Right Sidebar - Workflow History Panel */}
          <RightSidebar workflowId={currentWorkflowId} />
        </ReactFlowProvider>
      </div>
    </KeyboardShortcuts>
  );
}