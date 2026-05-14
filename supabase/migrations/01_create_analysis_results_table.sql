-- =============================================================
-- Migration 01: Create analysis_results table
-- Stores structured AI-generated explanations for each paper
-- =============================================================

CREATE TABLE public.analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  summary JSONB NOT NULL DEFAULT '{}',
  key_concepts JSONB NOT NULL DEFAULT '[]',
  math_explanation JSONB NOT NULL DEFAULT '{}',
  mind_map JSONB NOT NULL DEFAULT '{}',
  learning_cards JSONB NOT NULL DEFAULT '[]',
  related_topics JSONB NOT NULL DEFAULT '[]',
  ai_model TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS: deny all direct access by default
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups by paper_id
CREATE INDEX idx_analysis_results_paper_id ON public.analysis_results(paper_id);
