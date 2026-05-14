-- =============================================================
-- Migration 06: Add search_papers RPC and title auto-update
-- =============================================================

-- Add search functionality
CREATE OR REPLACE FUNCTION public.search_papers(p_query TEXT, p_limit INT DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        p.id,
        p.title,
        p.input_type,
        p.source_url,
        p.preview_image_url,
        p.status,
        p.created_at
      FROM papers p
      WHERE p.status = 'completed'
        AND (
          p.title ILIKE '%' || p_query || '%'
          OR p.raw_text ILIKE '%' || p_query || '%'
        )
      ORDER BY p.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Drop and recreate save_analysis_result to fix return type mismatch
DROP FUNCTION IF EXISTS public.save_analysis_result(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, INT);

-- Ensure save_analysis_result updates title if it was missing
CREATE OR REPLACE FUNCTION public.save_analysis_result(
  p_paper_id UUID,
  p_summary JSONB,
  p_key_concepts JSONB,
  p_math_explanation JSONB,
  p_mind_map JSONB,
  p_learning_cards JSONB,
  p_related_topics JSONB,
  p_ai_model TEXT,
  p_processing_time_ms INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  -- Insert the result
  INSERT INTO analysis_results (
    paper_id, summary, key_concepts, math_explanation,
    mind_map, learning_cards, related_topics, ai_model, processing_time_ms
  )
  VALUES (
    p_paper_id, p_summary, p_key_concepts, p_math_explanation,
    p_mind_map, p_learning_cards, p_related_topics, p_ai_model, p_processing_time_ms
  );

  -- Update paper status
  UPDATE papers
  SET status = 'completed'
  WHERE id = p_paper_id;

  -- Auto-set title from summary if paper title is null or generic
  v_title := p_summary->>'title';
  IF v_title IS NOT NULL AND v_title <> '' THEN
    UPDATE papers
    SET title = v_title
    WHERE id = p_paper_id AND (title IS NULL OR title = '' OR title = 'Untitled Paper');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_papers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_analysis_result TO anon, authenticated;

-- Update get_paper_status to include preview_image_url
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
  v_preview TEXT;
  v_updated TIMESTAMPTZ;
BEGIN
  SELECT status, title, error_message, preview_image_url, updated_at
  INTO v_status, v_title, v_error, v_preview, v_updated
  FROM papers WHERE id = p_paper_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found: %', p_paper_id;
  END IF;

  RETURN json_build_object(
    'id', p_paper_id,
    'status', v_status,
    'title', v_title,
    'error_message', v_error,
    'preview_image_url', v_preview,
    'updated_at', v_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_paper_status TO anon, authenticated;
