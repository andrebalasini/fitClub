-- ============================================================
-- Migration: Suporte a Séries Pirâmide na tbTreinos
-- ============================================================

ALTER TABLE public."tbTreinos"
  ADD COLUMN IF NOT EXISTS is_pyramid      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pyramid_series jsonb;
