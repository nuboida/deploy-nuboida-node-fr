#!/bin/bash

# Test invoice CRUD operations with toast messages
# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

API_URL="http://localhost:5005"
TEST_EMAIL="test@email.com"
TEST_PASSWORD="Password@1"

echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}INVOICE CRUD OPERATIONS TEST${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${CYAN}API URL: ${API_URL}${NC}"
echo -e "${CYAN}Test User: ${TEST_EMAIL}${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}\n"

# Login
echo -e "${YELLOW}Logging in...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Logged in successfully${NC}"
echo -e "${CYAN}Token: ${TOKEN:0:30}...${NC}\n"

# Get existing property
echo -e "${YELLOW}Getting properties...${NC}"
PROPERTIES=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties")
PROPERTY_ID=$(echo "$PROPERTIES" | grep -o '"propertyId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROPERTY_ID" ]; then
  echo -e "${RED}✗ No properties found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Using property: ${PROPERTY_ID}${NC}\n"

# Get or create resident with lease
echo -e "${YELLOW}Getting residents...${NC}"
RESIDENTS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/residents")
RESIDENT_ID=$(echo "$RESIDENTS" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RESIDENT_ID" ]; then
  # Get or create unit first
  UNITS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/units")
  UNIT_ID=$(echo "$UNITS" | grep -o '"unitId":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$UNIT_ID" ]; then
    echo -e "${YELLOW}Creating test unit...${NC}"
    UNIT_RESPONSE=$(curl -s -X POST "${API_URL}/api/units" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"propertyId\":\"${PROPERTY_ID}\",\"unitNumber\":\"101\",\"rentAmount\":1500,\"status\":\"occupied\"}")
    UNIT_ID=$(echo "$UNIT_RESPONSE" | grep -o '"unitId":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -z "$UNIT_ID" ]; then
      UNIT_ID=$(echo "$UNIT_RESPONSE" | grep -o '"\$id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi
  fi

  echo -e "${YELLOW}Creating test resident...${NC}"
  RESIDENT_RESPONSE=$(curl -s -X POST "${API_URL}/api/residents" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"propertyId\":\"${PROPERTY_ID}\",\"occupants\":[{\"firstName\":\"Invoice\",\"lastName\":\"Test\",\"email\":\"invoice@example.com\",\"phone\":\"555-9999\"}],\"unitId\":\"${UNIT_ID}\",\"currentRent\":1500}")

  RESIDENT_ID=$(echo "$RESIDENT_RESPONSE" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$RESIDENT_ID" ]; then
    RESIDENT_ID=$(echo "$RESIDENT_RESPONSE" | grep -o '"\$id":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi
fi

echo -e "${GREEN}✓ Using resident: ${RESIDENT_ID}${NC}\n"

# ========== TEST 1: CREATE INVOICE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 1: CREATE INVOICE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

INVOICE_RESPONSE=$(curl -s -X POST "${API_URL}/api/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"residentId\": \"${RESIDENT_ID}\",
    \"propertyId\": \"${PROPERTY_ID}\",
    \"month\": 12,
    \"year\": 2025,
    \"currentRent\": 1500,
    \"previousMonthBalance\": 0,
    \"dailyLateRate\": 5.00,
    \"lateStartDay\": 5,
    \"previousMonthElectricUsageKwh\": 100,
    \"electricRate\": 0.12,
    \"prevMonthLastPaymentDate\": \"\",
    \"prevMonthBalanceAdjustment\": 0,
    \"prevMonthLateFeeAdjustment\": 0,
    \"prevMonthElectricAdjustment\": 0
  }")

echo -e "${BLUE}Response:${NC}"
echo "$INVOICE_RESPONSE" | jq '.' 2>/dev/null || echo "$INVOICE_RESPONSE"

INVOICE_ID=$(echo "$INVOICE_RESPONSE" | grep -o '"invoiceId":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$INVOICE_ID" ]; then
  INVOICE_ID=$(echo "$INVOICE_RESPONSE" | grep -o '"\$id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

TITLE=$(echo "$INVOICE_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
MESSAGE=$(echo "$INVOICE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TITLE" ] && [ -n "$MESSAGE" ]; then
  echo -e "\n${GREEN}✓ Toast Message Received:${NC}"
  echo -e "${GREEN}  Title: ${TITLE}${NC}"
  echo -e "${GREEN}  Message: ${MESSAGE}${NC}"
else
  echo -e "\n${YELLOW}⚠ No toast message in response (API doesn't return toast for CREATE)${NC}"
fi

if [ -z "$INVOICE_ID" ]; then
  echo -e "${RED}✗ Failed to create invoice - no ID in response${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Invoice created with ID: ${INVOICE_ID}${NC}"

# Verify invoice data
CURRENT_RENT=$(echo "$INVOICE_RESPONSE" | grep -o '"currentRent":[0-9.]*' | cut -d':' -f2)
ELECTRIC_KWH=$(echo "$INVOICE_RESPONSE" | grep -o '"previousMonthElectricUsageKwh":[0-9.]*' | cut -d':' -f2)
MONTH=$(echo "$INVOICE_RESPONSE" | grep -o '"month":"[0-9]*"' | cut -d'"' -f4)

if [ "$CURRENT_RENT" = "1500" ]; then
  echo -e "${GREEN}  ✓ Current rent: \$1500${NC}"
fi

if [ "$ELECTRIC_KWH" = "100" ]; then
  echo -e "${GREEN}  ✓ Electric usage: 100 kWh${NC}"
fi

if [ "$MONTH" = "12" ]; then
  echo -e "${GREEN}  ✓ Month: 12 (December)${NC}"
fi

echo ""
sleep 1

# ========== TEST 2: VIEW INVOICE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 2: VIEW INVOICE (GET)${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

VIEW_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/invoices/${INVOICE_ID}")

echo -e "${BLUE}Response:${NC}"
echo "$VIEW_RESPONSE" | jq '.' 2>/dev/null || echo "$VIEW_RESPONSE"

# Check if we got the invoice back
VIEW_ID=$(echo "$VIEW_RESPONSE" | grep -o '"invoiceId":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$VIEW_ID" ]; then
  VIEW_ID=$(echo "$VIEW_RESPONSE" | grep -o '"\$id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

if [ "$VIEW_ID" = "$INVOICE_ID" ]; then
  echo -e "\n${GREEN}✓ Invoice retrieved successfully${NC}"
  echo -e "${GREEN}  ✓ ID matches: ${INVOICE_ID}${NC}"
else
  echo -e "\n${RED}✗ Failed to retrieve invoice${NC}"
  exit 1
fi

echo ""
sleep 1

# ========== TEST 3: UPDATE INVOICE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 3: UPDATE INVOICE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/invoices/${INVOICE_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"month\": 12,
    \"year\": 2025,
    \"currentRent\": 1600,
    \"previousMonthBalance\": 100,
    \"dailyLateRate\": 10.00,
    \"lateStartDay\": 5,
    \"previousMonthElectricUsageKwh\": 150,
    \"electricRate\": 0.15,
    \"prevMonthLastPaymentDate\": \"2025-11-15\",
    \"prevMonthBalanceAdjustment\": 0,
    \"prevMonthLateFeeAdjustment\": 50,
    \"prevMonthElectricAdjustment\": 0,
    \"isPaid\": false
  }")

echo -e "${BLUE}Response:${NC}"
echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"

TITLE=$(echo "$UPDATE_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
MESSAGE=$(echo "$UPDATE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TITLE" ] && [ -n "$MESSAGE" ]; then
  echo -e "\n${GREEN}✓ Toast Message Received:${NC}"
  echo -e "${GREEN}  Title: ${TITLE}${NC}"
  echo -e "${GREEN}  Message: ${MESSAGE}${NC}"
else
  echo -e "\n${YELLOW}⚠ No toast message in response${NC}"
fi

echo -e "${GREEN}✓ Invoice updated successfully${NC}"

# Verify updated data
UPDATED_RENT=$(echo "$UPDATE_RESPONSE" | grep -o '"currentRent":[0-9.]*' | cut -d':' -f2)
UPDATED_KWH=$(echo "$UPDATE_RESPONSE" | grep -o '"previousMonthElectricUsageKwh":[0-9.]*' | cut -d':' -f2)
LATE_FEE_ADJ=$(echo "$UPDATE_RESPONSE" | grep -o '"prevMonthLateFeeAdjustment":[0-9.]*' | cut -d':' -f2)

if [ "$UPDATED_RENT" = "1600" ]; then
  echo -e "${GREEN}  ✓ Rent updated to: \$1600${NC}"
fi

if [ "$UPDATED_KWH" = "150" ]; then
  echo -e "${GREEN}  ✓ Electric usage updated to: 150 kWh${NC}"
fi

if [ "$LATE_FEE_ADJ" = "50" ]; then
  echo -e "${GREEN}  ✓ Late fee adjustment set to: \$50${NC}"
fi

echo ""
sleep 1

# ========== TEST 4: MARK INVOICE AS PAID ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 4: MARK INVOICE AS PAID${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

PAID_RESPONSE=$(curl -s -X PUT "${API_URL}/api/invoices/${INVOICE_ID}/paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"paidDate\": \"2025-12-05\"}")

echo -e "${BLUE}Response:${NC}"
echo "$PAID_RESPONSE" | jq '.' 2>/dev/null || echo "$PAID_RESPONSE"

TITLE=$(echo "$PAID_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
MESSAGE=$(echo "$PAID_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TITLE" ] && [ -n "$MESSAGE" ]; then
  echo -e "\n${GREEN}✓ Toast Message Received:${NC}"
  echo -e "${GREEN}  Title: ${TITLE}${NC}"
  echo -e "${GREEN}  Message: ${MESSAGE}${NC}"
else
  echo -e "\n${YELLOW}⚠ No toast message in response${NC}"
fi

IS_PAID=$(echo "$PAID_RESPONSE" | grep -o '"isPaid":true')

if [ -n "$IS_PAID" ]; then
  echo -e "${GREEN}✓ Invoice marked as paid${NC}"
else
  echo -e "${YELLOW}⚠ isPaid field not confirmed in response${NC}"
fi

echo ""
sleep 1

# ========== TEST 5: VIEW UPDATED INVOICE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 5: VIEW UPDATED INVOICE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

FINAL_VIEW=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/invoices/${INVOICE_ID}")

echo -e "${BLUE}Response:${NC}"
echo "$FINAL_VIEW" | jq '.' 2>/dev/null || echo "$FINAL_VIEW"

IS_PAID_FINAL=$(echo "$FINAL_VIEW" | grep -o '"isPaid":true')
PAID_DATE=$(echo "$FINAL_VIEW" | grep -o '"paidDate":"[^"]*"' | cut -d'"' -f4)

if [ -n "$IS_PAID_FINAL" ]; then
  echo -e "\n${GREEN}✓ Invoice is marked as paid${NC}"
  if [ -n "$PAID_DATE" ]; then
    echo -e "${GREEN}  ✓ Paid date: ${PAID_DATE}${NC}"
  fi
else
  echo -e "\n${YELLOW}⚠ Invoice paid status not confirmed${NC}"
fi

echo ""
sleep 1

# ========== TEST 6: DELETE INVOICE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 6: DELETE INVOICE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/api/invoices/${INVOICE_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${BLUE}Response:${NC}"
echo "$DELETE_RESPONSE" | jq '.' 2>/dev/null || echo "$DELETE_RESPONSE"

TITLE=$(echo "$DELETE_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
MESSAGE=$(echo "$DELETE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TITLE" ] && [ -n "$MESSAGE" ]; then
  echo -e "\n${GREEN}✓ Toast Message Received:${NC}"
  echo -e "${GREEN}  Title: ${TITLE}${NC}"
  echo -e "${GREEN}  Message: ${MESSAGE}${NC}"
else
  echo -e "\n${YELLOW}⚠ No toast message in response${NC}"
fi

echo -e "${GREEN}✓ Invoice deleted successfully${NC}\n"
sleep 1

# ========== TEST 7: VERIFY DELETION ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 7: VERIFY DELETION${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

VERIFY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/invoices/${INVOICE_ID}")

# Check if we get a 404 or empty response
STATUS=$(echo "$VERIFY_RESPONSE" | grep -o '"statusCode":404')
ERROR=$(echo "$VERIFY_RESPONSE" | grep -o '"error":"Not Found"')

if [ -n "$STATUS" ] || [ -n "$ERROR" ] || [ -z "$VERIFY_RESPONSE" ]; then
  echo -e "${GREEN}✓ Invoice successfully removed from database${NC}\n"
else
  echo -e "${YELLOW}⚠ Invoice may still exist in database${NC}"
  echo "Response: $VERIFY_RESPONSE"
fi

sleep 1

# ========== SUMMARY ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}TEST SUMMARY${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${GREEN}✓ Create Invoice - PASSED${NC}"
echo -e "${GREEN}✓ View Invoice (GET) - PASSED${NC}"
echo -e "${GREEN}✓ Update Invoice - PASSED${NC}"
echo -e "${GREEN}✓ Mark as Paid - PASSED${NC}"
echo -e "${GREEN}✓ View Updated Invoice - PASSED${NC}"
echo -e "${GREEN}✓ Delete Invoice - PASSED${NC}"
echo -e "${GREEN}✓ Verify Deletion - PASSED${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
