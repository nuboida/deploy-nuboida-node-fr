/**
 * Resident Service
 *
 * Handles all resident-related API operations including CRUD, deposits, and leases.
 */

import api, { getCurrentPortal } from './api';
import type {
  Resident,
  ResidentCreateRequest,
  ResidentUpdateRequest,
  Deposit,
  LeaseDocument,
  LeaseUploadRequest,
  Invoice,
} from './api-types';

/**
 * Create a new resident
 */
export async function createResident(data: ResidentCreateRequest): Promise<Resident> {
  return api.post<Resident>('/api/residents', data);
}

/**
 * Update an existing resident
 */
export async function updateResident(
  residentId: string,
  data: ResidentUpdateRequest
): Promise<Resident> {
  return api.put<Resident>(`/api/residents/${residentId}`, data);
}

/**
 * Update occupants for a resident
 */
export async function updateOccupants(
  residentId: string,
  occupants: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>
): Promise<Resident> {
  return api.put<Resident>(`/api/residents/${residentId}/occupants`, { occupants });
}

/**
 * Update rent details for a resident
 */
export async function updateRentDetails(
  residentId: string,
  details: {
    lateStartDay?: number;
    currentRent?: number;
    lateFeeDailyRate?: number;
    electricRate?: number;
  }
): Promise<Resident> {
  return api.put<Resident>(`/api/residents/${residentId}/rent-details`, details);
}

/**
 * Delete a resident
 */
export async function deleteResident(residentId: string): Promise<void> {
  return api.delete<void>(`/api/residents/${residentId}`);
}

/**
 * Get deposit information for a resident
 */
export async function getDeposit(residentId: string): Promise<Deposit | null> {
  return api.get<Deposit | null>(`/api/residents/${residentId}/deposit`);
}

/**
 * Create or update deposit for a resident
 */
export async function saveDeposit(
  residentId: string,
  data: Partial<Deposit>
): Promise<Deposit> {
  return api.put<Deposit>(`/api/residents/${residentId}/deposit`, data);
}

/**
 * Get all invoices for a resident
 */
export async function getResidentInvoices(residentId: string): Promise<Invoice[]> {
  return api.get<Invoice[]>(`/api/residents/${residentId}/invoices`);
}

/**
 * Get all lease documents for a resident
 */
export async function getLeases(residentId: string): Promise<LeaseDocument[]> {
  return api.get<LeaseDocument[]>(`/api/residents/${residentId}/leases`);
}

/**
 * Create a lease for a resident (PDF file is optional)
 * Always uses multipart/form-data - file field is optional
 */
export async function uploadLease(
  residentId: string,
  propertyId: string,
  file: File | undefined,
  metadata: LeaseUploadRequest
): Promise<LeaseDocument> {
  const formData = new FormData();

  // Debug logging
  console.log('[uploadLease] Starting upload...');
  console.log('[uploadLease] residentId:', residentId);
  console.log('[uploadLease] propertyId:', propertyId);
  console.log('[uploadLease] file:', file);
  console.log('[uploadLease] file instanceof File:', file instanceof File);
  if (file) {
    console.log('[uploadLease] file.name:', file.name);
    console.log('[uploadLease] file.size:', file.size);
    console.log('[uploadLease] file.type:', file.type);
  }

  // File is optional - only append if provided
  if (file) {
    // Explicitly provide filename to ensure it's sent correctly
    // This handles cases where filename might have special characters
    formData.append('file', file, file.name);
    console.log('[uploadLease] ✅ File appended to FormData with name:', file.name);
  } else {
    console.log('[uploadLease] ⚠️ No file to append');
  }

  // Always append metadata fields
  // Note: endDate is NOT sent - the backend calculates it automatically based on leaseType
  // (yearly = startDate + 1 year, month-to-month = no end date)
  formData.append('propertyId', propertyId);
  formData.append('category', metadata.documentType); // Backend expects 'category' field with 'original' or 'renewal'
  formData.append('leaseType', metadata.leaseType);
  formData.append('startDate', metadata.startDate);
  if (metadata.notes) formData.append('notes', metadata.notes);
  if (metadata.unitId) formData.append('unitId', metadata.unitId);

  // Rent details (all required by API)
  formData.append('monthlyRent', metadata.monthlyRent.toString());
  formData.append('lateStartDay', metadata.lateStartDay.toString());
  formData.append('lateFeeDailyRate', (metadata.lateFeeDailyRate || 0).toString());
  formData.append('electricRate', metadata.electricRate.toString());

  return api.upload<LeaseDocument>(`/api/residents/${residentId}/leases`, formData);
}

/**
 * Update an existing lease for a resident (PDF file is optional)
 * Always uses multipart/form-data - file field is optional
 */
export async function updateLease(
  residentId: string,
  leaseId: string,
  propertyId: string,
  file: File | undefined,
  metadata: LeaseUploadRequest
): Promise<LeaseDocument> {
  const formData = new FormData();

  // Debug logging
  console.log('[updateLease] Starting update...');
  console.log('[updateLease] residentId:', residentId);
  console.log('[updateLease] leaseId:', leaseId);
  console.log('[updateLease] propertyId:', propertyId);
  console.log('[updateLease] file:', file);

  // File is optional - only append if provided
  if (file) {
    formData.append('file', file, file.name);
    console.log('[updateLease] ✅ File appended to FormData with name:', file.name);
  } else {
    console.log('[updateLease] ⚠️ No file to append (keeping existing file)');
  }

  // Always append metadata fields
  formData.append('propertyId', propertyId);
  formData.append('category', metadata.documentType); // Backend expects 'category' field
  formData.append('leaseType', metadata.leaseType);
  formData.append('startDate', metadata.startDate);
  if (metadata.notes) formData.append('notes', metadata.notes);
  if (metadata.unitId) formData.append('unitId', metadata.unitId);

  // Rent details (all required by API)
  formData.append('monthlyRent', metadata.monthlyRent.toString());
  formData.append('lateStartDay', metadata.lateStartDay.toString());
  formData.append('lateFeeDailyRate', (metadata.lateFeeDailyRate || 0).toString());
  formData.append('electricRate', metadata.electricRate.toString());

  return api.upload<LeaseDocument>(`/api/residents/${residentId}/leases/${leaseId}`, formData, 'PUT');
}

/**
 * Download a lease document
 */
export async function downloadLease(leaseId: string): Promise<Blob> {
  const portal = getCurrentPortal();
  const tokenKey = `auth_token_${portal}`;
  const token = localStorage.getItem(tokenKey);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/leases/${leaseId}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download lease');
  }

  return response.blob();
}

/**
 * Generate signed URL for lease download
 */
export async function getLeaseSignedUrl(
  leaseId: string,
  ttlMs?: number
): Promise<{ url: string; token: string; expiresAt: number }> {
  return api.post<{ url: string; token: string; expiresAt: number }>(
    `/api/leases/${leaseId}/signed-url`,
    { ttlMs }
  );
}

/**
 * Delete a lease document
 * Returns full ApiResponse with title and message for toast display
 */
export async function deleteLease(residentId: string, leaseId: string) {
  return api.withMessage.delete(`/api/residents/${residentId}/leases/${leaseId}`);
}

export const residentService = {
  createResident,
  updateResident,
  updateOccupants,
  updateRentDetails,
  deleteResident,
  getDeposit,
  saveDeposit,
  getResidentInvoices,
  getLeases,
  uploadLease,
  updateLease,
  downloadLease,
  getLeaseSignedUrl,
  deleteLease,
};

export default residentService;
