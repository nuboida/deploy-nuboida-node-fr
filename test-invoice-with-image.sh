#!/bin/bash

# Test invoice creation with image upload
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

API_URL="http://localhost:5005"
TEST_EMAIL="test@email.com"
TEST_PASSWORD="Password@1"

echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}INVOICE WITH IMAGE UPLOAD TEST${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}\n"

# Create a test image (1x1 pixel PNG)
echo -e "${YELLOW}Creating test image...${NC}"
TEST_IMAGE="/tmp/meter-snapshot-test.png"
# Simple 1x1 red pixel PNG
echo -n -e '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90\x77\x53\xde\x00\x00\x00\x0c\x49\x44\x41\x54\x08\x99\x63\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\xa8\x7c\x1e\x8b\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > "$TEST_IMAGE"
echo -e "${GREEN}✓ Test image created: $TEST_IMAGE${NC}\n"

# Login
echo -e "${YELLOW}Logging in...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Logged in${NC}\n"

# Get property and resident
PROPERTIES=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties")
PROPERTY_ID=$(echo "$PROPERTIES" | grep -o '"propertyId":"[^"]*"' | head -1 | cut -d'"' -f4)

RESIDENTS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/residents")
RESIDENT_ID=$(echo "$RESIDENTS" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)

echo -e "${GREEN}✓ Property ID: ${PROPERTY_ID}${NC}"
echo -e "${GREEN}✓ Resident ID: ${RESIDENT_ID}${NC}\n"

# Create invoice
echo -e "${BOLD}${CYAN}STEP 1: CREATE INVOICE${NC}"
echo -e "${CYAN}============================================================${NC}"

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
  echo -e "\n${RED}✗ Failed to create invoice${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓ Invoice created: ${INVOICE_ID}${NC}\n"

# Upload meter snapshot
echo -e "${BOLD}${CYAN}STEP 2: UPLOAD METER SNAPSHOT${NC}"
echo -e "${CYAN}============================================================${NC}"

UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/api/invoices/${INVOICE_ID}/meter-snapshot" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@${TEST_IMAGE}")

echo -e "${BLUE}Response:${NC}"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"

FILE_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"fileUrl":"[^"]*"' | cut -d'"' -f4)
FILE_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"fileId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$FILE_URL" ] && [ -n "$FILE_ID" ]; then
  echo -e "\n${GREEN}✓ Image uploaded successfully${NC}"
  echo -e "${GREEN}  File ID: ${FILE_ID}${NC}"
  echo -e "${GREEN}  File URL: ${FILE_URL:0:60}...${NC}"
  
  # Check if invoice was updated
  SNAPSHOT_FIELD=$(echo "$UPLOAD_RESPONSE" | grep -o '"electricMeterSnapshot":"[^"]*"' | cut -d'"' -f4)
  SNAPSHOT_ID_FIELD=$(echo "$UPLOAD_RESPONSE" | grep -o '"electricMeterSnapshotId":"[^"]*"' | cut -d'"' -f4)
  
  if [ -n "$SNAPSHOT_FIELD" ]; then
    echo -e "${GREEN}  ✓ electricMeterSnapshot updated in invoice${NC}"
  fi
  
  if [ -n "$SNAPSHOT_ID_FIELD" ]; then
    echo -e "${GREEN}  ✓ electricMeterSnapshotId updated in invoice${NC}"
  fi
else
  echo -e "\n${RED}✗ Image upload failed${NC}"
  exit 1
fi

echo -e "\n${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}✓ TEST COMPLETE - IMAGE UPLOAD SUCCESSFUL${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}\n"

# Cleanup
rm -f "$TEST_IMAGE"
