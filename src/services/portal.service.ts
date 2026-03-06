/**
 * Portal and Share Service
 *
 * Handles resident portal access and public invoice sharing (unauthenticated endpoints).
 */

import api from './api';
import type { TenantPortalData, PublicInvoiceData } from './api-types';

/**
 * Get resident portal data by portal token (public endpoint, no auth required)
 */
export async function getResidentPortal(portalToken: string): Promise<TenantPortalData> {
  // Remove auth header for this public request
  return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/resident-portal/${portalToken}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch resident portal data');
    }
    return response.json();
  });
}

// Legacy function name for backward compatibility
export const getTenantPortal = getResidentPortal;

/**
 * Get public invoice data by share token (public endpoint, no auth required)
 */
export async function getPublicInvoice(shareToken: string): Promise<PublicInvoiceData> {
  // Remove auth header for this public request
  return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/invoice-share/${shareToken}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch invoice data');
    }
    return response.json();
  });
}

export const portalService = {
  getResidentPortal,
  getTenantPortal, // Legacy alias
  getPublicInvoice,
};

export default portalService;
