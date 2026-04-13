#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envProductionPath = path.join(rootDir, '.env.production');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envProductionPath)) {
  dotenv.config({ path: envProductionPath, override: false });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false });
}

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'META_ADS_ACCESS_TOKEN',
];

const missingEnv = requiredEnv.filter((name) => {
  const value = process.env[name];
  return !value || !value.trim();
});

const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const migrationFiles = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()
  : [];

const destructivePatterns = [
  /\bdrop\s+table\b/i,
  /\btruncate\s+table\b/i,
  /\bset\s+session_replication_role\s*=\s*replica\b/i,
  /\binsert\s+into\s+auth\.users\b/i,
];

const riskyMigrations = [];
for (const file of migrationFiles) {
  const fullPath = path.join(migrationsDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  const matched = destructivePatterns
    .filter((regex) => regex.test(content))
    .map((regex) => regex.toString());

  if (matched.length > 0) {
    riskyMigrations.push({ file, matched });
  }
}

const appDir = path.join(rootDir, 'src');
const roleStats = {
  titleCaseRoles: 0,
  upperCaseRoles: 0,
};

const roleCodePatterns = {
  titleCase: [
    /role\s*===\s*['"](Super Admin|Admin|Gestor)['"]/,
    /role\s*!==\s*['"](Super Admin|Admin|Gestor)['"]/,
    /role\s*:\s*['"](Super Admin|Admin|Gestor)['"]/,
  ],
  upperCase: [
    /role\s*===\s*['"](SUPER_ADMIN|ADMIN|MANAGER)['"]/,
    /role\s*!==\s*['"](SUPER_ADMIN|ADMIN|MANAGER)['"]/,
    /role\s*:\s*['"](SUPER_ADMIN|ADMIN|MANAGER)['"]/,
  ],
};

function scanDirForRolePatterns(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanDirForRolePatterns(full);
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|sql)$/i.test(entry.name)) {
      continue;
    }

    const content = fs.readFileSync(full, 'utf8');
    if (roleCodePatterns.titleCase.some((pattern) => pattern.test(content))) {
      roleStats.titleCaseRoles += 1;
    }
    if (roleCodePatterns.upperCase.some((pattern) => pattern.test(content))) {
      roleStats.upperCaseRoles += 1;
    }
  }
}

scanDirForRolePatterns(appDir);

const hasMixedRoleConventions = roleStats.titleCaseRoles > 0 && roleStats.upperCaseRoles > 0;
const allowDestructiveMigrations = process.env.PREFLIGHT_ALLOW_DESTRUCTIVE_MIGRATIONS === 'true';

console.log('');
console.log('=== Preflight de Producao ===');
console.log(`Projeto: ${path.basename(rootDir)}`);
console.log(`Migracoes SQL encontradas: ${migrationFiles.length}`);
console.log('');

if (missingEnv.length === 0) {
  console.log('ENV: OK (todas as variaveis obrigatorias presentes)');
} else {
  console.log('ENV: FALHA (variaveis obrigatorias ausentes)');
  for (const item of missingEnv) {
    console.log(` - ${item}`);
  }
}

if (riskyMigrations.length === 0) {
  console.log('Migracoes: OK (sem padrao destrutivo detectado)');
} else {
  console.log('Migracoes: ALERTA (padroes de risco detectados)');
  for (const migration of riskyMigrations) {
    console.log(` - ${migration.file}`);
  }
}

if (hasMixedRoleConventions) {
  console.log('Roles: ALERTA (padroes mistos detectados no codigo)');
  console.log(` - Arquivos com roles em Title Case: ${roleStats.titleCaseRoles}`);
  console.log(` - Arquivos com roles em UPPER_CASE: ${roleStats.upperCaseRoles}`);
} else {
  console.log('Roles: OK (padrao consistente ou sem evidencia de conflito)');
}

const hasBlockingError =
  missingEnv.length > 0 ||
  (riskyMigrations.length > 0 && !allowDestructiveMigrations);

console.log('');
if (hasBlockingError) {
  console.log('Resultado: FALHOU');
  console.log('Acao: corrija itens bloqueantes antes do deploy de producao.');
  if (riskyMigrations.length > 0 && !allowDestructiveMigrations) {
    console.log('Obs: para liberar excepcionalmente, use PREFLIGHT_ALLOW_DESTRUCTIVE_MIGRATIONS=true.');
  }
  process.exit(1);
}

console.log('Resultado: APROVADO');
console.log('Acao: apto para seguir com rehearsal/deploy.');
process.exit(0);
