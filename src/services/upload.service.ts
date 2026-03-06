/**
 * Upload Service
 *
 * Handles file uploads for electric meter snapshots and other documents.
 */

import api from './api';

/**
 * Upload electric meter snapshot for an invoice
 */
export async function uploadElectricMeterSnapshot(
  invoiceId: string,
  file: File
): Promise<{ fileId: string; fileUrl: string; invoice: any }> {
  const formData = new FormData();
  formData.append('file', file);

  return api.upload<{ fileId: string; fileUrl: string; invoice: any }>(
    `/invoices/${invoiceId}/snapshot`,
    formData
  );
}

/**
 * Download electric meter snapshot for an invoice
 */
export async function downloadElectricMeterSnapshot(invoiceId: string): Promise<Blob> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/invoices/${invoiceId}/snapshot-download`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download snapshot');
  }

  return response.blob();
}

/**
 * Get signed URL for invoice snapshot download
 */
export async function getSnapshotSignedUrl(
  invoiceId: string,
  ttlMs?: number
): Promise<{ url: string; token: string; expiresAt: number }> {
  return api.post<{ url: string; token: string; expiresAt: number }>(
    `/invoices/${invoiceId}/snapshot-signed-url`,
    { ttlMs }
  );
}

export const uploadService = {
  uploadElectricMeterSnapshot,
  downloadElectricMeterSnapshot,
  getSnapshotSignedUrl,
};

export default uploadService;
