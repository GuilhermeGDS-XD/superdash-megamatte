# 📋 Checklist de Supabase - Row Level Security (RLS)

## 🔐 Verificar se RLS está bloqueando UPDATEs

### Acesso Rápido
URL: https://app.supabase.com/project/ggxuvuwpfifliffwnbsn/auth/policies

### O que Procurar

Se há um tique verde em **Enable RLS** na tabela `campaigns`, então RLS está ativada.

#### ❌ Problema Comum:
Se RLS está ativada mas não há policy que permite UPDATE, os updates falham silenciosamente.

#### ✅ Solução:

Execute o SQL abaixo no SQL Editor para **criar/ajustar policies de RLS**:

```sql
-- Permitir que usuários autenticados façam UPDATE na própria campanha se criaram
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Policy 1: Permitir UPDATE se é o criador
CREATE POLICY "Allow update own campaigns" ON public.campaigns
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy 2: Permitir SELECT de todas as campanhas (leitura pública)
CREATE POLICY "Allow select all campaigns" ON public.campaigns
  FOR SELECT
  USING (true);

-- Se quiser permitir UPDATE de qualquer admin:
CREATE POLICY "Allow admins to update campaigns" ON public.campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );
```

---

## 🧪 Teste Final

Depois de configurar RLS:

1. Edite uma campanha
2. Abra DevTools (F12) → Console
3. Procure por logs 📝, 🔑, ✅

Se ainda não funcionar:
- Verifique se o `user.id` está sendo capturado corretamente
- Verifique se a coluna `created_by` está preenchida nas campanhas

---

## 📊 Estrutura Esperada

```sql
-- Tabela campaigns deve ter:
- id (uuid, primary key)
- name (text)
- ecompay_product_id (text) ← NOVO
- spotter_list_id (text) ← NOVO
- created_by (uuid, fk users.id)
- created_at (timestamp)
- ... outras colunas
```

### Comando para Verificar Colunas:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='campaigns' AND column_name IN ('ecompay_product_id', 'spotter_list_id', 'created_by');
```

Se retornar vazio para `ecompay_product_id` e `spotter_list_id`, execute o SQL de criação de colunas novamente.
