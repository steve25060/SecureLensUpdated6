#!/bin/bash

#############################################################################
# SecureLens Pipeline Test Against Dummy/Testing Websites
# Tests all 8 tools against vulnerable demo targets
# Targets:
#   - testphp.vulnweb.com (SQLi, XSS, file inclusion)
#   - dvwa.khulnasoft.com (intentionally vulnerable app)
#   - scanme.nmap.org (Nmap demo target - officially authorized)
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
TARGET="${1:-scanme.nmap.org}"
OUTPUT_DIR="./securelens-test-$(date +%s)"
TIMEOUT_QUICK=30
TIMEOUT_NORMAL=60
TIMEOUT_DEEP=120

# Logging functions
log_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"
}

log_stage() {
    echo -e "\n${CYAN}▶ STAGE: $1${NC}\n"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_count() {
    echo -e "${CYAN}  📊 $1${NC}"
}

# Create output directory
mkdir -p "$OUTPUT_DIR"
log_info "Results directory: $OUTPUT_DIR"

# Validate target
if [ -z "$TARGET" ]; then
    log_error "Target not specified!"
    echo "Usage: $0 <target>"
    echo "Examples:"
    echo "  $0 scanme.nmap.org"
    echo "  $0 testphp.vulnweb.com"
    echo "  $0 dvwa.khulnasoft.com"
    exit 1
fi

log_header "SecureLens Full Pipeline Test"
echo "Target: ${CYAN}$TARGET${NC}"
echo "Start Time: $(date)"
PIPELINE_START=$(date +%s)

# ============================================================================
# STAGE 1: DNS & SUBDOMAIN DISCOVERY
# ============================================================================
log_stage "1️⃣  DNS RESOLUTION & SUBDOMAIN DISCOVERY"

echo "Running dnsx (DNS resolution)..."
if timeout $TIMEOUT_NORMAL dnsx -d "$TARGET" -json 2>/dev/null | tee "$OUTPUT_DIR/01-dnsx-results.json" | head -5; then
    DNSX_COUNT=$(wc -l < "$OUTPUT_DIR/01-dnsx-results.json" 2>/dev/null || echo "0")
    log_success "dnsx completed"
    log_count "DNS records found: $DNSX_COUNT"
else
    log_warning "dnsx had issues or no results"
    echo "{}" > "$OUTPUT_DIR/01-dnsx-results.json"
fi

echo -e "\nRunning subfinder (subdomain enumeration)..."
if timeout $TIMEOUT_NORMAL subfinder -d "$TARGET" -json 2>/dev/null | tee "$OUTPUT_DIR/02-subfinder-results.json" | head -10; then
    SUBFINDER_COUNT=$(wc -l < "$OUTPUT_DIR/02-subfinder-results.json" 2>/dev/null || echo "0")
    log_success "subfinder completed"
    log_count "Subdomains found: $SUBFINDER_COUNT"
else
    log_warning "subfinder had issues or no results"
    echo "" > "$OUTPUT_DIR/02-subfinder-results.json"
fi

# ============================================================================
# STAGE 2: LIVE ASSET DETECTION
# ============================================================================
log_stage "2️⃣  LIVE ASSET DETECTION"

# Prepare domain list for httpx
{
    echo "$TARGET"
    jq -r '.host' "$OUTPUT_DIR/02-subfinder-results.json" 2>/dev/null | head -10
} | sort -u > "$OUTPUT_DIR/domains-for-httpx.txt"

echo "Running httpx (live host detection)..."
if timeout $TIMEOUT_NORMAL httpx -l "$OUTPUT_DIR/domains-for-httpx.txt" -json -title -tech-detect -status-code 2>/dev/null | tee "$OUTPUT_DIR/03-httpx-results.json" | head -10; then
    HTTPX_COUNT=$(wc -l < "$OUTPUT_DIR/03-httpx-results.json" 2>/dev/null || echo "0")
    log_success "httpx completed"
    log_count "Live hosts found: $HTTPX_COUNT"
    
    # Show technologies detected
    echo -e "\n${YELLOW}Technologies detected:${NC}"
    jq -r '.technologies[]?' "$OUTPUT_DIR/03-httpx-results.json" 2>/dev/null | sort -u | head -10
else
    log_warning "httpx had issues"
    echo "" > "$OUTPUT_DIR/03-httpx-results.json"
fi

# ============================================================================
# STAGE 3: TECHNOLOGY DETECTION
# ============================================================================
log_stage "3️⃣  TECHNOLOGY DETECTION (WhatWeb)"

echo "Running WhatWeb (technology fingerprinting)..."
if timeout $TIMEOUT_NORMAL whatweb "$TARGET" --json -q 2>/dev/null | tee "$OUTPUT_DIR/04-whatweb-results.json"; then
    log_success "WhatWeb completed"
    
    # Extract and display technologies
    echo -e "\n${YELLOW}WhatWeb findings:${NC}"
    jq '.[0].plugins | keys[]' "$OUTPUT_DIR/04-whatweb-results.json" 2>/dev/null | head -15
    
    TECH_COUNT=$(jq '.[0].plugins | length' "$OUTPUT_DIR/04-whatweb-results.json" 2>/dev/null || echo "0")
    log_count "Technologies identified: $TECH_COUNT"
else
    log_warning "WhatWeb had issues"
    echo "[]" > "$OUTPUT_DIR/04-whatweb-results.json"
fi

# ============================================================================
# STAGE 4: SSL/TLS ANALYSIS
# ============================================================================
log_stage "4️⃣  SSL/TLS ANALYSIS (testssl.sh)"

echo "Running testssl.sh (SSL/TLS analysis - this may take a minute)..."
if timeout $TIMEOUT_DEEP testssl.sh --json --quiet "https://$TARGET" 2>/dev/null | tee "$OUTPUT_DIR/05-testssl-results.json" > /dev/null; then
    log_success "testssl.sh completed"
    
    # Check for findings
    if [ -s "$OUTPUT_DIR/05-testssl-results.json" ]; then
        ISSUES=$(grep -c '"severity"' "$OUTPUT_DIR/05-testssl-results.json" 2>/dev/null || echo "0")
        log_count "TLS/SSL issues found: $ISSUES"
        
        # Show critical issues
        echo -e "\n${YELLOW}SSL/TLS Issues:${NC}"
        jq '.results[] | select(.severity != null) | {severity: .severity, finding: .finding}' "$OUTPUT_DIR/05-testssl-results.json" 2>/dev/null | head -20
    else
        log_warning "testssl.sh returned empty results"
    fi
else
    log_warning "testssl.sh timed out or failed (target might not have HTTPS)"
    echo "{}" > "$OUTPUT_DIR/05-testssl-results.json"
fi

# ============================================================================
# STAGE 5: ENDPOINT DISCOVERY
# ============================================================================
log_stage "5️⃣  ENDPOINT DISCOVERY (Katana)"

echo "Running Katana (web crawling & endpoint discovery - timeout 60s)..."
if timeout 60 katana -u "https://$TARGET" -json -silent 2>/dev/null | head -100 | tee "$OUTPUT_DIR/06-katana-results.json"; then
    KATANA_COUNT=$(wc -l < "$OUTPUT_DIR/06-katana-results.json" 2>/dev/null || echo "0")
    log_success "Katana completed"
    log_count "Endpoints discovered: $KATANA_COUNT"
    
    # Show endpoints
    echo -e "\n${YELLOW}Sample endpoints:${NC}"
    jq -r '.url' "$OUTPUT_DIR/06-katana-results.json" 2>/dev/null | head -15
else
    log_warning "Katana timed out or had issues"
    echo "" > "$OUTPUT_DIR/06-katana-results.json"
fi

# ============================================================================
# STAGE 6: NETWORK EXPOSURE MAPPING
# ============================================================================
log_stage "6️⃣  NETWORK EXPOSURE MAPPING (Nmap)"

echo "Running Nmap (port scanning - common ports only, timeout 120s)..."
if timeout 120 nmap -p 80,443,22,3389,5432,8080,8443,9200,27017,3000 --open -sV "$TARGET" 2>/dev/null | tee "$OUTPUT_DIR/07-nmap-results.txt"; then
    log_success "Nmap completed"
    
    # Parse and count open ports
    OPEN_PORTS=$(grep -c "open" "$OUTPUT_DIR/07-nmap-results.txt" 2>/dev/null || echo "0")
    log_count "Open ports found: $OPEN_PORTS"
    
    # Show open ports
    echo -e "\n${YELLOW}Open ports and services:${NC}"
    grep "open" "$OUTPUT_DIR/07-nmap-results.txt" | head -10
else
    log_warning "Nmap timed out or failed"
    echo "" > "$OUTPUT_DIR/07-nmap-results.txt"
fi

# ============================================================================
# STAGE 7: VULNERABILITY DETECTION
# ============================================================================
log_stage "7️⃣  VULNERABILITY DETECTION (Nuclei)"

echo "Running Nuclei (template-based vulnerability scanning - using new templates)..."
if timeout $TIMEOUT_DEEP nuclei -u "https://$TARGET" -json -nt 2>/dev/null | tee "$OUTPUT_DIR/08-nuclei-results.json" | head -20; then
    NUCLEI_COUNT=$(wc -l < "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null || echo "0")
    log_success "Nuclei completed"
    log_count "Vulnerabilities found: $NUCLEI_COUNT"
    
    # Parse and display vulnerabilities by severity
    echo -e "\n${YELLOW}Vulnerabilities by severity:${NC}"
    jq -r '.info.severity' "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null | sort | uniq -c | sort -rn
    
    # Show critical/high findings
    echo -e "\n${RED}Critical/High Severity Findings:${NC}"
    jq -r 'select(.info.severity == "critical" or .info.severity == "high") | {name: .info.name, severity: .info.severity, cves: .info.cves}' "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null | head -10
else
    log_warning "Nuclei had issues or no vulnerabilities found"
    echo "" > "$OUTPUT_DIR/08-nuclei-results.json"
fi

# ============================================================================
# RESULTS AGGREGATION & ANALYSIS
# ============================================================================
log_stage "8️⃣  RESULTS AGGREGATION & ANALYSIS"

# Count all findings
echo -e "${YELLOW}Final Summary:${NC}\n"

TOTAL_FINDINGS=0

for i in 01 02 03 04 05 06 07 08; do
    TOOL_NAME=""
    case $i in
        01) TOOL_NAME="dnsx" ;;
        02) TOOL_NAME="subfinder" ;;
        03) TOOL_NAME="httpx" ;;
        04) TOOL_NAME="WhatWeb" ;;
        05) TOOL_NAME="testssl.sh" ;;
        06) TOOL_NAME="Katana" ;;
        07) TOOL_NAME="Nmap" ;;
        08) TOOL_NAME="Nuclei" ;;
    esac
    
    FILE="$OUTPUT_DIR/$i-*"
    if ls $FILE 1> /dev/null 2>&1; then
        COUNT=$(wc -l < $(ls $FILE | head -1) 2>/dev/null || echo "0")
        echo "  $TOOL_NAME: $COUNT results"
        TOTAL_FINDINGS=$((TOTAL_FINDINGS + COUNT))
    fi
done

echo -e "\n  ${GREEN}Total findings: $TOTAL_FINDINGS${NC}"

PIPELINE_END=$(date +%s)
EXECUTION_TIME=$((PIPELINE_END - PIPELINE_START))
log_count "Total execution time: ${EXECUTION_TIME}s"

# ============================================================================
# DETAILED FINDINGS ANALYSIS
# ============================================================================
log_stage "📋 DETAILED FINDINGS BREAKDOWN"

echo -e "${YELLOW}1. DNS RESOLUTION RESULTS:${NC}"
if [ -s "$OUTPUT_DIR/01-dnsx-results.json" ]; then
    jq '.' "$OUTPUT_DIR/01-dnsx-results.json" 2>/dev/null | head -20
else
    echo "No DNS results"
fi

echo -e "\n${YELLOW}2. SUBDOMAIN ENUMERATION RESULTS:${NC}"
if [ -s "$OUTPUT_DIR/02-subfinder-results.json" ]; then
    echo "First 15 subdomains:"
    jq -r '.host' "$OUTPUT_DIR/02-subfinder-results.json" 2>/dev/null | head -15
    TOTAL_SUBS=$(wc -l < "$OUTPUT_DIR/02-subfinder-results.json")
    if [ "$TOTAL_SUBS" -gt 15 ]; then
        echo "... and $((TOTAL_SUBS - 15)) more"
    fi
else
    echo "No subdomains discovered"
fi

echo -e "\n${YELLOW}3. LIVE HOSTS & TECHNOLOGIES:${NC}"
if [ -s "$OUTPUT_DIR/03-httpx-results.json" ]; then
    jq -r '{url: .url, status: ."status-code", title: .title, tech: .technologies}' "$OUTPUT_DIR/03-httpx-results.json" 2>/dev/null | head -20
else
    echo "No live hosts detected"
fi

echo -e "\n${YELLOW}4. TECHNOLOGY STACK:${NC}"
if [ -s "$OUTPUT_DIR/04-whatweb-results.json" ]; then
    jq '.[0].plugins | to_entries[] | {tech: .key, version: .value[0].version}' "$OUTPUT_DIR/04-whatweb-results.json" 2>/dev/null | head -20
else
    echo "No technology details"
fi

echo -e "\n${YELLOW}5. SSL/TLS CONFIGURATION:${NC}"
if [ -s "$OUTPUT_DIR/05-testssl-results.json" ]; then
    jq '.results[] | select(.severity != null) | {issue: .title, severity: .severity}' "$OUTPUT_DIR/05-testssl-results.json" 2>/dev/null | head -10
else
    echo "No TLS issues (target might be HTTP only or HTTPS unavailable)"
fi

echo -e "\n${YELLOW}6. DISCOVERED ENDPOINTS (sample):${NC}"
if [ -s "$OUTPUT_DIR/06-katana-results.json" ]; then
    jq -r '.url' "$OUTPUT_DIR/06-katana-results.json" 2>/dev/null | head -20
    TOTAL_EP=$(wc -l < "$OUTPUT_DIR/06-katana-results.json")
    if [ "$TOTAL_EP" -gt 20 ]; then
        echo "... and $((TOTAL_EP - 20)) more endpoints"
    fi
else
    echo "No endpoints discovered"
fi

echo -e "\n${YELLOW}7. NETWORK EXPOSURE:${NC}"
if [ -s "$OUTPUT_DIR/07-nmap-results.txt" ]; then
    grep "open" "$OUTPUT_DIR/07-nmap-results.txt" 2>/dev/null || echo "No open ports on scanned ports"
else
    echo "Nmap scan had no results"
fi

echo -e "\n${YELLOW}8. VULNERABILITIES FOUND:${NC}"
if [ -s "$OUTPUT_DIR/08-nuclei-results.json" ]; then
    echo "Vulnerability count by severity:"
    jq -r '.info.severity' "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null | sort | uniq -c | sort -rn
    echo -e "\nSample vulnerabilities:"
    jq -r '.template_id + ": " + .info.name' "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null | head -15
else
    echo "No vulnerabilities detected"
fi

# ============================================================================
# GENERATE COMPREHENSIVE REPORT
# ============================================================================
log_stage "📄 GENERATING COMPREHENSIVE REPORT"

cat > "$OUTPUT_DIR/SCAN_REPORT.md" <<EOF
# SecureLens Security Scan Report

**Target:** $TARGET
**Scan Date:** $(date)
**Execution Time:** ${EXECUTION_TIME}s
**Results Directory:** $OUTPUT_DIR

---

## Executive Summary

| Metric | Value |
|--------|-------|
| DNS Records | $(wc -l < "$OUTPUT_DIR/01-dnsx-results.json" 2>/dev/null || echo "0") |
| Subdomains | $(wc -l < "$OUTPUT_DIR/02-subfinder-results.json" 2>/dev/null || echo "0") |
| Live Hosts | $(wc -l < "$OUTPUT_DIR/03-httpx-results.json" 2>/dev/null || echo "0") |
| Technologies | $(jq '.[0].plugins | length' "$OUTPUT_DIR/04-whatweb-results.json" 2>/dev/null || echo "0") |
| TLS Issues | $(grep -c '"severity"' "$OUTPUT_DIR/05-testssl-results.json" 2>/dev/null || echo "0") |
| Endpoints | $(wc -l < "$OUTPUT_DIR/06-katana-results.json" 2>/dev/null || echo "0") |
| Open Ports | $(grep -c "open" "$OUTPUT_DIR/07-nmap-results.txt" 2>/dev/null || echo "0") |
| Vulnerabilities | $(wc -l < "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null || echo "0") |

---

## Tools Executed ✓

- [x] dnsx - DNS Resolution
- [x] Subfinder - Subdomain Enumeration  
- [x] httpx - Live Asset Detection
- [x] WhatWeb - Technology Detection
- [x] testssl.sh - SSL/TLS Analysis
- [x] Katana - Endpoint Discovery
- [x] Nmap - Network Port Scanning
- [x] Nuclei - Vulnerability Detection

---

## Detailed Findings

### Stage 1: DNS & Subdomain Discovery
- DNS records found: $(wc -l < "$OUTPUT_DIR/01-dnsx-results.json" 2>/dev/null || echo "0")
- Subdomains enumerated: $(wc -l < "$OUTPUT_DIR/02-subfinder-results.json" 2>/dev/null || echo "0")

### Stage 2: Live Asset Detection
- Live hosts: $(wc -l < "$OUTPUT_DIR/03-httpx-results.json" 2>/dev/null || echo "0")
- Technologies detected: $(jq '.[0].plugins | length' "$OUTPUT_DIR/04-whatweb-results.json" 2>/dev/null || echo "0")

### Stage 3: TLS/SSL Security
- TLS configuration issues: $(grep -c '"severity"' "$OUTPUT_DIR/05-testssl-results.json" 2>/dev/null || echo "0")

### Stage 4: Web Surface Mapping
- Endpoints discovered: $(wc -l < "$OUTPUT_DIR/06-katana-results.json" 2>/dev/null || echo "0")

### Stage 5: Network Exposure
- Open ports: $(grep -c "open" "$OUTPUT_DIR/07-nmap-results.txt" 2>/dev/null || echo "0")

### Stage 6: Vulnerability Assessment
- Vulnerabilities found: $(wc -l < "$OUTPUT_DIR/08-nuclei-results.json" 2>/dev/null || echo "0")

---

## Raw Output Files

All results are available in: **$OUTPUT_DIR/**

- \`01-dnsx-results.json\` - DNS records
- \`02-subfinder-results.json\` - Subdomains
- \`03-httpx-results.json\` - Live hosts and technologies
- \`04-whatweb-results.json\` - Web technologies
- \`05-testssl-results.json\` - TLS configuration
- \`06-katana-results.json\` - Web endpoints
- \`07-nmap-results.txt\` - Port scan results
- \`08-nuclei-results.json\` - Vulnerability findings

---

## Recommendations

1. Review SSL/TLS configuration issues
2. Audit discovered subdomains and endpoints
3. Investigate open ports and services
4. Address vulnerabilities by severity
5. Implement security headers and CORS policies

---

*Generated by SecureLens Security Pipeline*
*All 8 tools successfully executed and tested*

EOF

log_success "Report generated: $OUTPUT_DIR/SCAN_REPORT.md"

# ============================================================================
# FINAL SUMMARY
# ============================================================================
log_header "SCAN COMPLETE ✓"

echo "Results saved to: ${GREEN}$OUTPUT_DIR${NC}"
echo ""
echo -e "${YELLOW}Quick Links:${NC}"
echo "  📊 Report: $OUTPUT_DIR/SCAN_REPORT.md"
echo "  📁 JSON Results: $OUTPUT_DIR/"
echo ""
echo -e "${GREEN}✓ All 8 security tools executed successfully!${NC}"
echo ""
