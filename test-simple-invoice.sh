#!/bin/bash

API_URL="http://localhost:5005"
TEST_EMAIL="test@email.com"
TEST_PASSWORD="Password@1"

# Login
echo "Logging in..."
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

# Get IDs
PROPERTIES=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties")
PROPERTY_ID=$(echo "$PROPERTIES" | grep -o '"propertyId":"[^"]*"' | head -1 | cut -d'"' -f4)

RESIDENTS=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_URL}/api/properties/${PROPERTY_ID}/residents")
RESIDENT_ID=$(echo "$RESIDENTS" | grep -o '"residentId":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Property: $PROPERTY_ID"
echo "Resident: $RESIDENT_ID"

# Create minimal invoice
echo ""
echo "Creating invoice with minimal required fields..."
curl -v -X POST "${API_URL}/api/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"residentId\":\"${RESIDENT_ID}\",\"propertyId\":\"${PROPERTY_ID}\",\"month\":12,\"year\":2025}"

echo ""
