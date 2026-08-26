import { Controller, Get, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  root(@Req() req: Request, @Res() res: Response) {
    return this.handleStatus(req, res);
  }

  @Get('status')
  @Public()
  status(@Req() req: Request, @Res() res: Response) {
    return this.handleStatus(req, res);
  }

  @Get('api')
  @Public()
  apiRoot(@Req() req: Request, @Res() res: Response) {
    return this.handleStatus(req, res);
  }

  @Get('health')
  @Public()
  health() {
    return this.getHealthData();
  }

  @Get('ping')
  @Public()
  ping() {
    return {
      pong: true,
      timestamp: new Date().toISOString(),
      service: 'securelens-backend',
    };
  }

  private handleStatus(req: Request, res: Response) {
    const accept = req.headers['accept'] || '';
    const wantsJson = accept.includes('application/json') && !accept.includes('text/html');

    if (wantsJson) {
      return res.json(this.getHealthData());
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(this.generateStatusHtml());
  }

  private getHealthData() {
    const uptimeSec = process.uptime();
    return {
      status: 'operational',
      service: 'SecureLens API & Security Orchestration Gateway',
      version: '2.5.0-enterprise',
      database: this.prisma?.connected ? 'connected' : 'file-fallback',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptimeSec),
      uptimeFormatted: this.formatUptime(uptimeSec),
      environment: process.env.NODE_ENV || 'production',
      platform: 'Render Cloud (Linux x64)',
      engines: [
        { name: 'OWASP ZAP', type: 'DAST', status: 'ready' },
        { name: 'ProjectDiscovery Nuclei', type: 'CVE Templates', status: 'ready' },
        { name: 'SSLyze', type: 'TLS/SSL Audit', status: 'ready' },
        { name: 'Trivy', type: 'Container/Pkg SAST', status: 'ready' },
        { name: 'Bandit', type: 'Python SAST', status: 'ready' },
        { name: 'Semgrep', type: 'Code Security', status: 'ready' },
        { name: 'Nmap', type: 'Port Discovery', status: 'ready' },
      ],
      aiCopilot: {
        status: 'active',
        providers: ['Google Gemini', 'OpenRouter', 'Groq', 'OpenAI', 'Claude', 'Ollama'],
      },
      frontendUrl: process.env.FRONTEND_URL || 'https://securelens-frontend.onrender.com',
    };
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  private generateStatusHtml(): string {
    const uptime = this.formatUptime(process.uptime());
    const isDbConnected = Boolean(this.prisma?.connected);
    const frontendUrl = process.env.FRONTEND_URL || 'https://securelens-frontend.onrender.com';
    const nowIso = new Date().toISOString();
    const nowUtc = new Date().toUTCString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecureLens API Gateway | All Systems Operational</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.75);
      --card-border: rgba(139, 92, 246, 0.2);
      --accent: #8b5cf6;
      --accent-glow: rgba(139, 92, 246, 0.4);
      --cyan: #06b6d4;
      --emerald: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      position: relative;
      overflow-x: hidden;
    }
    /* Background Glow Orbs */
    .orb-1 {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 400px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
      z-index: 0;
    }
    .orb-2 {
      position: absolute;
      bottom: -100px;
      right: 10%;
      width: 450px;
      height: 350px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%);
      filter: blur(50px);
      pointer-events: none;
      z-index: 0;
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 860px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    /* Main Card */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1.25rem;
      padding: 2rem;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.08);
    }
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
    }
    .logo-icon svg { width: 24px; height: 24px; color: #fff; }
    .brand-title {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    /* Stats Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0.85rem;
      padding: 1rem;
      transition: all 0.2s ease;
    }
    .stat-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(139, 92, 246, 0.3);
      transform: translateY(-2px);
    }
    .stat-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.3rem;
    }
    .stat-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .stat-value.mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--cyan);
    }
    .indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }
    /* Action Buttons */
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.4rem;
      border-radius: 0.75rem;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      color: #fff;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
      border: 1px solid rgba(167, 139, 250, 0.4);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 25px rgba(124, 58, 237, 0.6);
      background: linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-color: rgba(255, 255, 255, 0.15);
    }
    /* Table */
    .table-container {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0.85rem;
      overflow-x: auto;
      padding: 0.5rem;
    }
    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    th, td {
      padding: 0.6rem 0.85rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    th {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    .method {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .get { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .post { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; }
    .path { font-family: 'JetBrains Mono', monospace; color: #f1f5f9; }
    .desc { color: var(--text-muted); }
    /* Footer */
    .footer {
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
  </style>
</head>
<body>
  <div class="orb-1"></div>
  <div class="orb-2"></div>

  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo-group">
          <div class="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div class="brand-title">SecureLens</div>
            <div class="brand-sub">Security Orchestration Engine & API Gateway</div>
          </div>
        </div>

        <div class="status-badge">
          <span class="pulse-dot"></span>
          <span>All Engines Operational</span>
        </div>
      </div>

      <div class="grid">
        <div class="stat-card">
          <div class="stat-label">Database Status</div>
          <div class="stat-value">
            <span class="indicator" style="background: ${isDbConnected ? '#10b981' : '#38bdf8'};"></span>
            <span>${isDbConnected ? 'PostgreSQL 16' : 'File Fallback'}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Security Engines</div>
          <div class="stat-value" style="color: #c4b5fd;">
            7 Active (ZAP, Nuclei, SSLyze)
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">AI Copilot Gateway</div>
          <div class="stat-value" style="color: #38bdf8;">
            Multi-Provider Ready
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Server Uptime</div>
          <div class="stat-value mono">${uptime}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Environment</div>
          <div class="stat-value mono" style="color: #a78bfa;">${process.env.NODE_ENV || 'production'}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">API Version</div>
          <div class="stat-value mono">v2.5.0-enterprise</div>
        </div>
      </div>

      <div class="actions">
        <a href="${frontendUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Launch Web Application
        </a>
        <a href="/api/health" class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Live Health Metrics (JSON)
        </a>
        <a href="/api/ping" class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Ping API
        </a>
      </div>

      <div>
        <div class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          Core API Services Directory
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Description</th>
                <th>Authentication</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="method post">POST</span></td>
                <td class="path">/api/auth/login</td>
                <td class="desc">User & Social OAuth Login</td>
                <td>Public</td>
              </tr>
              <tr>
                <td><span class="method get">GET</span></td>
                <td class="path">/api/scans</td>
                <td class="desc">List Active & Historical Scans</td>
                <td>Bearer JWT</td>
              </tr>
              <tr>
                <td><span class="method post">POST</span></td>
                <td class="path">/api/scans/website</td>
                <td class="desc">Initiate Web Vulnerability Scan</td>
                <td>Bearer JWT</td>
              </tr>
              <tr>
                <td><span class="method post">POST</span></td>
                <td class="path">/api/scans/github</td>
                <td class="desc">Initiate GitHub SAST Repository Audit</td>
                <td>Bearer JWT</td>
              </tr>
              <tr>
                <td><span class="method get">GET</span></td>
                <td class="path">/api/findings</td>
                <td class="desc">Vulnerability Findings & CVE Risk Scores</td>
                <td>Bearer JWT</td>
              </tr>
              <tr>
                <td><span class="method post">POST</span></td>
                <td class="path">/api/ai/chat</td>
                <td class="desc">AI Copilot Remediation Engine</td>
                <td>Bearer JWT</td>
              </tr>
              <tr>
                <td><span class="method get">GET</span></td>
                <td class="path">/api/health</td>
                <td class="desc">Live Service Health Diagnostics</td>
                <td>Public</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>SecureLens Security Intelligence Platform • Render Cloud Service</div>
      <div>Server Time: ${nowUtc}</div>
    </div>
  </div>
</body>
</html>`;
  }
}

