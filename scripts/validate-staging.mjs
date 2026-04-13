#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const url = process.env.VALIDATE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.VALIDATE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('FALHA: variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];

async function checkTable(tableName) {
  const { error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    checks.push({ ok: false, name: `Tabela ${tableName}`, detail: error.message });
    return;
  }
  checks.push({ ok: true, name: `Tabela ${tableName}`, detail: 'OK' });
}

async function checkColumns() {
  const campaignColumns = ['meta_account_id', 'google_campaign_id', 'meta_campaign_id'];
  for (const col of campaignColumns) {
    const { error } = await supabase.from('campaigns').select(`id, ${col}`).limit(1);
    checks.push({
      ok: !error,
      name: `Coluna campaigns.${col}`,
      detail: error ? error.message : 'OK',
    });
  }

  const creativeColumns = ['external_id', 'campaign_id', 'platform'];
  for (const col of creativeColumns) {
    const { error } = await supabase.from('creatives').select(`id, ${col}`).limit(1);
    checks.push({
      ok: !error,
      name: `Coluna creatives.${col}`,
      detail: error ? error.message : 'OK',
    });
  }

  const userColumns = ['email', 'role'];
  for (const col of userColumns) {
    const { error } = await supabase.from('users').select(`id, ${col}`).limit(1);
    checks.push({
      ok: !error,
      name: `Coluna users.${col}`,
      detail: error ? error.message : 'OK',
    });
  }
}

async function checkRoles() {
  const { data, error } = await supabase.from('users').select('role');
  if (error) {
    checks.push({ ok: false, name: 'Roles em users', detail: error.message });
    return;
  }

  const allowed = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  const distinct = [...new Set((data || []).map((row) => row.role))].sort();
  const invalid = distinct.filter((role) => !allowed.has(role));

  checks.push({
    ok: invalid.length === 0,
    name: 'Roles canonicas',
    detail: invalid.length === 0
      ? `OK (${distinct.join(', ') || 'sem usuarios'})`
      : `Roles invalidas: ${invalid.join(', ')}`,
  });
}

async function checkCreativeDuplicates() {
  const { data, error } = await supabase
    .from('creatives')
    .select('campaign_id, platform, external_id')
    .limit(10000);

  if (error) {
    checks.push({ ok: false, name: 'Duplicidade creatives', detail: error.message });
    return;
  }

  const map = new Map();
  let duplicates = 0;

  for (const row of data || []) {
    const key = `${row.campaign_id}::${row.platform}::${row.external_id}`;
    const count = map.get(key) || 0;
    map.set(key, count + 1);
    if (count >= 1) duplicates += 1;
  }

  checks.push({
    ok: duplicates === 0,
    name: 'Duplicidade creatives(campaign_id,platform,external_id)',
    detail: duplicates === 0 ? 'OK' : `Duplicatas detectadas: ${duplicates}`,
  });
}

async function checkCampaignIntegrity() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, platforms');

  if (error) {
    checks.push({ ok: false, name: 'Integridade campaigns', detail: error.message });
    return;
  }

  let noName = 0;
  let noPlatforms = 0;
  for (const row of data || []) {
    if (!row.name || !String(row.name).trim()) noName += 1;
    if (!row.platforms) noPlatforms += 1;
  }

  checks.push({
    ok: noName === 0 && noPlatforms === 0,
    name: 'Integridade campaigns(nome/platforms)',
    detail: `sem_nome=${noName}; sem_platforms=${noPlatforms}; total=${(data || []).length}`,
  });
}

async function main() {
  await checkTable('users');
  await checkTable('campaigns');
  await checkTable('logs');
  await checkTable('creatives');

  await checkColumns();
  await checkRoles();
  await checkCreativeDuplicates();
  await checkCampaignIntegrity();

  console.log('');
  console.log('=== Validacao Pos-Migracao (Staging) ===');

  let failures = 0;
  for (const check of checks) {
    const status = check.ok ? 'OK' : 'FALHA';
    if (!check.ok) failures += 1;
    console.log(`[${status}] ${check.name} -> ${check.detail}`);
  }

  console.log('');
  if (failures > 0) {
    console.log(`Resultado final: FALHOU (${failures} verificacoes).`);
    process.exit(1);
  }

  console.log('Resultado final: APROVADO.');
}

main().catch((err) => {
  console.error('Erro inesperado na validacao:', err.message);
  process.exit(1);
});
