#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production', override: false });
dotenv.config({ path: '.env', override: false });

const PROD_PROJECT_REF = process.env.SUPABASE_PROD_PROJECT_REF || 'ggxuvuwpfifliffwnbsn';
const STAGING_PROJECT_REF = process.env.SUPABASE_STAGING_PROJECT_REF || 'yzqvwhbrqmgvknzgoauq';
const VALIDATE_SUPABASE_URL = process.env.VALIDATE_SUPABASE_URL || `https://${PROD_PROJECT_REF}.supabase.co`;
const VALIDATE_SUPABASE_SERVICE_KEY =
  process.env.VALIDATE_SUPABASE_SERVICE_KEY ||
  process.env.PROD_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

function run(command, args, env = process.env) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`Falha ao executar: ${command} ${args.join(' ')}`);
  }
}

function runCapture(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env,
    encoding: 'utf8',
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`Falha ao executar: ${command} ${args.join(' ')}`);
  }

  return {
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString(),
  };
}

function timestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function relinkStagingSafe() {
  try {
    run('npx', ['supabase', 'link', '--project-ref', STAGING_PROJECT_REF, '--yes']);
  } catch (error) {
    console.error('\n[ALERTA] Nao foi possivel relinkar automaticamente para staging.');
    console.error(`[ALERTA] Rode manualmente: npx supabase link --project-ref ${STAGING_PROJECT_REF} --yes`);
  }
}

function promoteDevToMain() {
  if (process.env.CONFIRM_MAIN_PROMOTION !== 'true') {
    console.log('\n[INFO] Promocao para main ignorada.');
    console.log('[INFO] Defina CONFIRM_MAIN_PROMOTION=true para habilitar merge dev -> main no fim do protocolo.');
    return;
  }

  const status = runCapture('git', ['status', '--porcelain']).stdout.trim();
  if (status) {
    throw new Error('Workspace Git com alteracoes locais. Commit/stash antes de promover dev -> main.');
  }

  const currentBranch = runCapture('git', ['branch', '--show-current']).stdout.trim();
  if (currentBranch !== 'dev') {
    throw new Error(`Branch atual inesperada: ${currentBranch}. Execute o protocolo a partir da branch dev.`);
  }

  console.log('\n=== Promocao de codigo para producao (dev -> main) ===');
  run('git', ['fetch', 'origin']);
  run('git', ['checkout', 'main']);
  run('git', ['pull', 'origin', 'main']);
  run('git', ['merge', '--no-ff', 'dev', '-m', 'release: promote dev to production']);
  run('git', ['push', 'origin', 'main']);
  run('git', ['checkout', 'dev']);
  console.log('=== Promocao para main concluida ===');
}

async function main() {
  if (process.env.CONFIRM_PROD_MIGRATION !== 'true') {
    console.error('Bloqueado por seguranca.');
    console.error('Defina CONFIRM_PROD_MIGRATION=true para executar migracao em producao.');
    process.exit(1);
  }

  if (!VALIDATE_SUPABASE_SERVICE_KEY.trim()) {
    console.error('Variavel de chave service role ausente.');
    console.error('Defina PROD_SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `prod-pre-migration-${timestamp()}.sql`);

  try {
    console.log('\n=== Inicio do protocolo de migracao para producao ===');

    run('npx', ['supabase', 'link', '--project-ref', PROD_PROJECT_REF, '--yes']);
    run('npm', ['run', 'preflight:prod']);
    run('npx', ['supabase', 'migration', 'list']);
    run('npx', ['supabase', 'db', 'dump', '--linked', '-f', backupFile]);
    run('npx', ['supabase', 'db', 'push', '--linked', '--yes']);
    run('npx', ['supabase', 'migration', 'list']);

    const validateEnv = {
      ...process.env,
      VALIDATE_SUPABASE_URL,
      VALIDATE_SUPABASE_SERVICE_KEY,
    };
    run('node', ['scripts/validate-staging.mjs'], validateEnv);
    promoteDevToMain();

    console.log('\n=== Migracao de producao concluida com sucesso ===');
    console.log(`Backup gerado em: ${backupFile}`);
  } catch (error) {
    console.error('\n=== ERRO: migracao de producao interrompida ===');
    console.error(String(error));
    process.exitCode = 1;
  } finally {
    relinkStagingSafe();
  }
}

main();
