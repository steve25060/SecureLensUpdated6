#!/bin/bash

# Comprehensive tool test with better output
TARGET="httpbin.org"

echo "=========================================="
echo "COMPREHENSIVE SECURELENS TOOL TEST"
echo "Target: $TARGET"
echo "=========================================="

# Test 1: dnsx
echo -e "\n\n=== TEST 1: dnsx (DNS Resolution) ==="
echo "Command: dnsx -d $TARGET -json"
dnsx -d "$TARGET" -json 2>&1 | tee dns-results.txt | head -20
LINES=$(wc -l < dns-results.txt)
echo "✓ dnsx returned $LINES lines of output"

# Test 2: subfinder
echo -e "\n\n=== TEST 2: subfinder (Subdomain Enumeration) ==="
echo "Command: subfinder -d $TARGET -json"
subfinder -d "$TARGET" -json 2>&1 | tee subfinder-results.txt | head -20
LINES=$(wc -l < subfinder-results.txt)
echo "✓ subfinder returned $LINES lines of output"

# Test 3: httpx
echo -e "\n\n=== TEST 3: httpx (Live Host Detection + Tech) ==="
echo "Command: echo $TARGET | httpx -json -title -tech-detect -status-code"
echo "$TARGET" | httpx -json -title -tech-detect -status-code 2>&1 | tee httpx-results.txt
LINES=$(wc -l < httpx-results.txt)
echo "✓ httpx returned $LINES lines of output"

# Test 4: whatweb
echo -e "\n\n=== TEST 4: WhatWeb (Technology Fingerprinting) ==="
echo "Command: whatweb $TARGET --json -q"
whatweb "$TARGET" --json -q 2>&1 | tee whatweb-results.txt | head -30
LINES=$(wc -l < whatweb-results.txt)
echo "✓ WhatWeb returned $LINES lines of output"

# Test 5: testssl.sh
echo -e "\n\n=== TEST 5: testssl.sh (SSL/TLS Analysis) ==="
echo "Command: testssl.sh --json --quiet https://$TARGET (timeout 60s)"
timeout 60 testssl.sh --json --quiet "https://$TARGET" 2>&1 | tee testssl-results.txt | head -40
LINES=$(wc -l < testssl-results.txt)
echo "✓ testssl.sh returned $LINES lines of output"

# Test 6: Katana
echo -e "\n\n=== TEST 6: Katana (Endpoint Discovery) ==="
echo "Command: katana -u https://$TARGET -silent (timeout 60s, max 50 endpoints)"
timeout 60 katana -u "https://$TARGET" -silent 2>&1 | head -50 | tee katana-results.txt
LINES=$(wc -l < katana-results.txt)
echo "✓ Katana returned $LINES lines of output"

# Test 7: Nmap
echo -e "\n\n=== TEST 7: Nmap (Port Scanning) ==="
echo "Command: nmap -p 80,443,8080,8443 --open -sV $TARGET"
nmap -p 80,443,8080,8443 --open -sV "$TARGET" 2>&1 | tee nmap-results.txt
LINES=$(wc -l < nmap-results.txt)
echo "✓ Nmap returned $LINES lines of output"

# Test 8: Nuclei
echo -e "\n\n=== TEST 8: Nuclei (Vulnerability Detection) ==="
echo "Command: nuclei -u https://$TARGET -nt -silent (timeout 120s)"
timeout 120 nuclei -u "https://$TARGET" -nt -silent 2>&1 | tee nuclei-results.txt | head -50
LINES=$(wc -l < nuclei-results.txt)
echo "✓ Nuclei returned $LINES lines of output"

# Summary
echo -e "\n\n=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo "Tool Status:"
echo "  ✓ dnsx: $(wc -l < dns-results.txt) results"
echo "  ✓ subfinder: $(wc -l < subfinder-results.txt) results"
echo "  ✓ httpx: $(wc -l < httpx-results.txt) results"
echo "  ✓ WhatWeb: $(wc -l < whatweb-results.txt) results"
echo "  ✓ testssl.sh: $(wc -l < testssl-results.txt) results"
echo "  ✓ Katana: $(wc -l < katana-results.txt) results"
echo "  ✓ Nmap: $(wc -l < nmap-results.txt) results"
echo "  ✓ Nuclei: $(wc -l < nuclei-results.txt) results"
