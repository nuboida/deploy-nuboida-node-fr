/**
 * API Type Definitions
 *
 * TypeScript types matching the backend API responses.
 * These types align with the Appwrite collections defined in the backend.
 */

/**
 * Authentication Types
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export type UserRole = 'homeowner' | 'resident';

export interface LoginResponse {
  token: string;
  sessionId: string;
  userId: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

/**
 * User Preferences - persisted across devices
 */
export interface UserPreferences {
  lastSelectedPropertyId?: string;
}

/**
 * Property Types
 */
export interface Property {
  id: string;
  name: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  costs?: PropertyCost[];
  residents?: Resident[];
  units?: Unit[];
  createdAt?: string;
  updatedAt?: string;
}

export type CostType = 'fixed' | 'variable';
export type CostFrequency = 'monthly' | 'quarterly' | 'annually';

export interface PropertyCost {
  id: string;
  name: string;
  amount: number;
  type: CostType;
  frequency: CostFrequency;
  enabled: boolean;
  category?: string[];  // Category array for API
  categories?: string[];  // Alias for backward compatibility
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyCostCreateRequest {
  name: string;
  amount: number;
  type: CostType;
  frequency: CostFrequency;
  enabled: boolean;
  category?: string[];  // Category array for API
}

export interface PropertyCostUpdateRequest extends Partial<PropertyCostCreateRequest> {}

export interface PropertyCreateRequest {
  address: string;  // Only address is required per API
  address2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface PropertyUpdateRequest extends Partial<PropertyCreateRequest> {}

/**
 * Payment Info Types
 */
export interface PaymentInfo {
  id: string;
  propertyId: string;
  zelleEmail?: string;
  zellePhone?: string;
  otherInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Utility/Operating Costs Types
 */
export interface UtilityRecord {
  id: string;
  propertyId: string;
  month: number;
  year: number;
  mortgage?: number;
  gas?: number;
  electric?: number;
  water?: number;
  heat?: number;
  insurance?: number;
  customCosts?: Array<{
    name: string;
    amount: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Bonus Pool Types
 */
export interface BonusPool {
  id: string;
  propertyId: string;
  month: number;
  year: number;
  totalAmount: number;
  tenantShares: Array<{
    residentId: string;
    residentName: string;
    percentage: number;
    shareAmount: number;
  }>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Reminder Types
 */
export interface Reminder {
  id: string;
  propertyId: string;
  type: 'electric_meter' | 'invoice_due' | 'late_fee';
  daysBefore: number;
  enabled: boolean;
  customMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Analytics Types
 */
export interface ProfitAnalytics {
  propertyId: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeBreakdown: {
    rent: number;
    lateFees: number;
    electricCharges: number;
  };
  expenseBreakdown: {
    mortgage?: number;
    utilities?: number;
    insurance?: number;
    maintenance?: number;
    other?: number;
  };
  monthlyData?: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
}

/**
 * Resident/Tenant Types
 */
export interface Occupant {
  name: string;
  relationship?: string;
}

export interface Resident {
  $id: string;
  propertyId: string;
  // Primary contact (automatically formatted from occupants)
  name: string;
  email?: string;
  phone?: string;
  // Address details
  streetAddress?: string;
  aptNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Occupants
  occupants?: Occupant[];
  // Rent configuration
  currentRent?: number;
  lateStartDay?: number;
  lateFeeDailyRate?: number;
  electricRate?: number;
  // Portal access
  portalToken?: string;
  // Dashboard preferences
  dashboardPreferences?: {
    hideLateFees?: boolean;
    hideElectricUsage?: boolean;
  };
  // Relations
  invoices?: Invoice[];
  leases?: LeaseDocument[];
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface ResidentCreateRequest {
  propertyId: string;
  name: string;
  streetAddress?: string;
  aptNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ResidentUpdateRequest {
  name?: string;
  address?: string;
  unitNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/**
 * Deposit Types
 */
export interface Deposit {
  id: string;
  residentId: string;
  baseAmount: number;
  currentValue: number;
  lastAdjustmentDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Lease Document Types
 */
export interface LeaseDocument {
  id: string;
  residentId: string; // Changed from renterId
  documentType?: string; // Deprecated - use category instead
  category?: 'original' | 'renewal'; // Backend returns this field
  leaseType: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  lateStartDay?: number;
  lateFeeDailyRate?: number;
  electricRate?: number;
  gracePeriodDays?: number;
  fileId?: string; // Optional - empty if no PDF uploaded
  fileUrl?: string; // Optional - empty if no PDF uploaded
  notes?: string;
  $createdAt?: string; // Use this instead of uploadDate
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaseUploadRequest {
  documentType: string;
  leaseType: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  unitId?: string; // Selected unit ID
  // Rent details (now included in lease upload per API update)
  monthlyRent: number;
  lateStartDay: number;
  lateFeeDailyRate?: number; // Only daily rate, no flat lateFeeAmount
  electricRate: number;
}

/**
 * Invoice Types
 */
export interface Invoice {
  id: string;
  residentId: string;
  propertyId: string;
  month: number;
  year: number;
  date: string;
  // Balance calculations
  lastMonthBalance: number;
  currentRent: number;
  // Late fees
  daysLate: number;
  lateFeeDailyRate: number;
  lateStartDay?: number; // Day of month when late fees start (captured from lease)
  lateFeeAmount?: number;
  prevMonthLastPaymentDate?: string; // Date of last payment from previous month (YYYY-MM-DD)
  // Electric charges
  previousMonthElectricUsageKwh?: number;
  electricRate?: number;
  electricCharge?: number;
  electricMeterSnapshot?: string;
  electricMeterSnapshotId?: string; // File ID in Appwrite Storage
  // Adjustment fields (+ to add/debit, - to subtract/credit)
  prevMonthBalanceAdjustment?: number;
  prevMonthLateFeeAdjustment?: number;
  prevMonthElectricAdjustment?: number;
  // Payment status
  isPaid: boolean;
  paidDate?: string;
  // Public sharing
  shareToken?: string;
  // Relations
  receipts?: Receipt[];
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceCreateRequest {
  residentId: string;
  propertyId: string;
  month: number;
  year: number;
  previousMonthBalance?: number;
  currentRent?: number;
  dailyLateRate?: number;
  lateStartDay?: number; // Day of month when late fees start (captured from lease)
  previousMonthElectricUsageKwh?: number;
  electricRate?: number;
  electricMeterSnapshot?: string;
  prevMonthLastPaymentDate?: string; // Date of last payment from previous month (YYYY-MM-DD)
  // Adjustment fields (+ to add/debit, - to subtract/credit)
  prevMonthBalanceAdjustment?: number;
  prevMonthLateFeeAdjustment?: number;
  prevMonthElectricAdjustment?: number;
}

export interface InvoiceUpdateRequest extends Partial<Omit<InvoiceCreateRequest, 'residentId' | 'propertyId'>> {
  isPaid?: boolean;
  paidDate?: string;
}

/**
 * Receipt Types
 */
export interface Receipt {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptCreateRequest {
  invoiceId: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

/**
 * Unit Types
 */
export interface Unit {
  unitId: string; // API returns unitId (consistent with propertyId, residentId, invoiceId, costId, leaseId)
  propertyId: string;
  number: string; // API uses 'number' instead of 'unitNumber'
  address?: string; // API uses 'address' instead of 'unitAddress'
  rentAmount: number;
  status: 'available' | 'occupied' | 'maintenance';
  requirements?: {
    payStubsWeeks?: number;
    bankStatementsMonths?: number;
    minimumCreditScore?: number;
    minimumIncome?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitCreateRequest {
  propertyId: string;
  number: string; // API uses 'number' instead of 'unitNumber'
  address?: string; // API uses 'address' instead of 'unitAddress'
  rentAmount: number;
  status?: 'available' | 'occupied' | 'maintenance';
  requirements?: Unit['requirements'];
}

export interface UnitUpdateRequest extends Partial<Omit<UnitCreateRequest, 'propertyId'>> {}

/**
 * Unit Invite Types
 */
export interface UnitInvite {
  id: string;
  unitId: string;
  inviteToken: string;
  email?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitInviteCreateRequest {
  unitId: string;
  email?: string;
  expiresAt?: string;
}

/**
 * Tenant Application Types
 */
export interface TenantApplication {
  id: string;
  unitId: string;
  inviteToken: string;
  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentAddress: string;
  // Employment
  employer?: string;
  position?: string;
  monthlyIncome?: number;
  // Documents
  payStubs?: string[];
  bankStatements?: string[];
  creditReport?: string;
  otherDocuments?: string[];
  // Owner references
  previousOwner?: {
    name: string;
    phone: string;
    email?: string;
  };
  // Calculated values
  incomeToRentRatio?: number;
  // Status
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  // Timestamps
  submittedAt?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantApplicationSubmitRequest {
  inviteToken: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentAddress: string;
  employer?: string;
  position?: string;
  monthlyIncome?: number;
  previousOwner?: TenantApplication['previousOwner'];
}

/**
 * Tenant Portal Types
 */
export interface TenantPortalData {
  property: Property;
  resident: Resident;
  latestInvoice?: Invoice;
  paymentInfo?: PaymentInfo;
  deposit?: Deposit;
  bonusShare?: {
    poolId: string;
    month: number;
    year: number;
    totalPool: number;
    yourShare: number;
    percentage: number;
  };
  receipts?: Receipt[];
  leases?: LeaseDocument[];
}

/**
 * Public Invoice Share Types
 */
export interface PublicInvoiceData {
  invoice: Invoice;
  resident: Resident;
  property: Property;
}
