/**
 * API Test Script - Resident Creation Scenarios
 *
 * Tests the frontend service layer paths for:
 * 1. Creating resident with lease but no PDF
 * 2. Creating resident with lease and PDF
 * 3. Creating resident without lease
 *
 * Run with: node test-resident-api.mjs
 */

// Use native Node.js FormData and File (Node 20+) instead of form-data package
// The form-data package has issues with multipart boundary handling
import fs from 'fs';
import path from 'path';
import { Blob, File } from 'buffer';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5005';

// Test credentials from environment or defaults
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Usage info
if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
  console.log('\n⚠️  Using default test credentials (probably won\'t work)');
  console.log('Usage: TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass node test-resident-api.mjs\n');
}

// Will be set after authentication
let authToken = null;
let propertyId = null;
let unitId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'yellow');
}

/**
 * Sign in and get auth token
 */
async function signIn() {
  logSection('AUTHENTICATION');
  logInfo(`Signing in as ${TEST_EMAIL}...`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        rememberMe: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Sign-in failed: ${response.status}`);
    }

    authToken = data.data?.token;
    if (!authToken) {
      throw new Error('No token in response');
    }

    logSuccess(`Signed in successfully!`);
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    return false;
  }
}

/**
 * Create a test property
 */
async function createProperty() {
  logInfo('Creating test property...');

  const propertyData = {
    name: 'Test Property ' + Date.now(),
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(propertyData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create property');
    }

    propertyId = data.data?.propertyId || data.data?.$id || data.data?.id || data.propertyId || data.$id || data.id;

    if (!propertyId) {
      console.log('Create property response:', JSON.stringify(data, null, 2));
      throw new Error('No property ID returned');
    }

    logSuccess(`Created test property: ${propertyData.name} (${propertyId})`);
    return true;
  } catch (error) {
    logError(`Failed to create property: ${error.message}`);
    return false;
  }
}

/**
 * Get properties and select the first one, or create one if none exist
 */
async function getProperties() {
  logInfo('Fetching properties...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch properties');
    }

    const properties = data.data || data;
    console.log('Properties response:', JSON.stringify(data, null, 2));

    if (!properties || properties.length === 0) {
      logInfo('No properties found. Creating a test property...');
      return await createProperty();
    }

    // Use first property - check various field names
    const prop = properties[0];
    propertyId = prop.propertyId || prop.$id || prop.id;
    const propName = prop.name || prop.address || 'Unknown';
    logSuccess(`Using property: ${propName} (${propertyId})`);
    return true;
  } catch (error) {
    logError(`Failed to fetch properties: ${error.message}`);
    return false;
  }
}

/**
 * Create a test unit for the property
 */
async function createUnit() {
  logInfo('Creating test unit...');

  const unitData = {
    propertyId,
    name: 'Unit A', // Required by API
    number: 'A', // API also expects 'number'
    rentAmount: 1200,
    status: 'available',
  };

  try {
    console.log('Creating unit with data:', JSON.stringify(unitData, null, 2));

    // POST /api/units with propertyId in body (per unit.service.ts)
    const response = await fetch(`${API_BASE_URL}/api/units`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unitData),
    });

    const data = await response.json();
    console.log('Create unit response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create unit');
    }

    unitId = data.data?.unitId || data.data?.$id || data.data?.id || data.unitId || data.$id || data.id;

    if (!unitId) {
      console.log('Create unit response:', JSON.stringify(data, null, 2));
      throw new Error('No unit ID returned');
    }

    logSuccess(`Created test unit: ${unitData.name} - $${unitData.rentAmount}/mo (${unitId})`);
    return true;
  } catch (error) {
    logError(`Failed to create unit: ${error.message}`);
    return false;
  }
}

/**
 * Get units for the property, or create one if none exist
 */
async function getUnits() {
  logInfo('Fetching units...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/units`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle empty response
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : { data: [] };
    } catch {
      data = { data: [] };
    }

    console.log('Units response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch units');
    }

    const units = data.data || data;

    if (!units || units.length === 0) {
      logInfo('No units found. Creating a test unit...');
      return await createUnit();
    }

    // Use first unit - check various field names
    const unit = units[0];
    unitId = unit.unitId || unit.$id || unit.id;
    logSuccess(`Using unit: ${unit.name} - $${unit.rentAmount}/mo (${unitId})`);
    return true;
  } catch (error) {
    logError(`Failed to fetch units: ${error.message}`);
    return false;
  }
}

/**
 * Step 1: Create a basic resident
 */
async function createResident(testName) {
  logInfo(`Creating resident: ${testName}...`);

  const timestamp = Date.now();
  const residentData = {
    propertyId,
    name: testName,
    streetAddress: '123 Test Street',
    aptNumber: 'A1',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/residents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(residentData),
    });

    const data = await response.json();
    console.log('Create Resident Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || `Failed to create resident: ${response.status}`);
    }

    const residentId = data.data?.renterId || data.data?.$id || data.data?.id;

    if (!residentId) {
      throw new Error('No resident ID returned');
    }

    logSuccess(`Resident created: ${residentId}`);
    logInfo(`Toast: "${data.title}" - "${data.message}"`);
    return residentId;
  } catch (error) {
    logError(`Failed to create resident: ${error.message}`);
    return null;
  }
}

/**
 * Step 2: Update occupants
 */
async function updateOccupants(residentId, occupants) {
  logInfo('Updating occupants...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/residents/${residentId}/occupants`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ occupants }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update occupants');
    }

    logSuccess('Occupants updated');
    logInfo(`Toast: "${data.title}" - "${data.message}"`);
    return true;
  } catch (error) {
    logError(`Failed to update occupants: ${error.message}`);
    return false;
  }
}

/**
 * Step 3: Upload lease (with or without PDF)
 * Uses native Node.js FormData (Node 18+) which works correctly with fetch
 */
async function uploadLease(residentId, leaseData, pdfPath = null) {
  logInfo(`Uploading lease${pdfPath ? ' WITH PDF' : ' WITHOUT PDF'}...`);

  try {
    // Use native FormData (Node 18+) instead of form-data package
    const formData = new FormData();

    // Optional PDF file - use File class for native FormData (Node 20+)
    if (pdfPath) {
      const fileBuffer = fs.readFileSync(pdfPath);
      const fileName = path.basename(pdfPath);
      // Use File constructor (Node 20+) which properly sets filename
      const file = new File([fileBuffer], fileName, { type: 'application/pdf' });
      formData.append('file', file);
      logInfo(`Attached PDF: ${fileName} (${fileBuffer.length} bytes)`);
    }

    // Required metadata fields
    console.log('[uploadLease] Adding fields to FormData...');
    console.log('  propertyId:', propertyId);
    console.log('  documentType:', leaseData.documentType || 'original');
    console.log('  leaseType:', leaseData.leaseType || 'yearly');
    console.log('  startDate:', leaseData.startDate);

    formData.append('propertyId', String(propertyId));
    formData.append('documentType', String(leaseData.documentType || 'original'));
    formData.append('leaseType', String(leaseData.leaseType || 'yearly'));
    formData.append('startDate', String(leaseData.startDate));
    // Note: endDate is NOT sent - the backend calculates it automatically based on leaseType
    if (leaseData.notes) formData.append('notes', String(leaseData.notes));
    if (unitId) formData.append('unitId', String(unitId));

    // Rent details (required by API)
    formData.append('monthlyRent', String(leaseData.monthlyRent || 1000));
    formData.append('lateStartDay', String(leaseData.lateStartDay || 5));
    formData.append('lateFeeDailyRate', String(leaseData.lateFeeDailyRate || 10));
    formData.append('electricRate', String(leaseData.electricRate || 0.12));

    console.log('[uploadLease] Request URL:', `${API_BASE_URL}/api/residents/${residentId}/leases`);

    // Native FormData - don't manually set Content-Type, fetch handles it
    const response = await fetch(`${API_BASE_URL}/api/residents/${residentId}/leases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        // Don't set Content-Type - fetch will set it with proper boundary for FormData
      },
      body: formData,
    });

    const data = await response.json();
    console.log('Upload Lease Response:', JSON.stringify(data, null, 2));
    console.log('Response Status:', response.status);

    if (!response.ok) {
      throw new Error(data.message || `Failed to upload lease: ${response.status}`);
    }

    logSuccess('Lease created successfully!');
    const leaseId = data.$id || data.data?.$id || data.data?.id;
    logInfo(`Lease ID: ${leaseId}`);
    logInfo(`File URL: ${data.fileUrl || data.data?.fileUrl || 'No PDF attached'}`);
    return true;
  } catch (error) {
    logError(`Failed to upload lease: ${error.message}`);
    return false;
  }
}

/**
 * Delete a resident (cleanup)
 */
async function deleteResident(residentId) {
  logInfo(`Cleaning up: Deleting resident ${residentId}...`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/residents/${residentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      logSuccess('Resident deleted');
      return true;
    }
    return false;
  } catch (error) {
    logError(`Failed to delete resident: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScenario1_LeaseNoPDF() {
  logSection('TEST 1: Create Resident with Lease but NO PDF');

  const residentId = await createResident('Test Resident NoPDF ' + Date.now());
  if (!residentId) return false;

  const occupants = [
    { firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '555-1234' },
  ];
  await updateOccupants(residentId, occupants);

  const leaseData = {
    documentType: 'original',
    leaseType: 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    notes: 'Test lease without PDF',
    monthlyRent: 1200,
    lateStartDay: 5,
    lateFeeDailyRate: 10,
    electricRate: 0.12,
  };

  const success = await uploadLease(residentId, leaseData, null); // No PDF

  // Cleanup
  await deleteResident(residentId);

  return success;
}

async function testScenario2_LeaseWithPDF() {
  logSection('TEST 2: Create Resident with Lease AND PDF');

  // Create a simple test PDF file
  const testPdfPath = '/tmp/test-lease.pdf';

  // Check if we have a real PDF to test with, or create a minimal one
  if (!fs.existsSync(testPdfPath)) {
    // Create minimal PDF content
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF`;
    fs.writeFileSync(testPdfPath, pdfContent);
    logInfo(`Created test PDF at ${testPdfPath}`);
  }

  const residentId = await createResident('Test Resident WithPDF ' + Date.now());
  if (!residentId) return false;

  const occupants = [
    { firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', phone: '555-5678' },
  ];
  await updateOccupants(residentId, occupants);

  const leaseData = {
    documentType: 'original',
    leaseType: 'month-to-month',
    startDate: new Date().toISOString().split('T')[0],
    notes: 'Test lease with PDF attachment',
    monthlyRent: 1500,
    lateStartDay: 3,
    lateFeeDailyRate: 15,
    electricRate: 0.15,
  };

  const success = await uploadLease(residentId, leaseData, testPdfPath);

  // Cleanup
  await deleteResident(residentId);

  return success;
}

async function testScenario3_NoLease() {
  logSection('TEST 3: Create Resident WITHOUT Lease');

  const residentId = await createResident('Test Resident NoLease ' + Date.now());
  if (!residentId) return false;

  const occupants = [
    { firstName: 'Bob', lastName: 'Wilson', email: 'bob@test.com', phone: '555-9999' },
    { firstName: 'Alice', lastName: 'Wilson', email: 'alice@test.com', phone: '555-8888' },
  ];

  const success = await updateOccupants(residentId, occupants);

  logInfo('No lease created for this resident - testing resident-only creation');

  // Cleanup
  await deleteResident(residentId);

  return success;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'bold');
  log('║     RENTAL INVOICING APP - RESIDENT CREATION TESTS        ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝', 'bold');

  // Sign in
  if (!await signIn()) {
    logError('Cannot proceed without authentication');
    process.exit(1);
  }

  // Get property and unit
  if (!await getProperties()) {
    logError('Cannot proceed without a property');
    process.exit(1);
  }

  // Units are optional - tests can still run for lease creation without a unit selection
  const hasUnits = await getUnits();
  if (!hasUnits) {
    logInfo('⚠️  No units available - tests will proceed without unit selection');
    logInfo('   (The API may have a bug creating units - you can create one manually in the UI)');
  }

  // Run tests
  const results = {
    'Lease without PDF': await testScenario1_LeaseNoPDF(),
    'Lease with PDF': await testScenario2_LeaseWithPDF(),
    'No lease': await testScenario3_NoLease(),
  };

  // Summary
  logSection('TEST RESULTS SUMMARY');
  let passed = 0;
  let failed = 0;

  for (const [test, success] of Object.entries(results)) {
    if (success) {
      logSuccess(`${test}: PASSED`);
      passed++;
    } else {
      logError(`${test}: FAILED`);
      failed++;
    }
  }

  console.log('\n' + '-'.repeat(40));
  log(`Total: ${passed} passed, ${failed} failed`, passed === 3 ? 'green' : 'yellow');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
