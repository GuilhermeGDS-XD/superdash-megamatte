# 🚀 INSTRUÇÕES PARA DEBUGAR SALVAMENTO DE CAMPOS

## 📍 Passo 1: Verificar Console do Navegador

1. **Abra a aplicação no navegador**
2. **Edite uma campanha** (Menu → Editar)
3. **Abra DevTools:** F12 ou Ctrl+Shift+I
4. **Vá para a aba "Console"**
5. **Selecione um Produto Ecompay** (dropdown)
6. **Selecione uma Origem Spotter** (dropdown)
7. **Clique em "Salvar Alterações"**

### 🔍 Procure pelos logs:

```
📝 Dados sendo salvos: { name: '...', ecompay_product_id: 'xyz', spotter_list_id: '123' }
🔑 ecompay_product_id: xyz Type: string
🔑 spotter_list_id: 123 Type: string
```

**Se vir esses logs:** Os dados estão sendo enviados corretamente

**Se NÃO vir:** O formulário não está executando o update. Cole a mensagem de erro aqui.

---

## 📍 Passo 2: Verificar se Colunas Existem

No SQL Editor do Supabase (https://app.supabase.com/project/ggxuvuwpfifliffwnbsn/sql):

```sql
-- Selecione todas as colunas da tabela campaigns
SELECT * FROM campaigns LIMIT 1;
```

✅ **Se retornar dados com colunas `ecompay_product_id` e `spotter_list_id`:** Colunas existem

❌ **Se retornar erro tipo "column does not exist":** Execute o SQL abaixo:

```sql
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS ecompay_product_id TEXT DEFAULT NULL;

ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS spotter_list_id TEXT DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
```

---

## 📍 Passo 3: Testar UPDATE Manualmente

No SQL Editor, execute:

```sql
-- Substitua 'camp-uuid-here' pelo ID real de uma campanha
UPDATE campaigns 
SET ecompay_product_id = 'TESTE_' || NOW()::text,
    spotter_list_id = 'TESTE_' || NOW()::text
WHERE id = 'camp-uuid-here'
RETURNING id, ecompay_product_id, spotter_list_id;
```

✅ **Se retornar os dados atualizados:** Banco de dados está funcionando

❌ **Se retornar erro:** Verifique as políticas de RLS

---

## 📍 Passo 4: Verificar Row Level Security (RLS)

URL: https://app.supabase.com/project/ggxuvuwpfifliffwnbsn/auth/policies

**Procure por:**
- Checkbox "Enable RLS" ao lado de `campaigns`
- Se estiver marcado ✅ = RLS está ativada

**Se RLS estiver ativada:**
1. Vá para "Policies"
2. Procure por policies na tabela `campaigns`
3. Procure por policies com "UPDATE" ou "SELECT FOR UPDATE"

**Se não houver policies de UPDATE:**
- Isso pode estar bloqueando o salvamento
- Execute as policies do arquivo `docs/SUPABASE_RLS_CHECKLIST.md`

---

## 📍 Passo 5: Verificar Auth User

Execute no Console do Navegador:

```javascript
// Copie e cole no console do navegador
const { data: session } = await supabase.auth.getSession();
console.log('User ID:', session?.user?.id);
console.log('Email:', session?.user?.email);
```

✅ **Se retornar um UUID válido:** Você está autenticado

❌ **Se retornar null ou undefined:** Você não está logado, faça login novamente

---

## 🎯 Checklist da Resolução

Quando testar, verifique:

- [ ] Login está ativo (vejo User ID no console)
- [ ] Colunas existem no banco (`ecompay_product_id`, `spotter_list_id`)  
- [ ] Consigo fazer UPDATE manualmente no SQL Editor
- [ ] RLS está desabilitada OU há policies de UPDATE
- [ ] Os logs 📝, 🔑, ✅ aparecem quando salvo

### Próximas ações:

1. Execute os passos acima
2. Cole aqui:
   - Os logs que vê no console
   - Se há erros
   - O resultado do teste manual de UPDATE
3. Com isso eusei exatamente onde está o problema

---

## 🆘 Se Ainda Não Funcionar

Cole aqui:

1. **Prints de erro do console** (F12)
2. **Resultado do SQL:** `SELECT * FROM campaigns LIMIT 1;`
3. **Resultado de:** `SELECT auth.uid();`
4. **As policies existentes** (de https://...auth/policies)

Com isso consigo identificar o problema com certeza! 🔍
