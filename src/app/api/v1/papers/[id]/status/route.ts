import { type NextRequest, NextResponse } from "next/server";
import { getPaperStatus } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        // Try Redis first for real-time status (fast path)
        const redisStatus = await redis.hgetall(`paper:${id}:status`);

        if (redisStatus && Object.keys(redisStatus).length > 0) {
            return NextResponse.json({
                success: true,
                data: {
                    id,
                    status: redisStatus.status as string,
                    title: (redisStatus.title as string) ?? null,
                    preview_image_url:
                        (redisStatus.preview_image_url as string) ?? null,
                    current_step: redisStatus.current_step as string,
                    updated_at: redisStatus.updated_at as string,
                    error_message:
                        (redisStatus.error_message as string) ?? null,
                },
                source: "redis",
            });
        }

        // Fall back to Supabase RPC
        const data = await getPaperStatus(id);

        return NextResponse.json({
            success: true,
            data: {
                ...data,
                current_step: data.status === "completed" ? "done" : "unknown",
            },
            source: "database",
        });
    } catch (error) {
        console.error("[API] GET /papers/[id]/status error:", error);
        const message =
            error instanceof Error ? error.message : "Paper not found";
        const status = message.includes("not found") ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
