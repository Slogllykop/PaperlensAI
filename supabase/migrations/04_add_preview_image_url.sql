-- =============================================================
-- Migration 04: Add preview_image_url column to papers table
-- Stores the Supabase Storage URL for the first-page preview
-- =============================================================

ALTER TABLE public.papers ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Drop the old create_paper signature (4 params) before recreating with 5
DROP FUNCTION IF EXISTS public.create_paper(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_paper(
  p_title TEXT DEFAULT NULL,
  p_input_type TEXT DEFAULT 'text',
  p_source_url TEXT DEFAULT NULL,
  p_raw_text TEXT DEFAULT NULL,
  p_preview_image_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paper papers%ROWTYPE;
BEGIN
  INSERT INTO papers (title, input_type, source_url, raw_text, status, preview_image_url)
  VALUES (p_title, p_input_type, p_source_url, p_raw_text, 'pending', p_preview_image_url)
  RETURNING * INTO v_paper;

  RETURN json_build_object(
    'id', v_paper.id,
    'status', v_paper.status,
    'created_at', v_paper.created_at
  );
END;
$$;

-- Update get_paper_with_results to include preview_image_url
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
      'preview_image_url', v_paper.preview_image_url,
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

GRANT EXECUTE ON FUNCTION public.create_paper TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_paper_with_results TO anon, authenticated;
