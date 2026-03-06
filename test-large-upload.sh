#!/bin/bash
# Test large file upload

cd "/Volumes/BKUP20 Two/Web Design/YNO Creative Labs/Rental Invoicing/Rental Invoicing App figmake-claude"

# Get auth token
AUTH_RESPONSE=$(curl -s -X POST http://localhost:5005/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","password":"Password@1"}')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

# Create resident
RESIDENT_RESPONSE=$(curl -s -X POST http://localhost:5005/api/residents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"propertyId":"6930d696003dc9e268d9","name":"Large PDF Test","streetAddress":"123 Test","city":"Test","state":"TS","zipCode":"12345"}')

RESIDENT_ID=$(echo "$RESIDENT_RESPONSE" | grep -o '"renterId":"[^"]*"' | cut -d'"' -f4)
echo "Resident ID: $RESIDENT_ID"

if [ -z "$RESIDENT_ID" ]; then
  echo "Failed to create resident"
  echo "$RESIDENT_RESPONSE"
  exit 1
fi

echo ""
echo "=== Testing Large File Upload (234KB) with timeout ==="
curl -v --max-time 30 -X POST "http://localhost:5005/api/residents/${RESIDENT_ID}/leases" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-large.pdf;type=application/pdf" \
  -F "propertyId=6930d696003dc9e268d9" \
  -F "documentType=original" \
  -F "leaseType=yearly" \
  -F "startDate=2025-01-01" \
  -F "monthlyRent=1200" \
  -F "lateStartDay=5" \
  -F "lateFeeDailyRate=10" \
  -F "electricRate=0.12" 2>&1

echo ""
echo "=== Cleanup ==="
curl -s -X DELETE "http://localhost:5005/api/residents/${RESIDENT_ID}" \
  -H "Authorization: Bearer $TOKEN"
echo "Done"
