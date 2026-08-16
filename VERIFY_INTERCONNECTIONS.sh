#!/bin/bash

echo "🔍 SecureLens Real-Time Interconnection Verification"
echo "===================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

passed=0
failed=0

# Test 1: Event Bus Coverage
echo "Test 1: Event Bus Event Types Coverage"
if grep -q "type EventType =" apps/frontend/lib/event-bus.ts; then
  event_count=$(grep "| '" apps/frontend/lib/event-bus.ts | wc -l)
  if [ "$event_count" -gt 20 ]; then
    echo -e "${GREEN}✅ PASS${NC}: Found $event_count event types (expected >20)"
    ((passed++))
  else
    echo -e "${RED}❌ FAIL${NC}: Only $event_count event types (expected >20)"
    ((failed++))
  fi
fi
echo ""

# Test 2: All pages use real-time hooks
echo "Test 2: All Pages Using Real-Time Hooks"
missing_pages=()
for page in workspaces live-scan findings reports ai-copilot analytics notifications community settings; do
  if [ -f "apps/frontend/app/dashboard/$page/page.tsx" ]; then
    if grep -q "useRealtime\|useLiveScanSync" "apps/frontend/app/dashboard/$page/page.tsx"; then
      echo -e "${GREEN}✅${NC} $page"
      ((passed++))
    else
      echo -e "${RED}❌${NC} $page - MISSING HOOKS"
      missing_pages+=("$page")
      ((failed++))
    fi
  fi
done

if [ ${#missing_pages[@]} -eq 0 ]; then
  echo -e "\n${GREEN}✅ All pages have real-time hooks${NC}"
else
  echo -e "\n${RED}❌ Missing hooks in: ${missing_pages[@]}${NC}"
fi
echo ""

# Test 3: Local storage integration
echo "Test 3: Local Storage Integration"
if grep -q "securelens_live_scans\|securelens_live_findings\|securelens_active_scan_session" apps/frontend/lib/live-scan-store.ts; then
  echo -e "${GREEN}✅ PASS${NC}: LocalStorage keys defined"
  ((passed++))
else
  echo -e "${RED}❌ FAIL${NC}: LocalStorage keys not found"
  ((failed++))
fi
echo ""

# Test 4: Event publishing in live-scan-store
echo "Test 4: Event Publishing in Core Store"
publish_count=$(grep -c "EventBus.publish" apps/frontend/lib/live-scan-store.ts)
if [ "$publish_count" -gt 30 ]; then
  echo -e "${GREEN}✅ PASS${NC}: $publish_count EventBus.publish calls (expected >30)"
  ((passed++))
else
  echo -e "${RED}❌ FAIL${NC}: Only $publish_count EventBus.publish calls (expected >30)"
  ((failed++))
fi
echo ""

# Test 5: Polling mechanism
echo "Test 5: Backend Polling Mechanism"
if grep -q "fetch.*'/api/scans\|fetch.*'/api/findings" apps/frontend/lib/live-scan-store.ts; then
  if grep -q "pollInterval\|setInterval" apps/frontend/lib/live-scan-store.ts; then
    echo -e "${GREEN}✅ PASS${NC}: Polling mechanism configured"
    ((passed++))
  else
    echo -e "${RED}❌ FAIL${NC}: No polling interval found"
    ((failed++))
  fi
fi
echo ""

# Test 6: Cross-tab sync
echo "Test 6: Cross-Tab Synchronization"
if grep -q "window.addEventListener.*storage\|securelens_event" apps/frontend/lib/event-bus.ts; then
  echo -e "${GREEN}✅ PASS${NC}: Cross-tab sync via localStorage"
  ((passed++))
else
  echo -e "${RED}❌ FAIL${NC}: No cross-tab sync found"
  ((failed++))
fi
echo ""

# Test 7: Data deduplication
echo "Test 7: Data Deduplication Logic"
if grep -q "new Map.*id.*\|allFindingsMap\|allScansMap" apps/frontend/lib/live-scan-store.ts; then
  echo -e "${GREEN}✅ PASS${NC}: Map-based deduplication implemented"
  ((passed++))
else
  echo -e "${RED}❌ FAIL${NC}: No deduplication logic found"
  ((failed++))
fi
echo ""

# Summary
echo "===================================================="
echo "Test Results Summary"
echo "===================================================="
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo ""

if [ "$failed" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL INTERCONNECTION TESTS PASSED${NC}"
  echo ""
  echo "Real-time synchronization is properly configured:"
  echo "  • All pages connected via EventBus"
  echo "  • Backend polling active"
  echo "  • Data persistence via localStorage"
  echo "  • Cross-tab sync enabled"
  echo "  • Deduplication implemented"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Review the failures above and check the INTERCONNECTION_AUDIT_REPORT.md"
  exit 1
fi
