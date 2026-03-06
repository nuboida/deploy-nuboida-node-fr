/**
 * Date utility functions
 */

/**
 * Calculate the end date for a lease based on its type and start date
 * - Yearly leases: startDate + 1 year
 * - Month-to-month: no fixed end date (returns null)
 *
 * @param startDate - The lease start date (ISO string or Date)
 * @param leaseType - Either 'yearly' or 'month-to-month'
 * @returns ISO date string for yearly leases, null for month-to-month
 */
export function calculateLeaseEndDate(
  startDate: string | Date,
  leaseType: 'yearly' | 'month-to-month'
): string | null {
  if (leaseType === 'month-to-month') {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return end.toISOString();
}

/**
 * Format a date for display
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or empty string if no date
 */
export function formatDisplayDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Get the display text for a lease end date
 * Shows the actual end date for yearly leases, or "Month-to-month" for rolling leases
 *
 * @param leaseType - Either 'yearly' or 'month-to-month'
 * @param endDate - The lease end date (if known)
 * @param startDate - The lease start date (for calculating end if not provided)
 * @returns Display string for the lease end
 */
export function getLeaseEndDisplay(
  leaseType: 'yearly' | 'month-to-month',
  endDate?: string | Date | null,
  startDate?: string | Date
): string {
  if (leaseType === 'month-to-month') {
    return 'Month-to-month';
  }

  // Use provided end date or calculate from start date
  const end = endDate || (startDate ? calculateLeaseEndDate(startDate, leaseType) : null);
  return end ? formatDisplayDate(end) : 'N/A';
}
