/**
 * SecureLens Universal Export & Download Utility
 * Supports exporting detailed website security scanning data in:
 * - JSON (Complete technical schema)
 * - CSV (Spreadsheet with CVSS, CWE, OWASP, Remediation)
 * - HTML / Printable PDF (Executive Audit Report with dark styling & printable CSS)
 * - Markdown (Developer & SecOps documentation)
 */

export interface ExportFinding {
  id: string;
  title: string;
  severity: string;
  source?: string;
  target?: string;
  status?: string;
  category?: string;
  cvss?: number;
  cwe?: string;
  owasp?: string;
  remediation?: string;
  description?: string;
  evidence?: string;
  aiExplanation?: string;
  createdAt?: string;
  scanId?: string;
}

export interface ExportScanData {
  id?: string;
  target: string;
  type?: string;
  score?: number;
  findingsCount?: number;
  engines?: string[];
  createdAt?: string;
  findings?: ExportFinding[];
  summary?: any;
}

/** Trigger direct browser download of a text or blob payload */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export findings as comprehensive JSON */
export function exportFindingsToJSON(findings: ExportFinding[], targetName: string = 'all-assets') {
  const payload = {
    platform: 'SecureLens Security Intelligence Platform',
    exportedAt: new Date().toISOString(),
    target: targetName,
    totalFindings: findings.length,
    severityBreakdown: {
      critical: findings.filter(f => f.severity?.toUpperCase() === 'CRITICAL').length,
      high: findings.filter(f => f.severity?.toUpperCase() === 'HIGH').length,
      medium: findings.filter(f => f.severity?.toUpperCase() === 'MEDIUM').length,
      low: findings.filter(f => f.severity?.toUpperCase() === 'LOW').length,
      info: findings.filter(f => f.severity?.toUpperCase() === 'INFO').length,
    },
    findings: findings.map(f => ({
      id: f.id,
      title: f.title,
      severity: f.severity?.toUpperCase() || 'INFO',
      cvssScore: f.cvss ?? (f.severity === 'CRITICAL' ? 9.8 : f.severity === 'HIGH' ? 7.5 : f.severity === 'MEDIUM' ? 5.3 : 2.5),
      cwe: f.cwe || 'CWE-Unknown',
      owaspCategory: f.owasp || 'A00:2021',
      category: f.category || 'General Vulnerability',
      target: f.target || targetName,
      scannerEngine: f.source || 'SecureLens Engine',
      status: f.status || 'NEW',
      description: f.description || '',
      remediationAdvice: f.remediation || 'Apply vendor patches and follow secure configuration best practices.',
      aiExplanation: f.aiExplanation || null,
      detectedAt: f.createdAt || new Date().toISOString(),
    })),
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const cleanTarget = targetName.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(jsonStr, `securelens_findings_${cleanTarget}_${Date.now()}.json`, 'application/json');
}

/** Export findings as CSV */
export function exportFindingsToCSV(findings: ExportFinding[], targetName: string = 'all-assets') {
  const headers = [
    'Finding ID',
    'Title',
    'Severity',
    'CVSS',
    'CWE',
    'OWASP',
    'Category',
    'Target Asset',
    'Detection Engine',
    'Status',
    'Description',
    'Remediation Advice',
    'Detected Date',
  ];

  const rows = findings.map(f => [
    `"${f.id || ''}"`,
    `"${(f.title || '').replace(/"/g, '""')}"`,
    `"${f.severity || 'INFO'}"`,
    `"${f.cvss ?? ''}"`,
    `"${f.cwe || ''}"`,
    `"${f.owasp || ''}"`,
    `"${(f.category || '').replace(/"/g, '""')}"`,
    `"${(f.target || targetName).replace(/"/g, '""')}"`,
    `"${(f.source || '').replace(/"/g, '""')}"`,
    `"${f.status || 'NEW'}"`,
    `"${(f.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${(f.remediation || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${f.createdAt || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const cleanTarget = targetName.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(csvContent, `securelens_findings_${cleanTarget}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

/** Export findings as formatted Markdown */
export function exportFindingsToMarkdown(findings: ExportFinding[], targetName: string = 'all-assets') {
  const critical = findings.filter(f => f.severity?.toUpperCase() === 'CRITICAL');
  const high = findings.filter(f => f.severity?.toUpperCase() === 'HIGH');
  const medium = findings.filter(f => f.severity?.toUpperCase() === 'MEDIUM');
  const low = findings.filter(f => f.severity?.toUpperCase() === 'LOW');

  let md = `# 🛡️ SecureLens Security Assessment Report\n\n`;
  md += `**Target Asset:** \`${targetName}\`  \n`;
  md += `**Generated Date:** ${new Date().toUTCString()}  \n`;
  md += `**Total Vulnerabilities Identified:** ${findings.length}  \n\n`;

  md += `## 📊 Executive Severity Summary\n\n`;
  md += `| Severity | Count | Priority Action |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| 🔴 **Critical** | ${critical.length} | Immediate Hotfix Required |\n`;
  md += `| 🟠 **High** | ${high.length} | Fix in next sprint (7 days) |\n`;
  md += `| 🟡 **Medium** | ${medium.length} | Schedule remediation (30 days) |\n`;
  md += `| 🟢 **Low / Info** | ${low.length} | Hardening & best practices |\n\n`;

  md += `## 📑 Detailed Technical Findings\n\n`;

  findings.forEach((f, idx) => {
    md += `### ${idx + 1}. [${f.severity}] ${f.title}\n\n`;
    md += `- **Target:** \`${f.target || targetName}\`\n`;
    md += `- **Category:** ${f.category || 'General'}\n`;
    if (f.cvss) md += `- **CVSS Score:** ${f.cvss}\n`;
    if (f.cwe) md += `- **CWE:** ${f.cwe}\n`;
    if (f.owasp) md += `- **OWASP:** ${f.owasp}\n`;
    md += `- **Detection Tool:** ${f.source || 'SecureLens Engine'}\n`;
    md += `- **Status:** \`${f.status || 'NEW'}\`\n\n`;
    md += `**Description:**  \n${f.description || 'No description provided.'}\n\n`;
    md += `**💡 Recommended Remediation:**  \n${f.remediation || 'Follow vendor guidance to resolve this vulnerability.'}\n\n`;
    md += `---\n\n`;
  });

  const cleanTarget = targetName.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(md, `securelens_report_${cleanTarget}_${Date.now()}.md`, 'text/markdown;charset=utf-8;');
}

/** Export comprehensive Executive HTML / PDF Printable Report */
export function exportSecurityReportHTML(reportData: {
  title: string;
  target: string;
  date?: string;
  score?: number;
  findings: ExportFinding[];
  engines?: string[];
}) {
  const { title, target, date = new Date().toLocaleDateString(), score = 82, findings, engines = [] } = reportData;

  const crit = findings.filter(f => f.severity?.toUpperCase() === 'CRITICAL');
  const high = findings.filter(f => f.severity?.toUpperCase() === 'HIGH');
  const med = findings.filter(f => f.severity?.toUpperCase() === 'MEDIUM');
  const low = findings.filter(f => f.severity?.toUpperCase() === 'LOW');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${target}</title>
  <style>
    @media print {
      body { background: #fff !important; color: #111 !important; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #090d16;
      color: #e2e8f0;
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }
    .container { max-width: 960px; margin: 0 auto; }
    .header {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .logo span { color: #a78bfa; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-high { background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.4); }
    .badge-medium { background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4); }
    .badge-low { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; text-align: center; }
    .card-val { font-size: 32px; font-weight: 800; margin-top: 4px; }
    .score-circle {
      width: 90px; height: 90px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px; font-size: 28px; font-weight: 900;
      background: ${score >= 80 ? 'rgba(34, 197, 94, 0.15)' : score >= 60 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      color: ${score >= 80 ? '#4ade80' : score >= 60 ? '#fde047' : '#f87171'};
      border: 3px solid ${score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'};
    }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #1e293b; text-align: left; padding: 12px; color: #94a3b8; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #1e293b; }
    .finding-item {
      background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 20px;
    }
    .remediation-box {
      background: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 12px;
    }
    .btn-print {
      background: #7c3aed; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="logo">Secure<span>Lens</span></div>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">Enterprise Security Audit & Vulnerability Assessment</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 18px; font-weight: 700; color: #fff;">${target}</div>
        <div style="color: #94a3b8; font-size: 12px;">Audit Date: ${date}</div>
      </div>
    </div>

    <div style="display: flex; gap: 24px; align-items: center; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
      <div style="text-align: center;">
        <div class="score-circle">${score}</div>
        <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Security Score</div>
      </div>
      <div style="flex: 1;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #fff;">Executive Summary</h2>
        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
          SecureLens automated scan pipeline executed comprehensive reconnaissance, port scanning, SSL evaluation, and vulnerability detection against <strong>${target}</strong>.
          A total of <strong>${findings.length} issues</strong> were discovered, including <strong>${crit.length} Critical</strong> and <strong>${high.length} High</strong> priority security vulnerabilities.
        </p>
        ${engines.length > 0 ? `<div style="margin-top: 12px; font-size: 12px; color: #a78bfa;">Active Engines: ${engines.join(', ')}</div>` : ''}
      </div>
    </div>

    <div class="grid">
      <div class="card"><div class="badge badge-critical">Critical</div><div class="card-val" style="color: #f87171;">${crit.length}</div></div>
      <div class="card"><div class="badge badge-high">High</div><div class="card-val" style="color: #fb923c;">${high.length}</div></div>
      <div class="card"><div class="badge badge-medium">Medium</div><div class="card-val" style="color: #fde047;">${med.length}</div></div>
      <div class="card"><div class="badge badge-low">Low / Info</div><div class="card-val" style="color: #4ade80;">${low.length}</div></div>
    </div>

    <h2 style="font-size: 18px; color: #fff; margin-bottom: 16px;">Vulnerability Findings Registry</h2>
    ${findings.map((f, idx) => `
      <div class="finding-item">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <span class="badge badge-${(f.severity || 'low').toLowerCase()}">${f.severity || 'INFO'}</span>
            <strong style="font-size: 15px; color: #fff; margin-left: 8px;">${idx + 1}. ${f.title}</strong>
          </div>
          <span style="font-size: 12px; color: #94a3b8;">${f.source || 'Scanner'}</span>
        </div>
        <p style="font-size: 13px; color: #cbd5e1; margin: 8px 0;">${f.description || ''}</p>
        <div style="display: flex; gap: 16px; font-size: 11px; color: #94a3b8; margin: 8px 0;">
          ${f.cvss ? `<span><strong>CVSS:</strong> ${f.cvss}</span>` : ''}
          ${f.cwe ? `<span><strong>CWE:</strong> ${f.cwe}</span>` : ''}
          ${f.owasp ? `<span><strong>OWASP:</strong> ${f.owasp}</span>` : ''}
          <span><strong>Target:</strong> ${f.target || target}</span>
        </div>
        <div class="remediation-box">
          <strong style="color: #a78bfa; font-size: 12px;">💡 Recommended Remediation:</strong>
          <div style="font-size: 12px; color: #e2e8f0; margin-top: 4px;">${f.remediation || 'Implement security patches and input validation.'}</div>
        </div>
      </div>
    `).join('')}

    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
      Generated automatically by SecureLens Security Intelligence Platform · Confidential Audit Document
    </div>
  </div>
</body>
</html>`;

  const cleanTarget = target.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(html, `securelens_report_${cleanTarget}_${Date.now()}.html`, 'text/html;charset=utf-8;');
}
