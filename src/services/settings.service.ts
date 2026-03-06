/**
 * Settings Service
 *
 * Handles user-level default settings for payment info and reminders.
 * These are user defaults that can be overridden at the property level.
 */

import api from './api';

/**
 * Payment Info interface (user-level defaults)
 * Note: API uses camelCase field names
 */
export interface PaymentInfo {
  id?: string;
  $id?: string;
  userId?: string;
  propertyId?: string;
  zelleEmail: string;
  zellePhone: string;
  paymentInstructions: string;
  otherPaymentMethods: string[];
}

/**
 * Property Payment Info response with isDefault flag
 */
export interface PropertyPaymentInfoResponse {
  data: PaymentInfo | null;
  isDefault: boolean;
}

/**
 * Reminder interface (user-level defaults)
 * Note: API uses camelCase field names
 */
export interface Reminder {
  id?: string;
  $id?: string;
  userId?: string;
  reminderType: string;
  daysBefore: number;
  enabled: boolean;
  customMessage: string;
}

/**
 * Get user's default payment info
 */
export async function getPaymentInfo(): Promise<PaymentInfo | null> {
  try {
    const response = await api.get<PaymentInfo>('/api/settings/payment-info');
    return response;
  } catch (error: any) {
    // Return null if not found (404)
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Save user's default payment info
 * Note: API returns {status, title, message, data}
 */
export async function savePaymentInfo(paymentInfo: Omit<PaymentInfo, 'id' | '$id' | 'userId' | 'propertyId'>): Promise<any> {
  const response = await api.put<any>('/api/settings/payment-info', paymentInfo);
  // Return full response so caller can access title/message
  return response;
}

/**
 * Get property-level payment info (with fallback to account defaults)
 */
export async function getPropertyPaymentInfo(propertyId: string): Promise<PropertyPaymentInfoResponse> {
  try {
    const response = await api.get<PaymentInfo & { isDefault?: boolean }>(
      `/api/properties/${propertyId}/payment-info`
    );
    // Handle null response from API
    if (!response) {
      return { data: null, isDefault: false };
    }
    return {
      data: response,
      isDefault: response.isDefault ?? false,
    };
  } catch (error: any) {
    // Return null if not found (404)
    if (error.status === 404) {
      return { data: null, isDefault: false };
    }
    throw error;
  }
}

/**
 * Save property-level payment info override
 * Note: API returns {status, title, message, data}
 */
export async function savePropertyPaymentInfo(
  propertyId: string,
  paymentInfo: Omit<PaymentInfo, 'id' | '$id' | 'userId' | 'propertyId'>
): Promise<any> {
  const response = await api.put<any>(
    `/api/properties/${propertyId}/payment-info`,
    paymentInfo
  );
  // Return full response so caller can access title/message
  return response;
}

/**
 * Delete property-level payment info override (reverts to account defaults)
 * Note: API may return {status, title, message}
 */
export async function deletePropertyPaymentInfo(propertyId: string): Promise<any> {
  const response = await api.delete(`/api/properties/${propertyId}/payment-info`);
  return response || {};
}

/**
 * Get user's default reminders
 * Note: API may return array directly or wrapped in { data: Reminder[] }
 */
export async function getReminders(): Promise<Reminder[]> {
  try {
    const response = await api.get<Reminder[] | { data: Reminder[] }>('/api/settings/reminders');
    // Handle both direct array and wrapped response
    if (Array.isArray(response)) {
      return response;
    }
    if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error: any) {
    // Return empty array if not found (404)
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Save user's default reminders
 * Note: API returns { status, data: { count }, message, title } - not the saved reminders
 * Returns full API response so caller can access title/message for toasts
 */
export async function saveReminders(reminders: Omit<Reminder, 'id' | '$id' | 'userId'>[]): Promise<any> {
  const response = await api.put<any>('/api/settings/reminders', reminders);
  // Return full response with input reminders as data for UI state
  return {
    ...response,
    data: reminders as Reminder[] // API doesn't return saved reminders, so include input
  };
}

/**
 * Delete property-level reminders override (reverts to account defaults)
 * Note: API may return {status, title, message}
 */
export async function deletePropertyReminders(propertyId: string): Promise<any> {
  const response = await api.delete(`/api/properties/${propertyId}/reminders`);
  return response || {};
}

export const settingsService = {
  // Account-level settings
  getPaymentInfo,
  savePaymentInfo,
  getReminders,
  saveReminders,
  // Property-level overrides
  getPropertyPaymentInfo,
  savePropertyPaymentInfo,
  deletePropertyPaymentInfo,
  deletePropertyReminders,
};

export default settingsService;
