# 🔧 Checklist de Diagnóstico - Salvamento de Campos Ecompay e Spotter

## ✅ Passo 1: Verificar Console do Navegador

1. Abra o Chrome DevTools (F12)
2. Vá para a aba **Console**
3. Edite uma campanha e clique em "Salvar Alterações"
4. Procure pelos logs que começam com 📝, 🔑, ✅, ❌

**O que procurar:**
```
📝 Dados sendo salvos: {...}
🔑 ecompay_product_id: [valor] Type: string
🔑 spotter_list_id: [valor] Type: string
✅ Campanha atualizada com sucesso!
```

---

## ✅ Passo 2: Verificar Banco de Dados

Execute o script de teste:
```bash
cd "c:\Users\Guilherme\_projetos\Super Dashboard"
node scripts/test-db-prod.mjs
```

**Possíveis resultados:**

### ✅ Se for bem-sucedido:
- Mostrará "✅ Colunas encontradas!"
- Mostrará "✅ Update realizado com sucesso!"
- Os valores de teste serão exibidos

### ❌ Se falhar:
- "❌ ERRO: Colunas não encontradas!" 
  → Execute o SQL novamente no Supabase
  
- "❌ Erro ao fazer update"
  → Pode ser problema de RLS (Row Level Security)

---

## ✅ Passo 3: Verificar Row Level Security (RLS)

Se os dados não estão salvando mas também não aparecem erros:

1. Acesse: https://app.supabase.com/project/ggxuvuwpfifliffwnbsn
2. Menu esquerdo → **Authentication** → **Policies**
3. Procure por políticas na tabela **campaigns**
4. Se houver alguma respeitosa a UPDATE, verifique se seu user pode fazer update

**Solução comum:** Se há RLS restritivo, pode estar impedindo UPDATE de certos usuários.

---

## ✅ Passo 4: Verificar Types & Values

Quando seleciona um produto/origem no dropdown:

1. Abra DevTools → Console
2. Selecione um valor
3. Procure no console por:
```
onChange called with value: [ID do produto/origem]
```

Se NÃO aparecer, o onClick do dropdown não está funcionando.

---

## 🔍 Informações Importantes

### Tabela: `campaigns`
- Coluna: `ecompay_product_id` (TEXT, opcional)
- Coluna: `spotter_list_id` (TEXT, opcional)

### Update Query
```sql
UPDATE campaigns 
SET ecompay_product_id = 'xyz', spotter_list_id = 'abc'
WHERE id = [campaign_id]
```

### User ID Necessário?
- Verifique se seu usuário está autenticado
- Supabase precisa do `auth.users.id` para alguns casos

---

## 🚨 Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Nenhum erro, mas valores não salvam | RLS pode estar bloqueando | Verificar policies |
| "column does not exist" | Colunas não foram adicionadas | Executar SQL no Supabase |
| Dropdown não responde | onClick não vinculado | Verificar console para erros JS |
| Valores carregam mas não salvam | Tipo de dados errado | Verificar se é STRING no banco |

---

## 📋 Próximas Ações

1. Execute: `node scripts/test-db-prod.mjs`
2. Cole aqui a saída/erros que aparecerem
3. Se aparecer erro de RLS ou colunas, avise para que eu corrija
