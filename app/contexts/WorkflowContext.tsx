'use client';

import React, { createContext, useContext } from 'react';

interface WorkflowContextType {
    workflowId: string | null;
}

const WorkflowContext = createContext<WorkflowContextType>({ workflowId: null });

export function WorkflowProvider({
    children,
    workflowId
}: {
    children: React.ReactNode;
    workflowId: string | null;
}) {
    return (
        <WorkflowContext.Provider value={{ workflowId }}>
            {children}
        </WorkflowContext.Provider>
    );
}

export function useWorkflowContext() {
    return useContext(WorkflowContext);
}
