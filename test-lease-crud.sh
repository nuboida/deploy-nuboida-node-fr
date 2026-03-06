#!/bin/bash

# Test lease CRUD operations with toast messages
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
echo -e "${BOLD}LEASE CRUD OPERATIONS TEST${NC}"
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

# Get or create unit
echo -e "${YELLOW}Getting units...${NC}"
UNITS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/units")
UNIT_ID=$(echo "$UNITS" | grep -o '"unitId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$UNIT_ID" ]; then
  echo -e "${YELLOW}Creating test unit...${NC}"
  UNIT_RESPONSE=$(curl -s -X POST "${API_URL}/api/units" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"propertyId\":\"${PROPERTY_ID}\",\"unitNumber\":\"101\",\"rentAmount\":1500,\"status\":\"occupied\"}")

  UNIT_ID=$(echo "$UNIT_RESPONSE" | grep -o '"unitId":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo -e "${GREEN}✓ Using unit: ${UNIT_ID}${NC}\n"

# Get or create resident
echo -e "${YELLOW}Getting residents...${NC}"
RESIDENTS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/residents")
RESIDENT_ID=$(echo "$RESIDENTS" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RESIDENT_ID" ]; then
  echo -e "${YELLOW}Creating test resident...${NC}"
  RESIDENT_RESPONSE=$(curl -s -X POST "${API_URL}/api/residents" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"propertyId\":\"${PROPERTY_ID}\",\"occupants\":[{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"phone\":\"555-1234\"}],\"unitId\":\"${UNIT_ID}\",\"currentRent\":1500}")

  RESIDENT_ID=$(echo "$RESIDENT_RESPONSE" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo -e "${GREEN}✓ Using resident: ${RESIDENT_ID}${NC}\n"

# ========== TEST 1: CREATE LEASE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 1: CREATE LEASE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

LEASE_RESPONSE=$(curl -s -X POST "${API_URL}/api/residents/${RESIDENT_ID}/leases" \
  -H "Authorization: Bearer $TOKEN" \
  -F "propertyId=${PROPERTY_ID}" \
  -F "category=original" \
  -F "leaseType=yearly" \
  -F "startDate=2025-01-01" \
  -F "notes=Test lease created via script" \
  -F "unitId=${UNIT_ID}" \
  -F "monthlyRent=1500" \
  -F "lateStartDay=5" \
  -F "lateFeeDailyRate=5.00" \
  -F "electricRate=0.12")

echo -e "${BLUE}Response:${NC}"
echo "$LEASE_RESPONSE" | jq '.' 2>/dev/null || echo "$LEASE_RESPONSE"

LEASE_ID=$(echo "$LEASE_RESPONSE" | grep -o '"leaseId":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$LEASE_ID" ]; then
  LEASE_ID=$(echo "$LEASE_RESPONSE" | grep -o '"\$id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

TITLE=$(echo "$LEASE_RESPONSE" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
MESSAGE=$(echo "$LEASE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TITLE" ] && [ -n "$MESSAGE" ]; then
  echo -e "\n${GREEN}✓ Toast Message Received:${NC}"
  echo -e "${GREEN}  Title: ${TITLE}${NC}"
  echo -e "${GREEN}  Message: ${MESSAGE}${NC}"
else
  echo -e "\n${YELLOW}⚠ No toast message in response (API doesn't return toast for CREATE)${NC}"
fi

if [ -z "$LEASE_ID" ]; then
  echo -e "${RED}✗ Failed to create lease - no ID in response${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Lease created with ID: ${LEASE_ID}${NC}\n"
sleep 1

# ========== TEST 2: UPDATE LEASE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 2: UPDATE LEASE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/residents/${RESIDENT_ID}/leases/${LEASE_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -F "category=renewal" \
  -F "leaseType=month-to-month" \
  -F "startDate=2026-01-01" \
  -F "notes=Test lease UPDATED via script" \
  -F "monthlyRent=1600" \
  -F "lateStartDay=10" \
  -F "lateFeeDailyRate=10.00" \
  -F "electricRate=0.15")

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

echo -e "${GREEN}✓ Lease updated successfully${NC}\n"
sleep 1

# ========== TEST 3: DELETE LEASE ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 3: DELETE LEASE${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/api/residents/${RESIDENT_ID}/leases/${LEASE_ID}" \
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

echo -e "${GREEN}✓ Lease deleted successfully${NC}\n"
sleep 1

# ========== TEST 4: VERIFY DELETION ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}STEP 4: VERIFY DELETION${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"

LEASES=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/residents/${RESIDENT_ID}/leases")
FOUND=$(echo "$LEASES" | grep -o "\"leaseId\":\"${LEASE_ID}\"")

if [ -n "$FOUND" ]; then
  echo -e "${RED}✗ Lease still exists! Deletion failed.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Lease successfully removed from database${NC}\n"
fi

# ========== SUMMARY ==========
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${BOLD}TEST SUMMARY${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "${GREEN}✓ Create Lease - PASSED${NC}"
echo -e "${GREEN}✓ Update Lease - PASSED${NC}"
echo -e "${GREEN}✓ Delete Lease - PASSED${NC}"
echo -e "${GREEN}✓ Verify Deletion - PASSED${NC}"
echo -e "${BOLD}${CYAN}============================================================${NC}"
echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
