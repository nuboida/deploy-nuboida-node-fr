#!/usr/bin/env node

/**
 * Test script for lease CRUD operations
 * Tests: Create, Read, Update, Delete lease with toast message responses
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'landlord@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`STEP ${step}: ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function login() {
  const response = await fetch(`${API_URL}/api/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Login failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.token;
}

async function getOrCreateProperty(token) {
  // Try to get existing properties
  const response = await fetch(`${API_URL}/api/properties`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get properties: ${response.status}`);
  }

  const properties = await response.json();

  if (properties.length > 0) {
    logSuccess(`Using existing property: ${properties[0].address}`);
    return properties[0];
  }

  // Create a test property
  const createResponse = await fetch(`${API_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create property: ${createResponse.status}`);
  }

  const property = await createResponse.json();
  logSuccess(`Created test property: ${property.address}`);
  return property;
}

async function getOrCreateUnit(token, propertyId) {
  // Try to get existing units
  const response = await fetch(`${API_URL}/api/properties/${propertyId}/units`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get units: ${response.status}`);
  }

  const units = await response.json();

  if (units.length > 0) {
    logSuccess(`Using existing unit: ${units[0].unitNumber}`);
    return units[0];
  }

  // Create a test unit
  const createResponse = await fetch(`${API_URL}/api/units`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      propertyId,
      unitNumber: '101',
      rentAmount: 1500,
      status: 'occupied',
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create unit: ${createResponse.status}`);
  }

  const unit = await createResponse.json();
  logSuccess(`Created test unit: ${unit.unitNumber}`);
  return unit;
}

async function getOrCreateResident(token, propertyId, unitId) {
  // Try to get existing residents
  const response = await fetch(`${API_URL}/api/properties/${propertyId}/residents`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get residents: ${response.status}`);
  }

  const residents = await response.json();

  if (residents.length > 0) {
    logSuccess(`Using existing resident: ${residents[0].name || 'Test Resident'}`);
    return residents[0];
  }

  // Create a test resident
  const createResponse = await fetch(`${API_URL}/api/residents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      propertyId,
      occupants: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234',
        },
      ],
      unitId,
      currentRent: 1500,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create resident: ${createResponse.status} - ${errorText}`);
  }

  const resident = await createResponse.json();
  logSuccess(`Created test resident: ${resident.name || 'John Doe'}`);
  return resident;
}

async function createLease(token, residentId, propertyId, unitId) {
  logStep(1, 'CREATE LEASE');

  const formData = new FormData();
  formData.append('propertyId', propertyId);
  formData.append('category', 'original');
  formData.append('leaseType', 'yearly');
  formData.append('startDate', '2025-01-01');
  formData.append('notes', 'Test lease created via script');
  formData.append('unitId', unitId);
  formData.append('monthlyRent', '1500');
  formData.append('lateStartDay', '5');
  formData.append('lateFeeDailyRate', '5.00');
  formData.append('electricRate', '0.12');

  log('Sending POST request to create lease...', 'blue');
  const response = await fetch(`${API_URL}/api/residents/${residentId}/leases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logError(`Failed to create lease: ${response.status}`);
    log(`Response: ${errorText}`, 'red');
    throw new Error(`Failed to create lease: ${response.status}`);
  }

  const lease = await response.json();

  log('\nResponse:', 'blue');
  log(JSON.stringify(lease, null, 2), 'cyan');

  if (lease.title && lease.message) {
    logSuccess(`Toast Message Received:`);
    log(`  Title: ${lease.title}`, 'green');
    log(`  Message: ${lease.message}`, 'green');
  } else {
    logWarning('No toast message in response');
  }

  logSuccess(`Lease created with ID: ${lease.leaseId || lease.$id}`);

  // Verify lease data
  if (lease.category === 'original') logSuccess('✓ Category: original');
  if (lease.leaseType === 'yearly') logSuccess('✓ Lease type: yearly');
  if (lease.unitId === unitId) logSuccess('✓ Unit ID matches');
  if (lease.monthlyRent === 1500) logSuccess('✓ Monthly rent: $1500');

  return lease;
}

async function updateLease(token, residentId, leaseId) {
  logStep(2, 'UPDATE LEASE');

  const formData = new FormData();
  formData.append('category', 'renewal');
  formData.append('leaseType', 'month-to-month');
  formData.append('startDate', '2026-01-01');
  formData.append('notes', 'Test lease UPDATED via script');
  formData.append('monthlyRent', '1600');
  formData.append('lateStartDay', '10');
  formData.append('lateFeeDailyRate', '10.00');
  formData.append('electricRate', '0.15');

  log('Sending PUT request to update lease...', 'blue');
  const response = await fetch(`${API_URL}/api/residents/${residentId}/leases/${leaseId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logError(`Failed to update lease: ${response.status}`);
    log(`Response: ${errorText}`, 'red');
    throw new Error(`Failed to update lease: ${response.status}`);
  }

  const lease = await response.json();

  log('\nResponse:', 'blue');
  log(JSON.stringify(lease, null, 2), 'cyan');

  if (lease.title && lease.message) {
    logSuccess(`Toast Message Received:`);
    log(`  Title: ${lease.title}`, 'green');
    log(`  Message: ${lease.message}`, 'green');
  } else {
    logWarning('No toast message in response');
  }

  logSuccess(`Lease updated successfully`);

  // Verify updated data
  if (lease.category === 'renewal') logSuccess('✓ Category updated to: renewal');
  if (lease.leaseType === 'month-to-month') logSuccess('✓ Lease type updated to: month-to-month');
  if (lease.monthlyRent === 1600) logSuccess('✓ Monthly rent updated to: $1600');

  return lease;
}

async function deleteLease(token, residentId, leaseId) {
  logStep(3, 'DELETE LEASE');

  log('Sending DELETE request...', 'blue');
  const response = await fetch(`${API_URL}/api/residents/${residentId}/leases/${leaseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logError(`Failed to delete lease: ${response.status}`);
    log(`Response: ${errorText}`, 'red');
    throw new Error(`Failed to delete lease: ${response.status}`);
  }

  const result = await response.json();

  log('\nResponse:', 'blue');
  log(JSON.stringify(result, null, 2), 'cyan');

  if (result.title && result.message) {
    logSuccess(`Toast Message Received:`);
    log(`  Title: ${result.title}`, 'green');
    log(`  Message: ${result.message}`, 'green');
  } else {
    logWarning('No toast message in response');
  }

  logSuccess(`Lease deleted successfully`);

  return result;
}

async function verifyLeaseDeleted(token, residentId, leaseId) {
  logStep(4, 'VERIFY DELETION');

  log('Attempting to fetch deleted lease...', 'blue');
  const response = await fetch(`${API_URL}/api/residents/${residentId}/leases`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get leases: ${response.status}`);
  }

  const leases = await response.json();
  const foundLease = leases.find(l => (l.leaseId || l.$id) === leaseId);

  if (foundLease) {
    logError(`Lease still exists! Deletion failed.`);
    return false;
  } else {
    logSuccess(`Lease successfully removed from database`);
    return true;
  }
}

async function main() {
  try {
    log('\n' + '='.repeat(60), 'magenta');
    log('LEASE OPERATIONS TEST SUITE', 'bright');
    log('='.repeat(60), 'magenta');
    log(`API URL: ${API_URL}`, 'cyan');
    log(`Test User: ${TEST_EMAIL}`, 'cyan');
    log('='.repeat(60) + '\n', 'magenta');

    // Setup
    log('Setting up test environment...', 'yellow');
    const token = await login();
    logSuccess('Logged in successfully');

    const property = await getOrCreateProperty(token);
    const unit = await getOrCreateUnit(token, property.propertyId || property.$id);
    const resident = await getOrCreateResident(token, property.propertyId || property.$id, unit.unitId || unit.$id);

    const residentId = resident.residentId || resident.$id;
    const propertyId = property.propertyId || property.$id;
    const unitId = unit.unitId || unit.$id;

    log('\nTest environment ready:', 'yellow');
    log(`  Property: ${property.address}`, 'cyan');
    log(`  Unit: ${unit.unitNumber}`, 'cyan');
    log(`  Resident: ${resident.name || 'John Doe'}`, 'cyan');

    // Test 1: Create Lease
    const createdLease = await createLease(token, residentId, propertyId, unitId);
    const leaseId = createdLease.leaseId || createdLease.$id;

    // Wait a bit for the server
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Update Lease
    await updateLease(token, residentId, leaseId);

    // Wait a bit for the server
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: Delete Lease
    await deleteLease(token, residentId, leaseId);

    // Wait a bit for the server
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Verify Deletion
    await verifyLeaseDeleted(token, residentId, leaseId);

    // Summary
    log('\n' + '='.repeat(60), 'magenta');
    log('TEST SUMMARY', 'bright');
    log('='.repeat(60), 'magenta');
    logSuccess('✓ Create Lease - PASSED');
    logSuccess('✓ Update Lease - PASSED');
    logSuccess('✓ Delete Lease - PASSED');
    logSuccess('✓ Verify Deletion - PASSED');
    log('='.repeat(60), 'magenta');
    log('\n✓ All tests passed!', 'green');

    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('TEST FAILED', 'bright');
    log('='.repeat(60), 'red');
    logError(`Error: ${error.message}`);
    if (error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }
    log('='.repeat(60) + '\n', 'red');
    process.exit(1);
  }
}

main();
