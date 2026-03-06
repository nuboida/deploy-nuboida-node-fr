/**
 * Centralized Label Configuration
 *
 * All user-facing labels and terminology used throughout the application.
 * Update these values in one place to apply changes globally.
 */

export const LABELS = {
  // User Roles
  HOMEOWNER: 'Homeowner',
  HOMEOWNER_PLURAL: 'Homeowners',
  RESIDENT: 'Resident',
  RESIDENT_PLURAL: 'Residents',
  PROPERTY_MANAGER: 'Property Manager',

  // Portal Names
  HOMEOWNER_PORTAL: 'Homeowner Portal',
  RESIDENT_PORTAL: 'Resident Portal',

  // Dashboard Names
  HOMEOWNER_DASHBOARD: 'Homeowner Dashboard',
  RESIDENT_DASHBOARD: 'Resident Dashboard',

  // Action Labels
  ADD_RESIDENT: 'Add Resident',
  ADD_FIRST_RESIDENT: 'Add First Resident',
  VIEW_RESIDENT: 'View Resident',
  EDIT_RESIDENT: 'Edit Resident',
  DELETE_RESIDENT: 'Delete Resident',

  // Navigation
  GO_TO_HOMEOWNER_PORTAL: 'Go to Homeowner Portal',
  GO_TO_RESIDENT_PORTAL: 'Go to Resident Portal',

  // Questions/Prompts
  ARE_YOU_HOMEOWNER: 'Are you a property manager?',
  ARE_YOU_RESIDENT: 'Are you a resident?',

  // Account Creation
  CREATE_HOMEOWNER_ACCOUNT: 'Create homeowner account',
  CREATE_RESIDENT_ACCOUNT: 'Create resident account',

  // Details/Info
  RESIDENT_DETAILS: 'Resident Details',
  HOMEOWNER_DETAILS: 'Homeowner Details',

  // Settings
  PROFILE_AND_SETTINGS: 'Profile and Settings',
  OWNER_SETTINGS: 'Owner Settings',

  // Messages
  INVALID_PORTAL_LINK: 'The resident portal link you\'re trying to access is invalid or has expired.',

} as const;

// Export individual categories for easier imports
export const ROLE_LABELS = {
  HOMEOWNER: LABELS.HOMEOWNER,
  HOMEOWNER_PLURAL: LABELS.HOMEOWNER_PLURAL,
  RESIDENT: LABELS.RESIDENT,
  RESIDENT_PLURAL: LABELS.RESIDENT_PLURAL,
  PROPERTY_MANAGER: LABELS.PROPERTY_MANAGER,
} as const;

export const PORTAL_LABELS = {
  HOMEOWNER: LABELS.HOMEOWNER_PORTAL,
  RESIDENT: LABELS.RESIDENT_PORTAL,
} as const;

export const DASHBOARD_LABELS = {
  HOMEOWNER: LABELS.HOMEOWNER_DASHBOARD,
  RESIDENT: LABELS.RESIDENT_DASHBOARD,
} as const;

export default LABELS;
