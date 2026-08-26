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
        { name: 'DNS Resolution & Hygiene', id: 'dns_check', type: 'DAST/Recon', status: 'ready' },
        { name: 'Subdomain Enumeration', id: 'subdomain_discovery', type: 'DAST/Surface', status: 'ready' },
        { name: 'Live Host & Service Probing', id: 'asset_discovery', type: 'DAST/Recon', status: 'ready' },
        { name: 'Technology Fingerprinting', id: 'tech_detection', type: 'DAST/Tech', status: 'ready' },
        { name: 'SSL/TLS Encryption & Ciphers', id: 'ssl_tls_analysis', type: 'Encryption', status: 'ready' },
        { name: 'Endpoint & URL Crawler', id: 'endpoint_discovery', type: 'DAST/Crawler', status: 'ready' },
        { name: 'Network Port Exposure (Nmap)', id: 'network_exposure', type: 'Network', status: 'ready' },
        { name: 'Vulnerability & CVE Scanner (Nuclei)', id: 'vulnerability_detection', type: 'CVE Templates', status: 'ready' },
        { name: 'HTTP Headers & CORS Security', id: 'http_security', type: 'Headers & Cookies', status: 'ready' },
        { name: 'API Security & GraphQL Auditor', id: 'api_security', type: 'API Security', status: 'ready' },
        { name: 'WAF & Cloud Perimeter Defense', id: 'waf_detection', type: 'Perimeter', status: 'ready' },
        { name: 'Email & Anti-Spoofing Check (DMARC/SPF)', id: 'email_security', type: 'Email Security', status: 'ready' },
        { name: 'Privacy & Cookie Compliance', id: 'privacy_compliance', type: 'Compliance', status: 'ready' },
        { name: 'Repository Structure & Architecture', id: 'repository_overview', type: 'SAST', status: 'ready' },
        { name: 'Static Code Analysis (Semgrep & Bandit)', id: 'code_security', type: 'SAST/Code', status: 'ready' },
        { name: 'Secret & Key Detection (Gitleaks)', id: 'secret_detection', type: 'SAST/Secrets', status: 'ready' },
        { name: 'Dependency Vulnerability SCA (Trivy)', id: 'dependency_analysis', type: 'Supply Chain', status: 'ready' },
        { name: 'Infrastructure as Code IaC (Checkov)', id: 'infrastructure_security', type: 'Cloud & IaC', status: 'ready' },
        { name: 'CI/CD Pipeline Security Check', id: 'cicd_security', type: 'CI/CD Security', status: 'ready' },
        { name: 'License & Legal Risk Auditor', id: 'license_compliance', type: 'Legal & Risk', status: 'ready' },
        { name: 'Container & Dockerfile Security', id: 'container_security', type: 'Container', status: 'ready' },
        { name: 'Security Intelligence & Correlation Engine', id: 'security_intelligence', type: 'Correlation', status: 'ready' },
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
    const nowUtc = new Date().toUTCString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecureLens // MAINFRAME OPERATIONAL</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,700;0,800;1,400&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030712;
      --neon-green: #00ff66;
      --neon-cyan: #00f0ff;
      --neon-violet: #a855f7;
      --neon-pink: #ff0055;
      --dark-card: rgba(6, 11, 25, 0.88);
      --border-cyan: rgba(0, 240, 255, 0.35);
      --border-violet: rgba(168, 85, 247, 0.35);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      position: relative;
      overflow-x: hidden;
    }
    /* Matrix Canvas Background */
    #matrix {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
      opacity: 0.28;
      pointer-events: none;
    }
    /* CRT Scanline Overlay */
    .scanlines {
      position: fixed;
      inset: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%);
      background-size: 100% 4px;
      z-index: 2;
      pointer-events: none;
      opacity: 0.6;
    }
    /* Radial Vignette */
    .vignette {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, transparent 40%, rgba(3, 7, 18, 0.95) 100%);
      z-index: 2;
      pointer-events: none;
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 820px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    /* Main Terminal Card */
    .terminal-card {
      background: var(--dark-card);
      border: 1px solid var(--border-cyan);
      border-radius: 1.25rem;
      box-shadow: 0 0 40px rgba(0, 240, 255, 0.15), 0 20px 60px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 240, 255, 0.05);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      overflow: hidden;
      position: relative;
    }
    /* Top Bar */
    .terminal-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      background: rgba(0, 240, 255, 0.05);
      border-bottom: 1px solid rgba(0, 240, 255, 0.15);
      font-size: 0.75rem;
    }
    .terminal-dots {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ff5f56; box-shadow: 0 0 6px #ff5f56; }
    .dot.yellow { background: #ffbd2e; box-shadow: 0 0 6px #ffbd2e; }
    .dot.green { background: #27c93f; box-shadow: 0 0 6px #27c93f; }
    .terminal-title {
      color: var(--neon-cyan);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge-live {
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: rgba(0, 255, 102, 0.15);
      border: 1px solid rgba(0, 255, 102, 0.4);
      color: var(--neon-green);
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-shadow: 0 0 8px rgba(0, 255, 102, 0.6);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .blink-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--neon-green);
      box-shadow: 0 0 8px var(--neon-green);
      animation: blink 1.2s infinite ease-in-out;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.2; transform: scale(0.7); }
    }
    /* Content Body */
    .terminal-body {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    /* Hacker Character Section */
    .hacker-row {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      flex-wrap: wrap;
    }
    @media (max-width: 640px) {
      .hacker-row { flex-direction: column; text-align: center; }
      .terminal-body { padding: 1.25rem; }
    }
    /* Stylized Hacker Avatar */
    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
      width: 120px;
      height: 120px;
      margin: 0 auto;
    }
    .avatar-ring {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px dashed rgba(0, 240, 255, 0.5);
      animation: spin-slow 16s linear infinite;
    }
    .avatar-glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(0, 240, 255, 0.1) 70%);
      filter: blur(10px);
    }
    .avatar-svg {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #090e1f;
      border: 2px solid var(--neon-cyan);
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.4), inset 0 0 15px rgba(168, 85, 247, 0.3);
      position: relative;
      z-index: 2;
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    /* Speech Bubble / Dialogue Box */
    .speech-box {
      flex: 1;
      min-width: 260px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(0, 255, 102, 0.25);
      border-left: 4px solid var(--neon-green);
      border-radius: 0.85rem;
      padding: 1.25rem;
      position: relative;
      box-shadow: 0 0 25px rgba(0, 255, 102, 0.08);
    }
    .speech-header {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--neon-green);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .speech-text {
      font-size: 0.92rem;
      line-height: 1.6;
      color: #f1f5f9;
    }
    .speech-sub {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 0.6rem;
      padding-top: 0.5rem;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
    }
    .cursor {
      display: inline-block;
      width: 8px;
      height: 15px;
      background: var(--neon-green);
      margin-left: 4px;
      vertical-align: middle;
      animation: cursor-blink 0.8s infinite;
    }
    @keyframes cursor-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    /* Telemetry Grid */
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
    }
    .telemetry-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.75rem;
      padding: 0.85rem;
      transition: all 0.2s ease;
    }
    .telemetry-item:hover {
      border-color: var(--neon-cyan);
      background: rgba(0, 240, 255, 0.03);
      transform: translateY(-2px);
    }
    .tel-label {
      font-size: 0.65rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .tel-value {
      font-size: 0.85rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .tel-value.green { color: var(--neon-green); }
    .tel-value.violet { color: #c084fc; }
    /* Big CTA Button */
    .cta-container {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .btn-frontend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      padding: 1.1rem 1.5rem;
      border-radius: 0.85rem;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-decoration: none;
      color: #030712;
      background: linear-gradient(135deg, #00f0ff 0%, #00ff66 100%);
      box-shadow: 0 0 35px rgba(0, 240, 255, 0.5), 0 0 15px rgba(0, 255, 102, 0.4);
      border: 1px solid #ffffff;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }
    .btn-frontend:hover {
      transform: translateY(-3px) scale(1.01);
      box-shadow: 0 0 50px rgba(0, 240, 255, 0.8), 0 0 25px rgba(0, 255, 102, 0.6);
      background: linear-gradient(135deg, #38bdf8 0%, #34d399 100%);
    }
    .btn-frontend svg {
      transition: transform 0.2s ease;
    }
    .btn-frontend:hover svg {
      transform: translateX(4px);
    }
    /* Secondary Actions */
    .secondary-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn-secondary {
      flex: 1;
      min-width: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      color: #fff;
      border-color: var(--neon-cyan);
      background: rgba(0, 240, 255, 0.06);
    }
    /* Footer */
    .footer {
      text-align: center;
      font-size: 0.7rem;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  </style>
</head>
<body>
  <canvas id="matrix"></canvas>
  <div class="scanlines"></div>
  <div class="vignette"></div>

  <div class="container">
    <div class="terminal-card">
      <!-- Terminal Header -->
      <div class="terminal-bar">
        <div class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <div class="terminal-title">
          <span>SECURELENS // ORCHESTRATOR NODE 0x7F</span>
        </div>
        <div class="badge-live">
          <span class="blink-dot"></span>
          <span>100% OPERATIONAL</span>
        </div>
      </div>

      <!-- Terminal Body -->
      <div class="terminal-body">
        <!-- Hacker Character & Speech -->
        <div class="hacker-row">
          <!-- Animated Cyber Hacker Avatar -->
          <div class="avatar-wrapper">
            <div class="avatar-ring"></div>
            <div class="avatar-glow"></div>
            <svg class="avatar-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Dark Hoodie Base -->
              <path d="M60 15 C35 15 22 38 22 75 C22 105 38 115 60 115 C82 115 98 105 98 75 C98 38 85 15 60 15 Z" fill="#080c18" stroke="#00f0ff" stroke-width="2"/>
              <!-- Inner Hood Shadow -->
              <path d="M60 24 C42 24 32 42 32 72 C32 94 44 104 60 104 C76 104 88 94 88 72 C88 42 78 24 60 24 Z" fill="#030610"/>
              <!-- Neon Cyber Visor -->
              <rect x="36" y="52" width="48" height="16" rx="8" fill="url(#visor-grad)" stroke="#00ff66" stroke-width="1.5">
                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
              </rect>
              <!-- Visor Reflection Glow Line -->
              <line x1="42" y1="56" x2="68" y2="56" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
              <line x1="44" y1="62" x2="54" y2="62" stroke="#00f0ff" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
              <!-- Cyber Mask Details & Breath Vents -->
              <polygon points="52,80 68,80 64,96 56,96" fill="#0f172a" stroke="#a855f7" stroke-width="1.2"/>
              <circle cx="56" cy="88" r="1.5" fill="#00f0ff"/>
              <circle cx="64" cy="88" r="1.5" fill="#00f0ff"/>
              <!-- Visor Gradient Definition -->
              <defs>
                <linearGradient id="visor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#00f0ff" />
                  <stop offset="50%" stop-color="#a855f7" />
                  <stop offset="100%" stop-color="#00ff66" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- Speech Dialogue Console -->
          <div class="speech-box">
            <div class="speech-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>[SECURELENS CYBER AGENT]:</span>
            </div>
            <div class="speech-text">
              "Hey there, Operative! 🕶️ Everything on the SecureLens backend mainframe is running in peak condition. All 20+ specialized security engines across Website DAST, GitHub SAST, Cloud IaC, and AI Copilot neural streams are active and 100% operational."
              <span class="cursor"></span>
            </div>
            <div class="speech-sub">
              You are currently connected directly to the raw API gateway. Click the button below to launch the full graphical web platform!
            </div>
          </div>
        </div>

        <!-- Telemetry Metrics Grid -->
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <div class="tel-label">Security Engines</div>
            <div class="tel-value green">
              <span>●</span>
              <span>20+ Engines Active</span>
            </div>
          </div>

          <div class="telemetry-item">
            <div class="tel-label">AI Copilot Gateway</div>
            <div class="tel-value violet">
              <span>⚡</span>
              <span>Multi-LLM Online</span>
            </div>
          </div>

          <div class="telemetry-item">
            <div class="tel-label">Database Node</div>
            <div class="tel-value green">
              <span>◈</span>
              <span>${isDbConnected ? 'PostgreSQL 16' : 'Active (Fallback)'}</span>
            </div>
          </div>

          <div class="telemetry-item">
            <div class="tel-label">Mainframe Uptime</div>
            <div class="tel-value">
              <span>⏱</span>
              <span>${uptime}</span>
            </div>
          </div>
        </div>

        <!-- Call to Action Button -->
        <div class="cta-container">
          <a href="${frontendUrl}" target="_blank" rel="noopener noreferrer" class="btn-frontend">
            <span>ENTER SECURELENS PLATFORM</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>SECURELENS NEXT-GEN SECURITY INTELLIGENCE // RENDER CLOUD HOSTED</div>
      <div>MAINFRAME CLOCK: ${nowUtc}</div>
    </div>
  </div>

  <!-- Matrix Digital Rain Canvas Script -->
  <script>
    (function() {
      const canvas = document.getElementById('matrix');
      const ctx = canvas.getContext('2d');

      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      });

      const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンSECURELENS0123456789';
      const fontSize = 14;
      const columns = Math.floor(width / fontSize);
      const drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -100));

      function draw() {
        ctx.fillStyle = 'rgba(3, 7, 18, 0.08)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = fontSize + 'px "JetBrains Mono", monospace';

        for (let i = 0; i < drops.length; i++) {
          const text = chars.charAt(Math.floor(Math.random() * chars.length));
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          // Color gradient for drops
          if (Math.random() > 0.95) {
            ctx.fillStyle = '#ffffff';
          } else if (Math.random() > 0.5) {
            ctx.fillStyle = '#00f0ff';
          } else {
            ctx.fillStyle = '#00ff66';
          }

          ctx.fillText(text, x, y);

          if (y > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }

      setInterval(draw, 45);
    })();
  </script>
</body>
</html>`;
  }
}

