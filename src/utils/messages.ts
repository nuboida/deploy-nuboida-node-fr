/**
 * Messages Utility
 *
 * Centralized message management for toast notifications and UI feedback.
 * Messages are fetched from the API's messages.json endpoint.
 */

import api from '../services/api';

// Type definitions
interface MessageTemplate {
  title: string;
  message: string;
}

// Cache for messages data
let messagesCache: Record<string, any> | null = null;
let fetchPromise: Promise<void> | null = null;

/**
 * Fetch messages from the API and cache them
 */
async function fetchMessages(): Promise<void> {
  if (messagesCache) return;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const data = await api.get<Record<string, any>>('/api/messages');
      messagesCache = data;
    } catch (error) {
      console.error('[messages] Failed to fetch messages from API:', error);
      messagesCache = {}; // Use empty object to prevent repeated failed fetches
    }
  })();

  return fetchPromise;
}

// Initialize messages fetch on module load
fetchMessages();

/**
 * Get a nested message from the messages object using dot notation
 * Example: getMessage('properties.monthly_costs.created', { name: 'Rent', value: '$1,500' })
 */
export function getMessage(
  path: string,
  variables?: Record<string, string | number>
): { title: string; message: string } {
  if (!messagesCache) {
    console.warn(`[messages] Messages not loaded yet, path: ${path}`);
    return {
      title: 'Loading...',
      message: 'Please wait...',
    };
  }

  const keys = path.split('.');
  let current: any = messagesCache;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`[messages] Path not found: ${path}`);
      return {
        title: 'Error',
        message: 'Message not found',
      };
    }
  }

  if (!current || typeof current !== 'object' || !('title' in current) || !('message' in current)) {
    console.warn(`[messages] Invalid message format at: ${path}`);
    return {
      title: 'Error',
      message: 'Invalid message format',
    };
  }

  let { title, message } = current as MessageTemplate;

  // Replace template variables like {name}, {value}, etc.
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      title = title.replace(regex, String(value));
      message = message.replace(regex, String(value));
    }
  }

  return { title, message };
}

/**
 * Ensure messages are loaded before using them
 */
export async function ensureMessagesLoaded(): Promise<void> {
  await fetchMessages();
}

/**
 * Shorthand helpers for common message categories
 */
export const messages = {
  // Generic messages
  generic: {
    success: () => getMessage('generic.success'),
    warning: () => getMessage('generic.warning'),
    error: () => getMessage('generic.error'),
  },

  // Auth messages
  auth: {
    loginSuccess: (name: string) => getMessage('auth.login_success', { name }),
    invalidCredentials: () => getMessage('auth.invalid_credentials'),
    logoutSuccess: () => getMessage('auth.logout_success'),
    signupSuccess: (name: string) => getMessage('auth.signup_success', { name }),
    signupFailed: () => getMessage('auth.signup_failed'),
    accountExists: () => getMessage('auth.account_exists'),
    accountDeleteSuccess: () => getMessage('auth.account_delete_success'),
    accountDeleteFailed: () => getMessage('auth.account_delete_failed'),
    validationError: () => getMessage('auth.validation_error'),
    passwordResetSent: () => getMessage('auth.password_reset_request_sent'),
    passwordResetFailed: () => getMessage('auth.password_reset_failed'),
    passwordUpdateSuccess: () => getMessage('auth.password_update_success'),
    passwordUpdateFailed: () => getMessage('auth.password_update_failed'),
    passwordUpdateIncorrect: () => getMessage('auth.password_update_incorrect'),
    passwordUpdateMismatch: () => getMessage('auth.password_update_mismatch'),
  },

  // Resident messages
  resident: {
    linked: () => getMessage('resident.linked'),
    linkFailed: () => getMessage('resident.link_failed'),
    inviteNotFound: () => getMessage('resident.invite_not_found'),
    residentNotFound: () => getMessage('resident.resident_not_found'),
  },

  // Property messages
  properties: {
    created: (address: string) => getMessage('properties.created', { address }),
    updated: (address: string) => getMessage('properties.updated', { address }),
    deleted: (address: string) => getMessage('properties.deleted', { address }),

    // Monthly costs
    monthlyCosts: {
      created: (name: string, value: string) =>
        getMessage('properties.monthly_costs.created', { name, value }),
      updated: (name: string, value: string) =>
        getMessage('properties.monthly_costs.updated', { name, value }),
      deleted: (name: string, value: string) =>
        getMessage('properties.monthly_costs.deleted', { name, value }),
    },

    // Units
    units: {
      created: (unitName: string, propertyAddress: string) =>
        getMessage('properties.units.created', { unitName, propertyAddress }),
      updated: (unitName: string) =>
        getMessage('properties.units.updated', { unitName }),
      deleted: (unitName: string) =>
        getMessage('properties.units.deleted', { unitName }),
      inviteCreated: (unitNumber: string) =>
        getMessage('properties.units.invite_created', { unitNumber }),
      inviteSent: (email: string, unitNumber: string) =>
        getMessage('properties.units.invite_sent', { email, unitNumber }),
      inviteCreatedEmailFailed: (email: string, unitNumber: string) =>
        getMessage('properties.units.invite_created_email_failed', { email, unitNumber }),
    },

    // Residents
    residents: {
      created: (residentName: string) =>
        getMessage('properties.residents.created', { residentName }),
      updated: (residentName: string) =>
        getMessage('properties.residents.updated', { residentName }),
      deleted: (residentName: string) =>
        getMessage('properties.residents.deleted', { residentName }),
    },
  },

  // Invoice messages
  invoices: {
    created: (invoiceNumber: string, tenantName: string) =>
      getMessage('invoices.created', { invoiceNumber, tenantName }),
    updated: (invoiceNumber: string) =>
      getMessage('invoices.updated', { invoiceNumber }),
    deleted: (invoiceNumber: string) =>
      getMessage('invoices.deleted', { invoiceNumber }),
    paid: (invoiceNumber: string) =>
      getMessage('invoices.paid', { invoiceNumber }),
    shared: (invoiceNumber: string) =>
      getMessage('invoices.shared', { invoiceNumber }),
    linkCopied: (invoiceDate: string) =>
      getMessage('invoices.link_copied', { invoiceDate }),
    linkCopyFailed: (invoiceDate: string) =>
      getMessage('invoices.link_copy_failed', { invoiceDate }),
  },

  // Settings messages
  settings: {
    paymentInfoSaved: () => getMessage('settings.payment_info_saved'),
    paymentInfoFailed: () => getMessage('settings.payment_info_failed'),
    remindersSaved: () => getMessage('settings.reminders_saved'),
    remindersFailed: () => getMessage('settings.reminders_failed'),
    invoiceDefaultsSaved: () => getMessage('settings.invoice_defaults_saved'),
    invoiceDefaultsFailed: () => getMessage('settings.invoice_defaults_failed'),
  },

  // Payment info
  paymentInfo: {
    saved: () => getMessage('payment_info.upserted'),
  },

  // Invite messages
  invite: {
    emailSent: (email: string) => getMessage('invite.email_sent', { email }),
    emailMissing: () => getMessage('invite.email_missing'),
    linkGenerated: () => getMessage('invite.link_generated'),
    linkCopyFailed: () => getMessage('invite.link_copy_failed'),
  },

  // Uploads
  uploads: {
    uploaded: (fileName: string) => getMessage('uploads.uploaded', { fileName }),
    deleted: (fileName: string) => getMessage('uploads.deleted', { fileName }),
  },
};

export default messages;
