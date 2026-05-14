-- =============================================================
-- Migration 03: RPC functions for all database operations
-- All functions are SECURITY DEFINER: they bypass RLS
-- Tables have RLS enabled with zero policies (deny-all)
-- =============================================================

-- ============================================================
-- RPC: create_paper
-- Creates a new paper record and returns its id + status
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_paper(
  p_title TEXT DEFAULT NULL,
  p_input_type TEXT DEFAULT 'text',
  p_source_url TEXT DEFAULT NULL,
  p_raw_text TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paper papers%ROWTYPE;
BEGIN
  INSERT INTO papers (title, input_type, source_url, raw_text, status)
  VALUES (p_title, p_input_type, p_source_url, p_raw_text, 'pending')
  RETURNING * INTO v_paper;

  RETURN json_build_object(
    'id', v_paper.id,
    'status', v_paper.status,
    'created_at', v_paper.created_at
  );
END;
$$;

-- ============================================================
-- RPC: update_paper_status
-- Updates the processing status of a paper
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_paper_status(
  p_paper_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paper papers%ROWTYPE;
BEGIN
  UPDATE papers
  SET status = p_status,
      error_message = p_error_message
  WHERE id = p_paper_id
  RETURNING * INTO v_paper;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found: %', p_paper_id;
  END IF;

  RETURN json_build_object(
    'id', v_paper.id,
    'status', v_paper.status,
    'updated_at', v_paper.updated_at
  );
END;
$$;

-- ============================================================
-- RPC: save_analysis_result
-- Saves the AI-generated analysis and marks paper as completed
-- ============================================================
CREATE OR REPLACE FUNCTION public.save_analysis_result(
  p_paper_id UUID,
  p_summary JSONB,
  p_key_concepts JSONB,
  p_math_explanation JSONB,
  p_mind_map JSONB,
  p_learning_cards JSONB,
  p_related_topics JSONB,
  p_ai_model TEXT,
  p_processing_time_ms INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result analysis_results%ROWTYPE;
BEGIN
  -- Insert analysis result
  INSERT INTO analysis_results (
    paper_id, summary, key_concepts, math_explanation,
    mind_map, learning_cards, related_topics,
    ai_model, processing_time_ms
  )
  VALUES (
    p_paper_id, p_summary, p_key_concepts, p_math_explanation,
    p_mind_map, p_learning_cards, p_related_topics,
    p_ai_model, p_processing_time_ms
  )
  RETURNING * INTO v_result;

  -- Mark paper as completed
  UPDATE papers SET status = 'completed' WHERE id = p_paper_id;

  RETURN json_build_object(
    'id', v_result.id,
    'paper_id', v_result.paper_id,
    'created_at', v_result.created_at
  );
END;
$$;

-- ============================================================
-- RPC: get_paper_with_results
-- Fetches a paper and its analysis results in one call
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_paper_with_results(p_paper_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paper papers%ROWTYPE;
  v_result analysis_results%ROWTYPE;
BEGIN
  SELECT * INTO v_paper FROM papers WHERE id = p_paper_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found: %', p_paper_id;
  END IF;

  SELECT * INTO v_result FROM analysis_results WHERE paper_id = p_paper_id;

  RETURN json_build_object(
    'paper', json_build_object(
      'id', v_paper.id,
      'title', v_paper.title,
      'input_type', v_paper.input_type,
      'source_url', v_paper.source_url,
      'status', v_paper.status,
      'error_message', v_paper.error_message,
      'created_at', v_paper.created_at,
      'updated_at', v_paper.updated_at
    ),
    'analysis', CASE WHEN v_result.id IS NOT NULL THEN
      json_build_object(
        'id', v_result.id,
        'summary', v_result.summary,
        'key_concepts', v_result.key_concepts,
        'math_explanation', v_result.math_explanation,
        'mind_map', v_result.mind_map,
        'learning_cards', v_result.learning_cards,
        'related_topics', v_result.related_topics,
        'ai_model', v_result.ai_model,
        'processing_time_ms', v_result.processing_time_ms,
        'created_at', v_result.created_at
      )
    ELSE NULL END
  );
END;
$$;

-- ============================================================
-- RPC: get_paper_status
-- Lightweight status check (no heavy JSONB fields)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_paper_status(p_paper_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_title TEXT;
  v_error TEXT;
  v_updated TIMESTAMPTZ;
BEGIN
  SELECT status, title, error_message, updated_at
  INTO v_status, v_title, v_error, v_updated
  FROM papers WHERE id = p_paper_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found: %', p_paper_id;
  END IF;

  RETURN json_build_object(
    'id', p_paper_id,
    'status', v_status,
    'title', v_title,
    'error_message', v_error,
    'updated_at', v_updated
  );
END;
$$;

-- ============================================================
-- Grant execute on all RPC functions to anon and authenticated
-- ============================================================
GRANT EXECUTE ON FUNCTION public.create_paper TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_paper_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_analysis_result TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_paper_with_results TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_paper_status TO anon, authenticated;
