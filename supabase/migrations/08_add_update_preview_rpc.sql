-- =============================================================
-- Migration 08: Add update_paper_preview RPC function
-- Allows updating the preview_image_url on the papers table
-- after a server-side preview has been generated.
-- =============================================================

CREATE OR REPLACE FUNCTION update_paper_preview(
    p_paper_id UUID,
    p_preview_image_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE papers
    SET preview_image_url = p_preview_image_url,
        updated_at = NOW()
    WHERE id = p_paper_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paper not found: %', p_paper_id;
    END IF;
END;
$$;
