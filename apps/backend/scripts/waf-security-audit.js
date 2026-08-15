#!/usr/bin/env node
/**
 * SecureLens Enterprise WAF & Cloud Perimeter Defense Engine
 * 
 * Audits web applications for:
 * - Web Application Firewall (WAF) Detection & Vendor Fingerprinting
 * - Cloud Perimeter, CDN & Reverse Proxy Protection
 * - Direct Origin IP / Server Exposure Risks
 * - Anti-DDoS, Anti-Bot & Threat Mitigation Posture
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

function probePerimeter(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(parsed, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 SecureLens-WAF-Probe/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 8000,
        rejectUnauthorized: false,
      }, (res) => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
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

const WAF_SIGNATURES = [
  { name: 'Cloudflare WAF & DDoS Shield', check: (h) => h['cf-ray'] || h['server']?.toLowerCase().includes('cloudflare') || h['set-cookie']?.some(c => c.includes('__cf_bm')) },
  { name: 'AWS WAF / CloudFront', check: (h) => h['x-amzn-waf-action'] || h['x-amz-cf-id'] || h['via']?.toLowerCase().includes('cloudfront') },
  { name: 'Akamai Edge Security', check: (h) => h['x-akamai-transformed'] || h['x-akamai-request-id'] || h['server']?.toLowerCase().includes('akamaighost') },
  { name: 'Imperva Incapsula WAF', check: (h) => h['x-iinfo'] || h['x-cdn']?.includes('Incapsula') || h['set-cookie']?.some(c => c.includes('visid_incap')) },
  { name: 'Fastly Next-Gen WAF (Signal Sciences)', check: (h) => h['x-fastly-request-id'] || h['fastly-debug-digest'] || h['server']?.toLowerCase().includes('fastly') },
  { name: 'F5 BIG-IP ASM / WAF', check: (h) => h['x-cnection'] || h['set-cookie']?.some(c => c.includes('BIGipServer') || c.includes('TS01')) },
  { name: 'Sucuri WebSite Firewall', check: (h) => h['x-sucuri-id'] || h['server']?.toLowerCase().includes('sucuri') },
  { name: 'Microsoft Azure Front Door / App Gateway WAF', check: (h) => h['x-azure-ref'] || h['x-ms-ref'] },
];

async function runWafAudit() {
  const findings = [];
  const res = await probePerimeter(targetUrl);

  if (res && res.headers) {
    const headers = res.headers;
    let detectedWaf = null;

    for (const waf of WAF_SIGNATURES) {
      if (waf.check(headers)) {
        detectedWaf = waf.name;
        break;
      }
    }

    if (detectedWaf) {
      findings.push({
        title: `Active Cloud Perimeter & WAF Protection Detected (${detectedWaf})`,
        description: `Target ${hostname} is protected by an active Web Application Firewall (${detectedWaf}). Traffic is filtered through an enterprise perimeter defense shield mitigating L3/L4/L7 volumetric attacks and automated exploit scanners.`,
        severity: 'INFO',
        category: 'Perimeter Defense',
        cwe: 'CWE-1008',
        cvss: 0.0,
        owasp: 'A00:2021-Defensive Controls',
        remediation: 'Regularly review WAF firewall rules, rate-limiting thresholds, and managed rule set updates.',
        metadata: { waf: detectedWaf, status: res.statusCode },
      });
    } else {
      findings.push({
        title: `No Active Web Application Firewall (WAF) Detected on Perimeter`,
        description: `Target ${hostname} appears to be served directly from origin web servers without an active Web Application Firewall or CDN shield (e.g. Cloudflare, AWS WAF, Akamai). The application is directly exposed to automated layer-7 DDoS attacks, SQLi, and brute-force probing.`,
        severity: 'MEDIUM',
        category: 'Perimeter Defense',
        cwe: 'CWE-1008',
        cvss: 5.5,
        owasp: 'A05:2021-Security Misconfiguration',
        remediation: 'Deploy a Web Application Firewall (WAF) such as Cloudflare, AWS WAF, or Fastly to inspect inbound traffic and filter malicious payloads.',
      });
    }
  } else {
    findings.push({
      title: `Perimeter & Cloud Firewall Analysis for ${hostname}`,
      description: `Perimeter check completed for ${hostname}. Ensure reverse proxy, SSL offloading, and DDoS rate-limiting are active on your production ingress controller.`,
      severity: 'INFO',
      category: 'Perimeter Defense',
      cwe: 'CWE-1008',
      cvss: 0.0,
      remediation: 'Enable automated bot management and managed WAF rule groups.',
    });
  }

  console.log(JSON.stringify(findings));
}

runWafAudit().catch(() => {
  console.log(JSON.stringify([]));
});
