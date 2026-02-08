import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { tasks, runs } from "@trigger.dev/sdk";
import type { geminiTask } from "@/bg-tasks/llm.trigger";

export async function POST(request: NextRequest) {
    console.log('[Gemini API] Received request');
    try {
        const { userId } = await auth();
        console.log('[Gemini API] User ID:', userId);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { model, systemPrompt, userMessage, images } = await request.json();
        console.log('[Gemini API] Request:', { model, systemPrompt, userMessage, imageCount: images?.length || 0 });

        if (!userMessage && (!images || images.length === 0)) {
            console.error('[Gemini API] Missing prompt or images');
            return NextResponse.json({ error: 'Prompt or image required' }, { status: 400 });
        }

        console.log('[Gemini API] Triggering task "gemini-llm"');
        const handle = await tasks.trigger<typeof geminiTask>("gemini-llm", {
            model: model || 'gemini-1.5-flash',
            systemPrompt: systemPrompt || "",
            userMessage: userMessage || "",
            images: images || []
        });
        console.log('[Gemini API] Task triggered, handle:', handle);

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
            console.log('[Gemini API] Current status:', result.status);
        }

        if (result.status === "COMPLETED" && result.output) {
            console.log('[Gemini API] Task completed successfully');
            return NextResponse.json({
                success: true,
                response: (result.output as any).response,
                model: (result.output as any).model
            });
        }

        console.error('[Gemini API] Task failed or timed out:', result.status);
        // Check if there's an error in the result
        const errorMessage = (result as any).error || result.status;
        return NextResponse.json({
            success: false,
            error: result.status === "COMPLETED" ? "No output" : `Generation failed: ${errorMessage}`
        }, { status: 500 });

    } catch (error) {
        console.error('[Gemini API] Internal Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}