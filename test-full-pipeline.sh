#!/bin/bash

#############################################################################
# SecureLens Full Pipeline Test Script
# Tests all 8 security scanning tools in the proper sequence
# Usage: ./test-full-pipeline.sh [TARGET] [OPTIONAL_FLAGS]
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TARGET="${1:-example.com}"
TIMEOUT_QUICK=30
TIMEOUT_NORMAL=60
TIMEOUT_DEEP=300
OUTPUT_DIR="./securelens-results-$(date +%s)"
ENABLE_DEEP_SCAN="${2:-false}"

# Logging
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

# Create output directory
mkdir -p "$OUTPUT_DIR"
log_info "Results will be saved to: $OUTPUT_DIR"

# Check tool availability
check_tool() {
    local tool="$1"
    if ! command -v "$tool" &> /dev/null; then
        log_error "Tool not found: $tool"
        return 1
    else
        log_success "Tool found: $tool"
        return 0
    fi
}

# ============================================================================
# TOOL AVAILABILITY CHECK
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 0: TOOL AVAILABILITY CHECK${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

TOOLS=("dnsx" "subfinder" "httpx" "whatweb" "testssl.sh" "katana" "nmap" "nuclei")
AVAILABLE_TOOLS=()

for tool in "${TOOLS[@]}"; do
    if check_tool "$tool"; then
        AVAILABLE_TOOLS+=("$tool")
    fi
done

if [ ${#AVAILABLE_TOOLS[@]} -eq 0 ]; then
    log_error "No security tools found! Please install the required tools."
    exit 1
fi

log_info "Available tools: ${AVAILABLE_TOOLS[*]}"
log_info "Target: $TARGET"

# ============================================================================
# STAGE 1: DNS & SUBDOMAIN DISCOVERY
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 1: DNS & SUBDOMAIN DISCOVERY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# dnsx - DNS resolution
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " dnsx " ]]; then
    log_info "Running dnsx (DNS resolution)..."
    if dnsx -d "$TARGET" -json -o "$OUTPUT_DIR/dnsx-results.json" 2>/dev/null; then
        log_success "dnsx completed"
        cat "$OUTPUT_DIR/dnsx-results.json" | head -5
    else
        log_warning "dnsx execution had issues"
    fi
fi

# subfinder - Subdomain enumeration
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " subfinder " ]]; then
    log_info "Running subfinder (subdomain enumeration)..."
    if subfinder -d "$TARGET" -json -o "$OUTPUT_DIR/subfinder-results.json" 2>/dev/null; then
        log_success "subfinder completed"
        SUBDOMAINS=$(wc -l < "$OUTPUT_DIR/subfinder-results.json" 2>/dev/null || echo "0")
        log_info "Found $SUBDOMAINS subdomains"
    else
        log_warning "subfinder execution had issues"
    fi
fi

# ============================================================================
# STAGE 2: LIVE ASSET DETECTION
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 2: LIVE ASSET DETECTION${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# httpx - Live host detection
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " httpx " ]]; then
    log_info "Running httpx (live host detection)..."
    
    # Create input file for httpx
    if [ -f "$OUTPUT_DIR/subfinder-results.json" ]; then
        jq -r '.host' "$OUTPUT_DIR/subfinder-results.json" > "$OUTPUT_DIR/domains.txt" 2>/dev/null || echo "$TARGET" > "$OUTPUT_DIR/domains.txt"
    else
        echo "$TARGET" > "$OUTPUT_DIR/domains.txt"
    fi
    
    if httpx -l "$OUTPUT_DIR/domains.txt" -json -title -tech-detect -o "$OUTPUT_DIR/httpx-results.json" 2>/dev/null; then
        log_success "httpx completed"
        LIVE_HOSTS=$(wc -l < "$OUTPUT_DIR/httpx-results.json" 2>/dev/null || echo "0")
        log_info "Found $LIVE_HOSTS live hosts"
    else
        log_warning "httpx execution had issues"
    fi
fi

# ============================================================================
# STAGE 3: TECHNOLOGY DETECTION
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 3: TECHNOLOGY DETECTION${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# WhatWeb - Technology fingerprinting
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " whatweb " ]]; then
    log_info "Running WhatWeb (technology detection)..."
    if whatweb "$TARGET" --json -q -o "$OUTPUT_DIR/whatweb-results.json" 2>/dev/null; then
        log_success "WhatWeb completed"
        cat "$OUTPUT_DIR/whatweb-results.json" | head -3
    else
        log_warning "WhatWeb execution had issues"
    fi
fi

# ============================================================================
# STAGE 4: SSL/TLS ANALYSIS
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 4: SSL/TLS ANALYSIS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# testssl.sh - SSL/TLS analysis
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " testssl.sh " ]]; then
    log_info "Running testssl.sh (SSL/TLS analysis)..."
    if timeout $TIMEOUT_DEEP testssl.sh --json --quiet "$TARGET" > "$OUTPUT_DIR/testssl-results.json" 2>/dev/null; then
        log_success "testssl.sh completed"
        ISSUES=$(grep -c '"severity"' "$OUTPUT_DIR/testssl-results.json" 2>/dev/null || echo "0")
        log_info "Found $ISSUES SSL/TLS issues"
    else
        log_warning "testssl.sh execution had issues or timed out"
    fi
fi

# ============================================================================
# STAGE 5: ENDPOINT DISCOVERY
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 5: ENDPOINT DISCOVERY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Katana - Web crawling
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " katana " ]]; then
    log_info "Running Katana (endpoint discovery)..."
    if timeout $TIMEOUT_NORMAL katana -u "$TARGET" -json -silent -o "$OUTPUT_DIR/katana-results.json" 2>/dev/null; then
        log_success "Katana completed"
        ENDPOINTS=$(wc -l < "$OUTPUT_DIR/katana-results.json" 2>/dev/null || echo "0")
        log_info "Found $ENDPOINTS endpoints"
    else
        log_warning "Katana execution had issues or timed out"
    fi
fi

# ============================================================================
# STAGE 6: NETWORK EXPOSURE MAPPING
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 6: NETWORK EXPOSURE MAPPING${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Nmap - Port scanning
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " nmap " ]]; then
    log_info "Running Nmap (port scanning)..."
    
    # Determine ports to scan based on quick/deep flag
    if [ "$ENABLE_DEEP_SCAN" == "true" ]; then
        NMAP_ARGS="-p- -sV -sC --script vuln"
    else
        NMAP_ARGS="-p 80,443,22,3389,5432,27017,6379,9200 -sV"
    fi
    
    if timeout $TIMEOUT_DEEP nmap $NMAP_ARGS -oX "$OUTPUT_DIR/nmap-results.xml" "$TARGET" 2>/dev/null; then
        log_success "Nmap completed"
        OPEN_PORTS=$(grep -c "state state=\"open\"" "$OUTPUT_DIR/nmap-results.xml" 2>/dev/null || echo "0")
        log_info "Found $OPEN_PORTS open ports"
    else
        log_warning "Nmap execution had issues or timed out"
    fi
fi

# ============================================================================
# STAGE 7: VULNERABILITY DETECTION
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 7: VULNERABILITY DETECTION${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Nuclei - Vulnerability scanning
if [[ " ${AVAILABLE_TOOLS[@]} " =~ " nuclei " ]]; then
    log_info "Running Nuclei (vulnerability detection)..."
    
    # Use templates flag based on scan type
    if [ "$ENABLE_DEEP_SCAN" == "true" ]; then
        NUCLEI_ARGS="-t /nuclei-templates -timeout 300"
    else
        NUCLEI_ARGS="-nt -timeout 60"
    fi
    
    if timeout $TIMEOUT_DEEP nuclei -u "$TARGET" -json $NUCLEI_ARGS -o "$OUTPUT_DIR/nuclei-results.json" 2>/dev/null; then
        log_success "Nuclei completed"
        VULNS=$(wc -l < "$OUTPUT_DIR/nuclei-results.json" 2>/dev/null || echo "0")
        log_info "Found $VULNS vulnerabilities"
    else
        log_warning "Nuclei execution had issues or timed out"
    fi
fi

# ============================================================================
# RESULTS AGGREGATION & SUMMARY
# ============================================================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STAGE 8: RESULTS AGGREGATION & SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

log_success "Pipeline execution completed!"
log_info "Results saved to: $OUTPUT_DIR"

echo -e "\n${YELLOW}📊 SUMMARY:${NC}"
echo "────────────────────────────────────────────────────────────────"

# Count findings by tool
for tool in "${AVAILABLE_TOOLS[@]}"; do
    result_file="${OUTPUT_DIR}/${tool}-results.*"
    if ls $result_file 1> /dev/null 2>&1; then
        count=$(wc -l < $(ls $result_file | head -1) 2>/dev/null || echo "0")
        echo "  $tool: $count items"
    fi
done

echo "────────────────────────────────────────────────────────────────"

# Generate comprehensive report
cat > "$OUTPUT_DIR/summary.txt" <<EOF
SecureLens Security Pipeline Test Report
Generated: $(date)
Target: $TARGET
Results Directory: $OUTPUT_DIR

TOOLS EXECUTED:
$(for tool in "${AVAILABLE_TOOLS[@]}"; do echo "  ✓ $tool"; done)

FINDINGS BY TOOL:
$(for tool in "${AVAILABLE_TOOLS[@]}"; do
    result_file="${OUTPUT_DIR}/${tool}-results.*"
    if ls $result_file 1> /dev/null 2>&1; then
        count=$(wc -l < $(ls $result_file | head -1) 2>/dev/null || echo "0")
        echo "  $tool: $count"
    fi
done)

NEXT STEPS:
1. Review findings in each tool's JSON/XML output
2. Use correlation engine to deduplicate issues
3. Prioritize by severity and CVSS score
4. Generate remediation plan

EOF

log_success "Summary report generated: $OUTPUT_DIR/summary.txt"

# Create index HTML for results visualization
cat > "$OUTPUT_DIR/index.html" <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>SecureLens Results</title>
    <style>
        body { font-family: Arial; margin: 20px; }
        h1 { color: #333; }
        .tool { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .file { color: #0066cc; cursor: pointer; }
    </style>
</head>
<body>
    <h1>SecureLens Security Pipeline Results</h1>
    <p>Generated: <span id="timestamp"></span></p>
    <div id="results"></div>
    <script>
        const fs = require('fs');
        const path = require('path');
        document.getElementById('timestamp').textContent = new Date().toISOString();
    </script>
</body>
</html>
EOF

log_info "Results index created: $OUTPUT_DIR/index.html"

# Final status
echo -e "\n${GREEN}✓ Pipeline test completed successfully!${NC}\n"
