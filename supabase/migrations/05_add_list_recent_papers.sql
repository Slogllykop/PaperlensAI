-- =============================================================
-- Migration 05: Add list_recent_papers RPC
-- Returns the 20 most recently analyzed papers
-- =============================================================

CREATE OR REPLACE FUNCTION public.list_recent_papers(p_limit INT DEFAULT 20)
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
        AND p.title IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_recent_papers TO anon, authenticated;
