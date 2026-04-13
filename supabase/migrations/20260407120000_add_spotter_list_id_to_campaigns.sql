-- Migration: adiciona coluna spotter_list_id à tabela campaigns
-- Permite vincular uma campanha a uma lista do Exact Spotter

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS spotter_list_id TEXT DEFAULT NULL;

COMMENT ON COLUMN campaigns.spotter_list_id IS 'ID ou nome da lista no Exact Spotter vinculada a esta campanha';
