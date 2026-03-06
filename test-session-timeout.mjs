/**
 * Session Timeout / Auto Sign-Out Test Script
 *
 * Tests the JWT token refresh mechanism and session management:
 * 1. Sign in and get initial token + sessionId + expiresAt
 * 2. Make authenticated requests
 * 3. Test token refresh endpoint
 * 4. Simulate expired token scenario
 *
 * Run with: TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass node test-session-timeout.mjs
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:5005';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Session data
let authToken = null;
let sessionId = null;
let userId = null;
let expiresAt = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
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

function logDebug(message) {
  log(`   ${message}`, 'dim');
}

/**
 * Parse JWT token to see expiration
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Calculate time until expiration
 */
function timeUntilExpiry(expiryTimestamp) {
  if (!expiryTimestamp) return 'N/A';
  const now = Date.now();
  const expiry = new Date(expiryTimestamp).getTime();
  const diff = expiry - now;

  if (diff < 0) return 'EXPIRED';

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// ============================================================================
// TEST 1: Sign In
// ============================================================================

async function testSignIn(rememberMe = false) {
  logSection(`TEST 1: Sign In ${rememberMe ? '(with Remember Me)' : '(without Remember Me)'}`);

  logInfo(`Signing in as ${TEST_EMAIL}...`);
  logInfo(`Remember Me: ${rememberMe}`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        rememberMe,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logError(`Sign-in failed: ${data.message || response.status}`);
      return false;
    }

    // Extract session data (including userId for token refresh)
    authToken = data.data?.token;
    sessionId = data.data?.sessionId;
    userId = data.data?.userId;
    expiresAt = data.data?.expiresAt;

    if (!authToken) {
      logError('No token in response');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    logSuccess('Signed in successfully!');

    // Display session info
    console.log('\n--- Session Data from API Response ---');
    logDebug(`Token: ${authToken.substring(0, 30)}...`);
    logDebug(`Session ID: ${sessionId || 'NOT PROVIDED'}`);
    logDebug(`User ID: ${userId || 'NOT PROVIDED'}`);
    logDebug(`Expires At: ${expiresAt || 'NOT PROVIDED'}`);

    // Parse JWT to see actual expiration
    const jwtPayload = parseJwt(authToken);
    if (jwtPayload) {
      console.log('\n--- JWT Token Analysis ---');
      logDebug(`JWT Issued At (iat): ${formatTime(jwtPayload.iat * 1000)}`);
      logDebug(`JWT Expires At (exp): ${formatTime(jwtPayload.exp * 1000)}`);
      logDebug(`Time until JWT expires: ${timeUntilExpiry(jwtPayload.exp * 1000)}`);
      logDebug(`JWT User ID: ${jwtPayload.userId || jwtPayload.sub || 'N/A'}`);

      // Check if JWT is short-lived (typical for Appwrite ~15 min)
      const jwtLifetime = (jwtPayload.exp - jwtPayload.iat) / 60;
      logInfo(`JWT lifetime: ${jwtLifetime.toFixed(1)} minutes`);

      if (jwtLifetime < 20) {
        logInfo('⚠️  JWT has short lifetime - token refresh is required to maintain session');
      }
    }

    // Compare API expiresAt with JWT exp
    if (expiresAt && jwtPayload?.exp) {
      const apiExpiry = new Date(expiresAt).getTime();
      const jwtExpiry = jwtPayload.exp * 1000;
      const diff = Math.abs(apiExpiry - jwtExpiry) / 1000;

      console.log('\n--- Expiry Comparison ---');
      logDebug(`API expiresAt: ${formatTime(apiExpiry)}`);
      logDebug(`JWT exp claim: ${formatTime(jwtExpiry)}`);

      if (diff < 60) {
        logSuccess('API expiresAt matches JWT exp claim');
      } else {
        logInfo(`API expiresAt differs from JWT exp by ${diff.toFixed(0)} seconds`);
      }
    }

    return true;
  } catch (error) {
    logError(`Sign-in error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST 2: Make Authenticated Request
// ============================================================================

async function testAuthenticatedRequest() {
  logSection('TEST 2: Make Authenticated Request');

  logInfo('Fetching properties with current token...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      logError('401 Unauthorized - Token may be expired or invalid');
      const errorData = await response.json().catch(() => ({}));
      logDebug(`Error: ${errorData.message || 'Unknown'}`);
      return false;
    }

    if (!response.ok) {
      logError(`Request failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    logSuccess(`Authenticated request succeeded!`);
    logDebug(`Found ${Array.isArray(data) ? data.length : (data.data?.length || 0)} properties`);
    return true;
  } catch (error) {
    logError(`Request error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST 3: Token Refresh
// ============================================================================

async function testTokenRefresh() {
  logSection('TEST 3: Token Refresh');

  if (!sessionId) {
    logError('No sessionId available - cannot test token refresh');
    logInfo('The API may not be returning sessionId in the sign-in response');
    return false;
  }

  if (!userId) {
    logError('No userId available - cannot test token refresh');
    logInfo('The API may not be returning userId in the sign-in response');
    return false;
  }

  logInfo('Attempting to refresh token...');
  logDebug(`Using sessionId: ${sessionId.substring(0, 15)}...`);
  logDebug(`Using userId: ${userId.substring(0, 15)}...`);
  logDebug(`Current expiresAt: ${expiresAt || 'N/A'}`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId,
        expiresAt,
      }),
    });

    const data = await response.json();
    console.log('\n--- Refresh Token Response ---');
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      logError(`Token refresh failed: ${data.message || response.status}`);
      return false;
    }

    const newToken = data.data?.token;
    const newExpiresAt = data.data?.expiresAt;

    if (!newToken) {
      logError('No new token in refresh response');
      return false;
    }

    logSuccess('Token refreshed successfully!');

    // Compare old and new tokens
    console.log('\n--- Token Comparison ---');
    logDebug(`Old token: ${authToken.substring(0, 30)}...`);
    logDebug(`New token: ${newToken.substring(0, 30)}...`);
    logDebug(`Tokens are ${authToken === newToken ? 'SAME' : 'DIFFERENT'}`);

    // Parse new JWT
    const newJwtPayload = parseJwt(newToken);
    if (newJwtPayload) {
      logDebug(`New JWT expires: ${formatTime(newJwtPayload.exp * 1000)}`);
      logDebug(`Time until new JWT expires: ${timeUntilExpiry(newJwtPayload.exp * 1000)}`);
    }

    // Update our stored token
    authToken = newToken;
    if (newExpiresAt) expiresAt = newExpiresAt;

    return true;
  } catch (error) {
    logError(`Token refresh error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST 4: Verify Refreshed Token Works
// ============================================================================

async function testRefreshedTokenWorks() {
  logSection('TEST 4: Verify Refreshed Token Works');

  logInfo('Making request with refreshed token...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      logError('401 Unauthorized - Refreshed token is not valid!');
      return false;
    }

    if (!response.ok) {
      logError(`Request failed: ${response.status}`);
      return false;
    }

    logSuccess('Refreshed token works correctly!');
    return true;
  } catch (error) {
    logError(`Request error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST 5: Simulate Expired Token (optional)
// ============================================================================

async function testExpiredTokenHandling() {
  logSection('TEST 5: Simulate Expired Token Handling');

  logInfo('Using an invalid/expired token to test 401 handling...');

  const fakeExpiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';

  try {
    const response = await fetch(`${API_BASE_URL}/api/properties`, {
      headers: {
        'Authorization': `Bearer ${fakeExpiredToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      logSuccess('API correctly returns 401 for expired/invalid token');
      const errorData = await response.json().catch(() => ({}));
      logDebug(`Error message: ${errorData.message || 'N/A'}`);
      return true;
    }

    logError(`Expected 401, got ${response.status}`);
    return false;
  } catch (error) {
    logError(`Request error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════════════╗', 'bold');
  log('║         SESSION TIMEOUT / AUTO SIGN-OUT DIAGNOSTIC TEST              ║', 'bold');
  log('╚══════════════════════════════════════════════════════════════════════╝', 'bold');

  console.log('\nThis test will diagnose issues with:');
  console.log('  - JWT token expiration');
  console.log('  - Token refresh mechanism');
  console.log('  - Session management with/without "Remember Me"');
  console.log('');

  const results = {};

  // Test without Remember Me first
  results['Sign In (no Remember Me)'] = await testSignIn(false);

  if (results['Sign In (no Remember Me)']) {
    results['Authenticated Request'] = await testAuthenticatedRequest();
    results['Token Refresh'] = await testTokenRefresh();

    if (results['Token Refresh']) {
      results['Refreshed Token Works'] = await testRefreshedTokenWorks();
    }

    results['Expired Token Handling'] = await testExpiredTokenHandling();
  }

  // Summary
  logSection('DIAGNOSTIC SUMMARY');

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

  console.log('\n' + '-'.repeat(50));
  log(`Total: ${passed} passed, ${failed} failed`, passed === Object.keys(results).length ? 'green' : 'yellow');

  // Analysis
  logSection('ANALYSIS');

  if (!sessionId) {
    logError('CRITICAL: API is not returning sessionId in sign-in response');
    logInfo('Without sessionId, the frontend cannot refresh tokens');
    logInfo('This will cause users to be signed out when JWT expires (~15 min)');
  } else {
    logSuccess('sessionId is being returned by API');
  }

  if (!userId) {
    logError('CRITICAL: API is not returning userId in sign-in response');
    logInfo('Without userId, the frontend cannot refresh tokens');
    logInfo('This will cause users to be signed out when JWT expires (~15 min)');
  } else {
    logSuccess('userId is being returned by API');
  }

  if (!expiresAt) {
    logInfo('WARNING: API is not returning expiresAt in sign-in response');
    logInfo('The frontend may not know when to proactively refresh tokens');
  } else {
    logSuccess('expiresAt is being returned by API');
  }

  if (results['Token Refresh']) {
    logSuccess('Token refresh endpoint is working');
    logInfo('The frontend should be able to maintain sessions');
  } else if (sessionId && userId) {
    logError('Token refresh endpoint is NOT working');
    logInfo('Users will be signed out when JWT expires, even with valid session');
  }

  console.log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
