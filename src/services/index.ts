/**
 * Services Index
 *
 * Central export for all API services
 */

// Core API client
export { default as api, ApiError, setAuthToken, clearAuthToken, updateLastActivity, isSessionExpired, extendSession, hasRememberMeSession, getSessionId, getJwtExpiry, getUserId } from './api';
export type { ApiResponse } from './api';

// Authentication
export { default as authService } from './auth.service';
export * from './auth.service';

// Property management
export { default as propertyService } from './property.service';
export * from './property.service';

// Resident/Tenant management
export { default as residentService } from './resident.service';
export * from './resident.service';

// Invoice management
export { default as invoiceService } from './invoice.service';
export * from './invoice.service';

// Unit and application management
export { default as unitService } from './unit.service';
export * from './unit.service';

// Portal and sharing (public access)
export { default as portalService } from './portal.service';
export * from './portal.service';

// File uploads
export { default as uploadService } from './upload.service';
export * from './upload.service';

// Settings (payment info, reminders)
export { default as settingsService } from './settings.service';
export * from './settings.service';

// Type definitions
export * from './api-types';
