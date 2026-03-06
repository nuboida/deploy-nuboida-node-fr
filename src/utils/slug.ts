/**
 * URL Slug Utilities
 *
 * Generates URL-friendly slugs from addresses for property routing.
 */

/**
 * Generate a URL-friendly slug from an address
 * @example "101 Main Street" → "101-main-street"
 * @example "42 Oak Ave, Apt 2B" → "42-oak-ave-apt-2b"
 */
export function generateSlug(address: string): string {
  return address
    .toLowerCase()
    .trim()
    // Replace common punctuation and spaces with hyphens
    .replace(/[,.']/g, '')
    .replace(/\s+/g, '-')
    // Remove any characters that aren't alphanumeric or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Generate a unique slug for a property, adding a suffix if needed
 * @param address The property address
 * @param existingSlugs Array of slugs that already exist
 * @param propertyId Optional current property ID to exclude from conflict check
 */
export function generateUniqueSlug(
  address: string,
  existingSlugs: string[],
  propertyId?: string
): string {
  const baseSlug = generateSlug(address);

  // If no conflict, return the base slug
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Add numeric suffix to make unique: 101-main-st-2, 101-main-st-3, etc.
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Get display name for a property from its address
 * Uses just the street address portion (e.g., "101 Main St")
 */
export function getPropertyDisplayName(address: string, address2?: string): string {
  // Just use the main address as the display name
  // Optionally include address2 if present (e.g., "Suite 100")
  if (address2) {
    return `${address} ${address2}`.trim();
  }
  return address.trim();
}

/**
 * Generate a URL-friendly slug from resident's occupant names
 * @example Single occupant: "John Smith" → "john-smith"
 * @example Two occupants: "John Smith, Jane Doe" → "john-smith-and-jane-doe"
 * @example Three occupants: "John Smith, Jane Doe, Bob Johnson" → "john-smith-and-jane-doe-and-bob-johnson"
 */
export function generateResidentSlug(occupants: Array<{ firstName: string; lastName: string }>): string {
  if (!occupants || occupants.length === 0) {
    return '';
  }

  // Generate name parts for each occupant
  const nameParts = occupants.map(occ => {
    const fullName = `${occ.firstName} ${occ.lastName}`.trim();
    return fullName
      .toLowerCase()
      .trim()
      // Replace apostrophes and other punctuation
      .replace(/[,']/g, '')
      .replace(/\s+/g, '-')
      // Remove any characters that aren't alphanumeric or hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Replace multiple consecutive hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '');
  }).filter(name => name); // Remove any empty names

  // Join with "-and-"
  return nameParts.join('-and-');
}

/**
 * Format a date string (YYYY-MM-DD or ISO datetime) to local date string
 * Avoids timezone shift issues by treating the date as local, not UTC
 * @param dateString Date string in format "YYYY-MM-DD" or ISO datetime
 * @returns Formatted date string like "7/1/2025" or empty string if invalid
 */
export function formatDateLocal(dateString: string | null | undefined): string {
  if (!dateString) return '';

  // Extract just the date part (YYYY-MM-DD) if it's an ISO datetime
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  // Create date in local timezone (not UTC) to avoid day shifts
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString();
}

/**
 * Parse a date string and return a Date object in local timezone
 * @param dateString Date string in format "YYYY-MM-DD" or ISO datetime
 * @returns Date object or null if invalid
 */
export function parseDateLocal(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  // Extract just the date part (YYYY-MM-DD) if it's an ISO datetime
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  // Create date in local timezone (not UTC)
  return new Date(year, month - 1, day);
}

/**
 * Generate a URL-friendly slug from invoice month string
 * @param monthString Month string in format "December 2024"
 * @returns Slug in format "december-01-2024"
 * @example "December 2024" → "december-01-2024"
 * @example "January 2025" → "january-01-2025"
 */
export function generateInvoiceSlug(monthString: string): string {
  return monthString
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-01-');
}

/**
 * Parse an invoice slug back to month string
 * @param slug Slug in format "december-01-2024"
 * @returns Month string in format "December 2024"
 * @example "december-01-2024" → "December 2024"
 */
export function parseInvoiceSlug(slug: string): string {
  const parts = slug.split('-');
  if (parts.length < 3) return slug;

  const month = parts[0];
  const year = parts[2];

  // Capitalize first letter of month
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  return `${capitalizedMonth} ${year}`;
}
