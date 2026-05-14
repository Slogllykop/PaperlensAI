import { type NextRequest, NextResponse } from "next/server";
import { getPaperWithResults } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        // Try Redis cache first for completed results
        const cached = await redis.get<string>(`paper:${id}:result`);
        if (cached) {
            // Still need paper metadata from DB
            const paperData = await getPaperWithResults(id);
            return NextResponse.json({
                success: true,
                data: paperData,
                cached: true,
            });
        }

        // Fetch from Supabase via RPC
        const data = await getPaperWithResults(id);

        return NextResponse.json({
            success: true,
            data,
            cached: false,
        });
    } catch (error) {
        console.error("[API] GET /papers/[id] error:", error);
        const message =
            error instanceof Error ? error.message : "Paper not found";
        const status = message.includes("not found") ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
