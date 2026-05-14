import { NextResponse } from "next/server";
import { listRecentPapers, searchPapers } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");

        let papers: unknown[];
        if (query) {
            papers = await searchPapers({ query, limit: 20 });
        } else {
            papers = await listRecentPapers(20);
        }

        return NextResponse.json({
            success: true,
            data: papers,
        });
    } catch (error) {
        console.error("[API] GET /papers/recent error:", error);
        return NextResponse.json(
            { error: "Failed to fetch recent papers." },
            { status: 500 },
        );
    }
}
