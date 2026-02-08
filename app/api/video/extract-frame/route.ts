import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { tasks, runs } from "@trigger.dev/sdk";
import type { extractFrameTask } from "@/bg-tasks/extractFrame.trigger";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { videoUrl, timestamp } = await request.json();

        if (!videoUrl) return NextResponse.json({ error: 'Video URL required' }, { status: 400 });

        const handle = await tasks.trigger<typeof extractFrameTask>("extract-frame", {
            videoUrl,
            timestamp: timestamp || 0
        });

        let result = await runs.retrieve(handle);
        const startTime = Date.now();
        const timeoutMs = 60000;

        const terminalStatuses = ["COMPLETED", "FAILED", "CANCELED", "TIMED_OUT", "CRASHED", "SYSTEM_FAILURE"];

        while (
            !terminalStatuses.includes(result.status as any) &&
            Date.now() - startTime < timeoutMs
        ) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await runs.retrieve(handle);
        }

        if (result.status === "COMPLETED" && result.output) {
            return NextResponse.json({
                success: true,
                frameUrl: (result.output as any).frameUrl,
            });
        }

        return NextResponse.json({ success: false, error: `Extraction failed: ${result.status}` }, { status: 500 });
    } catch (error) {
        console.error('Video frame extraction error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
