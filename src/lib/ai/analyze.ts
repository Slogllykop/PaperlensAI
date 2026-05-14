import { ANALYSIS_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { CONTENT_CACHE_TTL, contentCacheKey } from "@/lib/content-hash";
import { saveAnalysisResult, updatePaperStatus } from "@/lib/db";
import { AI_MODEL, groq } from "@/lib/groq";
import { redis } from "@/lib/redis";
import type { AIAnalysisResponse } from "@/lib/types";

// ============================================================
// Core analysis orchestrator
// Calls Groq, parses response, saves to Supabase via RPC
// ============================================================

interface AnalyzeParams {
    paperId: string;
    paperText: string;
    /** SHA-256 fingerprint of normalised paper text for cache mapping */
    contentHash?: string;
}

const PROCESSING_STEPS = [
    "reading_content",
    "finding_ideas",
    "explaining_math",
    "creating_mindmap",
    "preparing_summary",
];

async function publishStep(paperId: string, step: string) {
    await redis.hset(`paper:${paperId}:status`, {
        current_step: step,
        updated_at: Date.now(),
    });
}

export async function analyzePaper({
    paperId,
    paperText,
    contentHash,
}: AnalyzeParams) {
    const startTime = Date.now();

    try {
        // Mark as processing
        await updatePaperStatus({ paperId, status: "processing" });
        await redis.hset(`paper:${paperId}:status`, {
            status: "processing",
            current_step: "reading_content",
            updated_at: Date.now(),
        });

        // Simulate step progression for better UX
        for (const step of PROCESSING_STEPS) {
            await publishStep(paperId, step);

            if (step === "reading_content") {
                // Actually call AI here
                const completion = await groq.chat.completions.create({
                    model: AI_MODEL,
                    messages: [
                        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
                        { role: "user", content: buildUserPrompt(paperText) },
                    ],
                    temperature: 0.3,
                    max_tokens: 4096,
                    response_format: { type: "json_object" },
                });

                const rawContent = completion.choices[0]?.message?.content;
                if (!rawContent) {
                    throw new Error("AI returned empty response");
                }

                // Parse the AI response
                let analysis: AIAnalysisResponse;
                try {
                    analysis = JSON.parse(rawContent) as AIAnalysisResponse;
                } catch {
                    throw new Error("AI returned invalid JSON");
                }

                // Progress through remaining steps with brief delays
                for (const remainingStep of PROCESSING_STEPS.slice(2)) {
                    await publishStep(paperId, remainingStep);
                    await new Promise((r) => setTimeout(r, 600));
                }

                const processingTimeMs = Date.now() - startTime;

                // Save results via RPC
                await saveAnalysisResult({
                    paperId,
                    summary: analysis.summary as unknown as Record<
                        string,
                        unknown
                    >,
                    keyConcepts: analysis.key_concepts,
                    mathExplanation:
                        analysis.math_explanation as unknown as Record<
                            string,
                            unknown
                        >,
                    mindMap: analysis.mind_map as unknown as Record<
                        string,
                        unknown
                    >,
                    learningCards: analysis.learning_cards,
                    relatedTopics: analysis.related_topics,
                    aiModel: AI_MODEL,
                    processingTimeMs,
                });

                // Update Redis status to completed
                await redis.hset(`paper:${paperId}:status`, {
                    status: "completed",
                    current_step: "done",
                    updated_at: Date.now(),
                });

                // Cache the result in Redis for 24 hours (matches content hash TTL)
                await redis.setex(
                    `paper:${paperId}:result`,
                    CONTENT_CACHE_TTL,
                    JSON.stringify(analysis),
                );

                // Refresh the content hash → paperId mapping so its TTL
                // starts from the moment of successful completion
                if (contentHash) {
                    await redis.set(contentCacheKey(contentHash), paperId, {
                        ex: CONTENT_CACHE_TTL,
                    });
                }

                // Set TTL on status hash (cleanup after TTL + 1 hour buffer)
                await redis.expire(
                    `paper:${paperId}:status`,
                    CONTENT_CACHE_TTL + 3600,
                );

                return analysis;
            }

            // Small delay between initial steps for visual progression
            await new Promise((r) => setTimeout(r, 400));
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        console.error(
            `[PaperLens] Analysis failed for ${paperId}:`,
            errorMessage,
        );

        // Mark as failed in both DB and Redis
        await updatePaperStatus({
            paperId,
            status: "failed",
            errorMessage,
        });
        await redis.hset(`paper:${paperId}:status`, {
            status: "failed",
            error_message: errorMessage,
            updated_at: Date.now(),
        });

        // Remove the content hash mapping so next attempt re-triggers
        if (contentHash) {
            await redis.del(contentCacheKey(contentHash));
        }

        throw error;
    }
}
