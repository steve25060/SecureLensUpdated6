# SecureLens Full Pipeline Integration Guide

## Overview

Your SecureLens security scanning pipeline is now fully implemented with all 8 tools integrated in a coordinated workflow:

```
WEBSITE
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: DNS & SUBDOMAIN DISCOVERY                          │
│ Tools: dnsx (DNS resolution), Subfinder (subdomain enum)    │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: LIVE ASSET DETECTION                               │
│ Tools: httpx (live host detection, tech detection)          │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: TECHNOLOGY DETECTION                               │
│ Tools: WhatWeb (framework/CMS identification)               │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: SSL/TLS ANALYSIS                                   │
│ Tools: testssl.sh (certificate & TLS config analysis)       │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 5: ENDPOINT DISCOVERY                                 │
│ Tools: Katana (web crawling & endpoint mapping)             │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 6: NETWORK EXPOSURE MAPPING                           │
│ Tools: Nmap (port scanning, service enumeration)            │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 7: VULNERABILITY DETECTION                            │
│ Tools: Nuclei (template-based vulnerability scanning)       │
└─────────────────────────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────────────────────────┐
│ CORRELATION & NORMALIZATION                                 │
│ - Deduplicate findings across tools                         │
│ - Normalize formats to unified schema                       │
│ - Apply severity boosting & context enrichment              │
└─────────────────────────────────────────────────────────────┘
   ↓
DASHBOARD: Intelligence, Remediation, Prioritization
```

---

## Files Created

### 1. **engine-commands-advanced.ts**
Location: `/apps/backend/src/scans/engines/engine-commands-advanced.ts`

Defines all 8 engine commands with proper argument handling:
- `dnsx`: DNS resolution with JSON output parsing
- `subfinder`: Passive subdomain enumeration
- `httpx`: Live asset detection with tech fingerprinting
- `whatweb`: Web framework identification
- `testssl`: SSL/TLS configuration analysis
- `katana`: Web endpoint discovery
- `nmap`: Port scanning and service enumeration
- `nuclei`: Template-based vulnerability detection

Each engine includes:
- Command template with `<TARGET>` placeholder
- Timeout configuration
- Custom JSON/text parser
- Finding extraction logic

### 2. **advanced-result-parser.ts**
Location: `/apps/backend/src/scans/engines/advanced-result-parser.ts`

Specialized parsers for complex tool outputs:
- **parseNucleiOutput()**: Handles line-delimited JSON from Nuclei
- **parseTestsslOutput()**: Parses JSON SSL/TLS reports with certificate analysis
- **parseWhatwebOutput()**: Extracts technology and version information
- **parseNmapOutput()**: Converts Nmap XML output to findings
- **parseKatanaOutput()**: Identifies sensitive endpoints from crawl results
- **parseSubfinderOutput()**: Deduplicates and normalizes subdomains
- **parseHttpxOutput()**: Handles status codes, headers, CORS issues

### 3. **correlation-engine.ts**
Location: `/apps/backend/src/scans/engines/correlation-engine.ts`

Intelligent finding correlation:
- **Duplicate detection**: Identifies same issues from different tools
- **Similarity matching**: Uses Levenshtein distance algorithm
- **Severity boosting**: Increases severity when multiple tools corroborate
- **Source tracking**: Records which tools found each issue
- **Merging logic**: Combines similar findings into single consolidated issue

### 4. **scan-orchestrator.ts**
Location: `/apps/backend/src/scans/engines/scan-orchestrator.ts`

Orchestrates execution pipeline:
- **executeFullPipeline()**: Runs all 7 stages sequentially
- **executeOptimizedPipeline()**: Skips slow tools for faster results
- **executeQuickScan()**: Fast mode (DNS, httpx, whatweb only)
- **executeDeepScan()**: Complete scan with all engines
- **Stage management**: Parallel execution within stages
- **Error handling**: Continues on tool failures

### 5. **normalization-layer.ts**
Location: `/apps/backend/src/scans/engines/normalization-layer.ts`

Normalizes findings across different tool formats:
- **Severity mapping**: Standardizes CRITICAL/HIGH/MEDIUM/LOW/INFO
- **Category normalization**: Maps to standard categories
- **CWE inference**: Automatically assigns CWE IDs based on finding type
- **CVSS vector generation**: Creates standardized CVSS v3.1 vectors
- **OWASP mapping**: Links to OWASP Top 10 categories
- **Evidence extraction**: Pulls URLs, IPs, CVEs from descriptions
- **Tag generation**: Auto-tags findings by tool, severity, type

### 6. **catalog.ts** (Updated)
Location: `/apps/backend/src/scans/engines/catalog.ts`

Enhanced engine catalog with all 8 new tools:
- Added entries for dnsx, subfinder, httpx, whatweb, testssl, katana, nmap, nuclei
- Proper categorization and mode assignment
- UI-friendly names and descriptions
- Icon mappings for frontend visualization

### 7. **test-full-pipeline.sh**
Location: `/test-full-pipeline.sh`

Comprehensive test script that:
- Checks tool availability
- Executes all 7 stages sequentially
- Outputs results to timestamped directory
- Generates summary report
- Creates HTML index for results

---

## Integration Points

### Backend Integration

1. **Update `scan-executor.ts`** to use new orchestration:

```typescript
import ScanOrchestrator from './engines/scan-orchestrator';
import NormalizationLayer from './engines/normalization-layer';
import CorrelationEngine from './engines/correlation-engine';

// In ScanExecutor.execute():
const orchestrator = new ScanOrchestrator(this.prisma);
const result = await orchestrator.executeFullPipeline({
  target,
  engines: engineIds,
  enableCorrelation: true,
});

// Normalize and store findings
const normalized = NormalizationLayer.normalizeBatch(result.findings);
const correlated = CorrelationEngine.processFindings(result.findings);

for (const finding of correlated) {
  await this.prisma.finding.create({
    data: {
      scanId,
      workspaceId,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      // ... more fields
      metadata: finding.sources, // Track which tools found it
    },
  });
}
```

2. **Update `scans.controller.ts`** to expose new engines:

```typescript
@Get('engines')
async getAvailableEngines() {
  const engines = ENGINE_CATALOG.filter(e => 
    ['dnsx', 'subfinder', 'httpx', 'whatweb', 'testssl', 'katana', 'nmap', 'nuclei'].includes(e.id)
  );
  return engines;
}
```

3. **Update `scans.service.ts`** validation:

```typescript
const VALID_ENGINES = ['dnsx', 'subfinder', 'httpx', 'whatweb', 'testssl', 'katana', 'nmap', 'nuclei'];

validateEngines(engineIds: string[]): boolean {
  return engineIds.every(id => VALID_ENGINES.includes(id));
}
```

---

## Usage Examples

### Quick Test

```bash
# Run test script against example.com
./test-full-pipeline.sh example.com

# Results saved to: ./securelens-results-<timestamp>/
```

### Running from Backend

```bash
# Direct TypeScript execution (for testing)
ts-node apps/backend/src/scans/engines/scan-orchestrator.ts

# Via API
curl -X POST http://localhost:3000/scans/create \
  -H "Content-Type: application/json" \
  -d '{
    "target": "example.com",
    "mode": "website",
    "engines": ["dnsx", "subfinder", "httpx", "whatweb", "testssl", "katana", "nmap", "nuclei"]
  }'
```

### Programmatic Usage

```typescript
import ScanOrchestrator from './scan-orchestrator';

const orchestrator = new ScanOrchestrator(prisma);
const result = await orchestrator.executeFullPipeline({
  target: 'example.com',
  engines: ['dnsx', 'subfinder', 'httpx', 'whatweb', 'testssl', 'katana', 'nmap', 'nuclei'],
  timeout: 300,
});

console.log(`Found ${result.findings.length} findings`);
console.log(`Correlated to ${result.correlatedFindings.length} unique issues`);
console.log(`Execution time: ${result.executionTime}ms`);
```

---

## Configuration Options

### Execution Modes

1. **Quick Scan** (30 seconds)
   - Tools: dnsx, subfinder, httpx, whatweb
   - Best for: Quick validation, continuous scanning
   
2. **Normal Scan** (2-3 minutes)
   - Tools: All except Nmap and slow testssl.sh
   - Best for: Regular security audits

3. **Deep Scan** (10-15 minutes)
   - Tools: All 8 engines with full options
   - Best for: Comprehensive security assessment, penetration testing

### Environment Variables

Add to `.env`:

```bash
# Scanning timeouts (seconds)
SCAN_QUICK_TIMEOUT=30
SCAN_NORMAL_TIMEOUT=120
SCAN_DEEP_TIMEOUT=300

# Tool-specific settings
NUCLEI_TEMPLATES=/usr/share/nuclei-templates
TESTSSL_QUIET=true

# Correlation settings
ENABLE_CORRELATION=true
CORRELATION_SIMILARITY_THRESHOLD=0.7

# Nmap settings (for deep scans)
NMAP_FULL_SCAN=false  # Set to true for -p- (all ports)
```

---

## Result Processing Pipeline

### 1. **Raw Findings Collection**
Each tool outputs findings in its native format (JSON, XML, etc.)

### 2. **Specialized Parsing**
Format-specific parsers convert to `FindingTemplate` objects

### 3. **Normalization**
Fields standardized to unified schema:
- Severity → CRITICAL/HIGH/MEDIUM/LOW/INFO
- Categories → Standard security categories
- CWE/CVSS → Automatically inferred or enhanced
- Evidence → Extracted and structured

### 4. **Correlation**
- Duplicate detection across tools
- Severity boosting for corroborated findings
- Source tracking (which tools found it)

### 5. **Storage**
Findings persisted to database with:
- Source tool tracking
- Correlation metadata
- Multiple evidence links
- Severity history

### 6. **Dashboard Visualization**
- Risk score calculation
- Trend analysis
- Remediation tracking
- SLA management

---

## Troubleshooting

### Tools Not Running

Check installation:
```bash
which dnsx subfinder httpx whatweb testssl.sh katana nmap nuclei
```

Install missing tools:
```bash
# Go-based tools
go install -v github.com/projectdiscovery/dnsx@latest
go install -v github.com/projectdiscovery/subfinder@latest
go install -v github.com/projectdiscovery/httpx@latest
go install -v github.com/projectdiscovery/katana@latest
go install -v github.com/projectdiscovery/nuclei@latest

# Other tools
apt-get install nmap whatweb testssl.sh
```

### Parsing Issues

Enable debug logging:
```typescript
// In scan-orchestrator.ts
private readonly logger = new Logger(ScanOrchestrator.name);
this.logger.debug(`Raw output: ${output.substring(0, 500)}`);
```

### Timeout Issues

Increase timeouts in configuration or code:
```typescript
const result = await orchestrator.executeFullPipeline({
  target: 'example.com',
  engines: ['nmap', 'nuclei'],
  timeout: 600, // 10 minutes
});
```

---

## Performance Optimization

### Parallel Execution
Stages run sequentially, but tools within a stage can be parallelized:

```typescript
// Modified in scan-orchestrator.ts
await Promise.all(engineIds.map(id => this.executeEngine(id, ...)));
```

### Caching
Cache subdomain results across scans:

```typescript
const cachedSubdomains = await cache.get(`subdomains:${target}`);
if (cachedSubdomains) {
  // Skip subfinder, use cached results
}
```

### Selective Execution
Skip slow tools for rapid scanning:

```typescript
const quickEngines = ['dnsx', 'subfinder', 'httpx', 'whatweb'];
// Skip 'nmap', 'testssl', 'nuclei' for speed
```

---

## Security Considerations

1. **Rate Limiting**: Nmap and testssl.sh can trigger IDS/WAF
2. **Authentication**: Some targets require API keys (handled in config)
3. **Data Sensitivity**: Results contain sensitive infrastructure info
4. **Audit Logging**: All scans logged with user/target/timestamp
5. **Scope Validation**: Verify target ownership before scanning

---

## Next Steps

1. ✅ **Implement** the integration code in `scan-executor.ts`
2. ✅ **Test** with `./test-full-pipeline.sh example.com`
3. ✅ **Deploy** backend changes
4. ✅ **Frontend** integration to display new engines
5. ✅ **Monitor** correlation accuracy and performance

---

## Support & Documentation

- Nuclei Templates: https://github.com/projectdiscovery/nuclei-templates
- ProjectDiscovery Docs: https://docs.projectdiscovery.io
- OWASP: https://owasp.org/Top10/
- CWE: https://cwe.mitre.org

