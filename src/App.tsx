import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, Lock, CreditCard, Bell, Trash2 } from 'lucide-react';
import { HomeownerSignIn } from './components/homeowner/HomeownerSignIn';
import { HomeownerSignUp } from './components/homeowner/HomeownerSignUp';
import { HomeownerForgotPassword } from './components/homeowner/HomeownerForgotPassword';
import { ResidentSignIn } from './components/resident/ResidentSignIn';
import { ResidentSignUp } from './components/resident/ResidentSignUp';
import { ResidentForgotPassword } from './components/resident/ResidentForgotPassword';
import { HomeownerDashboard } from './components/homeowner/HomeownerDashboard';
import { ResidentPortal } from './components/resident/ResidentPortal';
import { ResidentApplication } from './components/resident/ResidentApplication';
import { ApplicationDetails } from './components/homeowner/ApplicationDetails';
import { InvoiceView } from './components/shared/InvoiceView';
import { DesignSystem } from './components/shared/DesignSystem';
import { PrivacyPolicy } from './components/shared/PrivacyPolicy';
import { DataDeletion } from './components/shared/DataDeletion';
import { TermsOfService } from './components/shared/TermsOfService';
import HomeownerSettings, { isValidSettingsTab } from './components/homeowner/HomeownerSettings';
import TempDevPage from './pages/TempDevPage';
import { TestingNav } from './components/shared/TestingNav';
import { Container, Alert } from 'react-bootstrap';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { IdleTimeoutModal } from './components/common/IdleTimeoutModal';
import { copyToClipboard } from './utils/clipboard';
import { generateSlug, getPropertyDisplayName } from './utils/slug';
import { messages } from './utils/messages';
import { authService, propertyService, residentService, invoiceService, unitService, isAuthenticatedFor, setCurrentPortal, getCurrentPortal, isSessionExpired, extendSession, hasRememberMeSession } from './services';
import { onUnauthorized, clearUnauthorizedCallback } from './services/api';
// Bootstrap and custom styles are imported via index.scss in main.tsx

/**
 * Component that clears toast localStorage when user manually navigates or refreshes
 * Must be inside BrowserRouter to use useLocation
 */
// Component to handle scroll restoration
function ScrollRestorationWrapper() {
  useScrollRestoration();
  return null;
}

function ClearToastsOnNavigation() {
  const location = useLocation();

  // Clear toasts on component mount (page load/refresh)
  useEffect(() => {
    console.log('[ClearToastsOnNavigation] Component mounted - clearing toasts from page load/refresh');

    const welcomeToast = localStorage.getItem('welcome_toast');
    const propertyFormToast = localStorage.getItem('property_form_toast');

    console.log('[ClearToastsOnNavigation] On mount - welcome_toast:', welcomeToast ? 'exists' : 'null');
    console.log('[ClearToastsOnNavigation] On mount - property_form_toast:', propertyFormToast ? propertyFormToast : 'null');

    // Clear welcome toast on initial load/refresh
    // Note: Don't clear property_form_toast as it's meant to survive navigation to show success messages
    localStorage.removeItem('welcome_toast');

    console.log('[ClearToastsOnNavigation] ✅ Cleared welcome toast on mount (property_form_toast preserved)');
  }, []); // Empty dependency array = runs once on mount

  // Clear toasts on route changes (navigation)
  useEffect(() => {
    console.log('[ClearToastsOnNavigation] Route changed to:', location.pathname);

    // Check what's in localStorage before clearing
    const welcomeToast = localStorage.getItem('welcome_toast');
    const propertyFormToast = localStorage.getItem('property_form_toast');

    console.log('[ClearToastsOnNavigation] Before clearing - welcome_toast:', welcomeToast ? 'exists' : 'null');
    console.log('[ClearToastsOnNavigation] Before clearing - property_form_toast:', propertyFormToast ? propertyFormToast : 'null');

    // Clear welcome toast when route changes
    // Note: We don't clear property_form_toast, signin_toast, or account_deleted_toast
    // as those are specifically meant to survive navigation to show on the destination page
    localStorage.removeItem('welcome_toast');

    console.log('[ClearToastsOnNavigation] ✅ Cleared welcome_toast (property_form_toast preserved)');
  }, [location.pathname]);

  return null; // This component doesn't render anything
}

export type Payment = {
  id: string;
  date: string; // YYYY-MM-DD format
  amount: number;
  method?: string; // e.g., "Zelle", "Cash", "Check", "Bank Transfer"
  note?: string;
};

export type Invoice = {
  id: string;
  month: string;
  date: string;
  lastMonthBalance: number;
  currentRent: number;
  daysLate: number;
  lateFeeDailyRate: number;
  lateStartDay?: number; // Day of month when late fees start
  prevMonthLastPaymentDate?: string; // Date of last payment from previous month (YYYY-MM-DD)
  prevMonthPayments?: Payment[]; // Array of payments made in previous month
  previousMonthElectricUsageKwh: number;
  electricRate: number;
  electricMeterSnapshot?: string; // Legacy single snapshot (for backward compatibility)
  electricMeterSnapshots?: string[]; // Array of up to 4 snapshot URLs
  electricMeterSnapshotId?: string; // File ID in Appwrite Storage
  electricMeterSnapshotIds?: string[]; // Array of file IDs in Appwrite Storage
  // Adjustment fields (+ to add/debit, - to subtract/credit)
  prevMonthBalanceAdjustment?: number;
  prevMonthLateFeeAdjustment?: number;
  prevMonthElectricAdjustment?: number;
  isPaid: boolean;
  paidDate?: string;
  shareToken?: string; // Token for public sharing
};

export type LeaseDocument = {
  id: string;
  residentId?: string; // Changed from renterId
  documentType?: 'original' | 'renewal'; // Deprecated - use category instead
  category?: 'original' | 'renewal'; // Backend returns this field
  leaseType: 'month-to-month' | 'yearly'; // Lease duration type
  unitId?: string; // Optional unit ID if lease is for a specific unit
  startDate: string;
  endDate: string | null; // null for month-to-month leases
  fileId?: string; // Optional - empty if no PDF uploaded
  fileUrl?: string; // Optional - empty if no PDF uploaded
  notes?: string;
  // Rental details (inherited from rent details step)
  monthlyRent: number;
  securityDeposit: number; // Security deposit amount for this lease
  lateStartDay: number;
  lateFeeDailyRate: number;
  electricRate: number;
  $createdAt?: string; // Use this instead of uploadDate
};

export type Occupant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type Resident = {
  id: string;
  name: string; // Primary occupant name (for backward compatibility)
  email: string; // Primary occupant email (for backward compatibility)
  phone: string; // Primary occupant phone (for backward compatibility)
  occupants?: Occupant[]; // New field for multiple occupants
  streetAddress: string;
  aptNumber: string;
  city: string;
  state: string;
  zipCode: string;
  lateStartDay: number;
  currentRent: number;
  lateFeeDailyRate: number;
  electricRate: number;
  invoices: Invoice[];
  leases: LeaseDocument[];
  portalToken?: string; // Token for tenant portal access
  dashboardPreferences?: {
    showLateFees: boolean;
    showElectricCollected: boolean;
    showElectricUsage: boolean;
  };
};

export type CostType = 'fixed' | 'variable';
export type CostFrequency = 'monthly' | 'quarterly' | 'annually';

export type PropertyCost = {
  id: string;
  name: string;
  amount: number;
  type: CostType;
  frequency: CostFrequency;
  enabled: boolean;
  categories?: string[]; // Optional for backward compatibility
};

export type Property = {
  id: string;
  name: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  residents: Resident[];
  costs: PropertyCost[];
  units?: string[]; // Free text list of units
};

export type DateRangeType = 'ytd' | '1y' | '2y' | '3y' | 'custom';

export type DateRangeFilter = {
  type: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  startDate: Date;
  endDate: Date;
};

// Unit Management Types
export type Unit = {
  id: string;
  propertyId: string;
  number: string; // e.g., "Unit 2B", "Apt 3A" - maps to API 'unitNumber'
  address?: string; // Optional override address
  rentAmount: number;
  securityDeposit?: number; // Security deposit amount
  status: 'vacant' | 'occupied' | 'pending'; // occupancy status
  currentTenantId?: string; // If occupied, link to resident
  requirements?: {
    payStubsWeeks: number; // Default 12
    bankStatementsMonths: number; // Default 3
  };
};

export type UnitInvite = {
  id: string;
  unitId: string;
  inviteToken: string; // Unique token for the invite link
  email?: string; // If sent via email
  status: 'pending' | 'completed' | 'expired';
  sentDate: string;
  expiresDate?: string;
};

export type UploadedDocument = {
  id: string;
  fileName: string;
  fileUrl: string; // Data URL or blob URL
  fileType: string; // mime type
  uploadDate: string;
  tag?: 'income' | 'rent' | 'savings'; // For bank statements
};

export type ResidentApplication = {
  id: string;
  unitId: string;
  inviteToken: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedDate?: string;

  // Application data
  applicantInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  // Document uploads
  payStubs: UploadedDocument[];
  bankStatements: UploadedDocument[];
  creditReport?: UploadedDocument;

  // Current owner reference
  currentOwner?: {
    name: string;
    phone: string;
    email?: string;
  };

  // Calculated fields
  calculatedSavings?: number;
  meetsRequirements?: boolean;
};

function App() {
  // Check if user is already authenticated via stored JWT token for homeowner portal
  // (homeowner dashboard needs authentication for property management)
  // Also ensure the portal is set correctly for API calls
  const [isSignedIn, setIsSignedIn] = useState(() => {
    console.log('[App] Initializing isSignedIn state...');
    console.log('[App] localStorage auth_token_homeowner:', localStorage.getItem('auth_token_homeowner') ? 'present' : 'missing');
    console.log('[App] localStorage current_portal:', localStorage.getItem('current_portal'));
    const isAuth = isAuthenticatedFor('homeowner');
    console.log('[App] isAuthenticatedFor(homeowner):', isAuth);
    if (isAuth) {
      // Ensure portal is set for subsequent API calls
      setCurrentPortal('homeowner');
      console.log('[App] Portal set to homeowner');
    }
    return isAuth;
  });
  const [hasRememberMe, setHasRememberMe] = useState(() => {
    const hasRM = hasRememberMeSession();
    console.log('[App] Initializing hasRememberMe state:', hasRM);
    console.log('[App] session_expiry_homeowner:', localStorage.getItem('session_expiry_homeowner'));
    return hasRM;
  });

  // Sync hasRememberMe state when isSignedIn changes or on mount
  useEffect(() => {
    if (isSignedIn) {
      const hasRM = hasRememberMeSession();
      console.log('[App] Syncing hasRememberMe state:', hasRM);
      console.log('[App] session_expiry_homeowner:', localStorage.getItem('session_expiry_homeowner'));
      setHasRememberMe(hasRM);
    } else {
      // Clear remember me state when signed out
      setHasRememberMe(false);
    }
  }, [isSignedIn]);

  const [viewMode, setViewMode] = useState<'owner' | 'resident'>('owner');
  const [residentData, setResidentData] = useState<{ resident: Resident; property: Property } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for welcome toast data on app initialization (survives Dashboard remounts)
  const [welcomeToastData, setWelcomeToastData] = useState<{ title: string; message: string } | null>(() => {
    const data = localStorage.getItem('welcome_toast');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        localStorage.removeItem('welcome_toast');
        return parsed;
      } catch {
        localStorage.removeItem('welcome_toast');
        return null;
      }
    }
    return null;
  });

  // Global date range filter
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('ytd');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Unit Management State with demo data
  const [units, setUnits] = useState<Unit[]>([
    // Riverside Apartments (Property ID: '1')
    {
      id: 'unit-1-1a',
      propertyId: '1',
      number: '1A',
      rentAmount: 1650,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-1-1b',
      propertyId: '1',
      number: '1B',
      rentAmount: 1850,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-1-2a',
      propertyId: '1',
      number: '2A',
      rentAmount: 1800,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-1-2b',
      propertyId: '1',
      number: '2B',
      rentAmount: 1900,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-1-3a',
      propertyId: '1',
      number: '3A',
      rentAmount: 1800,
      status: 'vacant',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    // Pearl District Lofts (Property ID: '2')
    {
      id: 'unit-2-301',
      propertyId: '2',
      number: '301',
      rentAmount: 2400,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-2-302',
      propertyId: '2',
      number: '302',
      rentAmount: 2650,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-2-303',
      propertyId: '2',
      number: '303',
      rentAmount: 2450,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-2-304',
      propertyId: '2',
      number: '304',
      rentAmount: 2500,
      status: 'vacant',
      requirements: {
        payStubsWeeks: 8,
        bankStatementsMonths: 3,
      },
    },
    // Sunset Gardens (Property ID: '3')
    {
      id: 'unit-3-a1',
      propertyId: '3',
      number: 'A1',
      rentAmount: 2200,
      status: 'occupied',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
    {
      id: 'unit-3-a2',
      propertyId: '3',
      number: 'A2',
      rentAmount: 2300,
      status: 'vacant',
      requirements: {
        payStubsWeeks: 12,
        bankStatementsMonths: 3,
      },
    },
  ]);
  const [invites, setInvites] = useState<UnitInvite[]>([
    {
      id: 'invite-demo-1',
      unitId: 'unit-1-3a',
      inviteToken: 'demo-apply-123',
      status: 'pending',
      sentDate: new Date().toISOString(),
    },
  ]);
  const [applications, setApplications] = useState<ResidentApplication[]>([
    // Submitted application for Unit 2C at Riverside Apartments
    {
      id: 'app-001',
      unitId: 'unit-1-2c',
      inviteToken: 'invite-token-001',
      status: 'submitted',
      submittedDate: '2025-11-05T10:30:00Z',
      applicantInfo: {
        firstName: 'Sarah',
        lastName: 'Martinez',
        email: 'sarah.martinez@email.com',
        phone: '(503) 555-0198',
      },
      payStubs: [
        {
          id: 'ps-001-1',
          fileName: 'paystub_oct_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-05T09:15:00Z',
        },
        {
          id: 'ps-001-2',
          fileName: 'paystub_sep_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-05T09:16:00Z',
        },
        {
          id: 'ps-001-3',
          fileName: 'paystub_aug_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-05T09:17:00Z',
        },
      ],
      bankStatements: [
        {
          id: 'bs-001-1',
          fileName: 'bank_statement_oct_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-05T09:20:00Z',
          tag: 'income',
        },
        {
          id: 'bs-001-2',
          fileName: 'bank_statement_sep_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-05T09:21:00Z',
          tag: 'rent',
        },
        {
          id: 'bs-001-3',
          fileName: 'bank_statement_aug_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-05T09:22:00Z',
          tag: 'savings',
        },
      ],
      creditReport: {
        id: 'cr-001',
        fileName: 'credit_report_2025.pdf',
        fileUrl: 'data:application/pdf;base64,mock',
        fileType: 'application/pdf',
        uploadDate: '2025-11-05T09:25:00Z',
      },
      currentOwner: {
        name: 'John Peterson',
        phone: '(503) 555-0199',
        email: 'j.peterson@email.com',
      },
      calculatedSavings: 8200,
      meetsRequirements: true,
    },
    // Submitted application for Unit 1B at Oakwood Manor
    {
      id: 'app-002',
      unitId: 'unit-2-1b',
      inviteToken: 'invite-token-002',
      status: 'submitted',
      submittedDate: '2025-11-06T14:20:00Z',
      applicantInfo: {
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@email.com',
        phone: '(971) 555-0234',
      },
      payStubs: [
        {
          id: 'ps-002-1',
          fileName: 'paystub_1_oct_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-06T13:10:00Z',
        },
        {
          id: 'ps-002-2',
          fileName: 'paystub_2_sep_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-06T13:11:00Z',
        },
      ],
      bankStatements: [
        {
          id: 'bs-002-1',
          fileName: 'checking_oct_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-06T13:15:00Z',
          tag: 'income',
        },
        {
          id: 'bs-002-2',
          fileName: 'savings_oct_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-06T13:16:00Z',
          tag: 'savings',
        },
      ],
      creditReport: {
        id: 'cr-002',
        fileName: 'experian_report.pdf',
        fileUrl: 'data:application/pdf;base64,mock',
        fileType: 'application/pdf',
        uploadDate: '2025-11-06T13:18:00Z',
      },
      currentOwner: {
        name: 'Maria Garcia',
        phone: '(971) 555-0235',
      },
      calculatedSavings: 5800,
      meetsRequirements: false,
    },
    // Approved application for vacant unit at Sunset Gardens
    {
      id: 'app-003',
      unitId: 'unit-3-studio',
      inviteToken: 'invite-token-003',
      status: 'approved',
      submittedDate: '2025-11-03T11:00:00Z',
      applicantInfo: {
        firstName: 'Jennifer',
        lastName: 'Williams',
        email: 'jennifer.williams@email.com',
        phone: '(503) 555-0267',
      },
      payStubs: [
        {
          id: 'ps-003-1',
          fileName: 'paystub_oct_15_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-03T10:10:00Z',
        },
        {
          id: 'ps-003-2',
          fileName: 'paystub_oct_01_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-03T10:11:00Z',
        },
        {
          id: 'ps-003-3',
          fileName: 'paystub_sep_15_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-03T10:12:00Z',
        },
      ],
      bankStatements: [
        {
          id: 'bs-003-1',
          fileName: 'wells_fargo_checking_oct.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-03T10:15:00Z',
          tag: 'income',
        },
        {
          id: 'bs-003-2',
          fileName: 'wells_fargo_checking_sep.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-03T10:16:00Z',
          tag: 'rent',
        },
        {
          id: 'bs-003-3',
          fileName: 'wells_fargo_savings.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-03T10:17:00Z',
          tag: 'savings',
        },
      ],
      creditReport: {
        id: 'cr-003',
        fileName: 'transunion_credit_report.pdf',
        fileUrl: 'data:application/pdf;base64,mock',
        fileType: 'application/pdf',
        uploadDate: '2025-11-03T10:20:00Z',
      },
      currentOwner: {
        name: 'Robert Kim',
        phone: '(503) 555-0268',
        email: 'rkim@propertymanagement.com',
      },
      calculatedSavings: 4800,
      meetsRequirements: true,
    },
    // Rejected application
    {
      id: 'app-004',
      unitId: 'unit-1-2c',
      inviteToken: 'invite-token-004',
      status: 'rejected',
      submittedDate: '2025-11-01T09:30:00Z',
      applicantInfo: {
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'mike.johnson@email.com',
        phone: '(971) 555-0189',
      },
      payStubs: [
        {
          id: 'ps-004-1',
          fileName: 'paystub_sep_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-01T08:45:00Z',
        },
        {
          id: 'ps-004-2',
          fileName: 'paystub_aug_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-01T08:46:00Z',
        },
      ],
      bankStatements: [
        {
          id: 'bs-004-1',
          fileName: 'statement_sep_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-01T08:50:00Z',
          tag: 'income',
        },
        {
          id: 'bs-004-2',
          fileName: 'statement_aug_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-01T08:51:00Z',
          tag: 'rent',
        },
      ],
      creditReport: {
        id: 'cr-004',
        fileName: 'equifax_credit_report.pdf',
        fileUrl: 'data:application/pdf;base64,mock',
        fileType: 'application/pdf',
        uploadDate: '2025-11-01T08:55:00Z',
      },
      currentOwner: {
        name: 'Thomas Anderson',
        phone: '(971) 555-0190',
        email: 'tanderson@propertygroup.com',
      },
      calculatedSavings: 1200,
      meetsRequirements: false,
    },
    // Another submitted application for Unit 3A at Riverside
    {
      id: 'app-005',
      unitId: 'unit-1-3a',
      inviteToken: 'invite-token-005',
      status: 'submitted',
      submittedDate: '2025-11-07T16:45:00Z',
      applicantInfo: {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@email.com',
        phone: '(503) 555-0301',
      },
      payStubs: [
        {
          id: 'ps-005-1',
          fileName: 'paystub_nov_01_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-07T15:30:00Z',
        },
        {
          id: 'ps-005-2',
          fileName: 'paystub_oct_15_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-07T15:31:00Z',
        },
        {
          id: 'ps-005-3',
          fileName: 'paystub_oct_01_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-07T15:32:00Z',
        },
      ],
      bankStatements: [
        {
          id: 'bs-005-1',
          fileName: 'chase_checking_oct_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-07T15:35:00Z',
          tag: 'income',
        },
        {
          id: 'bs-005-2',
          fileName: 'chase_checking_sep_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-07T15:36:00Z',
          tag: 'rent',
        },
        {
          id: 'bs-005-3',
          fileName: 'chase_savings_2025.pdf',
          fileUrl: 'data:application/pdf;base64,mock',
          fileType: 'application/pdf',
          uploadDate: '2025-11-07T15:37:00Z',
          tag: 'savings',
        },
      ],
      creditReport: {
        id: 'cr-005',
        fileName: 'credit_karma_report.pdf',
        fileUrl: 'data:application/pdf;base64,mock',
        fileType: 'application/pdf',
        uploadDate: '2025-11-07T15:40:00Z',
      },
      currentOwner: {
        name: 'Lisa Thompson',
        phone: '(503) 555-0302',
        email: 'lthompson@rentals.com',
      },
      calculatedSavings: 9500,
      meetsRequirements: true,
    },
  ]);
  
  const [properties, setProperties] = useState<Property[]>([]);

  // Check for resident portal token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal');

    if (token) {
      // Find resident by portal token
      for (const property of properties) {
        const resident = property.residents.find(r => r.portalToken === token);
        if (resident) {
          setViewMode('resident');
          setResidentData({ resident, property });
          return;
        }
      }
    }
  }, [properties]);

  // Load properties from API
  const loadProperties = async () => {
    console.log('[loadProperties] Called, isSignedIn:', isSignedIn, 'isSessionExpiring:', isSessionExpiring);
    if (!isSignedIn) {
      console.log('[loadProperties] Not signed in, returning early');
      return;
    }
    // Skip API call if session is expiring (timeout warning shown)
    if (isSessionExpiring) {
      console.log('[loadProperties] Session expiring, skipping API call');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('[loadProperties] Fetching properties...');
      console.log('[loadProperties] Current portal:', getCurrentPortal());
      const propertiesData = await propertyService.listProperties();
      console.log('[loadProperties] Properties data:', propertiesData);
      console.log('[loadProperties] Properties count:', propertiesData?.length ?? 0);

      // Transform API data to match frontend types and load related data
      const transformedProperties: Property[] = await Promise.all(
        propertiesData.map(async (prop: any) => {
          // API returns propertyId directly
          const propertyId = prop.propertyId;
          console.log('[loadProperties] Processing property:', propertyId, prop.name);

          // Load residents for this property - handle errors gracefully
          let residentsData: any[] = [];
          try {
            residentsData = await propertyService.listPropertyResidents(propertyId);
            console.log('[loadProperties] Residents for', prop.name, ':', residentsData.length);
          } catch (err) {
            console.warn('[loadProperties] Failed to load residents for property', propertyId, err);
          }

          // Load units for this property - handle errors gracefully
          let unitsData: any[] = [];
          try {
            unitsData = await unitService.listUnits(propertyId);
            console.log('[loadProperties] Units for', prop.name, ':', unitsData.length);
          } catch (err) {
            console.warn('[loadProperties] Failed to load units for property', propertyId, err);
          }

          // Transform and load invoices/leases for each resident
          const residents: Resident[] = await Promise.all(
            residentsData.map(async (apiResident: any) => {
              // API returns residentId
              const residentId = apiResident.residentId;

              // Load invoices for this resident - handle errors gracefully
              let invoicesData: any[] = [];
              try {
                const response: any = await residentService.getResidentInvoices(residentId);
                console.log('[loadProperties] Invoices response for resident', residentId, ':', response);
                // Ensure we have an array - API might return { data: [...] } or just [...]
                invoicesData = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
              } catch (err) {
                console.warn('[loadProperties] Failed to load invoices for resident', residentId, err);
              }

              // Load leases for this resident - handle errors gracefully
              let leasesData: any[] = [];
              try {
                const response: any = await residentService.getLeases(residentId);
                console.log('[loadProperties] Leases response for resident', residentId, ':', response);
                // Ensure we have an array - API might return { data: [...] } or just [...]
                leasesData = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
              } catch (err) {
                console.warn('[loadProperties] Failed to load leases for resident', residentId, err);
              }

              // Transform invoices from API format to frontend format
              const invoices: Invoice[] = invoicesData.map((inv: any, index: number) => {
                console.log(`[loadProperties] Transforming invoice ${index + 1}/${invoicesData.length}:`, inv.invoiceId);
                console.log(`[loadProperties] Raw API invoice data:`, inv);
                console.log(`[loadProperties] electricMeterSnapshot from API:`, inv.electricMeterSnapshot);

                // Calculate date as 1st day of invoice month/year
                const invoiceDate = `${inv.year}-${String(inv.month).padStart(2, '0')}-01`;

                const transformed = {
                  id: inv.invoiceId,
                  month: `${getMonthName(inv.month)} ${inv.year}`, // Convert number to string format
                  date: invoiceDate, // Calculated from month/year
                  lastMonthBalance: inv.previousMonthBalance || 0,
                  currentRent: inv.currentRent,
                  daysLate: inv.daysLate,
                  lateFeeDailyRate: inv.dailyLateRate || 0, // Backend uses dailyLateRate
                  lateStartDay: inv.lateStartDay || 5,
                  previousMonthElectricUsageKwh: inv.previousMonthElectricUsageKwh || 0,
                  electricRate: inv.electricRate || 0,
                  electricMeterSnapshot: inv.electricMeterSnapshot,
                  electricMeterSnapshotId: inv.electricMeterSnapshotId,
                  prevMonthLastPaymentDate: inv.prevMonthLastPaymentDate || '',
                  // Adjustment fields (use ?? 0 to preserve negative values)
                  prevMonthBalanceAdjustment: inv.prevMonthBalanceAdjustment ?? 0,
                  prevMonthLateFeeAdjustment: inv.prevMonthLateFeeAdjustment ?? 0,
                  prevMonthElectricAdjustment: inv.prevMonthElectricAdjustment ?? 0,
                  isPaid: inv.isPaid,
                  paidDate: inv.paidDate,
                  shareToken: inv.shareToken,
                };

                console.log(`[loadProperties] Transformed invoice:`, transformed);
                console.log(`[loadProperties] electricMeterSnapshot after transform:`, transformed.electricMeterSnapshot);
                return transformed;
              });

              // Transform leases from API format to frontend format
              const leases: LeaseDocument[] = leasesData.map((lease: any) => ({
                id: lease.leaseId || lease.$id,
                category: lease.category as 'original' | 'renewal',
                leaseType: lease.leaseType as 'month-to-month' | 'yearly',
                unitId: lease.unitId || '', // Include unitId from API
                startDate: lease.startDate,
                endDate: lease.endDate || null, // Frontend will calculate this for display
                fileUrl: lease.fileUrl,
                $createdAt: lease.$createdAt, // API timestamp field
                notes: lease.notes,
                monthlyRent: lease.monthlyRent || 0,
                securityDeposit: lease.securityDeposit || 0,
                lateStartDay: lease.lateStartDay || 5,
                lateFeeDailyRate: lease.lateFeeDailyRate || 0,
                electricRate: lease.electricRate || 0,
              }));

              // Transform resident from API format to frontend format
              // API returns name field directly (formatted from occupants)
              return {
                id: residentId, // residentId already extracted at top of map function
                name: apiResident.name || '',
                email: apiResident.email,
                phone: apiResident.phone,
                occupants: apiResident.occupants?.map((occ: any) => ({
                  id: occ.id || Math.random().toString(36).substr(2, 9),
                  firstName: occ.firstName || '',
                  lastName: occ.lastName || '',
                  email: occ.email || '',
                  phone: occ.phone || '',
                })),
                streetAddress: apiResident.unitAddress || prop.address,
                aptNumber: apiResident.aptNumber || '',
                city: prop.city,
                state: prop.state,
                zipCode: prop.zipCode,
                lateStartDay: apiResident.gracePeriodDays || 5,
                currentRent: apiResident.monthlyRent,
                lateFeeDailyRate: apiResident.lateFeeDailyRate || 0,
                electricRate: 0, // TODO: Get from property settings
                invoices,
                leases,
                portalToken: apiResident.portalToken,
                dashboardPreferences: {
                  showLateFees: !apiResident.dashboardPreferences?.hideLateFees,
                  showElectricCollected: !apiResident.dashboardPreferences?.hideElectricUsage,
                  showElectricUsage: !apiResident.dashboardPreferences?.hideElectricUsage,
                },
              };
            })
          );

          // Transform costs from API format to frontend format
          const costs: PropertyCost[] = (prop.costs || []).map((cost: any) => ({
            id: cost.costId,
            name: cost.name,
            amount: cost.amount,
            type: cost.type || 'fixed',
            frequency: cost.frequency || 'monthly',
            enabled: cost.enabled !== false, // Default to enabled
            categories: cost.categories || [],
          }));

          // Transform units from API format to frontend format
          const propertyUnits: Unit[] = unitsData.map((apiUnit: any) => {
            // API returns unitId (consistent with propertyId, residentId, invoiceId, costId, leaseId)
            const unitId = apiUnit.unitId;
            console.log('[loadProperties] RAW API UNIT:', apiUnit);
            console.log('[loadProperties] apiUnit.unitNumber:', apiUnit.unitNumber);

            const transformedUnit = {
              id: unitId,
              propertyId: apiUnit.propertyId,
              number: apiUnit.unitNumber,  // Map API 'unitNumber' to frontend 'number'
              address: apiUnit.address,
              rentAmount: apiUnit.rentAmount,
              securityDeposit: apiUnit.securityDeposit || 0,
              status: apiUnit.status === 'available' ? 'vacant' : apiUnit.status === 'maintenance' ? 'pending' : 'occupied',
              requirements: apiUnit.requirements,
            };

            console.log('[loadProperties] TRANSFORMED UNIT:', transformedUnit);
            return transformedUnit;
          });

          return {
            id: propertyId,
            name: prop.name,
            address: prop.address,
            address2: prop.address2 || '',
            city: prop.city,
            state: prop.state,
            zipCode: prop.zipCode,
            residents,
            costs,
            units: propertyUnits.map(u => u.number), // Store unit numbers in property (for compatibility)
            unitsData: propertyUnits, // Store full unit data for setting units state
          };
        })
      );

      console.log('[loadProperties] Transformed properties:', transformedProperties);

      // Deduplicate properties by ID (in case API returns duplicates)
      const uniqueProperties = transformedProperties.filter(
        (prop, index, self) => index === self.findIndex(p => p.id === prop.id)
      );
      console.log('[loadProperties] Unique properties count:', uniqueProperties.length);
      console.log('[loadProperties] Setting properties state with:', uniqueProperties.map(p => ({ id: p.id, name: p.name })));

      setProperties(uniqueProperties);

      // Extract and set all units from all properties
      const allUnits = uniqueProperties.flatMap((prop: any) => prop.unitsData || []);
      console.log('[loadProperties] Setting units state, count:', allUnits.length);
      console.log('[loadProperties] First allUnit:', allUnits[0]);
      console.log('[loadProperties] Does first unit have number property?:', allUnits[0]?.number);
      setUnits(allUnits);
    } catch (err: any) {
      console.error('[loadProperties] Failed to load properties:', err);
      setError(err.message || 'Failed to load properties');

      // If unauthorized, log out
      if (err.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert month number to month name
  const getMonthName = (month: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  };

  // Load data when signed in
  useEffect(() => {
    console.log('[App useEffect] isSignedIn changed to:', isSignedIn);
    if (isSignedIn) {
      console.log('[App useEffect] Calling loadProperties...');
      loadProperties();
    }
  }, [isSignedIn]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.signIn(email, password);
      setIsSignedIn(true);
      setViewMode('owner');
      // Trigger properties reload after successful sign in
      loadProperties();
      return true;
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = useCallback(async (redirectTo?: string) => {
    const targetPath = redirectTo || '/resident/sign-in';

    await authService.signOut();

    // Redirect immediately to prevent React from re-rendering with cleared state
    window.location.href = targetPath;
  }, []);

  // Handle idle timeout logout
  const handleIdleLogout = useCallback(() => {
    // Determine which portal user is likely on based on current URL
    const isHomeowner = window.location.pathname.startsWith('/homeowner');
    const redirectPath = isHomeowner ? '/homeowner/sign-in' : '/resident/sign-in';
    handleLogout(redirectPath);
  }, [handleLogout]);

  // Register global 401 handler for automatic sign-out when auth fails on any API call
  useEffect(() => {
    const handle401 = () => {
      console.log('[App] 401 received - signing out user');
      const isHomeowner = window.location.pathname.startsWith('/homeowner');
      const redirectPath = isHomeowner ? '/homeowner/sign-in' : '/resident/sign-in';
      handleLogout(redirectPath);
    };

    onUnauthorized(handle401);

    return () => {
      clearUnauthorizedCallback();
    };
  }, [handleLogout]);

  // Auto-logout after inactivity
  // 10 minutes total: 8 minutes idle before warning, then 2 minute countdown
  // Disabled when "Remember Me" is active (30-day session)
  const idleTimeoutEnabled = isSignedIn && !hasRememberMe;

  // Log idle timeout state changes for debugging
  useEffect(() => {
    console.log('[App] Idle timeout state changed - enabled:', idleTimeoutEnabled, '(isSignedIn:', isSignedIn, ', hasRememberMe:', hasRememberMe, ')');
  }, [idleTimeoutEnabled, isSignedIn, hasRememberMe]);

  const { isWarning, warningSeconds, clearWarning } = useIdleTimeout({
    timeout: 10 * 60 * 1000,      // 10 minutes total (8 min idle + 2 min warning)
    warningTime: 2 * 60 * 1000,   // 2 minute warning countdown
    onTimeout: handleIdleLogout,
    enabled: idleTimeoutEnabled, // Disable idle timeout when Remember Me is active
  });

  // Automatic token refresh - keeps session alive by updating last activity
  // Only enabled for sessions WITHOUT Remember Me (Remember Me uses 30-day expiration)
  useTokenRefresh({
    enabled: isSignedIn && !hasRememberMe,
    onRefreshFailed: handleIdleLogout,
  });

  // Track if session is expiring (warning shown) - used to prevent API calls
  // Use ref to avoid causing re-renders when isWarning changes
  const isSessionExpiringRef = useRef(false);
  useEffect(() => {
    isSessionExpiringRef.current = isWarning;
  }, [isWarning]);
  const isSessionExpiring = isSessionExpiringRef.current;

  // Check for session expiration (for "Remember Me" 30-day sessions)
  useEffect(() => {
    if (!isSignedIn) return;

    // Check immediately on mount
    const checkExpiration = () => {
      if (isSessionExpired()) {
        console.log('[App] Session expired, logging out');
        handleIdleLogout();
      }
    };

    checkExpiration();

    // Check periodically (every minute)
    const intervalId = setInterval(checkExpiration, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isSignedIn, handleIdleLogout]);

  // Activity listener for sliding window session extension
  useEffect(() => {
    if (!isSignedIn) return;

    const handleActivity = () => {
      // Extend session on user activity (for rememberMe sessions)
      // This creates a sliding 30-day window
      extendSession();
    };

    // Listen for user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // Throttle to avoid excessive updates (max once per minute)
    let lastExtend = 0;
    const throttledExtend = () => {
      const now = Date.now();
      if (now - lastExtend > 60 * 1000) { // 1 minute throttle
        handleActivity();
        lastExtend = now;
      }
    };

    events.forEach(event => {
      window.addEventListener(event, throttledExtend, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledExtend);
      });
    };
  }, [isSignedIn]);

  // Calculate date range based on selection
  const getDateRangeFilter = (): DateRangeFilter => {
    const today = new Date();
    let startDate = new Date();
    let endDate = today;

    if (dateRangeType === 'ytd') {
      startDate = new Date(today.getFullYear(), 0, 1);
    } else if (dateRangeType === '1y') {
      startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    } else if (dateRangeType === '2y') {
      startDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    } else if (dateRangeType === '3y') {
      startDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    } else if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }

    return {
      type: dateRangeType,
      customStartDate,
      customEndDate,
      startDate,
      endDate,
    };
  };

  const dateRangeFilter = getDateRangeFilter();

  const addProperty = async (property: Omit<Property, 'id'>): Promise<Property> => {
    console.log('[addProperty] Creating property:', property);
    // Note: name field removed from API - only address is required
    const newProperty = await propertyService.createProperty({
      address: property.address,
      address2: property.address2,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
    });
    console.log('[addProperty] Property created:', newProperty);

    // API returns propertyId directly
    const propertyId = (newProperty as any).propertyId;
    console.log('[addProperty] Property ID:', propertyId);

    // Save costs if provided
    let savedCosts: PropertyCost[] = [];
    if (property.costs && property.costs.length > 0) {
      console.log('[addProperty] Saving costs:', property.costs);
      const costsToSave = property.costs.map(cost => ({
        name: cost.name,
        amount: cost.amount,
        type: cost.type || 'fixed' as const,
        frequency: cost.frequency || 'monthly' as const,
        enabled: cost.enabled !== false,
        categories: cost.categories || [],
      }));
      console.log('[addProperty] Costs to save (transformed):', costsToSave);
      const apiCosts = await propertyService.saveCosts(propertyId, costsToSave);
      console.log('[addProperty] API costs response:', apiCosts);
      // Handle both array response and object with costs array
      const costsArray = Array.isArray(apiCosts) ? apiCosts : (apiCosts as any)?.costs || [];
      savedCosts = costsArray.map((cost: any) => ({
        id: cost.costId,
        name: cost.name,
        amount: cost.amount,
        type: cost.type || 'fixed',
        frequency: cost.frequency || 'monthly',
        enabled: cost.enabled !== false,
        categories: cost.categories || [],
      }));
      console.log('[addProperty] Saved costs (transformed):', savedCosts);
    }

    const transformedProperty: Property = {
      id: propertyId,
      name: newProperty.name,
      address: newProperty.address,
      address2: newProperty.address2 || '',
      city: newProperty.city,
      state: newProperty.state,
      zipCode: newProperty.zipCode,
      residents: [],
      costs: savedCosts,
      units: property.units || [],
    };
    console.log('[addProperty] Final property:', transformedProperty);

    // Add property, ensuring no duplicates (in case property already exists)
    setProperties(prev => {
      const exists = prev.some(p => p.id === transformedProperty.id);
      if (exists) {
        console.log('[addProperty] Property already exists, updating instead');
        return prev.map(p => p.id === transformedProperty.id ? transformedProperty : p);
      }
      return [...prev, transformedProperty];
    });
    return transformedProperty;
  };

  const updateProperty = async (id: string, updatedProperty: Omit<Property, 'id'>) => {
    console.log('[updateProperty] Updating property:', id, updatedProperty);
    // Note: name field removed from API - only address is required
    await propertyService.updateProperty(id, {
      address: updatedProperty.address,
      address2: updatedProperty.address2,
      city: updatedProperty.city,
      state: updatedProperty.state,
      zipCode: updatedProperty.zipCode,
    });

    // Save costs if provided
    let savedCosts: PropertyCost[] = [];
    if (updatedProperty.costs && updatedProperty.costs.length > 0) {
      console.log('[updateProperty] Saving costs:', updatedProperty.costs);
      const costsToSave = updatedProperty.costs.map(cost => ({
        name: cost.name,
        amount: cost.amount,
        type: cost.type || 'fixed' as const,
        frequency: cost.frequency || 'monthly' as const,
        enabled: cost.enabled !== false,
        categories: cost.categories || [],
      }));
      console.log('[updateProperty] Costs to save (transformed):', costsToSave);
      console.log('[updateProperty] Calling propertyService.saveCosts with id:', id);
      const apiCosts = await propertyService.saveCosts(id, costsToSave);
      console.log('[updateProperty] API costs response:', apiCosts);
      console.log('[updateProperty] API costs response type:', typeof apiCosts);
      console.log('[updateProperty] API costs is array:', Array.isArray(apiCosts));
      // Handle both array response and object with costs array
      const costsArray = Array.isArray(apiCosts) ? apiCosts : (apiCosts as any)?.costs || [];
      savedCosts = costsArray.map((cost: any) => ({
        id: cost.costId,
        name: cost.name,
        amount: cost.amount,
        type: cost.type || 'fixed',
        frequency: cost.frequency || 'monthly',
        enabled: cost.enabled !== false,
        categories: cost.categories || [],
      }));
      console.log('[updateProperty] Saved costs (transformed):', savedCosts);
    } else {
      // Clear all costs if none provided
      console.log('[updateProperty] Clearing all costs');
      await propertyService.saveCosts(id, []);
    }

    // Update local state with saved costs
    setProperties(properties.map(p => p.id === id ? { ...updatedProperty, id, costs: savedCosts } : p));
  };

  const deleteProperty = async (id: string) => {
    try {
      await propertyService.deleteProperty(id);
      setProperties(properties.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('Failed to delete property:', err);
      setError(err.message || 'Failed to delete property');
    }
  };

  const addResident = async (propertyId: string, resident: Omit<Resident, 'id'>) => {
    try {
      // Get primary occupant info
      const primaryOccupant = resident.occupants && resident.occupants.length > 0
        ? resident.occupants[0]
        : {
            firstName: resident.name.split(' ')[0] || '',
            lastName: resident.name.split(' ').slice(1).join(' ') || '',
            email: resident.email,
            phone: resident.phone,
          };

      // Step 1: Create basic resident with name only
      console.log('[App.addResident] Calling API to create resident...');
      const createResponse = await residentService.createResident({
        propertyId,
        name: `${primaryOccupant.firstName} ${primaryOccupant.lastName}`.trim(),
        streetAddress: resident.streetAddress,
        aptNumber: resident.aptNumber,
        city: resident.city,
        state: resident.state,
        zipCode: resident.zipCode,
      });

      console.log('[App.addResident] API response:', createResponse);
      console.log('[App.addResident] Response keys:', Object.keys(createResponse));
      console.log('[App.addResident] Full response:', JSON.stringify(createResponse, null, 2));

      // Extract resident data from response.data (API format: {status, title, message, data})
      const residentData = (createResponse as any).data || createResponse;
      console.log('[App.addResident] Resident data:', residentData);
      console.log('[App.addResident] Resident data keys:', residentData ? Object.keys(residentData) : 'null');

      // Get the ID from the resident data - try multiple possible field names
      const residentId = residentData?.residentId ||
                        residentData?.$id ||
                        residentData?.id ||
                        residentData?._id;

      console.log('[App.addResident] Extracted resident ID:', residentId);

      if (!residentId) {
        console.error('[App.addResident] No ID found in response. Available fields:', residentData ? Object.keys(residentData) : 'none');
        console.error('[App.addResident] Full createResponse:', createResponse);
        throw new Error(`No resident ID returned from createResident. Response: ${JSON.stringify(createResponse)}`);
      }

      // Keep reference to final resident data and response for toast
      // Use createResponse for toast - it has "Resident Added" message with all occupant names
      let newResident = residentData;
      let finalResponse: any = createResponse;

      // Step 2: Update occupants separately if provided
      if (resident.occupants && resident.occupants.length > 0) {
        const occupantsResponse = await residentService.updateOccupants(residentId, resident.occupants);
        // Extract data from response (API format: {status, title, message, data})
        newResident = (occupantsResponse as any).data || occupantsResponse;
        // Keep finalResponse as createResponse - we want "Resident Added" not "Occupant Added"
      }

      // Step 3: Update rent details - REMOVED
      // Rent details are now provided during lease upload (Step 4)
      // This endpoint has been removed from the API

      // Transform to frontend type
      const transformedResident: Resident = {
        id: residentId,
        name: newResident.name || `${primaryOccupant.firstName} ${primaryOccupant.lastName}`.trim(),
        email: newResident.email || primaryOccupant.email,
        phone: newResident.phone || primaryOccupant.phone,
        occupants: newResident.occupants || resident.occupants || [],
        streetAddress: newResident.streetAddress,
        aptNumber: newResident.aptNumber,
        city: newResident.city,
        state: newResident.state,
        zipCode: newResident.zipCode,
        lateStartDay: newResident.lateStartDay,
        currentRent: newResident.currentRent,
        lateFeeDailyRate: newResident.lateFeeDailyRate,
        electricRate: newResident.electricRate,
        invoices: [],
        leases: [],
        portalToken: newResident.portalToken,
        dashboardPreferences: resident.dashboardPreferences,
      };

      // Add to local state
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return { ...p, residents: [...(p.residents || []), transformedResident] };
        }
        return p;
      }));

      // Step 4: Create lease record (PDF file is now optional)
      console.log('[App.addResident] Checking for lease data...');
      console.log('[App.addResident] resident.leases:', resident.leases);
      console.log('[App.addResident] resident.leases length:', resident.leases?.length);

      if (resident.leases && resident.leases.length > 0) {
        const lease = resident.leases[0];
        const leaseFile = (lease as any).file; // Optional
        console.log('[App.addResident] Found lease:', lease);
        console.log('[App.addResident] Lease has file property:', !!leaseFile);

        try {
          // Extract rent details from the lease object (set in ResidentForm)
          const leaseMetadata = {
            documentType: lease.documentType || 'lease',
            leaseType: lease.leaseType || 'yearly',
            startDate: lease.startDate,
            endDate: lease.endDate || undefined, // Convert null to undefined
            notes: lease.notes,
            unitId: (lease as any).unitId, // Selected unit
            // Rent details (now required in lease upload per API docs)
            monthlyRent: (lease as any).monthlyRent || 0,
            lateStartDay: (lease as any).lateStartDay || 1,
            lateFeeDailyRate: (lease as any).lateFeeDailyRate || 0, // Only daily rate, no flat lateFeeAmount
            electricRate: (lease as any).electricRate || 0,
          };

          console.log('[App.addResident] Lease metadata with rent details:', leaseMetadata);
          if (leaseFile) {
            console.log('[App.addResident] 📄 Creating lease WITH PDF file...');
            console.log('[App.addResident] File name:', leaseFile.name);
            console.log('[App.addResident] File size:', leaseFile.size);
            console.log('[App.addResident] File type:', leaseFile.type);
          } else {
            console.log('[App.addResident] 📋 Creating lease WITHOUT PDF file (metadata only)...');
          }

          console.log('[App.addResident] Calling residentService.uploadLease...');
          const leaseResponse = await residentService.uploadLease(
            residentId,
            propertyId,
            leaseFile, // Can be undefined - API now accepts leases without PDF
            leaseMetadata
          );
          console.log('[App.addResident] ✅ Lease created successfully');
          console.log('[App.addResident] Lease response:', leaseResponse);

          // Use lease response for toast if available
          if ((leaseResponse as any)?.title && (leaseResponse as any)?.message) {
            finalResponse = leaseResponse;
          }
        } catch (leaseErr) {
          console.error('[App.addResident] ❌ Failed to create lease:', leaseErr);
          // Don't fail the whole operation if lease creation fails
        }
      } else {
        console.log('[App.addResident] ⚠️ No leases provided with resident data');
      }

      // Show success toast from API response
      // API returns toast data at root level: { status, title, message, data }
      // Use finalResponse which contains the last operation's toast message (with all occupant names if added)
      console.log('[App.addResident] Checking for toast data in finalResponse...');
      console.log('[App.addResident] finalResponse.title:', (finalResponse as any)?.title);
      console.log('[App.addResident] finalResponse.message:', (finalResponse as any)?.message);

      if ((finalResponse as any)?.title && (finalResponse as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (finalResponse as any).title,
          message: (finalResponse as any).message,
        };
        console.log('[App.addResident] ✅ Saving toast to localStorage:', toastData);
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
        console.log('[App.addResident] ✅ Toast saved. localStorage.getItem result:', localStorage.getItem('property_form_toast'));
      } else {
        console.warn('[App.addResident] ❌ No toast data in API response - missing title or message');
      }

      // Reload properties from API to ensure data persistence
      // Don't await - let it happen in background to avoid blocking navigation
      console.log('[App.addResident] Calling loadProperties (non-blocking)...');
      loadProperties().then(() => {
        console.log('[App.addResident] loadProperties complete (background)');
      }).catch(err => {
        console.error('[App.addResident] loadProperties failed (background):', err);
      });

      // Return the transformed resident so caller can navigate to it
      console.log('[App.addResident] Returning transformedResident immediately');
      return transformedResident;
    } catch (err: any) {
      console.error('Failed to create resident:', err);
      // Show error toast from API response
      if (err.toast) {
        const toastData = {
          variant: 'error' as const,
          title: err.toast.title,
          message: err.toast.message,
        };
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }
      if (err.message) {
        setError(err.message);
      }
    }
  };

  const updateResident = async (propertyId: string, residentId: string, updatedResident: Omit<Resident, 'id'>) => {
    try {
      const primaryOccupant = updatedResident.occupants && updatedResident.occupants.length > 0
        ? updatedResident.occupants[0]
        : {
            firstName: updatedResident.name.split(' ')[0] || '',
            lastName: updatedResident.name.split(' ').slice(1).join(' ') || '',
            email: updatedResident.email,
            phone: updatedResident.phone,
          };

      // Step 1: Update basic resident info (name, address)
      let response = await residentService.updateResident(residentId, {
        name: `${primaryOccupant.firstName} ${primaryOccupant.lastName}`.trim(),
        address: updatedResident.streetAddress,
        unitNumber: updatedResident.aptNumber,
        city: updatedResident.city,
        state: updatedResident.state,
        zipCode: updatedResident.zipCode,
      });
      // Extract data from response (API format: {status, title, message, data})
      let residentData = (response as any).data || response;

      // Step 2: Update occupants separately if provided
      if (updatedResident.occupants && updatedResident.occupants.length > 0) {
        response = await residentService.updateOccupants(residentId, updatedResident.occupants);
        residentData = (response as any).data || response;
      }

      // Step 3: Update rent details - REMOVED
      // Rent details are now stored in lease records, not on the resident
      // To update rent details, update the lease instead

      // Update local state
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => r.id === residentId ? { ...updatedResident, id: residentId } : r),
          };
        }
        return p;
      }));

      // Show success toast from API response
      // API returns toast data at root level: { status, title, message, data }
      if ((response as any)?.title && (response as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (response as any).title,
          message: (response as any).message,
        };
        console.log('[App.updateResident] Saving toast to localStorage:', toastData);
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }

      // Reload properties from API to ensure data persistence
      console.log('[App.updateResident] Calling loadProperties...');
      await loadProperties();
      console.log('[App.updateResident] loadProperties complete');
    } catch (err: any) {
      console.error('Failed to update resident:', err);
      // Show error toast from API response
      if (err.toast) {
        const toastData = {
          variant: 'error' as const,
          title: err.toast.title,
          message: err.toast.message,
        };
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }
      if (err.message) {
        setError(err.message);
      }
    }
  };

  const deleteResident = async (residentId: string) => {
    try {
      // Find resident name before deleting
      let residentName = 'Resident';
      for (const property of properties) {
        const resident = property.residents?.find(r => r.id === residentId);
        if (resident) {
          residentName = resident.name;
          break;
        }
      }

      console.log('[App.deleteResident] Calling API to delete resident:', residentId);
      const response = await residentService.deleteResident(residentId);
      console.log('[App.deleteResident] API response:', response);

      // Update local state - find and remove resident from their property
      setProperties(properties.map(p => {
        // Check if this property contains the resident being deleted
        if (p.residents && p.residents.some(r => r.id === residentId)) {
          return {
            ...p,
            residents: p.residents.filter(r => r.id !== residentId),
          };
        }
        return p;
      }));

      // Show success toast from API response
      // API returns toast data at root level: { status, title, message, data }
      console.log('[App.deleteResident] Checking for toast data in response...');
      console.log('[App.deleteResident] response.title:', (response as any)?.title);
      console.log('[App.deleteResident] response.message:', (response as any)?.message);

      if ((response as any)?.title && (response as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (response as any).title,
          message: (response as any).message,
        };
        console.log('[App.deleteResident] ✅ Saving toast to localStorage:', toastData);
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
        console.log('[App.deleteResident] ✅ Toast saved. localStorage.getItem result:', localStorage.getItem('property_form_toast'));
      } else {
        console.warn('[App.deleteResident] ❌ No toast data in API response - missing title or message');
      }
    } catch (err: any) {
      console.error('Failed to delete resident:', err);
      // Show error toast from API response
      // API returns error toast at root level too
      if ((err as any)?.title && (err as any)?.message) {
        const toastData = {
          variant: 'error' as const,
          title: (err as any).title,
          message: (err as any).message,
        };
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }
      if (err.message) {
        setError(err.message);
      }
    }
  };

  const addInvoice = async (propertyId: string, residentId: string, invoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => {
    try {
      console.log('[addInvoice] ===== INVOICE CREATION START =====');
      console.log('[addInvoice] Received invoice object:', invoice);
      console.log('[addInvoice] Meter snapshot file:', meterSnapshotFile ? `${meterSnapshotFile.name} (${meterSnapshotFile.size} bytes)` : 'none');

      // Find the resident to get their name for the filename
      const property = properties.find(p => p.id === propertyId);
      const resident = property?.residents?.find(r => r.id === residentId);
      const residentName = resident?.name || 'Unknown';

      // Parse month string (e.g., "January 2025") to month/year numbers
      const [monthName, yearStr] = invoice.month.split(' ');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthNumber = monthNames.indexOf(monthName) + 1;
      const year = parseInt(yearStr);

      // Create invoice WITHOUT electricMeterSnapshot (will be uploaded separately)
      // daysLate is calculated by backend from prevMonthLastPaymentDate and lateStartDay
      const createRequest = {
        residentId,
        propertyId,
        month: monthNumber,
        year,
        currentRent: invoice.currentRent,
        previousMonthBalance: invoice.lastMonthBalance,
        dailyLateRate: invoice.lateFeeDailyRate,
        lateStartDay: invoice.lateStartDay || 5,
        previousMonthElectricUsageKwh: invoice.previousMonthElectricUsageKwh,
        electricRate: invoice.electricRate,
        prevMonthLastPaymentDate: invoice.prevMonthLastPaymentDate || '',
        // Adjustment fields (+ to add, - to subtract)
        prevMonthBalanceAdjustment: invoice.prevMonthBalanceAdjustment ?? 0,
        prevMonthLateFeeAdjustment: invoice.prevMonthLateFeeAdjustment ?? 0,
        prevMonthElectricAdjustment: invoice.prevMonthElectricAdjustment ?? 0,
      };
      console.log('[addInvoice] Creating invoice with:', createRequest);

      const response = await invoiceService.createInvoice(createRequest);
      console.log('[addInvoice] API response:', response);

      // Extract invoice data (may be nested in 'data' field if using withMessage)
      let invoiceData = (response as any).data || response;
      console.log('[addInvoice] Extracted invoice data:', invoiceData);

      const invoiceId = invoiceData.invoiceId || invoiceData.$id || invoiceData.id;

      // Upload meter snapshot file if provided
      if (meterSnapshotFile && invoiceId) {
        console.log('[addInvoice] ===== STARTING FILE UPLOAD =====');
        console.log('[addInvoice] meterSnapshotFile exists:', !!meterSnapshotFile);
        console.log('[addInvoice] invoiceId exists:', !!invoiceId);
        console.log('[addInvoice] File details:', meterSnapshotFile.name, meterSnapshotFile.size, meterSnapshotFile.type);
        try {
          const uploadResponse = await invoiceService.uploadMeterSnapshot(
            invoiceId,
            meterSnapshotFile,
            residentName,
            invoice.month // Pass invoice month for filename generation
          );
          console.log('[addInvoice] ===== UPLOAD SUCCESSFUL =====');
          console.log('[addInvoice] Upload response:', uploadResponse);
          console.log('[addInvoice] File URL:', uploadResponse.fileUrl);
          console.log('[addInvoice] Updated invoice:', uploadResponse.invoice);
          // Update invoiceData with the uploaded file URL
          invoiceData = uploadResponse.invoice;
        } catch (uploadError: any) {
          console.error('[addInvoice] ===== UPLOAD FAILED =====');
          console.error('[addInvoice] Upload error:', uploadError);
          console.error('[addInvoice] Error message:', uploadError?.message);
          console.error('[addInvoice] Error stack:', uploadError?.stack);
          // Continue anyway - invoice was created successfully
        }
      } else {
        console.log('[addInvoice] Skipping file upload:');
        console.log('  - meterSnapshotFile:', meterSnapshotFile ? 'exists' : 'NULL');
        console.log('  - invoiceId:', invoiceId ? invoiceId : 'NULL');
      }

      // Calculate date as 1st day of invoice month/year
      const createdInvoiceDate = `${year}-${String(monthNumber).padStart(2, '0')}-01`;

      // Transform to frontend type
      const transformedInvoice: Invoice = {
        id: invoiceId,
        month: invoice.month,
        date: createdInvoiceDate, // Calculated from month/year
        lastMonthBalance: invoiceData.previousMonthBalance || 0,
        currentRent: invoiceData.currentRent,
        daysLate: invoiceData.daysLate || 0,
        lateFeeDailyRate: invoiceData.dailyLateRate || 0, // Backend uses dailyLateRate
        lateStartDay: invoiceData.lateStartDay || 5,
        previousMonthElectricUsageKwh: invoiceData.previousMonthElectricUsageKwh || 0,
        electricRate: invoiceData.electricRate || 0,
        electricMeterSnapshot: invoiceData.electricMeterSnapshot || '',
        electricMeterSnapshotId: invoiceData.electricMeterSnapshotId,
        prevMonthLastPaymentDate: invoiceData.prevMonthLastPaymentDate || '',
        isPaid: invoiceData.isPaid || false,
        paidDate: invoiceData.paidDate,
        shareToken: invoiceData.shareToken,
      };

      // Add to local state
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => {
              if (r.id === residentId) {
                return { ...r, invoices: [transformedInvoice, ...r.invoices] };
              }
              return r;
            }),
          };
        }
        return p;
      }));

      // Show success toast if API provides it
      if ((response as any)?.title && (response as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (response as any).title,
          message: (response as any).message,
        };
        console.log('[App.addInvoice] Saving toast to localStorage:', toastData);
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }
    } catch (err: any) {
      console.error('Failed to create invoice:', err);
      setError(err.message || 'Failed to create invoice');
    }
  };

  const updateInvoice = async (propertyId: string, residentId: string, invoiceId: string, updatedInvoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => {
    try {
      console.log('[updateInvoice] Updating invoice:', invoiceId);
      console.log('[updateInvoice] Meter snapshot file:', meterSnapshotFile ? `${meterSnapshotFile.name} (${meterSnapshotFile.size} bytes)` : 'none');

      // Find the resident to get their name for the filename
      const property = properties.find(p => p.id === propertyId);
      const resident = property?.residents?.find(r => r.id === residentId);
      const residentName = resident?.name || 'Unknown';

      // Parse month string (e.g., "January 2025") to month/year numbers
      const [monthName, yearStr] = updatedInvoice.month.split(' ');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthNumber = monthNames.indexOf(monthName) + 1;
      const year = parseInt(yearStr);

      // Update invoice WITHOUT electricMeterSnapshot (will be uploaded separately if provided)
      // daysLate is calculated by backend from prevMonthLastPaymentDate and lateStartDay
      const response = await invoiceService.updateInvoice(invoiceId, {
        month: monthNumber,
        year,
        currentRent: updatedInvoice.currentRent,
        previousMonthBalance: updatedInvoice.lastMonthBalance,
        dailyLateRate: updatedInvoice.lateFeeDailyRate,
        lateStartDay: updatedInvoice.lateStartDay || 5,
        previousMonthElectricUsageKwh: updatedInvoice.previousMonthElectricUsageKwh,
        electricRate: updatedInvoice.electricRate,
        prevMonthLastPaymentDate: updatedInvoice.prevMonthLastPaymentDate || '',
        // Adjustment fields (+ to add, - to subtract)
        prevMonthBalanceAdjustment: updatedInvoice.prevMonthBalanceAdjustment ?? 0,
        prevMonthLateFeeAdjustment: updatedInvoice.prevMonthLateFeeAdjustment ?? 0,
        prevMonthElectricAdjustment: updatedInvoice.prevMonthElectricAdjustment ?? 0,
      });

      // Extract invoice data (may be nested in 'data' field if using withMessage)
      let invoiceData = (response as any).data || response;

      // Upload meter snapshot file if provided
      if (meterSnapshotFile) {
        console.log('[updateInvoice] ===== STARTING FILE UPLOAD =====');
        console.log('[updateInvoice] File details:', meterSnapshotFile.name, meterSnapshotFile.size, meterSnapshotFile.type);
        try {
          const uploadResponse = await invoiceService.uploadMeterSnapshot(
            invoiceId,
            meterSnapshotFile,
            residentName,
            updatedInvoice.month // Pass invoice month for filename generation
          );
          console.log('[updateInvoice] ===== UPLOAD SUCCESSFUL =====');
          console.log('[updateInvoice] Upload response:', uploadResponse);
          console.log('[updateInvoice] File URL:', uploadResponse.fileUrl);
          // Update invoiceData with the uploaded file URL
          invoiceData = uploadResponse.invoice;
        } catch (uploadError: any) {
          console.error('[updateInvoice] ===== UPLOAD FAILED =====');
          console.error('[updateInvoice] Upload error:', uploadError);
          console.error('[updateInvoice] Error message:', uploadError?.message);
          console.error('[updateInvoice] Error stack:', uploadError?.stack);
          // Continue anyway - invoice was updated successfully
        }
      } else {
        console.log('[updateInvoice] No file to upload - meterSnapshotFile is null');
      }

      // Calculate date as 1st day of invoice month/year
      const updatedInvoiceDate = `${year}-${String(monthNumber).padStart(2, '0')}-01`;

      // Transform updated invoice for local state
      const transformedInvoice: Invoice = {
        id: invoiceId,
        month: updatedInvoice.month,
        date: updatedInvoiceDate, // Calculated from month/year
        lastMonthBalance: invoiceData.previousMonthBalance || 0,
        currentRent: invoiceData.currentRent,
        daysLate: invoiceData.daysLate || 0,
        lateFeeDailyRate: invoiceData.dailyLateRate || 0, // Backend uses dailyLateRate
        lateStartDay: invoiceData.lateStartDay || 5,
        previousMonthElectricUsageKwh: invoiceData.previousMonthElectricUsageKwh || 0,
        electricRate: invoiceData.electricRate || 0,
        electricMeterSnapshot: invoiceData.electricMeterSnapshot,
        electricMeterSnapshotId: invoiceData.electricMeterSnapshotId,
        prevMonthLastPaymentDate: invoiceData.prevMonthLastPaymentDate || '',
        isPaid: invoiceData.isPaid || false,
        paidDate: invoiceData.paidDate,
        shareToken: invoiceData.shareToken,
      };

      // Update local state
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => {
              if (r.id === residentId) {
                return {
                  ...r,
                  invoices: r.invoices.map(inv => inv.id === invoiceId ? transformedInvoice : inv),
                };
              }
              return r;
            }),
          };
        }
        return p;
      }));

      // Show success toast from API response
      if ((response as any)?.title && (response as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (response as any).title,
          message: (response as any).message,
        };
        console.log('[App.updateInvoice] Saving toast to localStorage:', toastData);
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      setError(err.message || 'Failed to update invoice');
    }
  };

  const deleteInvoice = async (propertyId: string, residentId: string, invoiceId: string) => {
    try {
      const response = await invoiceService.deleteInvoice(invoiceId);

      // Update local state - remove the invoice from the resident's invoices array
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => {
              if (r.id === residentId) {
                return {
                  ...r,
                  invoices: r.invoices.filter(inv => inv.id !== invoiceId),
                };
              }
              return r;
            }),
          };
        }
        return p;
      }));

      // Show success toast if API provides it
      if (response.title && response.message) {
        const toastData = {
          variant: 'success' as const,
          title: response.title,
          message: response.message,
        };
        console.log('[App.deleteInvoice] Saving toast to localStorage:', toastData);
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      setError(err.message || 'Failed to delete invoice');
    }
  };

  const addLease = async (propertyId: string, residentId: string, lease: Omit<LeaseDocument, 'id'>) => {
    try {
      // Extract file from lease data (if provided)
      const file = (lease as any).file as File | undefined;

      console.log('[App.addLease] Creating lease with file:', file ? file.name : 'none');

      // Call API to create the lease
      const leaseMetadata = {
        documentType: lease.documentType || lease.category || 'original',
        leaseType: lease.leaseType,
        startDate: lease.startDate,
        notes: lease.notes || '',
        monthlyRent: lease.monthlyRent,
        securityDeposit: lease.securityDeposit,
        lateStartDay: lease.lateStartDay,
        lateFeeDailyRate: lease.lateFeeDailyRate,
        electricRate: lease.electricRate,
        unitId: (lease as any).unitId,
      };

      // Upload lease with file (if provided)
      const leaseResponse = await residentService.uploadLease(
        residentId,
        propertyId,
        file, // Pass the file from the form
        leaseMetadata
      );

      // Update local state with the lease from API response
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => {
              if (r.id === residentId) {
                return { ...r, leases: [...r.leases, leaseResponse] };
              }
              return r;
            }),
          };
        }
        return p;
      }));

      // Show success toast if available
      if ((leaseResponse as any)?.title && (leaseResponse as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (leaseResponse as any).title,
          message: (leaseResponse as any).message,
        };
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }

      // Reload properties to ensure sync
      loadProperties();
    } catch (err: any) {
      console.error('Failed to add lease:', err);
      if (err.message) {
        setError(err.message);
      }
    }
  };

  const updateLease = async (propertyId: string, residentId: string, leaseId: string, updatedLease: Omit<LeaseDocument, 'id'>) => {
    try {
      // Extract file from lease data (if provided)
      const file = (updatedLease as any).file as File | undefined;

      console.log('[App.updateLease] Updating lease with file:', file ? file.name : 'none');

      // Call API to update the lease
      const leaseMetadata = {
        documentType: updatedLease.documentType || updatedLease.category || 'original',
        leaseType: updatedLease.leaseType,
        startDate: updatedLease.startDate,
        notes: updatedLease.notes || '',
        monthlyRent: updatedLease.monthlyRent,
        securityDeposit: updatedLease.securityDeposit,
        lateStartDay: updatedLease.lateStartDay,
        lateFeeDailyRate: updatedLease.lateFeeDailyRate,
        electricRate: updatedLease.electricRate,
        unitId: (updatedLease as any).unitId,
      };

      const leaseResponse = await residentService.updateLease(
        residentId,
        leaseId,
        propertyId,
        file, // Pass the file from the form (optional)
        leaseMetadata
      );

      // Update local state with the lease from API response
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => {
              if (r.id === residentId) {
                return {
                  ...r,
                  leases: r.leases.map(l => l.id === leaseId ? leaseResponse : l),
                };
              }
              return r;
            }),
          };
        }
        return p;
      }));

      // Show success toast if available
      if ((leaseResponse as any)?.title && (leaseResponse as any)?.message) {
        const toastData = {
          variant: 'success' as const,
          title: (leaseResponse as any).title,
          message: (leaseResponse as any).message,
        };
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }

      // Reload properties to ensure sync
      loadProperties();
    } catch (err: any) {
      console.error('Failed to update lease:', err);
      if (err.message) {
        setError(err.message);
      }
    }
  };

  const deleteLease = async (propertyId: string, residentId: string, leaseId: string) => {
    try {
      const response = await residentService.deleteLease(residentId, leaseId);

      // Update local state
      setProperties(properties.map(p => {
        if (p.id === propertyId) {
          return {
            ...p,
            residents: p.residents.map(r => {
              if (r.id === residentId) {
                return { ...r, leases: r.leases.filter(l => l.id !== leaseId) };
              }
              return r;
            }),
          };
        }
        return p;
      }));

      // Show success toast with API response message
      const toastData = {
        variant: 'success' as const,
        title: response.title || 'Lease Deleted',
        message: response.message || 'Lease has been successfully deleted.',
      };
      console.log('[App.deleteLease] Saving toast to localStorage:', toastData);
      localStorage.setItem('property_form_toast', JSON.stringify(toastData));
    } catch (err: any) {
      console.error('Failed to delete lease:', err);
      setError(err.message || 'Failed to delete lease');
    }
  };

  const addCost = (propertyId: string, cost: Omit<PropertyCost, 'id'>) => {
    setProperties(properties.map(p => {
      if (p.id === propertyId) {
        const newCost = {
          ...cost,
          id: `cost-${Date.now()}`,
        };
        return { ...p, costs: [...(p.costs || []), newCost] };
      }
      return p;
    }));
  };

  const updateCost = (propertyId: string, costId: string, updatedCost: Omit<PropertyCost, 'id'>) => {
    setProperties(properties.map(p => {
      if (p.id === propertyId) {
        return {
          ...p,
          costs: p.costs.map(c => c.id === costId ? { ...updatedCost, id: costId } : c),
        };
      }
      return p;
    }));
  };

  const deleteCost = (propertyId: string, costId: string) => {
    setProperties(properties.map(p => {
      if (p.id === propertyId) {
        return {
          ...p,
          costs: p.costs.filter(c => c.id !== costId),
        };
      }
      return p;
    }));
  };

  const updateCombinedUtilities = (propertyId: string, utilityIds: string[]) => {
    setProperties(properties.map(p => {
      if (p.id === propertyId) {
        return { ...p, combinedUtilities: utilityIds };
      }
      return p;
    }));
  };

  // Unit Management Handlers
  const addUnit = async (unit: Omit<Unit, 'id'>) => {
    try {
      // Map status from UI format to API format
      const apiStatus = unit.status === 'vacant' ? 'available' : unit.status === 'pending' ? 'maintenance' : 'occupied';

      const apiUnit = await unitService.createUnit({
        propertyId: unit.propertyId,
        unitNumber: unit.number,  // Map frontend 'number' to API 'unitNumber'
        address: unit.address,
        rentAmount: unit.rentAmount,
        securityDeposit: unit.securityDeposit,
        status: apiStatus,
        requirements: unit.requirements,
      });

      console.log('[addUnit] API response:', apiUnit);

      // Map API response back to UI format
      // API returns unitId (consistent with propertyId, residentId, invoiceId, costId, leaseId)
      const unitId = (apiUnit as any).unitId;
      const newUnit: Unit = {
        id: unitId,
        propertyId: apiUnit.propertyId,
        number: (apiUnit as any).unitNumber,  // Map API 'unitNumber' to frontend 'number'
        address: (apiUnit as any).address,
        rentAmount: apiUnit.rentAmount,
        securityDeposit: (apiUnit as any).securityDeposit || 0,
        status: apiUnit.status === 'available' ? 'vacant' : apiUnit.status === 'maintenance' ? 'pending' : 'occupied',
        requirements: apiUnit.requirements,
      };

      setUnits([...units, newUnit]);

      // Return unit with API toast data if available (cast to any to allow extra properties)
      const response = newUnit as any;
      if ((apiUnit as any).title) response.title = (apiUnit as any).title;
      if ((apiUnit as any).message) response.message = (apiUnit as any).message;
      return response;
    } catch (error: any) {
      console.error('[addUnit] Error:', error);
      throw error;
    }
  };

  const updateUnit = async (id: string, updates: Partial<Unit>) => {
    try {
      // Map status from UI format to API format if provided
      const apiStatus = updates.status
        ? (updates.status === 'vacant' ? 'available' : updates.status === 'pending' ? 'maintenance' : 'occupied')
        : undefined;

      const apiUnit = await unitService.updateUnit(id, {
        unitNumber: updates.number,  // Map frontend 'number' to API 'unitNumber'
        address: updates.address,
        rentAmount: updates.rentAmount,
        securityDeposit: updates.securityDeposit,
        status: apiStatus,
        requirements: updates.requirements,
      });

      console.log('[updateUnit] API response:', apiUnit);

      // Map API response back to UI format
      // API returns unitId (consistent with propertyId, residentId, invoiceId, costId, leaseId)
      const unitId = (apiUnit as any).unitId;
      const updatedUnit: Unit = {
        id: unitId,
        propertyId: apiUnit.propertyId,
        number: (apiUnit as any).unitNumber,  // Map API 'unitNumber' to frontend 'number'
        address: (apiUnit as any).address,
        rentAmount: apiUnit.rentAmount,
        securityDeposit: (apiUnit as any).securityDeposit || 0,
        status: apiUnit.status === 'available' ? 'vacant' : apiUnit.status === 'maintenance' ? 'pending' : 'occupied',
        requirements: apiUnit.requirements,
      };

      setUnits(units.map(u => u.id === id ? updatedUnit : u));

      // Return unit with API toast data if available (cast to any to allow extra properties)
      const response = updatedUnit as any;
      if ((apiUnit as any).title) response.title = (apiUnit as any).title;
      if ((apiUnit as any).message) response.message = (apiUnit as any).message;
      return response;
    } catch (error: any) {
      console.error('[updateUnit] Error:', error);
      throw error;
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      await unitService.deleteUnit(id);
      setUnits(units.filter(u => u.id !== id));
      // Also delete related invites
      setInvites(invites.filter(inv => inv.unitId !== id));
    } catch (error: any) {
      console.error('[deleteUnit] Error:', error);
      throw error;
    }
  };

  // Generate invite link (for "Generate Link" button)
  const generateInvite = async (unitId: string) => {
    try {
      console.log('[generateInvite] START - unitId:', unitId);

      // Create the invite to get the invite token
      const createResponse: any = await unitService.createUnitInvite(unitId, {});

      console.log('[generateInvite] Step 1 - Create response:', JSON.stringify(createResponse, null, 2));

      const createData = createResponse.data || createResponse;
      const inviteToken = createData.inviteToken;
      const invite = createData.invite;

      console.log('[generateInvite] Step 2 - inviteToken:', inviteToken);
      console.log('[generateInvite] Step 3 - invite object:', JSON.stringify(invite, null, 2));

      if (!inviteToken || !invite) {
        throw new Error('Invalid API response: missing inviteToken or invite');
      }

      // Build the invite URL from the token
      const inviteUrl = `${window.location.origin}/apply/${inviteToken}`;
      console.log('[generateInvite] Step 4 - Built inviteUrl:', inviteUrl);

      // Update local state with the invite
      const newInvite: UnitInvite = {
        id: invite.id,
        unitId: invite.unitId,
        inviteToken: inviteToken,
        email: invite.email,
        status: invite.status === 'accepted' ? 'completed' : invite.status === 'revoked' ? 'expired' : 'pending',
        sentDate: invite.createdAt || new Date().toISOString(),
        expiresDate: invite.expiresAt,
      };
      setInvites([...invites, newInvite]);
      console.log('[generateInvite] Step 5 - Updated invites state');

      // Find the unit to get its number for the message
      const unit = units.find(u => u.id === unitId);
      const unitNumber = unit?.name || invite.unitId || 'Unknown';
      console.log('[generateInvite] Step 6 - Unit number:', unitNumber);

      // Get message for link generation
      const msg = messages.properties.units.inviteCreated(unitNumber);
      const messageText = `${msg.message || 'Invite link generated'}\n\n${inviteUrl}`;

      console.log('[generateInvite] Step 7 - Link message:', JSON.stringify(msg, null, 2));

      // Copy link to clipboard and show toast
      copyToClipboard(inviteUrl).then(() => {
        const toastData = {
          title: msg.title,
          description: messageText,
          variant: 'success' as const,
        };
        console.log('[generateInvite] Step 8 - Link toast data (copied):', JSON.stringify(toastData, null, 2));
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      }).catch(() => {
        // Failed to copy, but still show the link
        const toastData = {
          title: msg.title,
          description: `${msg.message}\n\nFailed to copy to clipboard. Please copy manually:\n${inviteUrl}`,
          variant: 'warning' as const,
        };
        console.log('[generateInvite] Step 8 - Link toast data (copy failed):', JSON.stringify(toastData, null, 2));
        localStorage.setItem('property_form_toast', JSON.stringify(toastData));
      });

      console.log('[generateInvite] COMPLETE');
    } catch (error: any) {
      console.error('[generateInvite] ERROR CAUGHT:', error);
      console.error('[generateInvite] Error stack:', error.stack);
      const toastData = {
        title: 'Error',
        description: error.message || 'Failed to generate invite link',
        variant: 'error' as const,
      };
      console.log('[generateInvite] Error toast data:', JSON.stringify(toastData, null, 2));
      localStorage.setItem('property_form_toast', JSON.stringify(toastData));
    }
  };

  // Send invite email (for "Send Email" button)
  const sendInvite = async (unitId: string, email: string, firstName?: string) => {
    try {
      console.log('[sendInvite] START - unitId:', unitId, 'email:', email, 'firstName:', firstName);

      // Find the unit and its property to get the property address
      const selectedUnit = units.find(u => u.id === unitId);
      const property = properties.find(p => p.id === selectedUnit?.propertyId);
      const propertyAddress = property ? getPropertyDisplayName(property.address, property.address2) : '';
      const unitNumber = selectedUnit?.name || unitId;

      console.log('[sendInvite] propertyAddress:', propertyAddress);

      // Send the email (API creates invite and sends email in one call)
      const sendResponse: any = await unitService.sendInviteEmail(unitId, {
        email,
        firstName,
        propertyAddress,
        inviteBaseUrl: `${window.location.origin}/apply`,
      });

      console.log('[sendInvite] API response:', JSON.stringify(sendResponse, null, 2));

      // Extract data from wrapped API response
      const messageKey = sendResponse.messageKey;
      const responseData = sendResponse.data || sendResponse;
      const inviteToken = responseData.inviteToken;
      const inviteUrl = responseData.inviteUrl;

      console.log('[sendInvite] messageKey:', messageKey);
      console.log('[sendInvite] inviteToken:', inviteToken);
      console.log('[sendInvite] inviteUrl:', inviteUrl);

      // Update local state with the new invite
      const newInvite: UnitInvite = {
        id: responseData.inviteId || Math.random().toString(36).substr(2, 9),
        unitId: unitId,
        inviteToken: inviteToken,
        email: email,
        status: 'pending',
        sentDate: new Date().toISOString(),
        expiresDate: responseData.expiresAt,
      };
      setInvites([...invites, newInvite]);

      // Get the appropriate message based on messageKey from API
      // messageKey can be:
      // - 'properties.units.invite_sent' (email sent successfully)
      // - 'properties.units.invite_created_email_failed' (invite created but email failed)
      let msg;
      let variant: 'success' | 'warning' = 'success';

      if (messageKey === 'properties.units.invite_created_email_failed') {
        msg = messages.properties.units.inviteCreatedEmailFailed(email, unitNumber);
        variant = 'warning'; // Use warning variant for partial success
      } else {
        // Default to invite_sent message
        msg = messages.properties.units.inviteSent(email, unitNumber);
        variant = 'success';
      }

      const messageText = `${msg.message || 'Invite processed'}\n\n${inviteUrl}`;

      console.log('[sendInvite] Message:', JSON.stringify(msg, null, 2));
      console.log('[sendInvite] messageText with URL:', messageText);

      // Show toast with URL
      const toastData = {
        title: msg.title,
        description: messageText,
        variant: variant,
      };
      console.log('[sendInvite] Toast data:', JSON.stringify(toastData, null, 2));
      localStorage.setItem('property_form_toast', JSON.stringify(toastData));

      console.log('[sendInvite] COMPLETE');
    } catch (error: any) {
      console.error('[sendInvite] ERROR:', error);
      const toastData = {
        title: 'Error',
        description: error.message || 'Failed to send invite email',
        variant: 'error' as const,
      };
      localStorage.setItem('property_form_toast', JSON.stringify(toastData));
    }
  };

  const deleteInvite = (id: string) => {
    setInvites(invites.filter(inv => inv.id !== id));
  };

  // Note: Unit loading has been moved to HomeownerDashboard component to avoid
  // the infinite loop issue. The parent (App) provides initial units via props,
  // and HomeownerDashboard loads fresh units from API when property changes.

  const submitApplication = (applicationData: Omit<ResidentApplication, 'id' | 'inviteToken' | 'unitId'>, inviteToken: string, unitId: string) => {
    const newApplication: ResidentApplication = {
      id: Math.random().toString(36).substr(2, 9),
      inviteToken,
      unitId,
      ...applicationData,
    };
    setApplications([...applications, newApplication]);

    // Update invite status to completed
    setInvites(invites.map(inv =>
      inv.inviteToken === inviteToken ? { ...inv, status: 'completed' } : inv
    ));
  };

  const approveApplication = (applicationId: string) => {
    setApplications(applications.map(app => 
      app.id === applicationId ? { ...app, status: 'approved' } : app
    ));
  };

  const rejectApplication = (applicationId: string) => {
    setApplications(applications.map(app => 
      app.id === applicationId ? { ...app, status: 'rejected' } : app
    ));
  };

  // Route Components
  const ResidentPortalRoute = () => {
    const { token } = useParams<{ token: string }>();

    console.log('[ResidentPortalRoute] Token:', token);
    console.log('[ResidentPortalRoute] Properties count:', properties.length);

    // Find resident by portal token
    let foundResident: Resident | null = null;
    let foundProperty: Property | null = null;

    for (const property of properties) {
      console.log(`[ResidentPortalRoute] Checking property: ${property.name}, residents:`, property.residents.length);
      const resident = property.residents.find(r => {
        console.log(`[ResidentPortalRoute] Checking resident: ${r.name}, portalToken: ${r.portalToken}`);
        return r.portalToken === token;
      });
      if (resident) {
        foundResident = resident;
        foundProperty = property;
        console.log('[ResidentPortalRoute] Found matching resident:', resident.name);
        break;
      }
    }

    if (!foundResident || !foundProperty) {
      console.log('[ResidentPortalRoute] No matching resident found!');
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Invalid Portal Link</Alert.Heading>
            <p>The resident portal link you're trying to access is invalid or has expired.</p>
            <p className="mt-2 small text-muted">Debug: Token = {token}, Properties = {properties.length}</p>
          </Alert>
        </Container>
      );
    }

    return (
      <ResidentPortal
        resident={foundResident}
        property={foundProperty}
        onLogout={() => handleLogout('/resident/sign-in')}
      />
    );
  };

  const ResidentApplicationRoute = () => {
    const { token } = useParams<{ token: string }>();

    // Find invite by token
    const invite = invites.find(inv => inv.inviteToken === token);

    if (!invite) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Invalid Application Link</Alert.Heading>
            <p>The application link you're trying to access is invalid or has expired.</p>
          </Alert>
        </Container>
      );
    }

    if (invite.status === 'completed') {
      return (
        <Container className="mt-5">
          <Alert variant="info">
            <Alert.Heading>Application Already Submitted</Alert.Heading>
            <p>This application has already been completed. Thank you for your submission!</p>
          </Alert>
        </Container>
      );
    }

    // Find unit
    const unit = units.find(u => u.id === invite.unitId);

    if (!unit) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Unit Not Found</Alert.Heading>
            <p>The unit associated with this application could not be found.</p>
          </Alert>
        </Container>
      );
    }

    // Find property
    const property = properties.find(p => p.id === unit.propertyId);

    return (
      <ResidentApplication
        inviteToken={token!}
        unit={unit}
        propertyName={property?.name || 'Property'}
        onSubmitApplication={(appData) => {
          submitApplication(appData, token!, unit.id);
          // Show success message
          alert('Application submitted successfully! The property owner will review your application soon.');
        }}
      />
    );
  };

  const ApplicationDetailsRoute = () => {
    return (
      <ApplicationDetails
        applications={applications}
        units={units}
        properties={properties}
        onApprove={approveApplication}
        onReject={rejectApplication}
      />
    );
  };

  const PublicInvoiceRoute = () => {
    const { shareToken } = useParams<{ shareToken: string }>();
    const [invoiceData, setInvoiceData] = useState<{ invoice: Invoice; resident: Resident; property: Property } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchPublicInvoice = async () => {
        if (!shareToken) {
          setError('No share token provided');
          setLoading(false);
          return;
        }

        try {
          console.log('[PublicInvoiceRoute] Fetching invoice for shareToken:', shareToken);

          // First try to find in local state (if homeowner is logged in)
          for (const property of properties) {
            for (const resident of property.residents) {
              const invoice = resident.invoices.find(inv => inv.shareToken === shareToken);
              if (invoice) {
                console.log('[PublicInvoiceRoute] Found invoice in local state');
                setInvoiceData({ invoice, resident, property });
                setLoading(false);
                return;
              }
            }
          }

          // If not found in local state, fetch from API
          console.log('[PublicInvoiceRoute] Not in local state, fetching from API...');
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_BASE_URL}/api/invoices/shared/${shareToken}`);

          if (!response.ok) {
            throw new Error('Invoice not found');
          }

          const result = await response.json();
          console.log('[PublicInvoiceRoute] Fetched from API:', result);

          // Extract data from standardized API response
          if (result.status === 'success' && result.data) {
            setInvoiceData(result.data);
          } else {
            throw new Error(result.message || 'Failed to load invoice');
          }
          setLoading(false);
        } catch (err) {
          console.error('[PublicInvoiceRoute] Error fetching invoice:', err);
          setError(err instanceof Error ? err.message : 'Failed to load invoice');
          setLoading(false);
        }
      };

      fetchPublicInvoice();
    }, [shareToken]);

    if (loading) {
      return (
        <Container className="mt-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading invoice...</p>
        </Container>
      );
    }

    if (error || !invoiceData) {
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Invoice Not Found</Alert.Heading>
            <p>The invoice you're trying to access could not be found or the link has expired.</p>
            {error && <p className="mt-2 small text-muted">Error: {error}</p>}
          </Alert>
        </Container>
      );
    }

    return (
      <InvoiceView
        resident={invoiceData.resident}
        invoice={invoiceData.invoice}
        property={invoiceData.property}
        onClose={() => window.location.href = '/'}
        onUpdateInvoice={() => {}}
        onEditResident={() => {}}
        isPublicView={true}
      />
    );
  };

  // Protected Route Wrapper - checks portal-specific authentication
  const ProtectedRoute = ({ children, portal = 'resident' }: { children: JSX.Element; portal?: 'homeowner' | 'resident' }) => {
    // Check if user is authenticated for this specific portal
    const isAuthForPortal = isAuthenticatedFor(portal);

    if (!isAuthForPortal) {
      const redirectPath = portal === 'homeowner' ? '/homeowner/sign-in' : '/resident/sign-in';
      return <Navigate to={redirectPath} replace />;
    }

    // Set the current portal context when accessing protected routes
    setCurrentPortal(portal);

    return children;
  };

  // Render homeowner dashboard content - inline to avoid component remounting issues
  // Note: We removed onPropertyChange to prevent the infinite loop. Units are now loaded
  // in HomeownerDashboard directly using the unitService.
  const renderHomeownerDashboard = () => (
    <HomeownerDashboard
      properties={properties}
      units={units}
      invites={invites}
      applications={applications}
      isLoading={isLoading}
      isSessionExpiring={isSessionExpiring}
      onLogout={() => handleLogout('/homeowner/sign-in')}
      onAddProperty={addProperty}
      onUpdateProperty={updateProperty}
      onDeleteProperty={deleteProperty}
      onAddResident={addResident}
      onUpdateResident={updateResident}
      onDeleteResident={deleteResident}
      onAddInvoice={addInvoice}
      onUpdateInvoice={updateInvoice}
      onDeleteInvoice={deleteInvoice}
      onAddLease={addLease}
      onUpdateLease={updateLease}
      onDeleteLease={deleteLease}
      onAddCost={addCost}
      dateRangeFilter={dateRangeFilter}
      onDateRangeChange={(type, start, end) => {
        setDateRangeType(type);
        setCustomStartDate(start || '');
        setCustomEndDate(end || '');
      }}
      onUpdateCost={updateCost}
      onDeleteCost={deleteCost}
      onUpdateCombinedUtilities={updateCombinedUtilities}
      onAddUnit={addUnit}
      onUpdateUnit={updateUnit}
      onDeleteUnit={deleteUnit}
      onGenerateInvite={generateInvite}
      onSendInvite={sendInvite}
      onDeleteInvite={deleteInvite}
      welcomeToastData={welcomeToastData}
      onCloseWelcomeToast={() => setWelcomeToastData(null)}
    />
  );

  // Render homeowner settings content with URL params
  const HomeownerSettingsRoute = () => {
    const { settingsTab } = useParams<{ settingsTab?: string }>();
    const navigate = useNavigate();
    const initialTab = isValidSettingsTab(settingsTab) ? settingsTab : 'profile';

    const accountMenuItems = useMemo(() => [
      {
        label: 'Profile',
        icon: <User size={16} />,
        onClick: () => navigate('/homeowner/profile-and-settings/profile'),
      },
      {
        label: 'Password',
        icon: <Lock size={16} />,
        onClick: () => navigate('/homeowner/profile-and-settings/password'),
      },
      {
        label: 'Payment Info',
        icon: <CreditCard size={16} />,
        onClick: () => navigate('/homeowner/profile-and-settings/payment'),
      },
      {
        label: 'Reminders',
        icon: <Bell size={16} />,
        onClick: () => navigate('/homeowner/profile-and-settings/reminders'),
      },
      {
        label: 'Delete Account',
        icon: <Trash2 size={16} />,
        onClick: () => {
          // This will be handled in the settings component itself
          // For now, navigate back to dashboard which has the delete modal
          navigate('/homeowner/dashboard');
        },
        dividerBefore: true,
        variant: 'danger' as const,
      },
    ], [navigate]);

    return (
      <HomeownerSettings
        onBack={() => navigate('/homeowner/dashboard')}
        initialTab={initialTab}
        onTabChange={(tab) => navigate(`/homeowner/profile-and-settings/${tab}`)}
        accountMenuItems={accountMenuItems}
        onLogout={handleLogout}
      />
    );
  };

  return (
    <>
      {/* Idle Timeout Warning Modal */}
      <IdleTimeoutModal
        show={isWarning}
        initialSeconds={warningSeconds}
        onStayLoggedIn={() => {
          // Clear the warning state so it can fire again next time
          clearWarning();
        }}
        onSignOut={handleIdleLogout}
        onTimeout={handleIdleLogout}
      />
      <BrowserRouter>
        <ScrollRestorationWrapper />
        <ClearToastsOnNavigation />
        <a href="#main-content" className="visually-hidden-focusable skip-link">
          Skip to main content
        </a>
        {/* <TestingNav /> */}
        <Routes>
        {/* Default Route - Redirect to Resident Portal */}
        <Route path="/" element={<Navigate to="/resident/sign-in" replace />} />

        {/* Resident Authentication Routes */}
        <Route path="/resident/sign-in" element={<ResidentSignIn />} />
        <Route path="/resident/sign-up" element={<ResidentSignUp />} />
        <Route path="/resident/forgot-password" element={<ResidentForgotPassword />} />

        {/* Resident Dashboard - placeholder for now */}
        <Route path="/resident/dashboard" element={
          <div className="container py-5 text-center">
            <h2>Resident Dashboard</h2>
            <p className="text-muted">Access your portal using the link provided by your property manager.</p>
          </div>
        } />

        {/* Owner Authentication Routes */}
        <Route path="/homeowner" element={<Navigate to="/homeowner/dashboard" replace />} />
        <Route path="/homeowner/sign-in" element={isAuthenticatedFor('homeowner') ? <Navigate to="/homeowner/dashboard" replace /> : <HomeownerSignIn />} />
        <Route path="/homeowner/sign-up" element={isAuthenticatedFor('homeowner') ? <Navigate to="/homeowner/dashboard" replace /> : <HomeownerSignUp />} />
        <Route path="/homeowner/forgot-password" element={isAuthenticatedFor('homeowner') ? <Navigate to="/homeowner/dashboard" replace /> : <HomeownerForgotPassword />} />

        {/* Protected Owner Routes - Dashboard */}
        <Route path="/homeowner/dashboard" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/dashboard/:tab" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/add/:propertyTab" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/profile-and-settings" element={<ProtectedRoute portal="homeowner"><Navigate to="/homeowner/profile-and-settings/profile" replace /></ProtectedRoute>} />
        <Route path="/homeowner/profile-and-settings/:settingsTab" element={<ProtectedRoute portal="homeowner"><HomeownerSettingsRoute /></ProtectedRoute>} />
        <Route path="/homeowner/properties" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/dashboard" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/edit" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/invoices/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/invoices/:invoiceId/edit" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/invoices/:invoiceId/view" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/invoices/:invoiceId" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/invoice/:invoiceId" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/leases/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/leases/:leaseId/edit" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId/:detailTab" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/residents/:residentId" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/applications" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/settings" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/properties/:propertySlug/settings/:propertyTab" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/edit" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/invoices/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/invoices/:invoiceId/edit" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/invoices/:invoiceId/view" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/invoices/:invoiceId" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/invoice/:invoiceId" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/leases/add" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/leases/:leaseId/edit" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId/:detailTab" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />
        <Route path="/homeowner/residents/:residentId" element={<ProtectedRoute portal="homeowner">{renderHomeownerDashboard()}</ProtectedRoute>} />

        {/* Protected Application Details Route */}
        <Route path="/application/:applicationId" element={<ProtectedRoute portal="homeowner"><ApplicationDetailsRoute /></ProtectedRoute>} />

        {/* Public Routes */}
        <Route path="/portal/:token" element={<ResidentPortalRoute />} />
        <Route path="/portal/:token/history" element={<ResidentPortalRoute />} />
        <Route path="/apply/:token" element={<ResidentApplicationRoute />} />
        <Route path="/i/:shareToken" element={<PublicInvoiceRoute />} />
        <Route path="/invoice/:shareToken" element={<PublicInvoiceRoute />} />
        <Route path="/share/:shareToken" element={<PublicInvoiceRoute />} />
        <Route path="/shared/invoice/:shareToken" element={<PublicInvoiceRoute />} />

        {/* Legal & Info Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* Design System (Development Only) */}
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="/dev" element={<TempDevPage />} />
      </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;