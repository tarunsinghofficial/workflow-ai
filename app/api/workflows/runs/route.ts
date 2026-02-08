import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Helper to get user by Clerk ID
async function getUser(clerkId: string) {
    return await prisma.user.findUnique({
        where: { clerkId },
    });
}

export async function GET(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUser(clerkId);
        if (!user) {
            // User hasn't been created yet - return empty runs
            return NextResponse.json({ runs: [] });
        }

        const { searchParams } = new URL(request.url);
        const workflowId = searchParams.get('workflowId');

        const whereClause: any = { userId: user.id };
        if (workflowId) {
            whereClause.workflowId = workflowId;
        }

        const runs = await prisma.workflowRun.findMany({
            where: whereClause,
            orderBy: { startedAt: 'desc' },
            take: 20,
            include: {
                workflow: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                nodeExecutions: {
                    orderBy: { startedAt: 'asc' },
                },
            },
        });

        return NextResponse.json({ runs });
    } catch (error) {
        console.error('Error fetching workflow runs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch workflow runs' },
            { status: 500 }
        );
    }
}
