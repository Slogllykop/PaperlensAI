import { Client } from "@upstash/qstash";
import { type NextRequest, NextResponse } from "next/server";
import { analyzePaper } from "@/lib/ai/analyze";
import { updatePaperStatus } from "@/lib/db";
import { redis } from "@/lib/redis";

const qstash = new Client({
    baseUrl: process.env.QSTASH_URL,
    token: process.env.QSTASH_TOKEN,
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: paperId } = await params;

    try {
        // Look up current status in Redis
        const statusData = await redis.hgetall(`paper:${paperId}:status`);

        if (!statusData) {
            return NextResponse.json(
                { error: "Paper not found" },
                { status: 404 },
            );
        }

        const currentStatus = (statusData as Record<string, string>).status;

        if (currentStatus !== "failed") {
            return NextResponse.json(
                { error: "Paper is not in a failed state" },
                { status: 400 },
            );
        }

        // Retrieve stored raw text from the Redis status hash
        const paperText = (statusData as Record<string, string>).paper_text;
        const contentHash = (statusData as Record<string, string>).content_hash;

        if (!paperText || !contentHash) {
            return NextResponse.json(
                {
                    error: "Cannot retry: original content not available. Please re-submit the paper.",
                },
                { status: 400 },
            );
        }

        // Reset status to pending
        await redis.hset(`paper:${paperId}:status`, {
            status: "pending",
            current_step: "received",
            error_message: "",
            updated_at: Date.now(),
        });

        await updatePaperStatus({
            paperId,
            status: "pending",
        });

        // Queue analysis job via QStash
        const baseUrl = process.env.APP_URL || request.nextUrl.origin;
        const isLocalhost =
            baseUrl.includes("localhost") ||
            baseUrl.includes("127.0.0.1") ||
            baseUrl.includes("::1");

        if (isLocalhost) {
            console.warn(
                `[API] ⚠️  QStash BYPASSED — retrying analysis in-process for paper ${paperId}.\n` +
                    `         Set APP_URL in .env.local to use QStash.`,
            );
            analyzePaper({ paperId, paperText, contentHash }).catch(
                console.error,
            );
        } else {
            await qstash.publishJSON({
                url: `${baseUrl}/api/v1/papers/process`,
                body: { paperId, paperText, contentHash },
                retries: 2,
            });
            console.log(
                `[API] ✅ Queued retry via QStash for paper ${paperId}`,
            );
        }

        console.log(`[API] Retried analysis for paper ${paperId}`);

        return NextResponse.json({
            success: true,
            data: { paperId, status: "pending" },
        });
    } catch (error) {
        console.error(`[API] POST /papers/${paperId}/retry error:`, error);
        return NextResponse.json(
            { error: "Failed to retry analysis." },
            { status: 500 },
        );
    }
}
