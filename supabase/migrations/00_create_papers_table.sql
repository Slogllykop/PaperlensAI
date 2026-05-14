-- =============================================================
-- Migration 00: Create papers table
-- Stores uploaded/pasted/linked research papers
-- =============================================================

CREATE TABLE public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  input_type TEXT NOT NULL CHECK (input_type IN ('text', 'pdf', 'url')),
  source_url TEXT,
  raw_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending','processing','completed','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS: deny all direct access by default
-- All access goes through SECURITY DEFINER RPC functions
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
