/**
 * Property Service
 *
 * Handles all property-related API operations including CRUD and nested resources.
 */

import api from './api';
import type {
  Property,
  PropertyCreateRequest,
  PropertyUpdateRequest,
  PropertyCost,
  PropertyCostCreateRequest,
  Resident,
  PaymentInfo,
  UtilityRecord,
  BonusPool,
  Reminder,
  ProfitAnalytics,
} from './api-types';

/**
 * Get all properties for the authenticated owner
 */
export async function listProperties(): Promise<Property[]> {
  const response = await api.get<Property[] | { properties: Property[] } | { data: Property[] } | { status: string; data: Property[] }>('/api/properties');
  console.log('[propertyService.listProperties] Raw response:', JSON.stringify(response, null, 2));
  console.log('[propertyService.listProperties] Response type:', typeof response);
  console.log('[propertyService.listProperties] Is array:', Array.isArray(response));
  if (response && typeof response === 'object') {
    console.log('[propertyService.listProperties] Response keys:', Object.keys(response));
    // Log each property if it's an array
    if (Array.isArray(response)) {
      response.forEach((prop: any, i: number) => {
        console.log(`[propertyService.listProperties] Property ${i}:`, prop.id, prop.name);
      });
    }
  }

  // Handle different API response formats
  if (Array.isArray(response)) {
    console.log('[propertyService.listProperties] Returning array directly, length:', response.length);
    return response;
  }
  if (response && typeof response === 'object') {
    // Check for { status: "success", data: [...] } format
    if ('status' in response && 'data' in response && Array.isArray((response as any).data)) {
      console.log('[propertyService.listProperties] Found status+data format, returning data array');
      return (response as any).data;
    }
    if ('properties' in response && Array.isArray(response.properties)) {
      console.log('[propertyService.listProperties] Found properties key, returning');
      return response.properties;
    }
    if ('data' in response && Array.isArray(response.data)) {
      console.log('[propertyService.listProperties] Found data key, returning');
      return response.data;
    }
  }
  console.warn('[propertyService.listProperties] Unexpected response format, returning empty array');
  return [];
}

/**
 * Get a single property by ID
 */
export async function getProperty(propertyId: string): Promise<Property> {
  return api.get<Property>(`/api/properties/${propertyId}`);
}

/**
 * Create a new property
 */
export async function createProperty(data: PropertyCreateRequest): Promise<Property> {
  return api.post<Property>('/api/properties', data);
}

/**
 * Update an existing property
 */
export async function updateProperty(
  propertyId: string,
  data: PropertyUpdateRequest
): Promise<Property> {
  return api.put<Property>(`/api/properties/${propertyId}`, data);
}

/**
 * Delete a property
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  return api.delete<void>(`/api/properties/${propertyId}`);
}

/**
 * Get all residents for a property
 */
export async function listPropertyResidents(propertyId: string): Promise<Resident[]> {
  if (!propertyId) {
    console.warn('listPropertyResidents called with undefined propertyId');
    return [];
  }
  return api.get<Resident[]>(`/api/properties/${propertyId}/residents`);
}

/**
 * Get payment info for a property
 */
export async function getPaymentInfo(propertyId: string): Promise<PaymentInfo | null> {
  return api.get<PaymentInfo | null>(`/api/properties/${propertyId}/payment-info`);
}

/**
 * Create or update payment info for a property
 */
export async function savePaymentInfo(
  propertyId: string,
  data: Partial<PaymentInfo>
): Promise<PaymentInfo> {
  return api.put<PaymentInfo>(`/api/properties/${propertyId}/payment-info`, data);
}

/**
 * Get utilities/operating costs for a property (optionally filtered by month/year)
 */
export async function getUtilities(
  propertyId: string,
  month?: number,
  year?: number
): Promise<UtilityRecord | null> {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return api.get<UtilityRecord | null>(`/api/properties/${propertyId}/utilities${query}`);
}

/**
 * Save utilities/operating costs for a property
 */
export async function saveUtilities(
  propertyId: string,
  data: Partial<UtilityRecord> & { month: number; year: number }
): Promise<UtilityRecord> {
  return api.put<UtilityRecord>(`/api/properties/${propertyId}/utilities`, data);
}

/**
 * Get bonus pool for a property (optionally filtered by month/year)
 */
export async function getBonusPool(
  propertyId: string,
  month?: number,
  year?: number
): Promise<BonusPool | null> {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return api.get<BonusPool | null>(`/api/properties/${propertyId}/bonus-pool${query}`);
}

/**
 * Save bonus pool for a property
 */
export async function saveBonusPool(
  propertyId: string,
  data: Partial<BonusPool> & { month: number; year: number }
): Promise<BonusPool> {
  return api.put<BonusPool>(`/api/properties/${propertyId}/bonus-pool`, data);
}

/**
 * Get reminders for a property
 */
export async function getReminders(propertyId: string): Promise<Reminder[]> {
  return api.get<Reminder[]>(`/api/properties/${propertyId}/reminders`);
}

/**
 * Save reminders for a property (replaces all existing)
 */
export async function saveReminders(
  propertyId: string,
  reminders: Partial<Reminder>[]
): Promise<{ success: boolean; count: number }> {
  return api.put<{ success: boolean; count: number }>(
    `/api/properties/${propertyId}/reminders`,
    reminders
  );
}

/**
 * Get profit analytics for a property
 */
export async function getProfitAnalytics(
  propertyId: string,
  range?: string
): Promise<ProfitAnalytics> {
  const query = range ? `?range=${range}` : '';
  return api.get<ProfitAnalytics>(`/api/properties/${propertyId}/analytics/profit${query}`);
}

/**
 * Get all costs for a property
 */
export async function getCosts(propertyId: string): Promise<PropertyCost[]> {
  return api.get<PropertyCost[]>(`/api/properties/${propertyId}/costs`);
}

/**
 * Replace all costs for a property (bulk update)
 */
export async function saveCosts(
  propertyId: string,
  costs: PropertyCostCreateRequest[]
): Promise<PropertyCost[]> {
  return api.put<PropertyCost[]>(`/api/properties/${propertyId}/costs`, costs);
}

/**
 * Add a single cost to a property
 */
export async function addCost(
  propertyId: string,
  cost: PropertyCostCreateRequest
): Promise<PropertyCost> {
  return api.post<PropertyCost>(`/api/properties/${propertyId}/costs`, cost);
}

/**
 * Delete a specific cost from a property
 */
export async function deleteCost(
  propertyId: string,
  costId: string
): Promise<void> {
  return api.delete<void>(`/api/properties/${propertyId}/costs/${costId}`);
}

export const propertyService = {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  listPropertyResidents,
  getPaymentInfo,
  savePaymentInfo,
  getUtilities,
  saveUtilities,
  getBonusPool,
  saveBonusPool,
  getReminders,
  saveReminders,
  getProfitAnalytics,
  getCosts,
  saveCosts,
  addCost,
  deleteCost,
};

export default propertyService;
