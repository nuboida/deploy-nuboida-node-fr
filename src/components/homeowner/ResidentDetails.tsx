import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Plus, FileText, File, Trash2, Copy, Check, DollarSign, Zap, Calendar, User, Edit2, X as XIcon, Eye, Layout } from 'lucide-react';
import { Row, Col, Form, Button, Dropdown, Modal, Card } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Property, Resident, Invoice, LeaseDocument, Occupant } from '../../App';
import { InvoiceForm } from './InvoiceForm';
import { copyToClipboard } from '../../utils/clipboard';
import { PageHeader, BreadcrumbItem, PropertyOption, AccountMenuItem } from '../common/PageHeader';
import { getPropertyDisplayName, formatDateLocal, parseDateLocal } from '../../utils/slug';
import { TabNavigation } from '../common/TabNavigation';
import { StatCard } from '../common/StatCard';
import { AppToast } from '../common/AppToast';
import { PdfPreview } from '../common/PdfPreview';
import { PORTAL_LABELS } from '../../config/labels';

type ResidentDetailsProps = {
  resident: Resident;
  property: Property;
  allResidents?: Resident[];
  allProperties?: Property[];
  units?: Array<{ unitId: string; number: string; rentAmount: number; status: string }>;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onResidentSelect?: (residentId: string) => void;
  onPropertySelect?: (propertyId: string) => void;
  onPropertySettings?: (propertyId: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onAddInvoice: (invoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => void;
  onUpdateInvoice: (invoiceId: string, invoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onDeleteLease: (leaseId: string) => void;
  onEditResident?: (editTab?: string) => void;
  onUpdateResident?: (residentData: Partial<Resident>) => void;
  onNavigateToProperty?: () => void;
  onLogout?: () => void;
  accountMenuItems?: AccountMenuItem[];
};

type DateRangeType = 'ytd' | '1y' | '2y' | '3y' | 'custom';

export function ResidentDetails({
  resident,
  property,
  allResidents = [],
  allProperties = [],
  units = [],
  onClose,
  onEdit,
  onDelete,
  onResidentSelect,
  onPropertySelect,
  onPropertySettings,
  onViewInvoice,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onDeleteLease,
  onUpdateResident,
  onNavigateToProperty,
  onLogout,
  accountMenuItems,
}: ResidentDetailsProps) {
  const { detailTab, propertySlug, residentId: residentIdFromUrl } = useParams<{ detailTab?: string; propertySlug?: string; residentId?: string }>();
  const navigate = useNavigate();

  // For backwards compatibility, also check for renterId (old param name)
  const renterId = residentIdFromUrl;

  // Format full property address
  const getFullAddress = (prop: Property) => {
    const parts = [prop.address, prop.city, prop.state, prop.zipCode].filter(Boolean);
    return parts.join(', ');
  };

  // Derive active tab from URL (default to 'dashboard' if no detailTab param)
  const activeTab = (detailTab === 'occupants' || detailTab === 'invoices' || detailTab === 'leases')
    ? detailTab
    : 'dashboard';

  // Helper to get the base URL for navigation
  const getBaseUrl = () => {
    if (propertySlug) {
      return `/homeowner/properties/${propertySlug}/residents/${renterId || resident.id}`;
    }
    return `/homeowner/residents/${renterId || resident.id}`;
  };

  // Helper to generate lease slug (e.g., "2025-yearly-original")
  const getLeaseSlug = (lease: LeaseDocument): string => {
    const startDate = parseDateLocal(lease.startDate);
    const year = startDate ? startDate.getFullYear() : new Date().getFullYear();
    const type = lease.leaseType === 'yearly' ? 'yearly' : 'monthly';
    const category = (lease.category || lease.documentType || 'original').toLowerCase();
    return `${year}-${type}-${category}`;
  };

  // Helper to calculate end date for yearly leases (start date + 1 year - 1 day)
  const calculateLeaseEndDate = (lease: LeaseDocument): Date | null => {
    if (lease.leaseType === 'month-to-month') {
      return null; // Month-to-month has no end date
    }

    // For yearly leases: startDate + 1 year - 1 day
    // Use parseDateLocal to avoid timezone shifts
    const startDate = parseDateLocal(lease.startDate);
    if (!startDate) return null;

    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setDate(endDate.getDate() - 1);
    return endDate;
  };

  // Helper to determine if a lease is active (current date falls within its date range)
  const isLeaseActive = (lease: LeaseDocument): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const startDate = parseDateLocal(lease.startDate);
    if (!startDate) return false;
    startDate.setHours(0, 0, 0, 0);

    // Lease hasn't started yet
    if (today < startDate) return false;

    // Month-to-month leases have no end date and are active if started
    if (!lease.endDate) return true;

    const endDate = parseDateLocal(lease.endDate);
    if (!endDate) return true;
    endDate.setHours(0, 0, 0, 0);

    // Check if today is within the lease period (inclusive)
    return today >= startDate && today <= endDate;
  };

  // Find the active lease (should only be one)
  const activeLease = resident.leases?.find(lease => isLeaseActive(lease));

  // Get the most recent invoice (for carrying over balance to new invoices)
  const getMostRecentInvoice = () => {
    if (!resident.invoices || resident.invoices.length === 0) return null;
    // Sort by month (most recent first) - month format is "Month Year" e.g. "December 2024"
    const sortedInvoices = [...resident.invoices].sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
    return sortedInvoices[0];
  };

  const previousInvoice = getMostRecentInvoice();

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [showDeleteLeaseModal, setShowDeleteLeaseModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [leaseToDelete, setLeaseToDelete] = useState<LeaseDocument | null>(null);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [residentDropdownOpen, setResidentDropdownOpen] = useState(false);
  
  // Helper function to parse name
  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  // Helper function to get occupants from resident
  const getOccupantsFromResident = (resident: Resident) => {
    if (resident.occupants && resident.occupants.length > 0) {
      return resident.occupants;
    }
    // Convert legacy data to occupants array
    return [{
      id: 'occupant-1',
      ...parseName(resident.name),
      email: resident.email,
      phone: resident.phone,
    }];
  };

  // Helper to format resident name for display
  const getResidentDisplayName = (resident: Resident) => {
    const occupants = getOccupantsFromResident(resident);
    return formatOccupantsNames(occupants);
  };

  // Format occupants names for display (e.g., "John Smith and Jane Doe" or "John Smith, Jane Doe and Bob Johnson")
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Layout },
    { id: 'occupants', label: 'Occupants', icon: User },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'leases', label: 'Leases', icon: File },
  ];

  const formatOccupantsNames = (occupants: Occupant[]) => {
    const names = occupants.map(occ => `${occ.firstName} ${occ.lastName}`.trim()).filter(name => name);

    if (names.length === 0) return 'No occupants';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;

    // 3 or more: "John Smith, Jane Doe and Bob Johnson"
    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast} and ${names[names.length - 1]}`;
  };

  // Helper to validate phone number (must be exactly 10 digits)
  const isValidPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  // Helper to validate email
  const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    // Basic email validation - must have @ and a domain with at least one dot
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form data for editing - now using occupants
  const [occupants, setOccupants] = useState(getOccupantsFromResident(resident));

  // Track which occupant fields have been touched (modified by user)
  const [touchedFields, setTouchedFields] = useState<Record<string, Set<string>>>({});

  const [rentDetailsFormData, setRentDetailsFormData] = useState({
    aptNumber: resident.aptNumber || '',
    lateStartDay: resident.lateStartDay || 5,
    lateFeeDailyRate: resident.lateFeeDailyRate || 5.00,
    electricRate: resident.electricRate || 0.12,
    currentRent: resident.currentRent || 0,
  });

  // Toast state for showing API messages
  const [toast, setToast] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>({
    show: false,
    variant: 'success',
    title: '',
    message: '',
  });

  // Check for toast in localStorage when component mounts or resident changes
  useEffect(() => {
    console.log('[ResidentDetails] Checking for toast (resident changed)');
    const stored = localStorage.getItem('property_form_toast');
    console.log('[ResidentDetails] localStorage.property_form_toast:', stored);

    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('[ResidentDetails] ✅ Found toast in localStorage:', data);
        setToast({ show: true, ...data });
        // Note: Don't clear from localStorage here - let the toast onClose handler do it
        // This way if user navigates away before closing the toast, it will still be available
      } catch (err) {
        console.error('[ResidentDetails] ❌ Failed to parse toast data:', err);
      }
    } else {
      console.log('[ResidentDetails] No toast found in localStorage');
    }
  }, [resident]); // Re-check when resident object changes (after updates via loadProperties)

  // Sync occupants state when resident prop changes (after API updates)
  useEffect(() => {
    setOccupants(getOccupantsFromResident(resident));
    setTouchedFields({}); // Reset touched fields when resident changes
  }, [resident]);

  // Sync rent details state when resident prop changes (after API updates)
  useEffect(() => {
    setRentDetailsFormData({
      lateStartDay: resident.lateStartDay || 5,
      lateFeeDailyRate: resident.lateFeeDailyRate || 5.00,
      electricRate: resident.electricRate || 0.12,
      currentRent: resident.currentRent || 0,
    });
  }, [resident]);

  // Local date range state (independent from dashboard)
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('ytd');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const calculateInvoiceTotal = (invoice: Invoice) => {
    // Apply adjustments to each component
    const adjustedBalance = (invoice.lastMonthBalance || 0) + (invoice.prevMonthBalanceAdjustment ?? 0);
    const baseLateFees = (invoice.daysLate || 0) * (invoice.lateFeeDailyRate || 0);
    const adjustedLateFees = baseLateFees + (invoice.prevMonthLateFeeAdjustment ?? 0);
    const baseElectricCharges = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
    const adjustedElectricCharges = baseElectricCharges + (invoice.prevMonthElectricAdjustment ?? 0);

    return adjustedBalance + (invoice.currentRent || 0) + adjustedLateFees + adjustedElectricCharges;
  };

  // Format invoice month to "Month 1st, Year" format
  const formatInvoiceMonth = (monthStr: string) => {
    // monthStr is in format "December 2025"
    const [month, year] = monthStr.split(' ');
    return `${month} 1st, ${year}`;
  };

  // Generate invoice number in format: #<houseNumber><streetInitial><unitNumber><MMDDYY>
  // Example: #101MS120125 (101 Main St, Unit 1, December 01, 2025)
  const generateInvoiceNumber = (invoice: Invoice) => {
    // Extract house number from property address (e.g., "101" from "101 Main St")
    const addressParts = property.address.split(' ');
    const houseNumber = addressParts[0] || '';

    // Extract first letter of street name (e.g., "M" from "Main St")
    const streetName = addressParts[1] || '';
    const streetInitial = streetName.charAt(0).toUpperCase();

    // Get unit number from resident (default to empty string if no unit)
    const unitNumber = resident.aptNumber || resident.unit || '';

    // Parse invoice date to get MMDDYY
    const invoiceDate = new Date(invoice.date);
    const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
    const day = '01'; // Always 1st of the month
    const year = String(invoiceDate.getFullYear()).slice(-2);

    return `#${houseNumber}${streetInitial}${unitNumber}${month}${day}${year}`;
  };

  const handleInvoiceSubmit = (invoiceData: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => {
    if (editingInvoice) {
      onUpdateInvoice(editingInvoice.id, invoiceData, meterSnapshotFile);
      setEditingInvoice(null);
    } else {
      onAddInvoice(invoiceData, meterSnapshotFile);
    }
    setShowInvoiceForm(false);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteInvoiceModal(true);
  };

  const confirmDeleteInvoice = () => {
    if (invoiceToDelete) {
      onDeleteInvoice(invoiceToDelete.id);
      setShowDeleteInvoiceModal(false);
      setInvoiceToDelete(null);
    }
  };

  const handleDeleteLease = (lease: LeaseDocument) => {
    setLeaseToDelete(lease);
    setShowDeleteLeaseModal(true);
  };

  const confirmDeleteLease = () => {
    if (leaseToDelete) {
      onDeleteLease(leaseToDelete.id);
      setShowDeleteLeaseModal(false);
      setLeaseToDelete(null);
    }
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    onUpdateInvoice(invoice.id, {
      ...invoice,
      isPaid: true,
      paidDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleOccupantsSave = () => {
    if (onUpdateResident) {
      const primaryOccupant = occupants[0];

      // Validate primary occupant email
      if (!isValidEmail(primaryOccupant.email)) {
        setToast({
          show: true,
          variant: 'error',
          title: 'Invalid Email',
          message: 'Primary occupant email must be a valid email address',
        });
        return;
      }

      // Validate primary occupant phone number
      if (!isValidPhone(primaryOccupant.phone)) {
        setToast({
          show: true,
          variant: 'error',
          title: 'Invalid Phone Number',
          message: 'Primary occupant phone number must be 10 digits',
        });
        return;
      }

      const fullName = `${primaryOccupant.firstName} ${primaryOccupant.lastName}`.trim();

      onUpdateResident({
        name: fullName,
        email: primaryOccupant.email,
        phone: primaryOccupant.phone,
        occupants: occupants,
      });
    }
  };

  // Phone number formatting
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Format based on number of digits
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handleOccupantChange = (id: string, field: string, value: string) => {
    // Format phone numbers as user types
    const formattedValue = field === 'phone' ? formatPhoneNumber(value) : value;

    // Mark field as touched
    setTouchedFields(prev => {
      const occupantTouched = prev[id] || new Set<string>();
      occupantTouched.add(field);
      return { ...prev, [id]: occupantTouched };
    });

    setOccupants(prev => prev.map(occ =>
      occ.id === id ? { ...occ, [field]: formattedValue } : occ
    ));
  };

  // Helper to check if a field has been touched
  const isFieldTouched = (occupantId: string, field: string): boolean => {
    return touchedFields[occupantId]?.has(field) || false;
  };

  const addOccupant = () => {
    const newOccupant = {
      id: `occupant-${Date.now()}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    };
    setOccupants(prev => [...prev, newOccupant]);
  };

  const removeOccupant = (id: string) => {
    if (occupants.length > 1) {
      setOccupants(prev => prev.filter(occ => occ.id !== id));
    }
  };

  const handleRentDetailsSave = () => {
    if (onUpdateResident) {
      onUpdateResident(rentDetailsFormData);
    }
  };

  const getPortalLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/portal/${resident.portalToken}`;
  };

  const copyPortalLink = async () => {
    const link = getPortalLink();
    
    try {
      await copyToClipboard(link);
      setCopiedPortalLink(true);
      setTimeout(() => setCopiedPortalLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopiedPortalLink(true);
      setTimeout(() => setCopiedPortalLink(false), 2000);
    }
  };

  // Calculate local date range
  const getLocalDateRange = () => {
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

    return { startDate, endDate };
  };

  const localDateRange = getLocalDateRange();

  const isInvoiceInDateRange = (invoice: Invoice) => {
    const invoiceDate = new Date(invoice.date);
    return invoiceDate >= localDateRange.startDate && invoiceDate <= localDateRange.endDate;
  };

  // Generate electric usage data for chart
  const electricUsageData = resident.invoices
    .filter(isInvoiceInDateRange)
    .map(inv => ({
      month: inv.month,
      usage: inv.previousMonthElectricUsageKwh,
    }))
    .reverse();

  const totalRentCollected = resident.invoices
    .filter(inv => inv.isPaid && isInvoiceInDateRange(inv))
    .reduce((sum, inv) => sum + inv.currentRent, 0);

  const totalElectricCollected = resident.invoices
    .filter(inv => inv.isPaid && isInvoiceInDateRange(inv))
    .reduce((sum, inv) => {
      const baseElectric = inv.previousMonthElectricUsageKwh * inv.electricRate;
      const adjustedElectric = baseElectric + (inv.prevMonthElectricAdjustment ?? 0);
      return sum + adjustedElectric;
    }, 0);

  const totalLateFees = resident.invoices
    .filter(inv => inv.isPaid && isInvoiceInDateRange(inv))
    .reduce((sum, inv) => {
      const baseFee = inv.daysLate * inv.lateFeeDailyRate;
      const adjustedFee = baseFee + (inv.prevMonthLateFeeAdjustment ?? 0);
      return sum + adjustedFee;
    }, 0);

  if (showInvoiceForm) {
    return (
      <InvoiceForm
        resident={resident}
        property={property}
        invoice={editingInvoice || undefined}
        activeLease={activeLease}
        previousInvoice={editingInvoice ? null : previousInvoice}
        onSubmit={handleInvoiceSubmit}
        onCancel={() => {
          setShowInvoiceForm(false);
          setEditingInvoice(null);
        }}
        onNavigateToResident={() => {
          setShowInvoiceForm(false);
          setEditingInvoice(null);
        }}
        allProperties={allProperties}
        onPropertySelect={onPropertySelect}
        onPropertySettings={onPropertySettings}
      />
    );
  }

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    if (onDelete) {
      onDelete();
    }
  };

  // Build breadcrumbs for header
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Manage Rentals',
      onClick: onClose,
    },
    {
      label: getPropertyDisplayName(property.address, property.address2),
      isPropertyDropdown: allProperties.length > 1,
      isActive: true,
    },
  ];

  // Build property options for dropdown
  const propertyOptions: PropertyOption[] = allProperties.map(p => ({
    id: p.id,
    label: getPropertyDisplayName(p.address, p.address2),
    isSelected: p.id === property.id,
  }));

  return (
    <div className="bg-page">
      <PageHeader
        title={PORTAL_LABELS.HOMEOWNER}
        breadcrumbs={breadcrumbs}
        propertyOptions={propertyOptions}
        onPropertySelect={onPropertySelect}
        onPropertySettings={onPropertySettings}
        onLogout={onLogout}
        accountMenuItems={accountMenuItems}
      />

      {/* Main Content */}
      <main id="main-content" className="container-xl px-4 py-4 d-flex flex-column gap-4">
        {/* Back button, resident switcher, and action buttons */}
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={onClose}
            >
              <ArrowLeft size={18} />
              Back to Residents
            </button>

            {/* Resident Switcher Dropdown */}
            {onResidentSelect && (
              <Dropdown
                show={residentDropdownOpen && allResidents.length > 1}
                onToggle={(isOpen) => allResidents.length > 1 && setResidentDropdownOpen(isOpen)}
              >
                <Dropdown.Toggle
                  variant="outline-secondary"
                  disabled={allResidents.length <= 1}
                >
                  <User size={16} />
                  {getResidentDisplayName(resident)}
                </Dropdown.Toggle>
                <Dropdown.Menu className="property-dropdown-menu">
                  {[...allResidents]
                    .filter((r, index, self) =>
                      // Remove duplicates - keep only first occurrence of each unique ID
                      index === self.findIndex((resident) => resident.id === r.id)
                    )
                    .sort((a, b) => {
                      // Current resident first
                      if (a.id === resident.id) return -1;
                      if (b.id === resident.id) return 1;
                      // Then alphabetical by name
                      return getResidentDisplayName(a).localeCompare(getResidentDisplayName(b));
                    })
                    .map((r) => (
                      <div key={r.id} className="property-dropdown-item">
                        <span className={`checkmark ${r.id === resident.id ? 'visible' : ''}`}>✓</span>
                        <span
                          className="property-name flex-grow-1"
                          onClick={() => {
                            if (r.id !== resident.id) {
                              onResidentSelect(r.id);
                            }
                            setResidentDropdownOpen(false);
                          }}
                        >
                          {getResidentDisplayName(r)} - Unit {r.aptNumber}
                        </span>
                      </div>
                    ))}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>

          {/* Action buttons on the right */}
          <div className="d-flex align-items-center gap-2">
            {onDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-tertiary text-danger d-flex align-items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
            <button
              onClick={() => window.open(getPortalLink(), '_blank')}
              className="btn btn-tertiary d-flex align-items-center gap-2"
            >
              <Eye size={18} />
              Preview
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="btn btn-outline-primary d-flex align-items-center gap-2"
            >
              <Share2 size={18} />
              Share Portal
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            const baseUrl = getBaseUrl();
            if (tabId === 'dashboard') {
              navigate(baseUrl);
            } else {
              navigate(`${baseUrl}/${tabId}`);
            }
          }}
        />

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
          {/* Date Range Selector */}
          <div className="date-range-container">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <Calendar size={20} color="#667eea" />
                <h3 className="h6 fw-bold text-dark mb-0">Date Range</h3>
              </div>
              <div className="date-range-badge">
                {localDateRange.startDate.toLocaleDateString()} - {localDateRange.endDate.toLocaleDateString()}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-3 align-items-center">
              {(['ytd', '1y', '2y', '3y', 'custom'] as const).map((range) => (
                <Button
                  key={range}
                  variant={dateRangeType === range ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setDateRangeType(range)}
                >
                  {range === 'ytd' ? 'Year to Date' :
                   range === '1y' ? 'Last Year' :
                   range === '2y' ? 'Last 2 Years' :
                   range === '3y' ? 'Last 3 Years' : 'Custom'}
                </Button>
              ))}
                {dateRangeType === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="form-control form-control-sm w-auto"
                    />
                    <span className="text-muted fw-semibold">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="form-control form-control-sm w-auto"
                    />
                  </>
                )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-4">
            <div className="col-md-6 col-lg-4">
              <StatCard
                label="Rent Collected"
                value={`$${totalRentCollected.toFixed(0)}`}
                description="Total paid rent"
                icon={<DollarSign size={24} color="white" />}
                iconBgClass="stat-icon-success"
              />
            </div>
            <div className="col-md-6 col-lg-4">
              <StatCard
                label="Late Fees Collected"
                value={`$${totalLateFees.toFixed(0)}`}
                description="Total late fees"
                icon={<Calendar size={24} color="white" />}
                iconBgClass="stat-icon-danger"
              />
            </div>
            <div className="col-md-6 col-lg-4">
              <StatCard
                label="Electric Collected"
                value={`$${totalElectricCollected.toFixed(0)}`}
                description="Total electric fees"
                icon={<Zap size={24} color="white" />}
                iconBgClass="stat-icon-info"
              />
            </div>
          </div>

          {/* Electric Usage Chart */}
          {electricUsageData.length > 0 && (
              <div className="glass-card p-4 rounded-4 shadow">
                <h3 className="h5 fw-bold text-dark mb-4">
                  Electric Usage Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={electricUsageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      name="Electric Usage (kWh)" 
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Occupants Tab */}
        {activeTab === 'occupants' && (
          <Card className="border-0 shadow-lg mb-4 rounded-4">
            <Card.Body className="p-4 d-flex flex-column gap-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3>Occupant Information</h3>
                  <p className="text-muted">Add all residents living in this unit</p>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOccupants(getOccupantsFromResident(resident));
                      setTouchedFields({}); // Reset touched fields on restore
                    }}
                  >
                    Restore Last Saved
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleOccupantsSave}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {occupants.map((occupant, index) => (
                <div key={occupant.id}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="text-muted">
                      {index === 0 ? 'Primary Occupant' : `Occupant ${index + 1}`}
                    </h6>
                    {index > 0 && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeOccupant(occupant.id)}
                        className="d-flex align-items-center gap-1"
                      >
                        <XIcon size={14} />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="d-flex flex-column gap-3">
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>First Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={occupant.firstName}
                            onChange={(e) => handleOccupantChange(occupant.id, 'firstName', e.target.value)}
                            placeholder="e.g., John"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Last Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={occupant.lastName}
                            onChange={(e) => handleOccupantChange(occupant.id, 'lastName', e.target.value)}
                            placeholder="e.g., Smith"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Email</Form.Label>
                          <Form.Control
                            type="email"
                            value={occupant.email}
                            onChange={(e) => handleOccupantChange(occupant.id, 'email', e.target.value)}
                            placeholder="e.g., john.smith@email.com"
                            required
                            isInvalid={index === 0 && isFieldTouched(occupant.id, 'email') && occupant.email.length > 0 && !isValidEmail(occupant.email)}
                            isValid={index === 0 && isFieldTouched(occupant.id, 'email') && occupant.email.length > 0 && isValidEmail(occupant.email)}
                          />
                          {index === 0 && isFieldTouched(occupant.id, 'email') && occupant.email.length > 0 && !isValidEmail(occupant.email) && (
                            <Form.Control.Feedback type="invalid">
                              Please enter a valid email address
                            </Form.Control.Feedback>
                          )}
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Phone Number</Form.Label>
                          <Form.Control
                            type="tel"
                            value={occupant.phone}
                            onChange={(e) => handleOccupantChange(occupant.id, 'phone', e.target.value)}
                            placeholder="(555) 555-0000"
                            maxLength={14}
                            required
                            isInvalid={index === 0 && isFieldTouched(occupant.id, 'phone') && occupant.phone.length > 0 && !isValidPhone(occupant.phone)}
                            isValid={index === 0 && isFieldTouched(occupant.id, 'phone') && occupant.phone.length > 0 && isValidPhone(occupant.phone)}
                          />
                          {index === 0 && isFieldTouched(occupant.id, 'phone') && occupant.phone.length > 0 && !isValidPhone(occupant.phone) && (
                            <Form.Control.Feedback type="invalid">
                              Phone number must be 10 digits
                            </Form.Control.Feedback>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {index < occupants.length - 1 && (
                    <hr />
                  )}
                </div>
              ))}

              <div>
                <Button
                  variant="outline-primary"
                  onClick={addOccupant}
                  className="d-flex align-items-center gap-2"
                >
                  <Plus size={16} />
                  Add Another Occupant
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <Card className="border-0 shadow-lg mb-4 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h3 className="mb-1">Invoices</h3>
                  <p className="text-muted mb-0">Manage resident invoices and payments</p>
                </div>
                <button
                  onClick={() => setShowInvoiceForm(true)}
                  className="btn-gradient border-0 px-3 py-2 btn btn-primary btn-sm"
                >
                  <Plus size={16} className="me-1" />
                  Add Invoice
                </button>
              </div>

              {resident.invoices.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3">
                  <p className="text-muted mb-0">No invoices added yet</p>
                  <small className="text-muted">Select "Add Invoice" to create your first invoice</small>
                </div>
              ) : (
              <div className="d-grid gap-4">
                {[...resident.invoices]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((invoice) => {
                    const total = calculateInvoiceTotal(invoice);
                    // Calculate adjusted values for display
                    const adjustedBalance = (invoice.lastMonthBalance || 0) + (invoice.prevMonthBalanceAdjustment ?? 0);
                    const baseLateFees = (invoice.daysLate || 0) * (invoice.lateFeeDailyRate || 0);
                    const lateFees = baseLateFees + (invoice.prevMonthLateFeeAdjustment ?? 0);
                    const baseElectricCharges = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
                    const electricCharges = baseElectricCharges + (invoice.prevMonthElectricAdjustment ?? 0);

                    return (
                      <div
                        key={invoice.id}
                        className="p-4 rounded-3 border bg-light"
                      >
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h4 className="h5 fw-bold text-dark mb-0">
                                {formatInvoiceMonth(invoice.month)}
                              </h4>
                              {invoice.isPaid ? (
                                <span className="badge bg-success">Paid</span>
                              ) : (
                                <span className="badge bg-danger">Unpaid</span>
                              )}
                            </div>
                            <p className="small text-muted mb-0">
                              {generateInvoiceNumber(invoice)}
                            </p>
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="btn btn-outline-secondary small fw-semibold d-flex align-items-center gap-2 px-3 py-2"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="btn btn-outline-secondary text-danger small fw-semibold d-flex align-items-center gap-2 px-3 py-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="row">
                          {/* Invoice Preview Column - Clickable */}
                          <div className="col-3">
                            <div
                              onClick={() => onViewInvoice(invoice)}
                              className="d-flex align-items-center justify-content-center bg-white border rounded"
                              style={{ height: '182px', cursor: 'pointer' }}
                              role="button"
                              tabIndex={0}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  onViewInvoice(invoice);
                                }
                              }}
                            >
                              <div className="text-center text-muted">
                                <FileText size={48} strokeWidth={1} />
                                <p className="small mb-0 mt-2">Invoice Preview</p>
                              </div>
                            </div>
                          </div>

                          {/* Invoice Details Column */}
                          <div className="col-7">
                            {/* Row 1: Current Rent and Last Month Balance */}
                            <div className="row mb-3">
                              <div className="col-6">
                                <p className="small text-muted mb-1 fw-semibold">Current Rent</p>
                                <p className="small text-dark mb-0">${(invoice.currentRent || 0).toFixed(2)}</p>
                              </div>
                              <div className="col-6">
                                <p className="small text-muted mb-1 fw-semibold">Last Month Balance</p>
                                <p className="small text-dark mb-0">${adjustedBalance.toFixed(2)}</p>
                              </div>
                            </div>
                            {/* Row 2: Late Fee and Electric Charge */}
                            <div className="row mb-3">
                              <div className="col-6">
                                <p className="small text-muted mb-1 fw-semibold">Previous Month Late Fee</p>
                                <p className="small text-dark mb-0">${lateFees.toFixed(2)}</p>
                              </div>
                              <div className="col-6">
                                <p className="small text-muted mb-1 fw-semibold">Previous Month Electric Charge</p>
                                <p className="small text-dark mb-0">${electricCharges.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          {/* Total Amount Due Column */}
                          <div className="col-2">
                            <div className="text-end">
                              <p className="small text-muted mb-1">Total Amount {invoice.isPaid ? 'Paid' : 'Due'}</p>
                              <p className={`h3 fw-bold mb-2 ${total < 0 ? 'text-success' : (invoice.isPaid ? 'text-success' : 'text-danger')}`}>
                                ${Math.abs(total).toFixed(2)}
                              </p>
                              {total < 0 && (
                                <p className="small text-success fw-semibold mb-2">Credit</p>
                              )}
                              {!invoice.isPaid && total >= 0 && (
                                <p className="small text-muted mb-0">
                                  After the {resident.lateStartDay || 10}th, ${total.toFixed(2)} plus ${(invoice.lateFeeDailyRate || 0).toFixed(2)} per day
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Leases Tab */}
        {activeTab === 'leases' && (
          <Card className="border-0 shadow-lg mb-4 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h3 className="mb-1">Lease Documents</h3>
                  <p className="text-muted mb-0">Manage lease agreements and documents</p>
                </div>
                <button
                  onClick={() => {
                    const residentId = renterId || resident.id;
                    if (propertySlug) {
                      navigate(`/homeowner/properties/${propertySlug}/residents/${residentId}/leases/add`);
                    } else {
                      navigate(`/homeowner/residents/${residentId}/leases/add`);
                    }
                  }}
                  className="btn-gradient border-0 px-3 py-2 btn btn-primary btn-sm"
                >
                  <Plus size={16} className="me-1" />
                  Add Lease
                </button>
              </div>

              {resident.leases.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3">
                  <p className="text-muted mb-0">No lease documents added yet</p>
                  <small className="text-muted">Select "Add Lease" to upload your first lease document</small>
                </div>
              ) : (
              <div className="d-grid gap-4">
                {[...resident.leases]
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((lease) => {
                    const startYear = new Date(lease.startDate).getFullYear();
                    // Use category (new API field) with fallback to documentType (legacy)
                    const leaseCategory = lease.category || lease.documentType || 'original';
                    const leaseTitle = `${startYear} ${leaseCategory === 'original' ? 'Original' : 'Renewal'} Lease`;
                    const isActive = isLeaseActive(lease);

                    // Determine lease status for badge
                    const getLeaseStatus = () => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const startDate = new Date(lease.startDate);
                      startDate.setHours(0, 0, 0, 0);

                      if (today < startDate) return 'upcoming';
                      if (isActive) return 'active';
                      return 'expired';
                    };
                    const leaseStatus = getLeaseStatus();

                    return (
                  <div
                    key={lease.id}
                    className="p-4 rounded-3 border bg-light"
                  >
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h4 className="h5 fw-bold text-dark mb-0">
                            {leaseTitle}
                          </h4>
                          {leaseStatus === 'active' && (
                            <span className="badge bg-success">Active</span>
                          )}
                          {leaseStatus === 'expired' && (
                            <span className="badge bg-secondary">Expired</span>
                          )}
                          {leaseStatus === 'upcoming' && (
                            <span className="badge bg-info">Upcoming</span>
                          )}
                        </div>
                        <p className="small text-muted mb-0">
                          {lease.leaseType === 'yearly' ? 'Yearly Lease' : 'Month-to-Month'}
                        </p>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          onClick={() => {
                            // Use the renterId from URL (which is actually the resident slug) to maintain URL consistency
                            const residentSlugOrId = renterId || resident.id;
                            const leaseSlug = getLeaseSlug(lease);
                            if (propertySlug) {
                              navigate(`/homeowner/properties/${propertySlug}/residents/${residentSlugOrId}/leases/${leaseSlug}/edit`);
                            } else {
                              navigate(`/homeowner/residents/${residentSlugOrId}/leases/${leaseSlug}/edit`);
                            }
                          }}
                          className="btn btn-outline-secondary small fw-semibold d-flex align-items-center gap-2 px-3 py-2"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLease(lease)}
                          className="btn btn-outline-secondary text-danger small fw-semibold d-flex align-items-center gap-2 px-3 py-2"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="row">
                      {/* PDF Preview Column */}
                      <div className="col-3">
                        {lease.fileUrl ? (
                          <PdfPreview
                            fileUrl={lease.fileUrl}
                            downloadName={(() => {
                              const category = (lease.category || lease.documentType || 'original') === 'original' ? 'Original_Lease' : 'Renewal_Lease';
                              const type = lease.leaseType === 'yearly' ? 'Yearly' : 'Monthly';
                              const name = getResidentDisplayName(resident).replace(/\s+/g, '_');
                              const date = lease.startDate ? new Date(lease.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '';
                              return `${category}_${type}_${name}_${date}.pdf`;
                            })()}
                            width="auto"
                            height={182}
                            leaseId={lease.id}
                          />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center bg-secondary bg-opacity-10 rounded" style={{ width: '141px', height: '182px' }}>
                            <FileText size={36} className="text-muted" />
                          </div>
                        )}
                      </div>

                      {/* Lease Details Column */}
                      <div className="col-9">
                        {/* Row 1: Start Date, End Date, Monthly Rent, Security Deposit */}
                        <div className="row mb-3">
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">Start Date</p>
                            <p className="small text-dark mb-0">
                              {formatDateLocal(lease.startDate)}
                            </p>
                          </div>
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">End Date</p>
                            <p className="small text-dark mb-0">
                              {(() => {
                                // Use calculated end date for yearly leases
                                const calculatedEndDate = calculateLeaseEndDate(lease);
                                if (calculatedEndDate) {
                                  return calculatedEndDate.toLocaleDateString();
                                }
                                // Month-to-month leases show 'Ongoing'
                                return 'Ongoing';
                              })()}
                            </p>
                          </div>
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">Monthly Rent</p>
                            <p className="small text-dark mb-0">
                              ${(lease.monthlyRent || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">Security Deposit</p>
                            <p className="small text-dark mb-0">
                              ${(lease.securityDeposit || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Row 2: Late Start Day, Daily Late Rate, Electric Rate */}
                        <div className="row">
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">Late Start Day</p>
                            <p className="small text-dark mb-0">
                              Day {lease.lateStartDay || 5}
                            </p>
                          </div>
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">Daily Late Rate</p>
                            <p className="small text-dark mb-0">
                              ${(lease.lateFeeDailyRate || 5.00).toFixed(2)}/day
                            </p>
                          </div>
                          <div className="col-3">
                            <p className="small text-muted mb-1 fw-semibold">Electric Rate</p>
                            <p className="small text-dark mb-0">
                              ${(lease.electricRate || 0.12).toFixed(2)}/kWh
                            </p>
                          </div>
                        </div>

                        {/* Notes (if any) */}
                        {lease.notes && (
                          <div className="mt-3">
                            <p className="small text-muted mb-1 fw-semibold">Notes</p>
                            <p className="small text-dark mb-0 p-2 bg-white rounded-2">{lease.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              )}
            </Card.Body>
          </Card>
        )}
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-4 p-5 shadow"
            style={{ maxWidth: '500px', width: '90%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="h4 fw-bold text-dark mb-3">
              Share Resident Portal
            </h3>
            <p className="small text-muted mb-4">
              Share this link with {resident.name} to give them access to their resident portal:
            </p>
            <div className="p-4 bg-light rounded-3 mb-4 d-flex align-items-center gap-3">
              <input
                type="text"
                readOnly
                value={getPortalLink()}
                onClick={(e) => e.currentTarget.select()}
                className="flex-fill border-0 bg-transparent small text-dark"
                style={{ outline: 'none', cursor: 'text', userSelect: 'all' }}
              />
              <button
                onClick={copyPortalLink}
                className={`btn ${copiedPortalLink ? 'btn-success' : 'btn-primary'} small fw-semibold d-flex align-items-center gap-2 px-4 py-2`}
              >
                {copiedPortalLink ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="btn btn-light w-100 small fw-semibold text-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Resident</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Are you sure you want to delete "{formatOccupantsNames(occupants)}"? This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete Resident
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Invoice Confirmation Modal */}
      <Modal show={showDeleteInvoiceModal} onHide={() => setShowDeleteInvoiceModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            {invoiceToDelete && `Are you sure you want to delete ${formatInvoiceMonth(invoiceToDelete.month)} invoice?`}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteInvoiceModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteInvoice}>
            Delete Invoice
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Lease Confirmation Modal */}
      <Modal show={showDeleteLeaseModal} onHide={() => setShowDeleteLeaseModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Lease</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            {leaseToDelete && (() => {
              const startYear = new Date(leaseToDelete.startDate).getFullYear();
              const leaseCategory = leaseToDelete.category || leaseToDelete.documentType || 'original';
              const leaseTitle = leaseCategory === 'original' ? 'Original' : 'Renewal';
              return `Are you sure you want to delete ${startYear} ${leaseTitle} lease?`;
            })()}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteLeaseModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteLease}>
            Delete Lease
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast for API messages */}
      {toast.show && (
        <>
          {console.log('[ResidentDetails] 🎉 Rendering toast:', { title: toast.title, message: toast.message, variant: toast.variant })}
          <AppToast
            show={true}
            onClose={() => {
              console.log('[ResidentDetails] Toast closed by user, clearing localStorage');
              localStorage.removeItem('property_form_toast');
              setToast({ show: false, variant: 'success', title: '', message: '' });
            }}
            title={toast.title}
            message={toast.message}
            variant={toast.variant}
          />
        </>
      )}
    </div>
  );
}
