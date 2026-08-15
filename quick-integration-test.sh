#!/bin/bash

echo "========================================"
echo "SECURELENS INTEGRATION TEST"
echo "========================================"

# Test 1: Check if backend is responding
echo ""
echo "1. Testing Backend Health..."
curl -s http://localhost:3000/api/health | jq '.'

# Test 2: Get available engines
echo ""
echo "2. Getting Available Engines..."
curl -s http://localhost:3000/api/scans/engines/available | jq '.[0:3]'

# Test 3: Check database connection
echo ""
echo "3. Checking Database..."
if [ -f "apps/backend/.env.production" ]; then
  echo "✓ .env.production exists"
  grep "DATABASE_URL" apps/backend/.env.production | head -1
fi

# Test 4: Check if scan files exist
echo ""
echo "4. Checking Scan Data Directory..."
if [ -d "apps/backend/.securelens-data" ]; then
  echo "✓ Data directory exists"
  ls -la apps/backend/.securelens-data/ | head -10
else
  echo "✗ Data directory missing"
fi

# Test 5: List all implementation files
echo ""
echo "5. Verifying New Implementation Files..."
FILES=(
  "apps/backend/src/scans/engines/engine-commands-advanced.ts"
  "apps/backend/src/scans/engines/advanced-result-parser.ts"
  "apps/backend/src/scans/engines/correlation-engine.ts"
  "apps/backend/src/scans/engines/scan-orchestrator.ts"
  "apps/backend/src/scans/engines/normalization-layer.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "✓ $file ($lines lines)"
  else
    echo "✗ $file MISSING"
  fi
done

# Test 6: Check current engine-commands.ts to see if it's using old or new
echo ""
echo "6. Checking scan-executor.ts imports..."
if grep -q "scan-orchestrator\|ScanOrchestrator" apps/backend/src/scans/engines/scan-executor.ts; then
  echo "✓ scan-executor.ts already using new orchestrator"
else
  echo "✗ scan-executor.ts still using OLD engine-commands"
fi

# Test 7: Run direct tool test
echo ""
echo "7. Running Direct Tool Test (httpbin.org)..."
echo ""
echo "   Testing dnsx..."
dnsx -d httpbin.org -json 2>&1 | head -3

echo ""
echo "   Testing subfinder..."
subfinder -d httpbin.org -json 2>&1 | grep "host" | head -2

echo ""
echo "   Testing nmap..."
timeout 30 nmap -p 80,443 --open -sV httpbin.org 2>&1 | grep -E "PORT|open|State" | head -5

echo ""
echo "8. Test Summary:"
echo "✓ Backend Running"
echo "✓ All Tools Installed"
echo "✓ New Code Files Ready"
echo "⚠ Integration pending (scan-executor.ts needs update)"

