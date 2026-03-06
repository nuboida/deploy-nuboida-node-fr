/**
 * Unit and Application Service
 *
 * Handles unit management, invites, and tenant applications.
 */

import api from './api';
import type {
  Unit,
  UnitCreateRequest,
  UnitUpdateRequest,
  UnitInvite,
  UnitInviteCreateRequest,
  TenantApplication,
  TenantApplicationSubmitRequest,
} from './api-types';

/**
 * List units for a property
 */
export async function listUnits(propertyId: string): Promise<Unit[]> {
  return api.get<Unit[]>(`/api/properties/${propertyId}/units`);
}

/**
 * Create a new unit
 */
export async function createUnit(data: UnitCreateRequest): Promise<Unit> {
  return api.post<Unit>('/api/units', data);
}

/**
 * Update an existing unit
 */
export async function updateUnit(unitId: string, data: UnitUpdateRequest): Promise<Unit> {
  return api.put<Unit>(`/api/units/${unitId}`, data);
}

/**
 * Delete a unit
 */
export async function deleteUnit(unitId: string): Promise<void> {
  return api.delete<void>(`/api/units/${unitId}`);
}

/**
 * List invites for a unit
 */
export async function listUnitInvites(unitId: string): Promise<UnitInvite[]> {
  return api.get<UnitInvite[]>(`/api/units/${unitId}/invites`);
}

/**
 * Create an invite for a unit
 */
export async function createUnitInvite(
  unitId: string,
  data: Omit<UnitInviteCreateRequest, 'unitId'>
): Promise<{ inviteToken: string; invite: UnitInvite }> {
  return api.post<{ inviteToken: string; invite: UnitInvite }>(`/api/units/${unitId}/invites`, data);
}

/**
 * Send invite email (creates invite and sends email in one call)
 */
export async function sendInviteEmail(
  unitId: string,
  data: {
    email: string;
    firstName?: string;
    propertyAddress?: string;
    inviteBaseUrl?: string;
    subject?: string;
    text?: string;
    html?: string;
  }
): Promise<{
  inviteToken: string;
  inviteUrl: string;
  email: string;
  applicationId: string | null;
  message: string;
}> {
  return api.post<any>(`/api/units/${unitId}/invites/send`, data);
}

/**
 * Delete/revoke a unit invite
 */
export async function deleteUnitInvite(inviteId: string): Promise<void> {
  return api.delete<void>(`/api/unit-invites/${inviteId}`);
}

/**
 * Get application by invite token (public endpoint, creates draft if missing)
 */
export async function getApplicationByToken(
  inviteToken: string
): Promise<TenantApplication | null> {
  // Use fetch directly for public endpoint (no auth)
  return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/applications/${inviteToken}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(async (response) => {
    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch application');
    }
    return response.json();
  });
}

/**
 * Submit or update tenant application (public endpoint)
 */
export async function submitApplication(
  inviteToken: string,
  data: Partial<TenantApplicationSubmitRequest>
): Promise<TenantApplication> {
  // Use fetch directly for public endpoint (no auth)
  return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/applications/${inviteToken}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to submit application');
    }
    return response.json();
  });
}

/**
 * Upload document for tenant application
 */
export async function uploadApplicationDocument(
  inviteToken: string,
  file: File,
  documentType: 'payStub' | 'bankStatement' | 'creditReport' | 'other'
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  return api.upload<{ url: string }>(`/api/applications/${inviteToken}/documents`, formData);
}

export const unitService = {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  listUnitInvites,
  createUnitInvite,
  sendInviteEmail,
  deleteUnitInvite,
  getApplicationByToken,
  submitApplication,
  uploadApplicationDocument,
};

export default unitService;
