#!/bin/bash
# Test lease upload with cURL to bypass Node.js form-data issues

# Get auth token
AUTH_RESPONSE=$(curl -s -X POST http://localhost:5005/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","password":"Password@1"}')

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

# Create a resident first
RESIDENT_RESPONSE=$(curl -s -X POST http://localhost:5005/api/residents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "propertyId":"6930d696003dc9e268d9",
    "name":"cURL Test Resident",
    "streetAddress":"123 Test St",
    "aptNumber":"1A",
    "city":"Test City",
    "state":"TS",
    "zipCode":"12345"
  }')

echo "Resident Response: $RESIDENT_RESPONSE"

RESIDENT_ID=$(echo $RESIDENT_RESPONSE | grep -o '"renterId":"[^"]*"' | cut -d'"' -f4)
echo "Resident ID: $RESIDENT_ID"

if [ -z "$RESIDENT_ID" ]; then
  echo "Failed to create resident"
  exit 1
fi

# Upload lease using cURL multipart (without PDF file first)
echo ""
echo "=== Testing Lease Upload WITHOUT PDF (cURL) ==="
LEASE_RESPONSE=$(curl -s -X POST "http://localhost:5005/api/residents/${RESIDENT_ID}/leases" \
  -H "Authorization: Bearer $TOKEN" \
  -F "propertyId=6930d696003dc9e268d9" \
  -F "documentType=original" \
  -F "leaseType=yearly" \
  -F "startDate=2025-01-01" \
  -F "monthlyRent=1200" \
  -F "lateStartDay=5" \
  -F "lateFeeDailyRate=10" \
  -F "electricRate=0.12")

echo "Lease Response: $LEASE_RESPONSE"

# Test lease upload WITH PDF file
echo ""
echo "=== Testing Lease Upload WITH PDF (cURL) ==="
LEASE_PDF_RESPONSE=$(curl -s -X POST "http://localhost:5005/api/residents/${RESIDENT_ID}/leases" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-lease.pdf;type=application/pdf" \
  -F "propertyId=6930d696003dc9e268d9" \
  -F "documentType=renewal" \
  -F "leaseType=month-to-month" \
  -F "startDate=2025-06-01" \
  -F "monthlyRent=1500" \
  -F "lateStartDay=5" \
  -F "lateFeeDailyRate=15" \
  -F "electricRate=0.15")

echo "Lease with PDF Response: $LEASE_PDF_RESPONSE"

# Cleanup - delete the resident
echo ""
echo "=== Cleanup ==="
curl -s -X DELETE "http://localhost:5005/api/residents/${RESIDENT_ID}" \
  -H "Authorization: Bearer $TOKEN"
echo "Done"
