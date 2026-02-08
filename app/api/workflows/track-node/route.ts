import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Helper to get user by Clerk ID
async function getUser(clerkId: string) {
    return await prisma.user.findUnique({
        where: { clerkId },
    });
}

export async function POST(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUser(clerkId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { workflowId, nodeId, nodeType, status, inputs, outputs, error, duration } = body;

        if (!workflowId || !nodeId || !nodeType) {
            return NextResponse.json(
                { error: 'Missing required fields: workflowId, nodeId, nodeType' },
                { status: 400 }
            );
        }

        // Create a workflow run for this single node execution
        const workflowRun = await prisma.workflowRun.create({
            data: {
                workflowId,
                userId: user.id,
                status: status || 'SUCCESS',
                scope: 'SINGLE',
                duration: duration || null,
                completedAt: new Date(),
                nodeExecutions: {
                    create: {
                        nodeId,
                        nodeType,
                        status: status || 'SUCCESS',
                        inputs: inputs || null,
                        outputs: outputs || null,
                        error: error || null,
                        duration: duration || null,
                        completedAt: new Date(),
                    },
                },
            },
            include: {
                nodeExecutions: true,
            },
        });

        return NextResponse.json({ success: true, run: workflowRun });
    } catch (error) {
        console.error('[Track Node Execution] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to track node execution' },
            { status: 500 }
        );
    }
}
