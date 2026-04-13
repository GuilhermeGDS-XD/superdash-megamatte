-- Torna user_id nullable e remove FK para auth.users
-- Necessário pois ainda não implementamos autenticação real no fluxo OAuth Meta

-- 1. Remove FK existente se houver
ALTER TABLE meta_accounts
  DROP CONSTRAINT IF EXISTS meta_accounts_user_id_fkey;

-- 2. Torna user_id nullable
ALTER TABLE meta_accounts
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Remove constraint UNIQUE(user_id, account_id) que depende de user_id
ALTER TABLE meta_accounts
  DROP CONSTRAINT IF EXISTS meta_accounts_user_id_account_id_key;

-- 4. Adiciona UNIQUE apenas em account_id (uma entrada por conta Meta)
ALTER TABLE meta_accounts
  ADD CONSTRAINT meta_accounts_account_id_key UNIQUE (account_id);
