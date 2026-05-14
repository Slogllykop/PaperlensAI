import { Client } from "@upstash/qstash";
import { type NextRequest, NextResponse } from "next/server";
import { analyzePaper } from "@/lib/ai/analyze";
import {
    CONTENT_CACHE_TTL,
    contentCacheKey,
    generateContentHash,
    generateTitleHash,
} from "@/lib/content-hash";
import { createPaper, updatePaperStatus } from "@/lib/db";
import { generatePreviewFromUrl } from "@/lib/pdf-preview";
import { analysisRateLimit } from "@/lib/ratelimit";
import { redis } from "@/lib/redis";
import type { InputType } from "@/lib/types";

// QStash client
const qstash = new Client({
    baseUrl: process.env.QSTASH_URL,
    token: process.env.QSTASH_TOKEN,
});

export const maxDuration = 120;

export async function POST(request: NextRequest) {
    try {
        // Rate limiting by IP
        const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const { success, remaining } = await analysisRateLimit.limit(ip);

        if (!success) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                {
                    status: 429,
                    headers: { "X-RateLimit-Remaining": String(remaining) },
                },
            );
        }

        const body = await request.json();
        let { inputType, text, url, title, previewImageUrl } = body as {
            inputType: InputType;
            text?: string;
            url?: string;
            title?: string;
            previewImageUrl?: string;
        };

        // Validate input
        if (!inputType || !["text", "pdf", "url"].includes(inputType)) {
            return NextResponse.json(
                {
                    error: "Invalid input type. Must be 'text', 'pdf', or 'url'.",
                },
                { status: 400 },
            );
        }

        let rawText = text ?? "";
        let sourceUrl = url ?? null;

        // Handle URL input: fetch paper content
        if (inputType === "url") {
            if (!url) {
                return NextResponse.json(
                    { error: "URL is required for url input type." },
                    { status: 400 },
                );
            }
            sourceUrl = url;

            try {
                // Fetch abstract/content from URL
                const response = await fetch(url, {
                    headers: {
                        "User-Agent":
                            "PaperLensAI/1.0 (Research Paper Analyzer; mailto:contact@paperlens.ai)",
                    },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL: ${response.status}`);
                }
                const html = await response.text();
                // Extract text content (strip HTML tags)
                rawText = html
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 15000);
            } catch {
                return NextResponse.json(
                    {
                        error: "Failed to fetch content from the provided URL. Please paste the text directly.",
                    },
                    { status: 400 },
                );
            }

            // Generate preview image from the PDF URL (non-blocking — don't fail if this fails)
            if (!previewImageUrl) {
                try {
                    const generatedPreview = await generatePreviewFromUrl(url);
                    if (generatedPreview) {
                        previewImageUrl = generatedPreview;
                    }
                } catch (previewErr) {
                    console.warn(
                        "[API] Preview generation failed (non-critical):",
                        previewErr,
                    );
                }
            }
        }

        // For text/pdf input, text content is required
        if ((inputType === "text" || inputType === "pdf") && !rawText?.trim()) {
            return NextResponse.json(
                { error: "Paper text content is required." },
                { status: 400 },
            );
        }

        // ─── Content Deduplication ───────────────────────────────
        // Generate a fingerprint from the paper text or title. If we've already
        // analysed this exact content, return the cached paperId
        // immediately — no new DB record, no Groq API call.
        const contentHash = title
            ? generateTitleHash(title)
            : generateContentHash(rawText);
        const cacheKey = contentCacheKey(contentHash);
        const cachedPaperId = await redis.get<string>(cacheKey);

        if (cachedPaperId) {
            // Verify the cached paper actually has completed results
            const cachedStatus = await redis.hgetall(
                `paper:${cachedPaperId}:status`,
            );

            if (
                cachedStatus &&
                (cachedStatus as Record<string, string>).status === "completed"
            ) {
                console.log(
                    `[API] Cache hit for content hash ${contentHash.slice(0, 12)}… → paper ${cachedPaperId}`,
                );
                return NextResponse.json({
                    success: true,
                    data: {
                        paperId: cachedPaperId,
                        status: "completed",
                        cached: true,
                    },
                });
            }

            // If cached paper exists but is still processing, let client poll it
            if (
                cachedStatus &&
                (cachedStatus as Record<string, string>).status === "processing"
            ) {
                console.log(
                    `[API] In-flight hit for content hash ${contentHash.slice(0, 12)}… → paper ${cachedPaperId}`,
                );
                return NextResponse.json({
                    success: true,
                    data: {
                        paperId: cachedPaperId,
                        status: "processing",
                        cached: true,
                    },
                });
            }

            // Status is failed or missing — fall through and re-analyse
        }
        // ─────────────────────────────────────────────────────────

        // Create paper record via RPC
        const paper = await createPaper({
            title: title || undefined,
            inputType,
            sourceUrl: sourceUrl ?? undefined,
            rawText,
            previewImageUrl: previewImageUrl ?? undefined,
        });

        // Set initial status in Redis for fast polling
        await redis.hset(`paper:${paper.id}:status`, {
            status: "pending",
            title: title || "Untitled Paper",
            preview_image_url: previewImageUrl || null,
            current_step: "received",
            updated_at: Date.now(),
            paper_text: rawText,
            content_hash: contentHash,
        });

        // Store the content hash → paperId mapping immediately so that
        // concurrent duplicate requests also get deduplicated while
        // this analysis is still in-flight.
        await redis.set(cacheKey, paper.id, { ex: CONTENT_CACHE_TTL });

        // Queue analysis job via QStash
        try {
            const baseUrl = process.env.APP_URL || request.nextUrl.origin;

            // QStash cannot reach localhost. If no external APP_URL is provided in dev,
            // fallback to executing the analysis directly in the background.
            const isLocalhost =
                baseUrl.includes("localhost") ||
                baseUrl.includes("127.0.0.1") ||
                baseUrl.includes("::1");

            if (isLocalhost) {
                console.warn(
                    `[API] ⚠️  QStash BYPASSED — running analysis in-process for paper ${paper.id}.\n` +
                        `         To use QStash, set APP_URL in .env.local to your deployed URL (e.g. https://paperlens.vercel.app).\n` +
                        `         QStash cannot deliver webhooks to localhost.`,
                );
                // Run without awaiting so the response returns immediately
                analyzePaper({
                    paperId: paper.id,
                    paperText: rawText,
                    contentHash,
                }).catch(console.error);
            } else {
                await qstash.publishJSON({
                    url: `${baseUrl}/api/v1/papers/process`,
                    body: {
                        paperId: paper.id,
                        paperText: rawText,
                        contentHash,
                    },
                    retries: 2,
                });
                console.log(
                    `[API] ✅ Queued analysis via QStash for paper ${paper.id} → ${baseUrl}/api/v1/papers/process`,
                );
            }
        } catch (queueErr) {
            console.error("[API] Failed to queue analysis:", queueErr);
            // Revert cache so we can retry later
            await redis.del(cacheKey);
            await updatePaperStatus({
                paperId: paper.id,
                status: "failed",
                errorMessage: "Failed to queue analysis. Please try again.",
            });
            return NextResponse.json(
                { error: "Failed to queue analysis." },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                paperId: paper.id,
                status: paper.status,
                cached: false,
            },
        });
    } catch (error) {
        console.error("[API] POST /papers/analyze error:", error);
        return NextResponse.json(
            { error: "An error occurred while processing your request." },
            { status: 500 },
        );
    }
}
