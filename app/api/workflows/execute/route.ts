import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { WorkflowExecutionEngine, executeNode } from '../../../lib/executionEngine';

// Helper to ensure user exists in database (handles race: duplicate key -> findUnique)
async function ensureUser(clerkId: string) {
    let user = await prisma.user.findUnique({
        where: { clerkId },
    });

    if (!user) {
        const clerkUser = await currentUser();
        try {
            user = await prisma.user.create({
                data: {
                    clerkId,
                    email: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
                    name: clerkUser?.firstName
                        ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
                        : null,
                },
            });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
                user = await prisma.user.findUnique({ where: { clerkId } }) ?? undefined;
            }
            if (!user) throw err;
        }
    }

    return user;
}

export async function POST(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await ensureUser(clerkId);

        const body = await request.json();
        const { workflowId, nodes, edges } = body;

        if (!nodes || !Array.isArray(nodes)) {
            return NextResponse.json(
                { error: 'Nodes array required' },
                { status: 400 }
            );
        }

        // Initialize execution engine
        const engine = new WorkflowExecutionEngine(nodes, edges || []);

        // Check for cycles
        if (engine.hasCycle()) {
            return NextResponse.json(
                { error: 'Workflow contains cycles. Please fix the connections.' },
                { status: 400 }
            );
        }

        const startTime = Date.now();
        const nodeResults: Record<string, { output: any; error?: string; duration: number }> = {};

        // Get parallel execution groups
        const groups = engine.getParallelExecutionGroups();

        // Execute nodes in parallel groups
        for (const group of groups) {
            // Execute all nodes in this group in parallel
            const promises = group.map(async (nodeId) => {
                const node = nodes.find((n: any) => n.id === nodeId);
                if (!node) return;

                const nodeStartTime = Date.now();
                const inputs = engine.getNodeInputs(nodeId);

                const result = await executeNode(node, inputs);
                const duration = Date.now() - nodeStartTime;

                // Store output for downstream nodes
                if (result.output !== undefined) {
                    engine.setNodeOutput(nodeId, result.output);
                }

                nodeResults[nodeId] = {
                    output: result.output,
                    error: result.error,
                    duration,
                };
            });

            await Promise.all(promises);
        }

        const totalDuration = Date.now() - startTime;

        // Create workflow run record if workflowId provided
        if (workflowId) {
            try {
                const workflowRun = await prisma.workflowRun.create({
                    data: {
                        workflowId,
                        userId: user.id,
                        status: 'SUCCESS',
                        scope: 'FULL',
                        duration: totalDuration,
                        completedAt: new Date(),
                        nodeExecutions: {
                            create: Object.entries(nodeResults).map(([nodeId, result]) => ({
                                id: crypto.randomUUID(),
                                nodeId,
                                nodeType: nodes.find((n: any) => n.id === nodeId)?.type || 'unknown',
                                status: result.error ? 'FAILED' : 'SUCCESS' as any,
                                outputs: result.output ? (result.output as any) : null,
                                error: result.error,
                                duration: result.duration,
                                completedAt: new Date(),
                            })),
                        },
                    },
                });
            } catch (dbError) {
                console.error('Failed to save workflow run:', dbError);
                // Continue with response even if DB save fails
            }
        }

        return NextResponse.json({
            success: true,
            nodeResults,
            totalDuration,
        });
    } catch (error) {
        console.error('Workflow execution error:', error);
        return NextResponse.json(
            { error: 'Failed to execute workflow', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
