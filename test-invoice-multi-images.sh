#!/bin/bash

# Test invoice image upload with 3 different file types: JPG, PNG, PDF
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
echo -e "${BOLD}INVOICE IMAGE UPLOAD TEST - Multiple File Types${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}\n"

# Create test files (~5MB each)
echo -e "${YELLOW}Creating test files...${NC}"

# Create 5MB JPG (actually just a file with JPG header for testing)
TEST_JPG="/tmp/meter-snapshot-5mb.jpg"
dd if=/dev/urandom of="$TEST_JPG" bs=1024 count=5120 2>/dev/null
# Add JPG header
printf '\xFF\xD8\xFF' | cat - "$TEST_JPG" > "$TEST_JPG.tmp" && mv "$TEST_JPG.tmp" "$TEST_JPG"
echo -e "${GREEN}✓ Created 5MB JPG: $TEST_JPG ($(ls -lh $TEST_JPG | awk '{print $5}'))${NC}"

# Create 5MB PNG
TEST_PNG="/tmp/meter-snapshot-5mb.png"
dd if=/dev/urandom of="$TEST_PNG" bs=1024 count=5120 2>/dev/null
# Add PNG header
printf '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A' | cat - "$TEST_PNG" > "$TEST_PNG.tmp" && mv "$TEST_PNG.tmp" "$TEST_PNG"
echo -e "${GREEN}✓ Created 5MB PNG: $TEST_PNG ($(ls -lh $TEST_PNG | awk '{print $5}'))${NC}"

# Create 5MB PDF
TEST_PDF="/tmp/meter-snapshot-5mb.pdf"
dd if=/dev/urandom of="$TEST_PDF" bs=1024 count=5120 2>/dev/null
# Add PDF header
printf '%%PDF-1.4\n' | cat - "$TEST_PDF" > "$TEST_PDF.tmp" && mv "$TEST_PDF.tmp" "$TEST_PDF"
echo -e "${GREEN}✓ Created 5MB PDF: $TEST_PDF ($(ls -lh $TEST_PDF | awk '{print $5}'))${NC}\n"

# Login
echo -e "${YELLOW}Logging in...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  rm -f "$TEST_JPG" "$TEST_PNG" "$TEST_PDF"
  exit 1
fi

echo -e "${GREEN}✓ Logged in${NC}\n"

# Get property and resident
PROPERTIES=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties")
PROPERTY_ID=$(echo "$PROPERTIES" | grep -o '"propertyId":"[^"]*"' | head -1 | cut -d'"' -f4)

RESIDENTS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/residents")
RESIDENT_ID=$(echo "$RESIDENTS" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)

echo -e "${CYAN}Property ID: ${PROPERTY_ID}${NC}"
echo -e "${CYAN}Resident ID: ${RESIDENT_ID}${NC}\n"

# Function to test file upload
test_file_upload() {
  local FILE_TYPE=$1
  local FILE_PATH=$2
  local TEST_NUM=$3
  
  echo -e "${BOLD}${CYAN}============================================================${NC}"
  echo -e "${BOLD}TEST ${TEST_NUM}: ${FILE_TYPE} FILE UPLOAD${NC}"
  echo -e "${BOLD}${CYAN}============================================================${NC}"
  
  # Create invoice
  echo -e "${YELLOW}Creating invoice...${NC}"
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
  
  INVOICE_ID=$(echo "$INVOICE_RESPONSE" | grep -o '"invoiceId":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$INVOICE_ID" ]; then
    echo -e "${RED}✗ Failed to create invoice for ${FILE_TYPE} test${NC}"
    echo -e "${RED}Response: $INVOICE_RESPONSE${NC}\n"
    return 1
  fi
  
  echo -e "${GREEN}✓ Invoice created: ${INVOICE_ID}${NC}"
  
  # Upload file
  echo -e "${YELLOW}Uploading ${FILE_TYPE} file ($(ls -lh $FILE_PATH | awk '{print $5}'))...${NC}"
  
  UPLOAD_START=$(date +%s)
  UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/invoices/${INVOICE_ID}/meter-snapshot" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@${FILE_PATH}")
  UPLOAD_END=$(date +%s)
  
  HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
  UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | head -n -1)
  
  UPLOAD_TIME=$((UPLOAD_END - UPLOAD_START))
  
  echo -e "${BLUE}HTTP Status: ${HTTP_CODE}${NC}"
  echo -e "${BLUE}Upload Time: ${UPLOAD_TIME}s${NC}"
  echo -e "${BLUE}Response Body:${NC}"
  echo "$UPLOAD_BODY" | jq '.' 2>/dev/null || echo "$UPLOAD_BODY"
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    FILE_URL=$(echo "$UPLOAD_BODY" | grep -o '"fileUrl":"[^"]*"' | cut -d'"' -f4)
    FILE_ID=$(echo "$UPLOAD_BODY" | grep -o '"fileId":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$FILE_URL" ] && [ -n "$FILE_ID" ]; then
      echo -e "\n${GREEN}✓ ${FILE_TYPE} uploaded successfully${NC}"
      echo -e "${GREEN}  File ID: ${FILE_ID}${NC}"
      echo -e "${GREEN}  File URL: ${FILE_URL:0:70}...${NC}"
      echo -e "${GREEN}  Upload time: ${UPLOAD_TIME}s${NC}"
      
      # Verify fields in invoice
      SNAPSHOT=$(echo "$UPLOAD_BODY" | grep -o '"electricMeterSnapshot"')
      SNAPSHOT_ID=$(echo "$UPLOAD_BODY" | grep -o '"electricMeterSnapshotId"')
      
      if [ -n "$SNAPSHOT" ] && [ -n "$SNAPSHOT_ID" ]; then
        echo -e "${GREEN}  ✓ Invoice fields updated (electricMeterSnapshot + electricMeterSnapshotId)${NC}"
      fi
      
      echo -e "${GREEN}\n✓ TEST ${TEST_NUM} (${FILE_TYPE}) - PASSED${NC}\n"
      return 0
    else
      echo -e "\n${RED}✗ Upload succeeded but missing fileUrl or fileId${NC}\n"
      return 1
    fi
  else
    echo -e "\n${RED}✗ ${FILE_TYPE} upload failed with HTTP ${HTTP_CODE}${NC}\n"
    return 1
  fi
}

# Test each file type
JPG_RESULT=0
PNG_RESULT=0
PDF_RESULT=0

test_file_upload "JPG" "$TEST_JPG" "1" || JPG_RESULT=1
sleep 2

test_file_upload "PNG" "$TEST_PNG" "2" || PNG_RESULT=1
sleep 2

test_file_upload "PDF" "$TEST_PDF" "3" || PDF_RESULT=1

# Summary
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}TEST SUMMARY${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

if [ $JPG_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ JPG Upload - PASSED${NC}"
else
  echo -e "${RED}✗ JPG Upload - FAILED${NC}"
fi

if [ $PNG_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ PNG Upload - PASSED${NC}"
else
  echo -e "${RED}✗ PNG Upload - FAILED${NC}"
fi

if [ $PDF_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ PDF Upload - PASSED${NC}"
else
  echo -e "${RED}✗ PDF Upload - FAILED${NC}"
fi

echo -e "${BOLD}${CYAN}============================================================${NC}\n"

# Cleanup
rm -f "$TEST_JPG" "$TEST_PNG" "$TEST_PDF"

if [ $JPG_RESULT -eq 0 ] && [ $PNG_RESULT -eq 0 ] && [ $PDF_RESULT -eq 0 ]; then
  echo -e "${BOLD}${GREEN}✓ ALL TESTS PASSED!${NC}\n"
  exit 0
else
  echo -e "${BOLD}${RED}✗ SOME TESTS FAILED${NC}\n"
  exit 1
fi
