import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

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

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists and get their database ID
    const user = await ensureUser(clerkId);

    const workflows = await prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { workflowRuns: true }
        }
      }
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Environment check - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists and get their database ID
    const user = await ensureUser(clerkId);

    const body = await request.json();
    const { name, description, nodes, edges, viewport } = body;

    console.log('Workflow data received:', { name, description, nodesCount: nodes?.length, edgesCount: edges?.length });

    if (!name || !nodes || !edges) {
      return NextResponse.json(
        { error: 'Missing required fields: name, nodes, edges' },
        { status: 400 }
      );
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description: description || '',
        nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone to avoid immutable issues
        edges: JSON.parse(JSON.stringify(edges)),
        viewport: viewport ? JSON.parse(JSON.stringify(viewport)) : null,
        userId: user.id, // Use database user ID, not Clerk ID
      },
    });

    console.log('Workflow created successfully:', workflow.id);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
