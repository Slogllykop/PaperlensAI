// ============================================================
// Types for PaperLens AI
// ============================================================

export type InputType = "text" | "pdf" | "url";
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

// --- Paper ---
export interface Paper {
    id: string;
    title: string | null;
    input_type: InputType;
    source_url: string | null;
    preview_image_url: string | null;
    status: AnalysisStatus;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

// --- Summary Card ---
export interface Summary {
    title: string;
    category: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
    one_line_summary: string;
    problem_solved: string;
    method_used: string;
}

// --- Key Concept ---
export interface KeyConcept {
    name: string;
    description: string;
}

// --- Math Explanation ---
export interface MathExplanation {
    has_math: boolean;
    equation: string | null;
    equation_name: string | null;
    what_it_means: string | null;
    symbols: { symbol: string; meaning: string }[];
    step_by_step: string[];
    simple_explanation: string | null;
}

// --- Mind Map ---
export interface MindMapNode {
    id: string;
    label: string;
    children?: MindMapNode[];
}

export interface MindMap {
    root: MindMapNode;
}

// --- Learning Card ---
export interface LearningCard {
    question: string;
    answer: string;
    icon: string;
}

// --- Related Topic ---
export interface RelatedTopic {
    name: string;
    description: string;
    search_url: string;
}

// --- Full Analysis Result ---
export interface AnalysisResult {
    id: string;
    summary: Summary;
    key_concepts: KeyConcept[];
    math_explanation: MathExplanation;
    mind_map: MindMap;
    learning_cards: LearningCard[];
    related_topics: RelatedTopic[];
    ai_model: string;
    processing_time_ms: number;
    created_at: string;
}

// --- Combined Paper + Results ---
export interface PaperWithResults {
    paper: Paper;
    analysis: AnalysisResult | null;
}

// --- API Response Types ---
export interface CreatePaperResponse {
    id: string;
    status: AnalysisStatus;
    created_at: string;
}

export interface PaperStatusResponse {
    id: string;
    status: AnalysisStatus;
    title: string | null;
    preview_image_url: string | null;
    error_message: string | null;
    updated_at: string;
}

// --- AI Prompt Response Schema ---
export interface AIAnalysisResponse {
    summary: Summary;
    key_concepts: KeyConcept[];
    math_explanation: MathExplanation;
    mind_map: MindMap;
    learning_cards: LearningCard[];
    related_topics: RelatedTopic[];
}

// --- Processing Step (for UI) ---
export interface ProcessingStep {
    id: string;
    label: string;
    status: "waiting" | "active" | "completed";
}
