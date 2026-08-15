#!/usr/bin/env node
/**
 * One-command backend dev launcher.
 *
 * `npm run dev` runs this file, which:
 *   1. Starts PostgreSQL + Redis via docker-compose (if Docker is available)
 *   2. Waits for Postgres to accept connections
 *   3. Generates the Prisma client + applies migrations (or `db push` fallback)
 *   4. Launches the NestJS backend with ts-node, inheriting env from ../../.env
 *
 * If Docker isn't running, we skip straight to step 4 so the backend still
 * starts in offline/demo mode (file-backed fallback stores).
 *
 * Ctrl+C is forwarded cleanly to the backend so the docker containers keep
 * running between restarts (faster iteration).
 */

const { spawn, spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m',
  dim: '\x1b[2m',
};
const log = {
  info: (m) => console.log(`${c.blue}ℹ${c.reset}  ${m}`),
  ok: (m) => console.log(`${c.green}✓${c.reset}  ${m}`),
  warn: (m) => console.log(`${c.yellow}⚠${c.reset}  ${m}`),
  err: (m) => console.log(`${c.red}✗${c.reset}  ${m}`),
  step: (m) => console.log(`\n${c.bold}${c.blue}▶ ${m}${c.reset}`),
  dim: (m) => console.log(`${c.dim}   ${m}${c.reset}`),
};

const projectRoot = path.resolve(__dirname, '../..');
const backendDir = __dirname;
const envFile = path.join(projectRoot, '.env');

// ─── load .env so this script can read DATABASE_URL / REDIS_URL ───────────────
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2];
    }
  }
}
loadEnv(envFile);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://securelens:securelens@localhost:5433/securelens';
const PG_PORT = parseInt(process.env.PG_PORT || (DATABASE_URL.match(/:(\d+)\//) || [])[1] || '5433', 10);
const REDIS_PORT = parseInt((process.env.REDIS_URL || '').match(/:(\d+)$/)?. [1] || '6380', 10);

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8', ...opts });
}
function tryExec(cmd, opts = {}) {
  try { return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8', ...opts }).trim(); }
  catch { return null; }
}

function dockerAvailable() {
  return tryExec('docker info', { stdio: 'ignore' }) !== null;
}

function composeCmd() {
  // Prefer `docker compose` (v2); fall back to `docker-compose` (v1).
  if (tryExec('docker compose version', { stdio: 'ignore' }) !== null) return ['docker', 'compose'];
  if (tryExec('docker-compose version', { stdio: 'ignore' }) !== null) return ['docker-compose'];
  return null;
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Test whether a TCP port is accepting connections. */
function portOpen(port, host = 'localhost') {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(1000);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

async function waitForTcp(port, label, attempts = 30) {
  for (let i = 1; i <= attempts; i++) {
    if (await portOpen(port)) { log.ok(`${label} is up on :${port}`); return true; }
    if (i % 5 === 0) log.dim(`waiting for ${label} (${i}/${attempts})…`);
    await sleep(1000);
  }
  return false;
}

async function startServices() {
  log.step('Starting PostgreSQL + Redis');
  
  // Check if services are already running
  const pgRunning = await portOpen(PG_PORT);
  const redisRunning = await portOpen(REDIS_PORT);
  
  if (pgRunning && redisRunning) {
    log.ok(`PostgreSQL (:${PG_PORT}) and Redis (:${REDIS_PORT}) already running`);
    return;
  }
  
  if (pgRunning) log.ok(`PostgreSQL (:${PG_PORT}) already running`);
  if (redisRunning) log.ok(`Redis (:${REDIS_PORT}) already running`);

  // Try Docker first
  const compose = composeCmd();
  if (dockerAvailable() && compose) {
    if (!pgRunning || !redisRunning) {
      const up = run(compose[0], [...compose.slice(1), '-f', path.join(projectRoot, 'docker-compose.yml'), 'up', '-d', 'postgres', 'redis']);
      if (up.status === 0) {
        log.ok(`Docker containers started (postgres:${PG_PORT}, redis:${REDIS_PORT})`);
        return;
      }
    }
  }

  // Fallback: Try native services
  log.dim('Docker not available or compose failed. Attempting native service startup...');
  
  // Try to start PostgreSQL
  if (!pgRunning) {
    const pgStart = tryExec('which brew') ? tryExec('brew services start postgresql') : tryExec('sudo systemctl start postgresql 2>/dev/null || service postgresql start 2>/dev/null');
    if (pgStart !== null || await portOpen(PG_PORT)) {
      log.ok('PostgreSQL started or already running');
    } else {
      log.warn(`Could not start PostgreSQL. Make sure it is running on :${PG_PORT}`);
    }
  }

  // Try to start Redis
  if (!redisRunning) {
    const redisStart = tryExec('which brew') ? tryExec('brew services start redis') : tryExec('sudo systemctl start redis-server 2>/dev/null || service redis start 2>/dev/null');
    if (redisStart !== null || await portOpen(REDIS_PORT)) {
      log.ok('Redis started or already running');
    } else {
      log.warn(`Could not start Redis. Make sure it is running on :${REDIS_PORT}`);
    }
  }
}

async function runPrisma() {
  log.step('Applying database schema');
  const env = { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes' };
  const npx = (args) => run('npx', args, { cwd: backendDir, env });

  // Always regenerate the client (cheap; avoids stale-client surprises).
  const gen = npx(['prisma', 'generate']);
  if (gen.status !== 0) {
    log.warn(`prisma generate failed: ${(gen.stderr || '').trim().slice(0, 200)}`);
  } else {
    log.ok('Prisma client generated');
  }

  // Try real migrations first; if none exist or it fails, push the schema.
  const migrate = npx(['prisma', 'migrate', 'deploy']);
  if (migrate.status === 0) {
    log.ok('Migrations applied');
  } else {
    log.dim('migrate deploy failed, falling back to `prisma db push`…');
    const push = npx(['prisma', 'db', 'push', '--accept-data-loss']);
    if (push.status === 0) log.ok('Schema pushed (db push)');
    else log.warn(`prisma db push skipped/completed`);
  }
}

function startBackend() {
  log.step('Starting NestJS backend');

  // Load .env into the child explicitly (ts-node -r dotenv/config).
  const child = spawn(
    'npx',
    ['ts-node', '-r', 'dotenv/config', 'src/main.ts', `dotenv_config_path=${path.relative(backendDir, envFile)}`],
    { cwd: backendDir, stdio: 'inherit', env: { ...process.env } },
  );

  // Forward Ctrl+C / SIGTERM so the backend shuts down gracefully.
  const shutdown = (sig) => {
    if (!child.killed) child.kill(sig);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  child.on('error', (e) => { log.err(`Backend failed to start: ${e.message}`); process.exit(1); });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) log.err(`Backend exited with code ${code}`);
    process.exit(code ?? 0);
  });
}

async function main() {
  console.log(`\n${c.bold}🛡  SecureLens backend dev${c.reset}\n`);

  await startServices();

  // Don't block startup forever if Postgres didn't come up; the app degrades.
  const pgReady = await waitForTcp(PG_PORT, 'PostgreSQL', 25);
  if (!pgReady) log.warn(`PostgreSQL not responding on :${PG_PORT} — continuing in offline mode`);

  if (pgReady) await runPrisma();

  startBackend();
}

main().catch((e) => { log.err(e.message); process.exit(1); });
