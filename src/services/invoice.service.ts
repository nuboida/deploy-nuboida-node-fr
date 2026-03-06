/**
 * Invoice Service
 *
 * Handles all invoice-related API operations including CRUD, payments, receipts, and sharing.
 */

import api from './api';
import type {
  Invoice,
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
} from './api-types';

/**
 * Create a new invoice
 * POST /api/invoices
 * Returns full ApiResponse with title and message for toast display
 */
export async function createInvoice(data: InvoiceCreateRequest) {
  console.log('[invoiceService.createInvoice] ===== CREATE INVOICE START =====');
  console.log('[invoiceService.createInvoice] Request data:', JSON.stringify(data, null, 2));
  console.log('[invoiceService.createInvoice] Field breakdown:');
  console.log('  - residentId:', data.residentId);
  console.log('  - propertyId:', data.propertyId);
  console.log('  - month:', data.month);
  console.log('  - year:', data.year);
  console.log('  - previousMonthBalance:', data.previousMonthBalance);
  console.log('  - currentRent:', data.currentRent);
  console.log('  - dailyLateRate:', data.dailyLateRate);
  console.log('  - electricRate:', data.electricRate);
  console.log('  - previousMonthElectricUsageKwh:', data.previousMonthElectricUsageKwh);

  const response = await api.withMessage.post('/api/invoices', data);

  console.log('[invoiceService.createInvoice] Response received:', response);
  console.log('[invoiceService.createInvoice] Response data:', (response as any)?.data);
  console.log('[invoiceService.createInvoice] ===== CREATE INVOICE END =====');
  return response;
}

/**
 * Update an existing invoice
 * Returns full ApiResponse with title and message for toast display
 */
export async function updateInvoice(
  invoiceId: string,
  data: InvoiceUpdateRequest
) {
  console.log('[invoiceService.updateInvoice] ===== UPDATE INVOICE START =====');
  console.log('[invoiceService.updateInvoice] Invoice ID:', invoiceId);
  console.log('[invoiceService.updateInvoice] Request data:', JSON.stringify(data, null, 2));
  console.log('[invoiceService.updateInvoice] Field breakdown:');
  console.log('  - month:', data.month);
  console.log('  - year:', data.year);
  console.log('  - previousMonthBalance:', data.previousMonthBalance);
  console.log('  - currentRent:', data.currentRent);
  console.log('  - dailyLateRate:', data.dailyLateRate);
  console.log('  - electricRate:', data.electricRate);
  console.log('  - previousMonthElectricUsageKwh:', data.previousMonthElectricUsageKwh);

  const response = await api.withMessage.put(`/api/invoices/${invoiceId}`, data);

  console.log('[invoiceService.updateInvoice] Response received:', response);
  console.log('[invoiceService.updateInvoice] Response data:', (response as any)?.data);
  console.log('[invoiceService.updateInvoice] ===== UPDATE INVOICE END =====');
  return response;
}

/**
 * Delete an invoice
 * Returns full ApiResponse with title and message for toast display
 */
export async function deleteInvoice(invoiceId: string) {
  return api.withMessage.delete(`/api/invoices/${invoiceId}`);
}

/**
 * Mark an invoice as paid
 */
export async function markInvoicePaid(
  invoiceId: string,
  paidDate?: string
): Promise<Invoice> {
  return api.put<Invoice>(`/api/invoices/${invoiceId}/paid`, {
    isPaid: true,
    paidDate: paidDate || new Date().toISOString(),
  });
}

/**
 * Mark an invoice as unpaid
 */
export async function markInvoiceUnpaid(invoiceId: string): Promise<Invoice> {
  return api.put<Invoice>(`/api/invoices/${invoiceId}/paid`, {
    isPaid: false,
    paidDate: null,
  });
}

/**
 * Add a payment to an invoice
 */
export async function addPayment(
  invoiceId: string,
  payment: { amount: number; date: string; method: string }
): Promise<Invoice> {
  return api.post<Invoice>(`/api/invoices/${invoiceId}/payments`, payment);
}

/**
 * Remove a payment from an invoice by index
 */
export async function removePayment(
  invoiceId: string,
  paymentIndex: number
): Promise<Invoice> {
  return api.delete<Invoice>(`/api/invoices/${invoiceId}/payments/${paymentIndex}`);
}

/**
 * Generate or replace share token for public invoice access
 */
export async function generateShareToken(
  invoiceId: string
): Promise<{ shareToken: string; invoice: Invoice }> {
  return api.put<{ shareToken: string; invoice: Invoice }>(
    `/api/invoices/${invoiceId}/share-token`
  );
}

/**
 * Revoke share token for an invoice
 */
export async function revokeShareToken(invoiceId: string): Promise<void> {
  return api.delete<void>(`/api/invoices/${invoiceId}/share-token`);
}

/**
 * Download meter snapshot image
 */
export async function downloadMeterSnapshot(invoiceId: string): Promise<Blob> {
  const url = `${api.getBaseUrl()}/api/invoices/${invoiceId}/snapshot-download`;
  console.log('[downloadMeterSnapshot] Download URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${api.getAuthToken()}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[downloadMeterSnapshot] Download failed:', errorData);
    throw new Error(errorData.message || 'Failed to download meter snapshot');
  }

  return response.blob();
}

/**
 * Upload electric meter snapshot image
 * POST /api/invoices/:id/meter-snapshot
 * Returns the file URL to store in the invoice
 */
export async function uploadMeterSnapshot(
  invoiceId: string,
  file: File,
  residentName: string,
  invoiceMonth: string // Format: "December 2024"
): Promise<{ fileUrl: string; invoice: Invoice }> {
  console.log('[uploadMeterSnapshot] Starting upload...');
  console.log('[uploadMeterSnapshot] Invoice ID:', invoiceId);
  console.log('[uploadMeterSnapshot] File:', file.name, 'Size:', file.size, 'Type:', file.type);

  // Generate structured filename: Electric_Meter_Snapshot_Invoice_{residentName}_{MM-DD-YYYY}
  // Parse invoice month to get date components
  const [monthName, year] = invoiceMonth.split(' ');
  const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
  const formattedDate = `${String(monthNumber).padStart(2, '0')}-01-${year}`;

  // Clean resident name for filename (replace spaces and special chars with underscores)
  const cleanResidentName = residentName
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_'); // Replace spaces with underscores

  // Get file extension
  const fileExt = file.name.split('.').pop() || 'jpg';

  // Create new filename
  const newFileName = `Electric_Meter_Snapshot_Invoice_${cleanResidentName}_${formattedDate}.${fileExt}`;
  console.log('[uploadMeterSnapshot] Generated filename:', newFileName);

  // Create a new File object with the custom name
  const renamedFile = new File([file], newFileName, { type: file.type });

  const formData = new FormData();
  formData.append('file', renamedFile);

  const url = `${api.getBaseUrl()}/api/invoices/${invoiceId}/meter-snapshot`;
  console.log('[uploadMeterSnapshot] Upload URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${api.getAuthToken()}`,
    },
    body: formData,
  });

  console.log('[uploadMeterSnapshot] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[uploadMeterSnapshot] Upload failed:', errorData);
    throw new Error(errorData.message || 'Failed to upload meter snapshot');
  }

  const result = await response.json();
  console.log('[uploadMeterSnapshot] Upload successful:', result);
  console.log('[uploadMeterSnapshot] File URL:', result.data?.fileUrl);
  return result.data;
}

export const invoiceService = {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  addPayment,
  removePayment,
  generateShareToken,
  revokeShareToken,
  downloadMeterSnapshot,
  uploadMeterSnapshot,
};

export default invoiceService;
