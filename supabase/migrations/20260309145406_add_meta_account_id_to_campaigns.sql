-- Migration to add meta_account_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS meta_account_id TEXT;
