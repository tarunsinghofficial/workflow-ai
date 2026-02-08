import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { tasks, runs } from "@trigger.dev/sdk";

export async function GET() {
    return NextResponse.json({ message: 'Crop API is reachable' });
}

export async function POST(request: NextRequest) {
    console.log('[Crop API] Received request');
    try {
        const { userId } = await auth();
        console.log('[Crop API] User ID:', userId);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        console.log('[Crop API] Request body:', body);
        const { imageUrl, x, y, width, height } = body;

        if (!imageUrl) {
            console.error('[Crop API] Missing imageUrl');
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        console.log('[Crop API] Triggering task "crop-image"');
        const handle = await tasks.trigger("crop-image", {
            imageUrl,
            x: Number(x) || 0,
            y: Number(y) || 0,
            width: Number(width) || 100,
            height: Number(height) || 100
        });
        console.log('[Crop API] Task triggered, handle:', handle);

        let result = await runs.retrieve(handle);
        const startTime = Date.now();
        const timeoutMs = 60000;

        const terminalStatuses = ["COMPLETED", "FAILED", "CANCELED", "TIMED_OUT", "CRASHED", "SYSTEM_FAILURE"];

        while (
            !terminalStatuses.includes(result.status as string) &&
            Date.now() - startTime < timeoutMs
        ) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await runs.retrieve(handle);
            console.log('[Crop API] Current status:', result.status);
        }

        if (result.status === "COMPLETED" && result.output) {
            const output = result.output as { success?: boolean; croppedUrl?: string; error?: string };
            if (output.success === false && output.error) {
                console.error('[Crop API] Task returned error:', output.error);
                return NextResponse.json({ success: false, error: output.error }, { status: 500 });
            }
            if (!output.croppedUrl) {
                console.error('[Crop API] No croppedUrl in output');
                return NextResponse.json({ success: false, error: 'No cropped URL returned' }, { status: 500 });
            }
            console.log('[Crop API] Task completed successfully');
            return NextResponse.json({
                success: true,
                croppedUrl: output.croppedUrl,
            });
        }

        console.error('[Crop API] Task failed or timed out:', result.status);
        return NextResponse.json({ success: false, error: `Crop failed: ${result.status}` }, { status: 500 });
    } catch (error) {
        console.error('[Crop API] Internal Error:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
