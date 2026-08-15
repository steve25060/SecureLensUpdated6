#!/bin/bash

# Test against known vulnerable sites that will produce REAL findings
TARGETS=(
    "testphp.vulnweb.com"  # SQLi, XSS, file inclusion vulnerabilities
    "dvwa.khulnasoft.com"  # Deliberately vulnerable web app
)

for TARGET in "${TARGETS[@]}"; do
    echo "======================================"
    echo "Testing against: $TARGET"
    echo "======================================"
    
    # Quick DNS check
    echo -e "\n1. DNS Resolution:"
    dnsx -d "$TARGET" -json 2>/dev/null | head -5
    
    # Subdomain discovery
    echo -e "\n2. Subdomain Enumeration:"
    subfinder -d "$TARGET" -silent 2>/dev/null | head -10
    
    # Live host detection
    echo -e "\n3. Live Host Detection (httpx):"
    echo "$TARGET" | httpx -json -title -tech-detect -status-code 2>/dev/null | head -5
    
    # Technology detection
    echo -e "\n4. Technology Detection (WhatWeb):"
    whatweb "$TARGET" --json -q 2>/dev/null | head -10
    
    # SSL/TLS analysis
    echo -e "\n5. SSL/TLS Analysis (testssl.sh):"
    timeout 60 testssl.sh --json --quiet "https://$TARGET" 2>/dev/null | grep -i "severity\|finding" | head -10
    
    # Endpoint discovery
    echo -e "\n6. Endpoints (Katana):"
    timeout 60 katana -u "https://$TARGET" -silent 2>/dev/null | head -15
    
    # Nuclei vulnerability scanning
    echo -e "\n7. Nuclei Vulnerability Scan:"
    timeout 120 nuclei -u "https://$TARGET" -nt -silent 2>/dev/null | head -20
    
done
