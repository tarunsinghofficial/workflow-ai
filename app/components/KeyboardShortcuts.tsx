'use client';

import React, { useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

interface KeyboardShortcutsProps {
  children: React.ReactNode;
}

export function KeyboardShortcuts({ children }: KeyboardShortcutsProps) {
  const selectedNodeIds = useWorkflowStore((state) => state.selectedNodeIds);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Delete or Backspace to delete selected nodes
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeIds.length > 0) {
      // Prevent default browser behavior (like going back in history)
      event.preventDefault();
      
      // Delete all selected nodes
      selectedNodeIds.forEach(nodeId => {
        removeNode(nodeId);
      });
      
      // Clear selection after deletion
      clearSelection();
    }

    // Escape to clear selection
    if (event.key === 'Escape') {
      clearSelection();
    }

    // Ctrl+Z for undo (placeholder - we'll implement this later)
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      console.log('Undo functionality to be implemented');
    }

    // Ctrl+Y for redo (placeholder - we'll implement this later)
    if (event.ctrlKey && event.key === 'y') {
      event.preventDefault();
      console.log('Redo functionality to be implemented');
    }
  }, [selectedNodeIds, removeNode, clearSelection]);

  useEffect(() => {
    // Add event listener when component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return <>{children}</>;
}
