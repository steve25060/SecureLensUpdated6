# SecureLens Railway Deployment

SecureLens is deployed from this monorepo as **two Railway services** plus a managed PostgreSQL database.

## Services

### 1. Backend

Source repository: `steve25060/SecureLensUpdated6`  
Branch: `main`  
Root directory: `/`

Clear any custom **Build Command** or **Start Command** override in Railway so the Dockerfile build and its `CMD` are used.

Set this Railway service variable so Railway uses the correct Dockerfile:

```env
RAILWAY_DOCKERFILE_PATH=Dockerfile.backend
```

Recommended healthcheck path:

```text
/health
```

Required variables:

```env
NODE_ENV=production
DATABASE_URL=<reference the Railway PostgreSQL DATABASE_URL>
JWT_SECRET=<strong random secret, at least 32 bytes>
BACKEND_URL=https://web-production-e3c1e.up.railway.app
FRONTEND_URL=https://web-production-13bf9.up.railway.app
FRONTEND_ORIGIN=https://web-production-13bf9.up.railway.app
GITHUB_CALLBACK_URL=https://web-production-e3c1e.up.railway.app/api/auth/github/callback
GOOGLE_CALLBACK_URL=https://web-production-e3c1e.up.railway.app/api/auth/google/callback
```

Optional provider variables:

```env
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
CLAUDE_API_KEY=
DEEPSEEK_API_KEY=
OLLAMA_BASE_URL=
```

Optional queue variable:

```env
REDIS_URL=
```

Redis is not required for the current in-process live scan flow. When `REDIS_URL` is absent, the optional Bull queues stay disabled instead of connecting to localhost.

The backend Docker image runs `prisma migrate deploy` before starting NestJS. A failed migration prevents the service from starting instead of silently running against an outdated schema.

The backend listens on Railway's injected `PORT` value. Do not hardcode a Railway port.

### 2. Frontend

Source repository: `steve25060/SecureLensUpdated6`  
Branch: `main`  
Root directory: `/`

Clear any custom **Build Command** or **Start Command** override in Railway so the Dockerfile build and its `CMD` are used.

Set:

```env
RAILWAY_DOCKERFILE_PATH=Dockerfile.frontend
BACKEND_URL=https://web-production-e3c1e.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://web-production-e3c1e.up.railway.app
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_URL=https://web-production-13bf9.up.railway.app
NEXT_PUBLIC_ENABLE_DEMO_AUTH=false
```

The frontend uses the same-origin `/api/*` path. Next.js rewrites it server-side to the NestJS backend.

The frontend also listens on Railway's injected `PORT` value. Do not manually pin `PORT` on either web service unless you have a specific networking reason.

Recommended frontend healthcheck path: `/`.

## PostgreSQL

Add a Railway PostgreSQL service and reference its generated `DATABASE_URL` from the backend service instead of copying a static credential.

## OAuth provider dashboards

If Google or GitHub OAuth is enabled, configure these exact callback URLs in the corresponding provider console:

```text
https://web-production-e3c1e.up.railway.app/api/auth/google/callback
https://web-production-e3c1e.up.railway.app/api/auth/github/callback
```

## Security scanner runtime

The backend Docker image contains the website-scanning binaries required by the live website pipeline:

- dnsx
- Subfinder
- httpx
- WhatWeb
- testssl.sh
- Katana
- Nmap
- Nuclei

The SecureLens native HTTP, API, WAF, email, privacy, repository and correlation engines run through the bundled Node.js scanner scripts.

Repository scanning also performs built-in code-pattern, secret-pattern, dependency, IaC, CI/CD, container and license analysis. External Semgrep/Gitleaks/Trivy/Checkov binaries remain optional accelerators rather than prerequisites.

## Worker service

Do **not** deploy `apps/worker` as a Railway service yet.

The active production scan path currently executes from NestJS through `ScanExecutor`. The older worker code uses BullMQ while the backend's optional queue wrapper uses Bull 4; that legacy worker should only be activated after those queue contracts are unified.

## Final verification after deploy

Backend:

```text
GET https://web-production-e3c1e.up.railway.app/health
GET https://web-production-e3c1e.up.railway.app/ping
```

Frontend:

```text
https://web-production-13bf9.up.railway.app
```

Then verify:

1. Register/login succeeds.
2. Dashboard API requests return JSON.
3. AI provider Test Connection no longer returns HTML.
4. Create a scan only against a target you own or are explicitly authorized to test.
5. Scan status moves from RUNNING to COMPLETED or FAILED with real execution logs.
6. Findings are persisted in PostgreSQL.
