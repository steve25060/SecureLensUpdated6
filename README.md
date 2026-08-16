# 🛡️ SecureLens — Enterprise Cyber Defense & Full-Stack Security Platform

SecureLens is a next-generation, AI-augmented cybersecurity intelligence and automated vulnerability management platform. Built for SecOps teams, penetration testers, and enterprise DevOps pipelines, it unifies web surface reconnaissance, full-stack DAST/SAST vulnerability detection, repository auditing, and AI-powered code remediation into a single command center.

---

## 🌟 Key Features

- **Multi-Mode Scanner Orchestration**:
  - 🌐 **Website Reconnaissance & DAST**: Surface asset discovery, SSL/TLS ciphers, HTTP security headers, CORS/CSP analysis, subdomain enumeration.
  - 🐙 **GitHub & Repository SAST**: Automated static code analysis, Gitleaks secret detection, dependency vulnerability audits (SCA), container/Dockerfile security, and CI/CD security review.
  - ⚡ **Combined Full-Stack Posture**: Unified simultaneous scan correlating web exposure with backend repository source code.
- **19 Orchestrated Security Engines**:
  - Nuclei, OWASP ZAP, Nmap, TestSSL, DNSX, Subfinder, HTTPX, WhatWeb, Katana, Gitleaks, Semgrep, Dependency Check, and specialized heuristic scanners.
- **Unified Correlation & Risk Scoring**:
  - Contextual deduplication, multi-stage alert correlation, and real-time **0–100 Security Score Gauge**.
- **AI Security Copilot & Automated Fixes**:
  - Multi-provider LLM failover engine supporting **Google Gemini 3.5**, **Groq LPU (Llama 3.3 70B)**, **OpenRouter (Nemotron 3.5)**, **OpenAI (GPT-4o)**, **Claude 3.5**, **Local Ollama**, and automated Rule-Engine fallbacks.
  - Generates ready-to-merge code diff patches and explains complex exploit chains.
- **Executive & Technical Reporting**:
  - Export audit documents in **Executive PDF**, **Interactive HTML**, **SIEM-Ready JSON**, **CSV**, and **Markdown**.
- **Modern Cyber Theme Engine**:
  - 10 curated cybersecurity color palettes with live reactive CSS tokens and darkroom contrast modes.

---

## 🏗️ Architecture & Tech Stack

```
SecureLens
├── apps/
│   ├── frontend/         # Next.js 16 (Turbopack, React 19, Tailwind CSS, Framer Motion)
│   ├── backend/          # NestJS (Node.js REST API, WebSocket/SSE, Scanning Pipeline)
│   └── worker/           # Background Scan & Parser Worker Queue
├── packages/             # Shared TypeScript types, schemas, and logging utilities
└── docker-compose.yml    # Container orchestration for PostgreSQL & Redis
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20+`
- **pnpm**: `v9+` (`npm install -g pnpm`)
- **Docker**: (Optional, for PostgreSQL & Redis)

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/steve25060/SecureLensUpdated5.git
cd SecureLensUpdated5

# Install dependencies
pnpm install

# Start local database & services (PostgreSQL on 5433, Redis on 6380)
docker-compose up -d postgres redis
```

### 3. Run Application
```bash
# Terminal 1: Start Backend API (Port 4000)
cd apps/backend
npm run dev:full

# Terminal 2: Start Frontend Application (Port 3000)
cd apps/frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## ☁️ Deployment

### 1. Render / Railway / Cloud Hosting
- **Frontend**: Next.js App Router (`apps/frontend`)
- **Backend**: NestJS Service (`apps/backend`)
- **Database**: PostgreSQL with Prisma migrations (`apps/backend/prisma`)

### 2. Production Build Verification
```bash
# Verify backend compilation
cd apps/backend && npm run build

# Verify frontend build & static page prerendering
cd apps/frontend && npm run build
```

---

## 📜 License
This project is licensed under the MIT License.
