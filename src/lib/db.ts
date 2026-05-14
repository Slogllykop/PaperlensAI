import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type {
    CreatePaperResponse,
    InputType,
    PaperStatusResponse,
    PaperWithResults,
} from "@/lib/types";

// ============================================================
// Database layer: all operations go through Supabase RPC
// No direct table queries anywhere in the app
// ============================================================

function sanitizeForPg(str: string | undefined | null): string | null {
    if (!str) return null;
    // PostgreSQL does not support the null byte (\u0000) in text fields
    return str.replace(/\0/g, "");
}

export async function createPaper(params: {
    title?: string;
    inputType: InputType;
    sourceUrl?: string;
    rawText?: string;
    previewImageUrl?: string;
}): Promise<CreatePaperResponse> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("create_paper", {
        p_title: sanitizeForPg(params.title),
        p_input_type: params.inputType,
        p_source_url: params.sourceUrl ?? null,
        p_raw_text: sanitizeForPg(params.rawText),
        p_preview_image_url: params.previewImageUrl ?? null,
    });

    if (error) throw new Error(`Failed to create paper: ${error.message}`);
    return data as CreatePaperResponse;
}

export async function updatePaperStatus(params: {
    paperId: string;
    status: string;
    errorMessage?: string;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("update_paper_status", {
        p_paper_id: params.paperId,
        p_status: params.status,
        p_error_message: params.errorMessage ?? null,
    });

    if (error)
        throw new Error(`Failed to update paper status: ${error.message}`);
    return data;
}

export async function searchPapers(params: { query: string; limit?: number }) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("search_papers", {
        p_query: params.query,
        p_limit: params.limit ?? 20,
    });

    if (error) throw new Error(`Failed to search papers: ${error.message}`);
    return data as any[];
}

export async function saveAnalysisResult(params: {
    paperId: string;
    summary: Record<string, unknown>;
    keyConcepts: unknown[];
    mathExplanation: Record<string, unknown>;
    mindMap: Record<string, unknown>;
    learningCards: unknown[];
    relatedTopics: unknown[];
    aiModel: string;
    processingTimeMs: number;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("save_analysis_result", {
        p_paper_id: params.paperId,
        p_summary: params.summary,
        p_key_concepts: params.keyConcepts,
        p_math_explanation: params.mathExplanation,
        p_mind_map: params.mindMap,
        p_learning_cards: params.learningCards,
        p_related_topics: params.relatedTopics,
        p_ai_model: params.aiModel,
        p_processing_time_ms: params.processingTimeMs,
    });

    if (error)
        throw new Error(`Failed to save analysis result: ${error.message}`);
    return data;
}

export async function getPaperWithResults(
    paperId: string,
): Promise<PaperWithResults> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("get_paper_with_results", {
        p_paper_id: paperId,
    });

    if (error)
        throw new Error(`Failed to get paper with results: ${error.message}`);
    return data as PaperWithResults;
}

export async function getPaperStatus(
    paperId: string,
): Promise<PaperStatusResponse> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("get_paper_status", {
        p_paper_id: paperId,
    });

    if (error) throw new Error(`Failed to get paper status: ${error.message}`);
    return data as PaperStatusResponse;
}

export interface RecentPaper {
    id: string;
    title: string;
    input_type: string;
    source_url: string | null;
    preview_image_url: string | null;
    status: string;
    created_at: string;
}

export async function listRecentPapers(limit = 20): Promise<RecentPaper[]> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc("list_recent_papers", {
        p_limit: limit,
    });

    if (error)
        throw new Error(`Failed to list recent papers: ${error.message}`);
    return (data as RecentPaper[]) ?? [];
}

export async function updatePaperPreview(params: {
    paperId: string;
    previewImageUrl: string;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.rpc("update_paper_preview", {
        p_paper_id: params.paperId,
        p_preview_image_url: params.previewImageUrl,
    });

    if (error)
        throw new Error(`Failed to update paper preview: ${error.message}`);
}
