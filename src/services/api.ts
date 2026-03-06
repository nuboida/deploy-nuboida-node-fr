/**
 * API Client Service
 *
 * Base configuration for all API requests to the rental invoicing backend.
 * Handles authentication, request/response interceptors, and error handling.
 */

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Global 401 handler - called when any API request returns 401 Unauthorized
// This allows App.tsx to register a callback for automatic sign-out
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * Register a callback to be called when a 401 Unauthorized response is received.
 * This enables automatic sign-out when authentication fails on any API call.
 */
export function onUnauthorized(callback: () => void): void {
  onUnauthorizedCallback = callback;
}

/**
 * Clear the unauthorized callback (e.g., when component unmounts)
 */
export function clearUnauthorizedCallback(): void {
  onUnauthorizedCallback = null;
}

/**
 * API Response wrapper (new backend format)
 */
export interface ApiResponse<T> {
  status: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  data?: T;
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Portal type for token separation
export type PortalType = 'homeowner' | 'resident';

// Current active portal - defaults to homeowner
let currentPortal: PortalType = 'homeowner';

/**
 * Set the current portal type (call this before auth operations)
 */
export function setCurrentPortal(portal: PortalType): void {
  currentPortal = portal;
  localStorage.setItem('current_portal', portal);
}

/**
 * Get the current portal type
 */
export function getCurrentPortal(): PortalType {
  const stored = localStorage.getItem('current_portal') as PortalType | null;
  if (stored === 'homeowner' || stored === 'resident') {
    currentPortal = stored;
  }
  return currentPortal;
}

/**
 * Get the localStorage key for the current portal's token
 */
function getTokenKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `auth_token_${p}`;
}

/**
 * Get the localStorage key for the current portal's session expiration
 */
function getSessionExpiryKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `session_expiry_${p}`;
}

/**
 * Get the localStorage key for the current portal's last activity timestamp
 */
function getLastActivityKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `last_activity_${p}`;
}

/**
 * Get the localStorage key for the current portal's session ID (for token refresh)
 */
function getSessionIdKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `session_id_${p}`;
}

/**
 * Get the localStorage key for the current portal's JWT expiration time
 */
function getJwtExpiryKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `jwt_expiry_${p}`;
}

/**
 * Get the localStorage key for the current portal's user ID (for token refresh)
 */
function getUserIdKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `user_id_${p}`;
}

/**
 * Get authentication token from localStorage for current portal
 */
function getAuthToken(): string | null {
  return localStorage.getItem(getTokenKey());
}

/**
 * Set authentication token in localStorage for current portal
 * @param token - The authentication token
 * @param portal - The portal type (homeowner or resident)
 * @param rememberMe - If true, extends session to 30 days; otherwise uses default (10 minutes idle timeout)
 * @param sessionId - The Appwrite session ID (for token refresh)
 * @param expiresAt - The JWT expiration time from the server
 * @param userId - The Appwrite user ID (required for token refresh)
 */
export function setAuthToken(
  token: string,
  portal?: PortalType,
  rememberMe: boolean = false,
  sessionId?: string,
  expiresAt?: string,
  userId?: string
): void {
  const p = portal || getCurrentPortal();
  localStorage.setItem(getTokenKey(p), token);

  // Store session ID for token refresh
  if (sessionId) {
    localStorage.setItem(getSessionIdKey(p), sessionId);
  }

  // Store JWT expiry time for proactive refresh
  if (expiresAt) {
    localStorage.setItem(getJwtExpiryKey(p), expiresAt);
  }

  // Store user ID for token refresh (required by API)
  if (userId) {
    localStorage.setItem(getUserIdKey(p), userId);
  }

  // Set session expiration based on rememberMe
  if (rememberMe) {
    // 30 days from now
    const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
    localStorage.setItem(getSessionExpiryKey(p), expiryTime.toString());
  } else {
    // No expiration stored for regular sessions (uses idle timeout instead)
    localStorage.removeItem(getSessionExpiryKey(p));
  }

  // Update last activity timestamp
  updateLastActivity(p);
}

/**
 * Get the stored session ID for token refresh
 */
export function getSessionId(portal?: PortalType): string | null {
  const p = portal || getCurrentPortal();
  return localStorage.getItem(getSessionIdKey(p));
}

/**
 * Get the stored JWT expiry time
 */
export function getJwtExpiry(portal?: PortalType): string | null {
  const p = portal || getCurrentPortal();
  return localStorage.getItem(getJwtExpiryKey(p));
}

/**
 * Get the stored user ID for token refresh
 */
export function getUserId(portal?: PortalType): string | null {
  const p = portal || getCurrentPortal();
  return localStorage.getItem(getUserIdKey(p));
}

/**
 * Update the last activity timestamp for the current portal
 */
export function updateLastActivity(portal?: PortalType): void {
  const p = portal || getCurrentPortal();
  localStorage.setItem(getLastActivityKey(p), Date.now().toString());
}

/**
 * Check if Remember Me is active for the current session
 * Returns true if user has an active Remember Me session
 */
export function hasRememberMeSession(portal?: PortalType): boolean {
  const p = portal || getCurrentPortal();
  const expiryTime = localStorage.getItem(getSessionExpiryKey(p));
  return !!expiryTime; // If expiry time exists, Remember Me is active
}

/**
 * Check if the session has expired
 * Returns true if session is expired, false otherwise
 */
export function isSessionExpired(portal?: PortalType): boolean {
  const p = portal || getCurrentPortal();
  const expiryTime = localStorage.getItem(getSessionExpiryKey(p));

  // If there's an expiry time set (rememberMe was checked)
  if (expiryTime) {
    const now = Date.now();
    return now > parseInt(expiryTime);
  }

  // For regular sessions, they don't expire based on time
  // (idle timeout is handled separately in App.tsx)
  return false;
}

/**
 * Extend the session expiration (for sliding window)
 * Only applies to rememberMe sessions
 */
export function extendSession(portal?: PortalType): void {
  const p = portal || getCurrentPortal();
  const expiryTime = localStorage.getItem(getSessionExpiryKey(p));

  // Only extend if there's an existing expiration (rememberMe session)
  if (expiryTime) {
    const newExpiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
    localStorage.setItem(getSessionExpiryKey(p), newExpiryTime.toString());
  }

  // Always update last activity
  updateLastActivity(p);
}

/**
 * Clear authentication token from localStorage for current portal
 */
export function clearAuthToken(portal?: PortalType): void {
  const p = portal || getCurrentPortal();
  localStorage.removeItem(getTokenKey(p));
  localStorage.removeItem(getSessionExpiryKey(p));
  localStorage.removeItem(getLastActivityKey(p));
  localStorage.removeItem(getSessionIdKey(p));
  localStorage.removeItem(getJwtExpiryKey(p));
  localStorage.removeItem(getUserIdKey(p));
}

/**
 * Clear all auth tokens (both portals)
 */
export function clearAllAuthTokens(): void {
  localStorage.removeItem('auth_token_homeowner');
  localStorage.removeItem('auth_token_resident');
  localStorage.removeItem('session_expiry_homeowner');
  localStorage.removeItem('session_expiry_resident');
  localStorage.removeItem('last_activity_homeowner');
  localStorage.removeItem('last_activity_resident');
  localStorage.removeItem('session_id_homeowner');
  localStorage.removeItem('session_id_resident');
  localStorage.removeItem('jwt_expiry_homeowner');
  localStorage.removeItem('jwt_expiry_resident');
  localStorage.removeItem('user_id_homeowner');
  localStorage.removeItem('user_id_resident');
  localStorage.removeItem('current_portal');
  localStorage.removeItem('current_user_homeowner');
  localStorage.removeItem('current_user_resident');
  // Also clear old token key for migration
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
}

/**
 * Check if authenticated for a specific portal
 */
export function isAuthenticatedFor(portal: PortalType): boolean {
  return !!localStorage.getItem(getTokenKey(portal));
}

// Flag to prevent concurrent token refresh attempts
let isRefreshing = false;
// Queue of pending requests waiting for token refresh
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the JWT token using the stored session ID and user ID
 * Returns the new token if successful, null if refresh fails
 */
async function refreshToken(): Promise<string | null> {
  const portal = getCurrentPortal();
  const sessionId = getSessionId();
  const userId = getUserId();
  const jwtExpiry = getJwtExpiry();
  const currentToken = getAuthToken();

  console.log('[API] Token refresh attempt - portal:', portal);
  console.log('[API] Token refresh attempt - sessionId exists:', !!sessionId);
  console.log('[API] Token refresh attempt - userId exists:', !!userId);
  console.log('[API] Token refresh attempt - jwtExpiry:', jwtExpiry);
  console.log('[API] Token refresh attempt - currentToken exists:', !!currentToken);

  if (!sessionId) {
    console.log('[API] No session ID stored, cannot refresh token');
    return null;
  }

  if (!userId) {
    console.log('[API] No user ID stored, cannot refresh token');
    return null;
  }

  console.log('[API] Attempting token refresh with sessionId:', sessionId.substring(0, 10) + '...');

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId,
        expiresAt: jwtExpiry,
      }),
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = JSON.stringify(errorData);
      } catch {
        errorDetails = response.statusText;
      }
      console.error('[API] Token refresh failed with status:', response.status, 'Details:', errorDetails);
      return null;
    }

    const data = await response.json();
    console.log('[API] Token refresh response:', JSON.stringify(data));

    if (data.data?.token) {
      const newToken = data.data.token;
      const newExpiresAt = data.data.expiresAt;

      // Update stored token (preserve rememberMe status)
      localStorage.setItem(getTokenKey(portal), newToken);
      if (newExpiresAt) {
        localStorage.setItem(getJwtExpiryKey(portal), newExpiresAt);
      }

      console.log('[API] Token refresh successful, new token stored');
      return newToken;
    }

    console.error('[API] Token refresh response missing token');
    return null;
  } catch (error) {
    console.error('[API] Token refresh error:', error);
    return null;
  }
}

/**
 * Get a fresh token, refreshing if necessary
 * Handles concurrent refresh requests by returning the same promise
 */
async function ensureFreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    // Wait for the ongoing refresh
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = refreshToken();

  try {
    const token = await refreshPromise;
    return token;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

/**
 * Base fetch wrapper with authentication and error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const portal = getCurrentPortal();
  const tokenKey = getTokenKey();
  const token = getAuthToken();

  // Debug logging
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] Endpoint:', endpoint);
  console.log('[API] Current portal:', portal);
  console.log('[API] Token key:', tokenKey);
  console.log('[API] Token present:', !!token);
  console.log('[API] Token value (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
  if (options.body) {
    console.log('[API] Request body:', options.body);
  }

  // Build headers - only set Content-Type for requests with a body
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorDetails = errorData;
      } catch {
        // If response is not JSON, use status text
      }

      // Make error messages more human-friendly
      if (response.status === 404) {
        errorMessage = errorDetails?.message || 'The requested resource was not found. Please check if the API server is running and configured correctly.';
      } else if (response.status === 500) {
        errorMessage = errorDetails?.message || 'The server encountered an error. Please try again later.';
      } else if (response.status === 401) {
        errorMessage = errorDetails?.message || 'Authentication failed. Please check your credentials.';

        // Don't attempt refresh for auth endpoints (sign-in, sign-up, etc.)
        const isAuthEndpoint = endpoint.includes('/api/auth/sign-') ||
                               endpoint.includes('/api/auth/password') ||
                               endpoint.includes('/api/auth/refresh-token');

        // Attempt token refresh if this isn't a retry and we have a session
        if (!isRetry && !isAuthEndpoint && getSessionId()) {
          console.log('[API] 401 Unauthorized - attempting token refresh');
          const newToken = await ensureFreshToken();

          if (newToken) {
            // Retry the original request with the new token
            console.log('[API] Retrying request with refreshed token');
            return apiFetch<T>(endpoint, options, true);
          }
        }

        // Token refresh failed or not applicable - trigger sign out
        if (onUnauthorizedCallback) {
          console.log('[API] 401 Unauthorized - token refresh failed, triggering sign-out');
          onUnauthorizedCallback();
        }
      } else if (response.status === 403) {
        errorMessage = errorDetails?.message || 'You do not have permission to access this resource.';
      }

      console.error(`[API] Error ${response.status}:`, errorMessage, errorDetails);
      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    // Parse JSON response
    const rawResponse = await response.json();
    console.log('[API] Raw response:', rawResponse);

    // Check if response follows new API format with { status, title, message, data }
    if (rawResponse && typeof rawResponse === 'object' && 'status' in rawResponse && 'data' in rawResponse) {
      console.log('[API] New format response detected, extracting data');
      // Store the title and message for potential toast display
      if (rawResponse.title && rawResponse.message) {
        console.log('[API] Response message:', rawResponse.title, '-', rawResponse.message);
      }
      // Return just the data portion (or entire response if data is undefined)
      return rawResponse.data !== undefined ? rawResponse.data : rawResponse;
    }

    // Legacy format - return as-is
    console.log('[API] Legacy format response');
    return rawResponse;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      console.error('[API] Network error:', error);
      throw new ApiError(0, 'Network error: Unable to connect to API server');
    }

    // Handle other errors
    console.error('[API] Unknown error:', error);
    throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

/**
 * Fetch with full response (including title and message for toasts)
 * Returns the raw ApiResponse instead of extracting data
 */
async function apiFetchWithMessage<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  console.log('[API] Request:', options.method || 'GET', url);

  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorDetails = errorData;
      } catch {
        // If response is not JSON, use status text
      }

      console.error(`[API] Error ${response.status}:`, errorMessage, errorDetails);
      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    if (response.status === 204) {
      return {
        status: 'success',
        title: 'Success',
        message: 'Operation completed successfully',
        data: {} as T,
      };
    }

    const rawResponse = await response.json();

    // If already in new format, return as-is
    if (rawResponse && typeof rawResponse === 'object' && 'status' in rawResponse) {
      return rawResponse as ApiResponse<T>;
    }

    // Legacy format - wrap it
    return {
      status: 'success',
      title: 'Success',
      message: 'Operation completed successfully',
      data: rawResponse as T,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error('[API] Unknown error:', error);
    throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

/**
 * API request methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * POST request
   */
  post: <T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },

  /**
   * Upload file (multipart/form-data)
   * Includes automatic token refresh on 401
   */
  upload: async <T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST', options?: RequestInit, isRetry: boolean = false): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    // Debug: Log FormData contents
    console.log('[API Upload] Endpoint:', endpoint);
    console.log('[API Upload] Method:', method);
    console.log('[API Upload] FormData entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(name=${value.name}, size=${value.size}, type=${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    // Add auth token if available (don't set Content-Type, browser will set it with boundary)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log('[API Upload] Sending request...');
      const response = await fetch(url, {
        ...options,
        method,
        headers,
        body: formData,
      });

      console.log('[API Upload] Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData;
        try {
          errorData = await response.json();
          console.log('[API Upload] Error response:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Use status text if not JSON
        }

        // Handle 401 with token refresh
        if (response.status === 401 && !isRetry && getSessionId()) {
          console.log('[API Upload] 401 Unauthorized - attempting token refresh');
          const newToken = await ensureFreshToken();

          if (newToken) {
            // Retry the upload with the new token
            console.log('[API Upload] Retrying upload with refreshed token');
            return api.upload<T>(endpoint, formData, method, options, true);
          }

          // Token refresh failed - trigger sign out
          if (onUnauthorizedCallback) {
            console.log('[API Upload] Token refresh failed, triggering sign-out');
            onUnauthorizedCallback();
          }
        }

        throw new ApiError(response.status, errorMessage);
      }

      const rawResponse = await response.json();
      console.log('[API Upload] Raw response:', rawResponse);

      // Check if response follows new API format with { status, title, message, data }
      if (rawResponse && typeof rawResponse === 'object' && 'status' in rawResponse && 'data' in rawResponse) {
        console.log('[API Upload] New format response detected, extracting data');
        if (rawResponse.title && rawResponse.message) {
          console.log('[API Upload] Response message:', rawResponse.title, '-', rawResponse.message);
        }
        // Preserve toast metadata (title, message, status) along with the data
        // This allows callers to check for toast messages
        const result = rawResponse.data !== undefined ? rawResponse.data : rawResponse;
        if (result && typeof result === 'object' && rawResponse.title && rawResponse.message) {
          return {
            ...result,
            title: rawResponse.title,
            message: rawResponse.message,
            status: rawResponse.status,
          };
        }
        return result;
      }

      // Legacy format - return as-is
      console.log('[API Upload] Legacy format response');
      return rawResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, error instanceof Error ? error.message : 'Upload failed');
    }
  },

  /**
   * Methods that return full ApiResponse (with title and message for toasts)
   */
  withMessage: {
    get: <T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
      return apiFetchWithMessage<T>(endpoint, {
        ...options,
        method: 'GET',
      });
    },

    post: <T>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> => {
      return apiFetchWithMessage<T>(endpoint, {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    put: <T>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> => {
      return apiFetchWithMessage<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    delete: <T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
      return apiFetchWithMessage<T>(endpoint, {
        ...options,
        method: 'DELETE',
      });
    },
  },
  getBaseUrl: () => API_BASE_URL,
  getAuthToken: () => getAuthToken(),
};

export default api;
