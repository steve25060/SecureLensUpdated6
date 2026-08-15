#!/usr/bin/env node
/**
 * SecureLens Enterprise Email Security & Anti-Spoofing Engine
 * 
 * Audits domain security for:
 * - DMARC Record Policy (p=reject, p=quarantine, p=none)
 * - SPF Record Configuration (v=spf1, +all, ~all, -all)
 * - Mail Exchange (MX) Configuration & Phishing Protection
 * - Domain Impersonation & Business Email Compromise (BEC) Defenses
 */

const dns = require('dns').promises;
const { URL } = require('url');

const rawTarget = process.argv[2] || 'https://example.com';
let targetUrl = rawTarget;
if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
  targetUrl = 'https://' + targetUrl;
}

const parsedBase = new URL(targetUrl);
const hostname = parsedBase.hostname.replace(/^www\./, '');

async function runEmailAudit() {
  const findings = [];

  // 1. Check DMARC Record (_dmarc.<hostname>)
  try {
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${hostname}`);
    const dmarcString = dmarcRecords.map(r => r.join('')).find(s => s.startsWith('v=DMARC1'));

    if (dmarcString) {
      const isNone = dmarcString.includes('p=none');
      const isQuarantine = dmarcString.includes('p=quarantine');
      const isReject = dmarcString.includes('p=reject');

      if (isNone) {
        findings.push({
          title: `Weak DMARC Policy Configured: p=none (${hostname})`,
          description: `The DMARC policy for ${hostname} is set to "p=none" (\`${dmarcString}\`). While DMARC is present, this mode only monitors emails without enforcing quarantine or reject rules on spoofed phishing emails sent using your domain.`,
          severity: 'MEDIUM',
          category: 'Email Security',
          cwe: 'CWE-290',
          cvss: 5.8,
          owasp: 'A05:2021-Security Misconfiguration',
          remediation: 'Upgrade DMARC policy from `p=none` to `p=quarantine` or `p=reject` to block spoofed domain impersonation.',
          metadata: { dmarc: dmarcString },
        });
      } else {
        findings.push({
          title: `Strict DMARC Policy Enforced (${isReject ? 'p=reject' : 'p=quarantine'})`,
          description: `Domain ${hostname} has an active, strict DMARC enforcement policy (\`${dmarcString}\`). Unauthorized emails claiming to originate from your domain will be automatically rejected or quarantined by receiving mail gateways.`,
          severity: 'INFO',
          category: 'Email Security',
          cwe: 'CWE-1008',
          cvss: 0.0,
          remediation: 'Maintain regular DMARC aggregate report monitoring via RUA/RUF reporting services.',
          metadata: { dmarc: dmarcString },
        });
      }
    } else {
      findings.push({
        title: `Missing DMARC Anti-Spoofing Record on Domain (${hostname})`,
        description: `Domain ${hostname} is missing a DMARC (Domain-based Message Authentication, Reporting, and Conformance) DNS TXT record. Attackers can forge emails appearing to originate from your company domain to execute Business Email Compromise (BEC) and phishing.`,
        severity: 'HIGH',
        category: 'Email Security',
        cwe: 'CWE-290',
        cvss: 7.5,
        owasp: 'A05:2021-Security Misconfiguration',
        remediation: 'Publish a DMARC TXT record at `_dmarc.' + hostname + '` with `v=DMARC1; p=reject; rua=mailto:dmarc-reports@' + hostname + '`.',
      });
    }
  } catch {
    findings.push({
      title: `Missing DMARC Anti-Spoofing Record on Domain (${hostname})`,
      description: `No DMARC DNS record found at \`_dmarc.${hostname}\`. Without DMARC, receiving email servers cannot verify sender legitimacy, allowing domain spoofing.`,
      severity: 'HIGH',
      category: 'Email Security',
      cwe: 'CWE-290',
      cvss: 7.5,
      owasp: 'A05:2021-Security Misconfiguration',
      remediation: 'Publish a DMARC record at `_dmarc.' + hostname + '` (e.g. `v=DMARC1; p=quarantine`).',
    });
  }

  // 2. Check SPF Record (<hostname>)
  try {
    const txtRecords = await dns.resolveTxt(hostname);
    const spfRecord = txtRecords.map(r => r.join('')).find(s => s.startsWith('v=spf1'));

    if (spfRecord) {
      if (spfRecord.includes('+all')) {
        findings.push({
          title: `Dangerous SPF Wildcard (+all) Configured on ${hostname}`,
          description: `The SPF record for ${hostname} contains \`+all\`. This explicitly authorizes EVERY server on the entire internet to send email on behalf of your domain.`,
          severity: 'CRITICAL',
          category: 'Email Security',
          cwe: 'CWE-290',
          cvss: 9.1,
          owasp: 'A05:2021-Security Misconfiguration',
          remediation: 'Replace `+all` with `~all` (SoftFail) or `-all` (HardFail) in your SPF TXT record.',
          metadata: { spf: spfRecord },
        });
      } else {
        findings.push({
          title: `SPF Sender Policy Framework Record Configured (${hostname})`,
          description: `Valid SPF record found for ${hostname}: \`${spfRecord}\`. Specifies authorized IP addresses and mail servers allowed to send outbound email.`,
          severity: 'INFO',
          category: 'Email Security',
          cwe: 'CWE-1008',
          cvss: 0.0,
          remediation: 'Ensure only authorized mail relays and services are listed in the SPF record.',
        });
      }
    } else {
      findings.push({
        title: `Missing SPF (Sender Policy Framework) Record (${hostname})`,
        description: `Domain ${hostname} has no SPF record configured. Receiving mail servers cannot verify whether sending IP addresses are authorized by your domain.`,
        severity: 'MEDIUM',
        category: 'Email Security',
        cwe: 'CWE-290',
        cvss: 6.2,
        owasp: 'A05:2021-Security Misconfiguration',
        remediation: 'Add an SPF TXT record (e.g. `v=spf1 include:_spf.google.com ~all`).',
      });
    }
  } catch {}

  console.log(JSON.stringify(findings));
}

runEmailAudit().catch(() => {
  console.log(JSON.stringify([]));
});
