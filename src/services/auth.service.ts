/**
 * Authentication Service
 *
 * Handles owner authentication, session management, and token storage.
 * Supports separate authentication for homeowner and resident portals.
 */

import api, { setAuthToken, clearAuthToken, setCurrentPortal, getCurrentPortal, isAuthenticatedFor, type PortalType } from './api';
import type { LoginRequest, LoginResponse, UserPreferences } from './api-types';

// Re-export PortalType and portal functions for convenience
export type { PortalType };
export { setCurrentPortal, getCurrentPortal, isAuthenticatedFor };

/**
 * Sign up request interface
 */
export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

/**
 * Password reset request interface
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirm interface
 */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

/**
 * Get the user storage key for the current portal
 */
function getUserKey(portal?: PortalType): string {
  const p = portal || getCurrentPortal();
  return `current_user_${p}`;
}

/**
 * Sign up with email and password (for current portal)
 */
export async function signUp(email: string, password: string, name?: string): Promise<LoginResponse & { title?: string; message?: string }> {
  const response = await api.post<LoginResponse & { title?: string; message?: string }>('/api/auth/sign-up', {
    email,
    password,
    name,
  } as SignUpRequest);

  // API client already unwraps the response, so response is the data object
  const { token, sessionId, userId, expiresAt, user, title, message } = response;

  // Store auth token for current portal (including sessionId, expiresAt, and userId for token refresh)
  if (token) {
    setAuthToken(token, undefined, false, sessionId, expiresAt, userId);
  }

  // Store user info for current portal
  if (user) {
    setCurrentUser(user);
  }

  // Return data with title and message from API response
  return {
    token,
    sessionId,
    userId,
    expiresAt,
    user,
    title,
    message,
  };
}

/**
 * Sign in with email and password (for current portal)
 */
export async function signIn(email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse & { title?: string; message?: string }> {
  const response = await api.post<LoginResponse & { title?: string; message?: string }>('/api/auth/sign-in', {
    email,
    password,
    rememberMe,
  } as LoginRequest);

  // API client already unwraps the response, so response is the data object
  const { token, sessionId, userId, expiresAt, user, title, message } = response;

  // Store auth token for current portal (including sessionId, expiresAt, and userId for token refresh)
  if (token) {
    setAuthToken(token, undefined, rememberMe, sessionId, expiresAt, userId);
  }

  // Store user info for current portal
  if (user) {
    setCurrentUser(user);
  }

  // Return data with title and message from API response
  return {
    token,
    sessionId,
    userId,
    expiresAt,
    user,
    title,
    message,
  };
}

/**
 * Sign out and clear session
 */
export async function signOut(): Promise<void> {
  try {
    // Call server-side logout to invalidate token
    await api.post('/api/auth/sign-out', {});
  } catch (error) {
    // Continue with local cleanup even if server call fails
    console.error('Logout error:', error);
  } finally {
    // Always clear local storage
    clearAuthToken();
    clearCurrentUser();
    // Clear property selection preference (will be restored from backend on next login)
    localStorage.removeItem('last_selected_property_id');
  }
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return await api.post('/api/auth/password-reset-request', {
    email,
  } as PasswordResetRequest);
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return await api.post('/api/auth/password-reset', {
    token,
    newPassword,
  } as PasswordResetConfirmRequest);
}

/**
 * Update profile request interface
 */
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

/**
 * Change password request interface
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Update user profile
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<LoginResponse['user']> {
  const response = await api.put<{ status: string; data: LoginResponse['user'] }>('/api/auth/profile', data);

  // Update stored user info
  if (response.data) {
    setCurrentUser(response.data);
  }

  return response.data;
}

/**
 * Change user password
 */
export async function changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
  return await api.put('/api/auth/password', data);
}

/**
 * Delete user account
 */
export async function deleteAccount(): Promise<void> {
  await api.delete('/api/auth/account');

  // Clear local storage after successful deletion
  clearAuthToken();
  clearCurrentUser();
}

/**
 * Check if user is authenticated (for current portal)
 */
export function isAuthenticated(portal?: PortalType): boolean {
  return isAuthenticatedFor(portal || getCurrentPortal());
}

/**
 * Get current user info from token (if stored) for current portal
 */
export function getCurrentUser(portal?: PortalType): LoginResponse['user'] | null {
  const userJson = localStorage.getItem(getUserKey(portal));
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Store current user info for current portal
 */
export function setCurrentUser(user: LoginResponse['user'], portal?: PortalType): void {
  localStorage.setItem(getUserKey(portal), JSON.stringify(user));
}

/**
 * Clear current user info for current portal
 */
export function clearCurrentUser(portal?: PortalType): void {
  localStorage.removeItem(getUserKey(portal));
}

/**
 * Get user preferences from backend
 */
export async function getPreferences(): Promise<UserPreferences> {
  try {
    const response = await api.get<{ status: string; data: UserPreferences }>('/api/auth/preferences');
    return response.data || {};
  } catch (error) {
    console.error('[authService.getPreferences] Error:', error);
    return {};
  }
}

/**
 * Save user preferences to backend
 */
export async function savePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  try {
    const response = await api.put<{ status: string; data: UserPreferences }>('/api/auth/preferences', preferences);
    return response.data || {};
  } catch (error) {
    console.error('[authService.savePreferences] Error:', error);
    // Return the input on error so UI stays in sync
    return preferences as UserPreferences;
  }
}

export const authService = {
  signUp,
  signIn,
  signOut,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  changePassword,
  deleteAccount,
  isAuthenticated,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  getPreferences,
  savePreferences,
};

export default authService;
