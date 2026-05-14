import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { analyzePaper } from "@/lib/ai/analyze";
import { updatePaperStatus } from "@/lib/db";
import { redis } from "@/lib/redis";

export const maxDuration = 120; // Allow 2 minutes for processing

async function handler(request: NextRequest) {
    let body: {
        paperId?: string;
        paperText?: string;
        contentHash?: string;
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { paperId, paperText, contentHash } = body;

    if (!paperId || !paperText || !contentHash) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 },
        );
    }

    console.log(`[QStash] Processing paper: ${paperId}`);

    try {
        await analyzePaper({ paperId, paperText, contentHash });
        console.log(`[QStash] Successfully processed paper: ${paperId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`[QStash] Failed to process paper ${paperId}:`, error);

        // Delete cache key on failure so subsequent requests trigger a retry
        const { contentCacheKey } = await import("@/lib/content-hash");
        await redis.del(contentCacheKey(contentHash));

        // Attempt to update the DB status to failed
        try {
            await updatePaperStatus({
                paperId,
                status: "failed",
                errorMessage:
                    error instanceof Error ? error.message : "Analysis failed",
            });
        } catch (dbErr) {
            console.error(`[QStash] Failed to update paper status:`, dbErr);
        }

        // Return 500 so QStash knows to retry the job
        return NextResponse.json(
            { error: "Failed to process paper" },
            { status: 500 },
        );
    }
}

// verifySignatureAppRouter wraps our handler and validates the Upstash-Signature header
export const POST = verifySignatureAppRouter(handler);
