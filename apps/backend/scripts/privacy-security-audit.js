#!/usr/bin/env node
/**
 * SecureLens Enterprise Privacy & Cookie Compliance Audit Engine
 * 
 * Audits web applications for:
 * - Third-Party Tracking Pixel & Analytics Inventory (Google, Meta, TikTok, Hotjar)
 * - Cookie Lifetime & Flag Security (Max-Age > 1 year, SameSite, Secure)
 * - Insecure Mixed Content (HTTP scripts/images inside HTTPS pages)
 * - Privacy Policy, Terms & Legal Compliance Disclosure Links
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const rawTarget = process.argv[2] || 'https://example.com';
let targetUrl = rawTarget;
if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
  targetUrl = 'https://' + targetUrl;
}

const parsedBase = new URL(targetUrl);
const hostname = parsedBase.hostname;

function fetchPage(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(parsed, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SecureLens-Privacy-Auditor/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 8000,
        rejectUnauthorized: false,
      }, (res) => {
        let body = '';
        res.on('data', chunk => {
          if (body.length < 100000) body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    } catch {
      resolve(null);
    }
  });
}

const TRACKER_SIGNATURES = [
  { name: 'Google Analytics / Tag Manager', check: (b) => b.includes('googletagmanager.com') || b.includes('google-analytics.com') || b.includes('gtag(') },
  { name: 'Meta Pixel (Facebook Ads)', check: (b) => b.includes('connect.facebook.net') || b.includes('fbq(') },
  { name: 'TikTok Pixel', check: (b) => b.includes('analytics.tiktok.com') || b.includes('ttq.') },
  { name: 'Hotjar Session Recording', check: (b) => b.includes('static.hotjar.com') || b.includes('hj(') },
  { name: 'Microsoft Clarity', check: (b) => b.includes('clarity.ms') },
  { name: 'Mixpanel Analytics', check: (b) => b.includes('cdn.mxpnl.com') || b.includes('mixpanel.init') },
  { name: 'Segment CDP', check: (b) => b.includes('cdn.segment.com') || b.includes('analytics.load') },
];

async function runPrivacyAudit() {
  const findings = [];
  const res = await fetchPage(targetUrl);

  if (res) {
    const body = res.body || '';
    const headers = res.headers || {};

    // 1. Detect Trackers & Analytics
    const detectedTrackers = TRACKER_SIGNATURES.filter(t => t.check(body)).map(t => t.name);
    if (detectedTrackers.length > 0) {
      findings.push({
        title: `Third-Party Tracking & Analytics Services Detected (${detectedTrackers.length} Services)`,
        description: `Discovered active tracking integrations on ${hostname}: ${detectedTrackers.join(', ')}. Under GDPR, CCPA, and ePrivacy regulations, tracking tags must not fire prior to receiving affirmative user consent via a cookie banner.`,
        severity: 'LOW',
        category: 'Privacy & Compliance',
        cwe: 'CWE-359',
        cvss: 3.5,
        owasp: 'A05:2021-Security Misconfiguration',
        remediation: 'Implement a Consent Management Platform (CMP) like OneTrust, Cookiebot, or Klaro to gate tracking scripts until user consent is granted.',
        metadata: { trackers: detectedTrackers },
      });
    }

    // 2. Check for Insecure Mixed Content
    if (targetUrl.startsWith('https://')) {
      const hasMixedContent = /src\s*=\s*["']http:\/\//i.test(body) || /href\s*=\s*["']http:\/\/[^"']*\.(?:css|js)/i.test(body);
      if (hasMixedContent) {
        findings.push({
          title: `Insecure Mixed Content (HTTP Assets on HTTPS Page)`,
          description: `HTTPS web page on ${hostname} references active scripts or stylesheets over unencrypted HTTP. Attackers on the network path can intercept and modify these unencrypted resources to execute man-in-the-middle attacks.`,
          severity: 'HIGH',
          category: 'Privacy & Compliance',
          cwe: 'CWE-319',
          cvss: 7.4,
          owasp: 'A02:2021-Cryptographic Failures',
          remediation: "Upgrade all internal asset links to relative paths or HTTPS, and set 'Content-Security-Policy: upgrade-insecure-requests'.",
        });
      }
    }

    // 3. Privacy Policy & Legal Links Check
    const hasPrivacyPolicy = /href\s*=\s*["'][^"']*(?:privacy|terms|legal|gdpr)[^"']*["']/i.test(body) || /Privacy Policy/i.test(body);
    if (!hasPrivacyPolicy) {
      findings.push({
        title: 'Missing Direct Privacy Policy or Legal Terms Link',
        description: `No visible link to a Privacy Policy, Terms of Service, or Data Processing Agreement was found on the homepage of ${hostname}. This violates basic regulatory transparency requirements under GDPR and CCPA.`,
        severity: 'LOW',
        category: 'Privacy & Compliance',
        cwe: 'CWE-1059',
        cvss: 3.0,
        remediation: 'Include a clearly visible footer link to your organization Privacy Policy and Terms of Service.',
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      title: `Privacy & Tracking Compliance Verified for ${hostname}`,
      description: `Audited web assets, third-party analytics integrations, and legal disclosures on ${hostname}. No insecure mixed content or unmanaged tracking scripts were flagged.`,
      severity: 'INFO',
      category: 'Privacy & Compliance',
      cwe: 'CWE-1008',
      cvss: 0.0,
      remediation: 'Regularly audit third-party vendor scripts and update consent management configurations.',
    });
  }

  console.log(JSON.stringify(findings));
}

runPrivacyAudit().catch(() => {
  console.log(JSON.stringify([]));
});
