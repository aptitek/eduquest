import { spawn } from 'node:child_process';
import { existsSync, readFileSync, watch } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');
const migrationsDir = join(backendRoot, 'src/db/d1-migrations');
const devVarsPath = join(backendRoot, '.dev.vars');
const wranglerArgs = [
  'dev',
  'src/index.ts',
  '--show-interactive-dev-session=false',
  '--persist-to',
  '.wrangler/state',
  ...process.argv.slice(2),
];

let migrationRunning = false;
let migrationQueued = false;
let migrationDebounce;
let wranglerProcess;

loadDevVars();

function loadDevVars() {
  if (!existsSync(devVarsPath)) return;

  const lines = readFileSync(devVarsPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = unquote(rawValue);
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function runMigration(reason) {
  if (migrationRunning) {
    migrationQueued = true;
    return 0;
  }

  migrationRunning = true;
  console.log(`[db] Running migrations (${reason})...`);

  const exitCode = await runCommand('npm', ['run', 'db:migrate']);
  migrationRunning = false;

  if (exitCode !== 0) {
    console.error(`[db] Migration failed with exit code ${exitCode}.`);
  } else {
    console.log('[db] Migrations are up to date.');
  }

  if (migrationQueued) {
    migrationQueued = false;
    await runMigration('queued migration change');
  }

  return exitCode;
}

function runCommand(command, args) {
  return new Promise((resolveExitCode) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      console.error(`[db] Failed to start ${command}:`, error);
      resolveExitCode(1);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        resolveExitCode(1);
        return;
      }

      resolveExitCode(code ?? 1);
    });
  });
}

function scheduleMigration(reason) {
  clearTimeout(migrationDebounce);
  migrationDebounce = setTimeout(() => {
    void runMigration(reason);
  }, 500);
}

function watchMigrations() {
  const watchTargets = [migrationsDir, join(migrationsDir, 'meta')];

  for (const target of watchTargets) {
    if (!existsSync(target)) continue;

    watch(target, { persistent: true }, (_eventType, filename) => {
      if (!filename) return;
      scheduleMigration(`${filename.toString()} changed`);
    });
  }
}

function startWrangler() {
  wranglerProcess = spawn('wrangler', wranglerArgs, {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  });

  wranglerProcess.on('error', (error) => {
    console.error('[dev] Failed to start Wrangler:', error);
    process.exit(1);
  });

  wranglerProcess.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    }

    process.exit(code ?? 1);
  });
}

function stop() {
  if (wranglerProcess && !wranglerProcess.killed) {
    wranglerProcess.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stop();
  process.exit(143);
});

const startupMigrationExitCode = await runMigration('startup');
if (startupMigrationExitCode !== 0) {
  process.exit(startupMigrationExitCode);
}

watchMigrations();
startWrangler();
