import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, User, DollarSign, ChevronDown, Search, TrendingUp, Zap, Calendar, Edit, Home, CreditCard, Bell, Lock, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Button, Modal, Dropdown, Spinner, Card } from 'react-bootstrap';
import { ResidentForm } from './ResidentForm';
import { LeaseForm } from './LeaseForm';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceView } from '../shared/InvoiceView';
import { ResidentDetails } from './ResidentDetails';
import { PropertyForm } from './PropertyForm';
// PropertyFormTabbed is deprecated - using unified PropertyForm instead
import { ApplicationsTab } from './ApplicationsTab';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { TenantCard } from '../common/TenantCard';
import { TabNavigation } from '../common/TabNavigation';
import { AppToast } from '../common/AppToast';
import { PORTAL_LABELS, LABELS } from '../../config/labels';
import { deleteAccount, getPreferences, savePreferences } from '../../services/auth.service';
import { unitService } from '../../services/unit.service';
import { generateSlug, getPropertyDisplayName, generateResidentSlug, generateInvoiceSlug, parseInvoiceSlug } from '../../utils/slug';
import type { Property, Resident, Invoice, LeaseDocument, PropertyCost, DateRangeFilter, DateRangeType, Occupant, Unit, UnitInvite, TenantApplication } from '../../App';

type OwnerDashboardProps = {
  properties: Property[];
  units: Unit[];
  invites: UnitInvite[];
  applications: TenantApplication[];
  isLoading?: boolean;
  isSessionExpiring?: boolean; // True when idle timeout warning is shown - prevents API calls
  onLogout: () => void;
  onAddProperty: (property: Omit<Property, 'id'>) => void | Promise<void> | Promise<Property>;
  onUpdateProperty: (id: string, property: Omit<Property, 'id'>) => void | Promise<void>;
  onDeleteProperty: (id: string) => void;
  onAddResident: (propertyId: string, resident: Omit<Resident, 'id'>) => Promise<Resident | undefined> | Resident | undefined | void;
  onUpdateResident: (propertyId: string, residentId: string, resident: Omit<Resident, 'id'>) => void;
  onDeleteResident: (residentId: string) => void;
  onAddInvoice: (propertyId: string, renterId: string, invoice: Omit<Invoice, 'id'>) => void;
  onUpdateInvoice: (propertyId: string, renterId: string, invoiceId: string, invoice: Omit<Invoice, 'id'>) => void;
  onDeleteInvoice: (propertyId: string, renterId: string, invoiceId: string) => void;
  onAddLease: (propertyId: string, renterId: string, lease: Omit<LeaseDocument, 'id'>) => void;
  onUpdateLease: (propertyId: string, renterId: string, leaseId: string, lease: Omit<LeaseDocument, 'id'>) => void;
  onDeleteLease: (propertyId: string, renterId: string, leaseId: string) => void;
  onAddCost: (propertyId: string, cost: Omit<PropertyCost, 'id'>) => void;
  onUpdateCost: (propertyId: string, costId: string, cost: Omit<PropertyCost, 'id'>) => void;
  onDeleteCost: (propertyId: string, costId: string) => void;
  onUpdateCombinedUtilities: (propertyId: string, utilityIds: string[]) => void;
  onAddUnit: (unit: Omit<Unit, 'id'>) => void;
  onUpdateUnit: (id: string, unit: Partial<Unit>) => void;
  onDeleteUnit: (id: string) => void;
  onGenerateInvite: (unitId: string) => void;
  onSendInvite: (unitId: string, email: string, firstName?: string) => void | Promise<void>;
  onDeleteInvite: (id: string) => void;
  dateRangeFilter: DateRangeFilter;
  onDateRangeChange: (type: DateRangeType, customStart?: string, customEnd?: string) => void;
  welcomeToastData: { title: string; message: string } | null;
  onCloseWelcomeToast: () => void;
};

export function HomeownerDashboard({
  properties,
  units,
  invites,
  applications,
  isLoading = false,
  isSessionExpiring = false,
  onLogout,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onAddResident,
  onUpdateResident,
  onDeleteResident,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddLease,
  onUpdateLease,
  onDeleteLease,
  onAddCost,
  onUpdateCost,
  onDeleteCost,
  onUpdateCombinedUtilities,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onGenerateInvite,
  onSendInvite,
  onDeleteInvite,
  dateRangeFilter,
  onDateRangeChange,
  welcomeToastData,
  onCloseWelcomeToast,
}: OwnerDashboardProps) {
  // Debug: Log every render
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`[HomeownerDashboard] RENDER #${renderCountRef.current}`, {
    propertiesCount: properties.length,
    unitsCount: units.length,
    invitesCount: invites.length
  });

  // Debug: Log properties received
  console.log('[HomeownerDashboard] Received properties:', properties.length, properties.map(p => ({ id: p.id, name: p.name })));

  const { tab, residentId, detailTab, invoiceId, leaseId, propertySlug, propertyTab } = useParams<{ tab?: string; residentId?: string; detailTab?: string; invoiceId?: string; leaseId?: string; propertySlug?: string; propertyTab?: string }>();
  // Use residentId from route params
  const activeTenantId = residentId;
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on the properties route
  const isPropertiesRoute = location.pathname.startsWith('/homeowner/properties');

  // Check if we're in invoice edit mode (URL ends with /edit)
  const isInvoiceEditMode = location.pathname.endsWith('/edit') && invoiceId;

  // Check if we're on the property settings route (for PropertyForm)
  const isPropertySettingsRoute = location.pathname.includes('/settings');

  // Check if we're on the property dashboard route
  const isPropertyDashboardRoute = isPropertiesRoute && location.pathname.includes('/dashboard');

  // Check if we're on the add-property route
  const isAddPropertyRoute = location.pathname.startsWith('/homeowner/properties/add');

  // Helper function to get property slug
  const getPropertySlugForProperty = (property: Property) => {
    return generateSlug(getPropertyDisplayName(property.address, property.address2));
  };

  // Helper function to find property by slug
  const findPropertyBySlug = (slug: string): Property | undefined => {
    return properties.find(p => getPropertySlugForProperty(p) === slug);
  };

  // Helper function to get resident slug
  const getResidentSlugForResident = (resident: Resident) => {
    if (resident.occupants && resident.occupants.length > 0) {
      return generateResidentSlug(resident.occupants);
    }
    return '';
  };

  // Helper function to find resident by ID or slug
  const findResidentByIdOrSlug = (idOrSlug: string): Resident | undefined => {
    const allResidents = properties.flatMap(p => p.residents);
    // First try to find by ID (for backward compatibility)
    let found = allResidents.find(r => r.id === idOrSlug);
    if (!found) {
      // If not found by ID, try by slug
      found = allResidents.find(r => getResidentSlugForResident(r) === idOrSlug);
    }
    return found;
  };

  // Helper function to generate lease slug (e.g., "2025-yearly-original")
  const getLeaseSlug = (lease: LeaseDocument): string => {
    const year = new Date(lease.startDate).getFullYear();
    const type = lease.leaseType === 'yearly' ? 'yearly' : 'monthly';
    const category = (lease.category || lease.documentType || 'original').toLowerCase();
    return `${year}-${type}-${category}`;
  };

  // Helper function to find lease by slug within a resident's leases
  const findLeaseBySlug = (leases: LeaseDocument[], slug: string): LeaseDocument | undefined => {
    // First try to find by ID (for backward compatibility)
    let found = leases.find(l => l.id === slug);
    if (!found) {
      // If not found by ID, try by slug
      found = leases.find(l => getLeaseSlug(l) === slug);
    }
    return found;
  };

  // Initialize selected property - start empty, let effects populate it once properties load
  // This avoids using stale localStorage values before we can validate them
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    // Only use localStorage if properties are already available to validate against
    if (properties.length > 0) {
      const storedId = localStorage.getItem('last_selected_property_id');
      if (storedId && properties.some(p => p.id === storedId)) {
        console.log('[HomeownerDashboard] Init: Using validated stored ID:', storedId);
        return storedId;
      }
      console.log('[HomeownerDashboard] Init: Using first property:', properties[0].id);
      return properties[0].id;
    }
    // Properties not loaded yet - start empty, validation effect will set it
    console.log('[HomeownerDashboard] Init: Properties not loaded yet, starting empty');
    return '';
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Track the last property ID we loaded units for to avoid duplicate API calls
  const lastLoadedUnitsPropertyIdRef = useRef<string | null>(null);
  // Track the property ID that was loaded from backend preferences to avoid saving it back
  const preferencePropertyIdRef = useRef<string | null>(null);
  // Local units state loaded from API (merged with prop units for backward compatibility)
  const [localUnits, setLocalUnits] = useState<Unit[]>([]);

  // Load user preferences from backend when properties are available
  useEffect(() => {
    // Skip API call if session is expiring (timeout warning shown)
    if (isSessionExpiring) return;

    if (properties.length > 0 && !preferencesLoaded) {
      getPreferences().then(prefs => {
        setPreferencesLoaded(true);
        if (prefs.lastSelectedPropertyId && properties.some(p => p.id === prefs.lastSelectedPropertyId)) {
          // Valid property ID from backend - use it
          // Store in ref so we don't save it back to backend (it already came from there)
          preferencePropertyIdRef.current = prefs.lastSelectedPropertyId;
          setSelectedPropertyId(prefs.lastSelectedPropertyId);
          localStorage.setItem('last_selected_property_id', prefs.lastSelectedPropertyId);
        } else if (prefs.lastSelectedPropertyId) {
          // Backend has stale/invalid property ID - update backend with first valid property
          console.log('[HomeownerDashboard] Backend has stale property ID:', prefs.lastSelectedPropertyId, '- updating to:', properties[0].id);
          setSelectedPropertyId(properties[0].id);
          localStorage.setItem('last_selected_property_id', properties[0].id);
          savePreferences({ lastSelectedPropertyId: properties[0].id });
          preferencePropertyIdRef.current = properties[0].id;
        }
      });
    }
  }, [properties, preferencesLoaded, isSessionExpiring]);

  // Save selected property to localStorage and backend
  useEffect(() => {
    // Skip API call if session is expiring (timeout warning shown)
    if (isSessionExpiring) return;

    // Only proceed if properties are loaded and selectedPropertyId is valid
    if (properties.length === 0) return;

    // Double-check that the property actually exists in the array (use find, not some)
    const validProperty = properties.find(p => p.id === selectedPropertyId);
    const isValidProperty = !!validProperty;
    console.log('[HomeownerDashboard] Save effect - selectedPropertyId:', selectedPropertyId, 'isValid:', isValidProperty, 'propertyName:', validProperty?.name || 'NONE');

    if (isValidProperty) {
      localStorage.setItem('last_selected_property_id', selectedPropertyId);
      // Save to backend only if this is a NEW selection (not what we just loaded from backend)
      // This prevents a save→load→save loop
      if (preferencesLoaded && preferencePropertyIdRef.current !== selectedPropertyId) {
        console.log('[HomeownerDashboard] Saving preference (new selection):', selectedPropertyId);
        savePreferences({ lastSelectedPropertyId: selectedPropertyId });
        preferencePropertyIdRef.current = selectedPropertyId;
      }
    } else {
      // Property ID is invalid - this should be handled by the validation effect
      console.warn('[HomeownerDashboard] Save effect skipped - property not found in array:', selectedPropertyId);
    }
  }, [selectedPropertyId, preferencesLoaded, properties, isSessionExpiring]);

  // Load units for selected property from API
  // This runs INSIDE HomeownerDashboard to avoid causing parent re-renders
  useEffect(() => {
    // Skip API call if session is expiring (timeout warning shown)
    if (isSessionExpiring) return;

    // Only load if we have a valid property and haven't already loaded for this property
    if (!selectedPropertyId || selectedPropertyId === lastLoadedUnitsPropertyIdRef.current) {
      return;
    }

    // Verify property exists before loading
    const propertyExists = properties.some(p => p.id === selectedPropertyId);
    if (!propertyExists) {
      console.log('[HomeownerDashboard] Skipping unit load - property not found:', selectedPropertyId);
      return;
    }

    console.log('[HomeownerDashboard] Loading units for property:', selectedPropertyId);
    lastLoadedUnitsPropertyIdRef.current = selectedPropertyId;

    unitService.listUnits(selectedPropertyId)
      .then((unitsData) => {
        console.log('[HomeownerDashboard] Units loaded:', unitsData?.length || 0);
        // Transform units from API format
        const transformedUnits: Unit[] = (unitsData || []).map((u: any) => ({
          id: u.unitId || u.id,
          propertyId: u.propertyId || selectedPropertyId,
          number: u.unitNumber || u.number, // API uses 'unitNumber', map to frontend 'number'
          address: u.address,
          rentAmount: u.rentAmount || 0,
          securityDeposit: u.securityDeposit || 0,
          status: u.status === 'available' ? 'vacant' : u.status === 'maintenance' ? 'pending' : 'occupied',
          currentTenantId: u.currentTenantId,
          requirements: u.requirements || {
            payStubsWeeks: 12,
            bankStatementsMonths: 3,
          },
        }));
        setLocalUnits(transformedUnits);
      })
      .catch((error) => {
        console.error('[HomeownerDashboard] Error loading units:', error);
      });
  }, [selectedPropertyId, properties, isSessionExpiring]);

  // If current selection is invalid (deleted or not loaded yet), fall back to first property
  useEffect(() => {
    console.log('[HomeownerDashboard] Selection validation effect - properties.length:', properties.length, 'selectedPropertyId:', selectedPropertyId);
    if (properties.length > 0 && !properties.some(p => p.id === selectedPropertyId)) {
      // selectedPropertyId is invalid - use first property
      console.log('[HomeownerDashboard] Invalid selection, using first property ID:', properties[0].id);
      setSelectedPropertyId(properties[0].id);
      // Also clear the stale localStorage value
      localStorage.setItem('last_selected_property_id', properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Redirect to default routes when needed
  useEffect(() => {
    console.log('[HomeownerDashboard] Tab redirect effect - pathname:', location.pathname, 'propertySlug:', propertySlug, 'propertyTab:', propertyTab, 'selectedPropertyId:', selectedPropertyId);

    // Handle /homeowner/dashboard - always redirect to /homeowner/properties
    // The properties page will either show empty state or redirect to selected property
    if (location.pathname === '/homeowner/dashboard') {
      console.log('[HomeownerDashboard] Redirecting /homeowner/dashboard to /homeowner/properties');
      navigate('/homeowner/properties', { replace: true });
      return; // Don't process other redirects
    }

    // Handle /homeowner/properties (exact match only) - redirect to selected property dashboard
    // If no properties, stay on properties page to show empty state
    if (location.pathname === '/homeowner/properties' && !propertySlug && selectedPropertyId && properties.length > 0) {
      const property = properties.find(p => p.id === selectedPropertyId);
      if (property) {
        const slug = getPropertySlugForProperty(property);
        console.log('[HomeownerDashboard] Redirecting to property dashboard with slug:', slug);
        navigate(`/homeowner/properties/${slug}/dashboard`, { replace: true });
        return;
      }
    }

    // Handle invalid property slug - if URL has a slug but property doesn't exist, redirect to /homeowner/properties
    // This handles the case when a property is deleted and the URL still points to it
    // Only check after properties have loaded (length > 0) to avoid redirect during initial load
    if (propertySlug && propertySlug !== 'add' && properties.length > 0) {
      const propertyExists = findPropertyBySlug(propertySlug);
      if (!propertyExists) {
        console.log('[HomeownerDashboard] Property slug not found, redirecting to /homeowner/properties:', propertySlug);
        navigate('/homeowner/properties', { replace: true });
        return;
      }
    }

    // Handle /homeowner/properties/:slug/settings (exact match) - redirect to property-information tab
    // Only redirect if the path ends with /settings (no tab specified in URL)
    // Also check !propertyTab to avoid redirecting when URL param just hasn't updated yet
    const settingsExactMatch = location.pathname.match(/\/homeowner\/properties\/[^/]+\/settings$/);
    if (settingsExactMatch && propertySlug && !propertyTab) {
      console.log('[HomeownerDashboard] Redirecting to property-information (from settings exact match)');
      navigate(`/homeowner/properties/${propertySlug}/settings/property-information`, { replace: true });
    }

    // Handle /homeowner/properties/add (exact match only) - redirect to add property-information tab
    if (location.pathname === '/homeowner/properties/add' && !propertyTab) {
      console.log('[HomeownerDashboard] Redirecting to property-information (from /homeowner/properties/add)');
      navigate('/homeowner/properties/add/property-information', { replace: true });
    }
  }, [location.pathname, navigate, propertySlug, propertyTab, properties, selectedPropertyId, isPropertiesRoute, isPropertySettingsRoute]);

  // Resolve propertySlug to property ID and sync selected property
  useEffect(() => {
    if (propertySlug && properties.length > 0 && isPropertiesRoute) {
      const propertyFromSlug = findPropertyBySlug(propertySlug);
      if (propertyFromSlug && propertyFromSlug.id !== selectedPropertyId) {
        console.log('[HomeownerDashboard] Setting selectedPropertyId from slug:', propertySlug, '->', propertyFromSlug.id);
        setSelectedPropertyId(propertyFromSlug.id);
      }
    }
  }, [propertySlug, properties, isPropertiesRoute, selectedPropertyId]);

  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showRenterForm, setShowRenterForm] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Initialize delete property toast from localStorage (persists across navigation)
  const [deletePropertyToast, setDeletePropertyToast] = useState<{ show: boolean; address: string }>(() => {
    const stored = localStorage.getItem('delete_property_toast');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { show: false, address: '' };
      }
    }
    return { show: false, address: '' };
  });

  // Initialize resident toast from localStorage (for add/update/delete operations)
  const [residentToast, setResidentToast] = useState<{ show: boolean; variant: 'success' | 'error'; title: string; message: string }>(() => {
    console.log('[HomeownerDashboard] Initializing toast state...');
    const stored = localStorage.getItem('property_form_toast');
    console.log('[HomeownerDashboard] localStorage.property_form_toast on mount:', stored);

    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('[HomeownerDashboard] ✅ Parsed toast data on mount:', data);
        return { show: true, ...data };
      } catch (err) {
        console.error('[HomeownerDashboard] ❌ Failed to parse toast data:', err);
        return { show: false, variant: 'success', title: '', message: '' };
      }
    }
    console.log('[HomeownerDashboard] No toast data found on mount');
    return { show: false, variant: 'success', title: '', message: '' };
  });

  // Watch for toast changes in localStorage (triggered by resident operations)
  useEffect(() => {
    console.log('[HomeownerDashboard] Properties changed, checking for toast...');
    const checkToast = () => {
      const stored = localStorage.getItem('property_form_toast');
      console.log('[HomeownerDashboard] localStorage.property_form_toast in properties effect:', stored);

      if (stored) {
        try {
          const data = JSON.parse(stored);
          console.log('[HomeownerDashboard] ✅ Found toast after properties change:', data);
          setResidentToast({ show: true, ...data });
        } catch (err) {
          console.error('[HomeownerDashboard] ❌ Failed to parse toast in properties effect:', err);
        }
      } else {
        console.log('[HomeownerDashboard] No toast found in properties effect');
      }
    };

    // Check immediately when properties change (after delete/add/update)
    checkToast();
  }, [properties]);

  // Watch for location changes to show toast after navigation (e.g., after deleting resident)
  useEffect(() => {
    console.log('[HomeownerDashboard] Location changed to:', location.pathname);
    const stored = localStorage.getItem('property_form_toast');
    console.log('[HomeownerDashboard] localStorage.property_form_toast after navigation:', stored);

    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('[HomeownerDashboard] ✅ Found toast after navigation:', data);
        setResidentToast({ show: true, ...data });
      } catch (err) {
        console.error('[HomeownerDashboard] ❌ Failed to parse toast after navigation:', err);
      }
    } else {
      console.log('[HomeownerDashboard] No toast found after navigation');
    }
  }, [location.pathname]);

  // Account menu items for "My Account" dropdown (same order as settings tabs)
  // Must be defined before any early returns to avoid React hooks error
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
      onClick: () => setShowDeleteAccountModal(true),
      dividerBefore: true,
      variant: 'danger' as const,
    },
  ], [navigate]);

  // Handle delete account
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setShowDeleteAccountModal(false);
      setDeleteConfirmText('');
      // Store success toast for sign-in page to display after redirect
      localStorage.setItem('account_deleted_toast', JSON.stringify({
        title: 'Account Deleted',
        message: 'Your account has been successfully deleted.',
      }));
      // After successful deletion, logout and redirect
      onLogout();
    } catch (error) {
      console.error('Failed to delete account:', error);
      // Could show an error toast here
    }
  };

  // Check if we're on property-scoped residents route
  const isPropertyResidentsRoute = isPropertiesRoute && location.pathname.includes('/residents');
  // Check if we're on the add resident route
  const isAddResidentRoute = location.pathname.endsWith('/residents/add');
  // Check if we're on the edit resident route
  const isEditResidentRoute = location.pathname.includes('/residents/') && location.pathname.endsWith('/edit');
  // Check if we're on the add lease route
  const isAddLeaseRoute = location.pathname.includes('/residents/') && location.pathname.includes('/leases/add');
  // Check if we're on the edit lease route
  const isEditLeaseRoute = location.pathname.includes('/residents/') && location.pathname.includes('/leases/') && location.pathname.endsWith('/edit');
  // Check if we're on property-scoped applications route
  const isPropertyApplicationsRoute = isPropertiesRoute && location.pathname.includes('/applications');

  // Derive active tab from URL path (default to 'dashboard' if no tab param)
  const getActiveTab = (): string => {
    // Check for property-scoped routes first
    if (isPropertyDashboardRoute) return 'dashboard';
    if (isPropertyResidentsRoute) return 'residents';
    if (isPropertyApplicationsRoute) return 'units'; // 'units' is the tab ID for applications
    // Check for top-level routes (legacy)
    if (location.pathname.startsWith('/homeowner/residents')) return 'residents';
    // Check for dashboard sub-tabs (units = applications tab)
    if (tab === 'residents' || tab === 'units') return tab;
    // Default to dashboard
    return 'dashboard';
  };
  const activeTab = getActiveTab();

  // Get selected property - prefer slug from URL over stored ID for consistency
  const selectedProperty = useMemo(() => {
    // If we have a propertySlug in URL, find property by slug first
    if (propertySlug && isPropertiesRoute) {
      const propertyFromSlug = findPropertyBySlug(propertySlug);
      if (propertyFromSlug) {
        return propertyFromSlug;
      }
    }
    // Fall back to selectedPropertyId
    return properties.find(p => p.id === selectedPropertyId);
  }, [propertySlug, isPropertiesRoute, selectedPropertyId, properties]);

  console.log('[HomeownerDashboard] selectedPropertyId:', selectedPropertyId, 'propertySlug:', propertySlug, 'selectedProperty:', selectedProperty?.name || 'NONE');
  const residents = selectedProperty?.residents || [];

  // Calculate base route for PropertyForm tab navigation
  // Needs to be available for the handlePropertyTabChange callback
  const baseRoute = useMemo(() => {
    const propertyToEdit = (isPropertiesRoute && isPropertySettingsRoute) ? selectedProperty : editingProperty;
    return (isPropertiesRoute && isPropertySettingsRoute)
      ? `/homeowner/properties/${propertySlug || (propertyToEdit ? getPropertySlugForProperty(propertyToEdit) : '')}/settings`
      : '/homeowner/properties/add';
  }, [isPropertiesRoute, isPropertySettingsRoute, propertySlug, selectedProperty, editingProperty]);

  // Merge units: use localUnits for current property (loaded from API), prop units for others
  // This allows units to be loaded dynamically without causing parent re-renders
  const mergedUnits = useMemo(() => {
    if (!selectedProperty?.id) return units;
    // Filter out prop units for current property, use local units instead
    const otherPropertyUnits = units.filter(u => u.propertyId !== selectedProperty.id);
    return [...otherPropertyUnits, ...localUnits];
  }, [units, localUnits, selectedProperty?.id]);

  // Filter units by selected property (use selectedProperty.id for accuracy)
  const filteredUnits = mergedUnits.filter(unit => unit.propertyId === selectedProperty?.id);

  // Get unit IDs for the selected property to filter applications
  const selectedPropertyUnitIds = new Set(filteredUnits.map(unit => unit.id));

  // Filter applications by units that belong to the selected property
  const filteredApplications = applications.filter(app => selectedPropertyUnitIds.has(app.unitId));

  // Find resident and invoice from URL params (supports both ID and slug)
  const viewingResidentDetails = activeTenantId
    ? findResidentByIdOrSlug(activeTenantId) || null
    : null;

  const viewingInvoice = activeTenantId && invoiceId && viewingResidentDetails
    ? {
        resident: viewingResidentDetails,
        invoice: viewingResidentDetails.invoices.find(inv => {
          // Support both invoice ID and invoice slug (e.g., "december-2024")
          const invoiceSlug = generateInvoiceSlug(inv.month);
          return inv.id === invoiceId || invoiceSlug === invoiceId;
        }) || null as any
      }
    : null;

  // Helper function to get occupants from resident with backward compatibility
  const getOccupantsFromResident = (resident: Resident): Occupant[] => {
    if (resident.occupants && resident.occupants.length > 0) {
      return resident.occupants;
    }

    const parseName = (fullName: string) => {
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
      }
      const lastName = parts.pop() || '';
      const firstName = parts.join(' ');
      return { firstName, lastName };
    };

    const { firstName, lastName } = parseName(resident.name);
    return [{
      id: 'occupant-1',
      firstName,
      lastName,
      email: resident.email,
      phone: resident.phone,
    }];
  };

  // Format occupants names for display
  const formatOccupantsNames = (occupants: Occupant[]) => {
    const names = occupants.map(occ => `${occ.firstName} ${occ.lastName}`.trim()).filter(name => name);

    if (names.length === 0) return 'No occupants';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;

    const allButLast = names.slice(0, -1).join(', ');
    return `${allButLast} and ${names[names.length - 1]}`;
  };

  // Enhanced search filter
  const filteredResidents = (selectedProperty?.residents || []).filter(resident => {
    const searchLower = searchTerm.toLowerCase();

    if (resident.aptNumber?.toLowerCase().includes(searchLower)) {
      return true;
    }

    const occupants = getOccupantsFromResident(resident);
    return occupants.some(occ => {
      const fullName = `${occ.firstName} ${occ.lastName}`.toLowerCase();
      return fullName.includes(searchLower);
    });
  });

  const calculateInvoiceTotal = (invoice: Invoice) => {
    // Match the calculation from InvoiceView.tsx
    const adjustedBalance = (invoice.lastMonthBalance || 0) + (invoice.prevMonthBalanceAdjustment || 0);
    const baseLateFee = (invoice.daysLate || 0) * (invoice.lateFeeDailyRate || 0);
    const adjustedLateFee = baseLateFee + (invoice.prevMonthLateFeeAdjustment || 0);
    const baseElectricCharge = (invoice.previousMonthElectricUsageKwh || 0) * (invoice.electricRate || 0);
    const adjustedElectricCharge = baseElectricCharge + (invoice.prevMonthElectricAdjustment || 0);

    const total = adjustedBalance + (invoice.currentRent || 0) + adjustedLateFee + adjustedElectricCharge;

    console.log('[calculateInvoiceTotal] Debug:', {
      invoice: invoice.id,
      month: invoice.month,
      adjustedBalance,
      currentRent: invoice.currentRent,
      adjustedLateFee,
      adjustedElectricCharge,
      total,
    });

    return total;
  };

  const getLatestInvoice = (resident: Resident): Invoice | null => {
    return resident.invoices[0] || null;
  };

  const handleResidentFormSubmit = async (residentData: Omit<Resident, 'id'>): Promise<Resident | undefined> => {
    console.log('[HomeownerDashboard] handleResidentFormSubmit called');
    console.log('[HomeownerDashboard] Resident data received:', {
      hasLeases: !!residentData.leases,
      leasesCount: residentData.leases?.length,
      leaseHasFile: !!(residentData.leases?.[0] as any)?.file,
    });

    const isNewResident = !editingResident;
    let createdOrUpdatedResident: Resident | undefined;
    let hadError = false;

    try {
      if (editingResident) {
        console.log('[HomeownerDashboard] Updating existing resident');
        await onUpdateResident(selectedPropertyId, editingResident.id, residentData);
      } else {
        console.log('[HomeownerDashboard] Adding new resident to property:', selectedPropertyId);
        console.log('[HomeownerDashboard] Calling onAddResident...');
        createdOrUpdatedResident = await onAddResident(selectedPropertyId, residentData);
        console.log('[HomeownerDashboard] onAddResident returned:', createdOrUpdatedResident);
      }
    } catch (err) {
      console.error('[HomeownerDashboard] ❌ Error in resident operation:', err);
      hadError = true;
      // Don't throw - we still want to navigate away from the form
    }

    // Check for toast after operation completes
    console.log('[HomeownerDashboard] Checking for toast after resident operation');
    const stored = localStorage.getItem('property_form_toast');
    console.log('[HomeownerDashboard] Toast in localStorage:', stored);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('[HomeownerDashboard] Setting resident toast:', data);
        setResidentToast({ show: true, ...data });
      } catch {
        // Invalid JSON, ignore
      }
    }

    // For NEW residents, ALWAYS navigate to residents list
    // Even if there was an error, we navigate away from the form
    if (isNewResident) {
      console.log('[HomeownerDashboard] ✅ Navigating to residents list...', hadError ? '(after error)' : '(success)');
      const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);

      // Close form state
      setShowRenterForm(false);
      setEditingResident(null);

      // Navigate to residents list
      if (currentSlug) {
        console.log('[HomeownerDashboard] Navigating to:', `/homeowner/properties/${currentSlug}/residents`);
        navigate(`/homeowner/properties/${currentSlug}/residents`);
      } else {
        console.log('[HomeownerDashboard] Navigating to:', '/homeowner/residents');
        navigate('/homeowner/residents');
      }
    }

    console.log('[HomeownerDashboard] Returning resident:', createdOrUpdatedResident);
    return createdOrUpdatedResident;
  };

  const handlePropertyFormSubmit = async (propertyData: Omit<Property, 'id'>): Promise<Property | void> => {
    // When on settings route, we're editing selectedProperty (not editingProperty)
    // When on add-property route, we're creating new
    const isEditing = isPropertySettingsRoute && selectedProperty;

    if (editingProperty) {
      await onUpdateProperty(editingProperty.id, propertyData);
      // Return the updated property with its ID
      return { ...propertyData, id: editingProperty.id } as Property;
    } else if (isEditing && selectedProperty) {
      // Editing via settings route - use selectedProperty
      await onUpdateProperty(selectedProperty.id, propertyData);
      // Return the updated property with its ID
      return { ...propertyData, id: selectedProperty.id } as Property;
    } else {
      // Create new property and get the created property with ID
      const result = await onAddProperty(propertyData);
      return result as Property;
    }
  };

  const handlePropertyFormSuccess = (createdProperty?: Property) => {
    // Only navigate to property-information if this is a NEW property creation
    // (i.e., from add-property route, not from settings route)
    const isEditing = isPropertySettingsRoute && selectedProperty;

    if (createdProperty && createdProperty.id && !editingProperty && !isEditing) {
      // Set the newly created property as the selected property for editing
      setSelectedPropertyId(createdProperty.id);
      setEditingProperty(null);
      // Navigate to the property settings route
      const slug = getPropertySlugForProperty(createdProperty);
      navigate(`/homeowner/properties/${slug}/settings/property-information`);
    }
    // Otherwise just stay on the form (for updates)
  };

  // Memoize PropertyForm callbacks to prevent re-renders
  const handlePropertyFormCancel = useCallback(() => {
    setShowPropertyForm(false);
    setEditingProperty(null);
    // Go back to property dashboard if we have a slug, otherwise properties list
    if (propertySlug) {
      navigate(`/homeowner/properties/${propertySlug}/dashboard`);
    } else {
      navigate('/homeowner/properties');
    }
  }, [propertySlug, navigate]);

  const handlePropertyTabChange = useCallback((tabId: string) => {
    navigate(`${baseRoute}/${tabId}`);
  }, [baseRoute, navigate]);

  const handlePropertySelect = useCallback((propertyId: string) => {
    // Update the selected property state - this will trigger re-render with new property
    setSelectedPropertyId(propertyId);
    // Navigate to the new property's settings URL with slug
    const newProperty = properties.find(p => p.id === propertyId);
    if (newProperty) {
      const slug = getPropertySlugForProperty(newProperty);
      navigate(`/homeowner/properties/${slug}/settings/${propertyTab || 'property-information'}`);
    }
  }, [properties, propertyTab, navigate]);

  const handlePropertyDelete = useCallback((id: string) => {
    // Find property address before deleting for toast message
    const propertyToDelete = properties.find(p => p.id === id);
    const address = propertyToDelete ? getPropertyDisplayName(propertyToDelete.address, propertyToDelete.address2) : 'Property';
    onDeleteProperty(id);
    // Store toast in localStorage so it persists across navigation
    const toastData = { show: true, address };
    localStorage.setItem('delete_property_toast', JSON.stringify(toastData));
    setDeletePropertyToast(toastData);
    // Navigate to properties list (will show empty state or redirect to first property)
    navigate('/homeowner/properties');
  }, [properties, onDeleteProperty, navigate]);

  // Date filtering helper
  const isInvoiceInDateRange = (invoice: Invoice) => {
    const invoiceDate = new Date(invoice.date);
    return invoiceDate >= dateRangeFilter.startDate && invoiceDate <= dateRangeFilter.endDate;
  };

  // Year-to-Date filtering helper (Jan 1 of current year to today)
  const isInvoiceYTD = (invoice: Invoice) => {
    const invoiceDate = new Date(invoice.date);
    const currentYear = new Date().getFullYear();
    const jan1 = new Date(currentYear, 0, 1); // January 1st of current year
    const today = new Date();
    return invoiceDate >= jan1 && invoiceDate <= today;
  };

  // Calculate financial stats
  const totalRentCollected = residents.reduce((sum, r) => {
    return sum + r.invoices.filter(inv => inv.isPaid && isInvoiceInDateRange(inv)).reduce((invSum, inv) => invSum + inv.currentRent, 0);
  }, 0);

  const totalElectricCollected = residents.reduce((sum, r) => {
    return sum + r.invoices.filter(inv => inv.isPaid && isInvoiceInDateRange(inv)).reduce((invSum, inv) =>
      invSum + (inv.previousMonthElectricUsageKwh * inv.electricRate), 0
    );
  }, 0);

  const getMonthsBetweenDates = (start: Date, end: Date) => {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    return Math.max(1, months);
  };

  const monthsInRange = getMonthsBetweenDates(dateRangeFilter.startDate, dateRangeFilter.endDate);
  const totalCosts = (selectedProperty?.costs || []).reduce((sum, cost) => sum + cost.amount, 0) * monthsInRange;
  const netIncome = totalRentCollected + totalElectricCollected - totalCosts;

  // Prepare chart data
  const getMonthlyNetIncomeData = () => {
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
    const monthlyCosts = (selectedProperty?.costs || []).reduce((sum, cost) => sum + cost.amount, 0);

    (selectedProperty?.residents || []).forEach(resident => {
      resident.invoices.filter(inv => inv.isPaid && isInvoiceInDateRange(inv)).forEach(invoice => {
        const month = invoice.month;
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: monthlyCosts };
        }
        monthlyData[month].income += invoice.currentRent + (invoice.previousMonthElectricUsageKwh * invoice.electricRate);
      });
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        netIncome: data.income - data.expenses,
      }))
      .sort((a, b) => {
        const parseMonth = (monthStr: string) => {
          const [monthName, year] = monthStr.split(' ');
          const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];
          return new Date(parseInt(year), monthOrder.indexOf(monthName), 1);
        };
        return parseMonth(a.month).getTime() - parseMonth(b.month).getTime();
      });
  };

  const monthlyNetIncomeData = getMonthlyNetIncomeData();

  // Expense chart data
  const colorMap: { [key: string]: string } = {
    'Mortgage': '#8b5cf6',
    'Gas': '#ec4899',
    'Electric': '#f59e0b',
    'Water': '#06b6d4',
    'Heat': '#ef4444',
    'Insurance': '#10b981',
  };

  const expenseCategories: { [key: string]: number } = {};
  (selectedProperty?.costs || []).forEach(cost => {
    const categoryName = cost.name;
    if (!expenseCategories[categoryName]) {
      expenseCategories[categoryName] = 0;
    }
    expenseCategories[categoryName] += cost.amount * monthsInRange;
  });

  const expenseData = Object.entries(expenseCategories).map(([name, value]) => ({
    name,
    value,
    color: colorMap[name] || '#6366f1',
  }));

  // Handle modal views
  // Show InvoiceForm directly if in edit mode
  if (isInvoiceEditMode && viewingInvoice) {
    // Find active lease for invoice defaults
    const isLeaseActive = (lease: LeaseDocument) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(lease.startDate);
      startDate.setHours(0, 0, 0, 0);
      if (!lease.endDate) return today >= startDate;
      const endDate = new Date(lease.endDate);
      endDate.setHours(0, 0, 0, 0);
      return today >= startDate && today <= endDate;
    };
    const activeLease = viewingInvoice.resident.leases?.find(isLeaseActive);

    return (
      <InvoiceForm
        resident={viewingInvoice.resident}
        property={selectedProperty!}
        invoice={viewingInvoice.invoice}
        activeLease={activeLease}
        onSubmit={(updatedInvoice, meterSnapshotFile) => {
          onUpdateInvoice(selectedPropertyId, viewingInvoice.resident.id, viewingInvoice.invoice.id, updatedInvoice, meterSnapshotFile);
          // Navigate back to invoice view (remove /edit from URL)
          const currentPath = location.pathname.replace(/\/edit$/, '');
          navigate(currentPath);
        }}
        onCancel={() => {
          // Navigate back to invoice view (remove /edit from URL)
          const currentPath = location.pathname.replace(/\/edit$/, '');
          navigate(currentPath);
        }}
        onNavigateToResident={() => {
          const slug = getResidentSlugForResident(viewingInvoice.resident);
          const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
          if (currentSlug) {
            navigate(`/homeowner/properties/${currentSlug}/residents/${slug}/invoices`);
          } else {
            navigate(`/homeowner/residents/${slug}/invoices`);
          }
        }}
        allProperties={properties}
        onPropertySelect={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const prop = properties.find(p => p.id === propertyId);
          if (prop) {
            const slug = getPropertySlugForProperty(prop);
            navigate(`/homeowner/properties/${slug}/residents`);
          }
        }}
        onPropertySettings={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const prop = properties.find(p => p.id === propertyId);
          if (prop) {
            const slug = getPropertySlugForProperty(prop);
            navigate(`/homeowner/properties/${slug}/settings/property-information`);
          }
        }}
      />
    );
  }

  if (viewingInvoice) {
    return (
      <InvoiceView
        resident={viewingInvoice.resident}
        invoice={viewingInvoice.invoice}
        property={selectedProperty!}
        onClose={() => {
          // Navigate back using browser history
          navigate(-1);
        }}
        onUpdateInvoice={(updatedInvoice, meterSnapshotFile) => {
          onUpdateInvoice(selectedPropertyId, viewingInvoice.resident.id, viewingInvoice.invoice.id, updatedInvoice, meterSnapshotFile);
          // Invoice will update via props on next render
        }}
        onEditResident={() => {
          setEditingResident(viewingInvoice.resident);
          const slug = getResidentSlugForResident(viewingInvoice.resident);
          navigate(`/homeowner/residents/${slug}`);
          setShowRenterForm(true);
        }}
      />
    );
  }

  // Show LeaseForm for add/edit lease routes
  if ((isAddLeaseRoute || isEditLeaseRoute) && viewingResidentDetails) {
    console.log('[HomeownerDashboard] LeaseForm route - isEditLeaseRoute:', isEditLeaseRoute);
    console.log('[HomeownerDashboard] LeaseForm route - leaseId from URL:', leaseId);
    console.log('[HomeownerDashboard] LeaseForm route - resident leases COUNT:', viewingResidentDetails.leases?.length || 0);
    console.log('[HomeownerDashboard] LeaseForm route - resident leases:', viewingResidentDetails.leases);

    // Log each lease with its generated slug
    viewingResidentDetails.leases?.forEach((lease, index) => {
      const slug = getLeaseSlug(lease);
      console.log(`[HomeownerDashboard] Lease ${index}: slug="${slug}", id="${lease.id}"`, lease);
    });

    const editingLease = isEditLeaseRoute && leaseId
      ? findLeaseBySlug(viewingResidentDetails.leases || [], leaseId) || null
      : null;

    console.log('[HomeownerDashboard] LeaseForm route - editingLease found:', editingLease);

    const handleLeaseCancel = () => {
      const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
      const residentSlug = getResidentSlugForResident(viewingResidentDetails);
      if (currentSlug) {
        navigate(`/homeowner/properties/${currentSlug}/residents/${residentSlug}/leases`);
      } else {
        navigate(`/homeowner/residents/${residentSlug}/leases`);
      }
    };

    const handleLeaseSubmit = (lease: Omit<LeaseDocument, 'id'>) => {
      if (isEditLeaseRoute && editingLease) {
        // Use the actual lease ID (not the slug) for the API call
        onUpdateLease(selectedPropertyId, viewingResidentDetails.id, editingLease.id, lease);
      } else {
        onAddLease(selectedPropertyId, viewingResidentDetails.id, lease);
      }
      handleLeaseCancel(); // Navigate back to leases tab
    };

    const handleNavigateToProperty = () => {
      const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
      if (currentSlug) {
        navigate(`/homeowner/properties/${currentSlug}/dashboard`);
      }
    };

    const handleNavigateToResident = () => {
      const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
      const residentSlug = getResidentSlugForResident(viewingResidentDetails);
      if (currentSlug) {
        navigate(`/homeowner/properties/${currentSlug}/residents/${residentSlug}/leases`);
      } else {
        navigate(`/homeowner/residents/${residentSlug}/leases`);
      }
    };

    return (
      <LeaseForm
        resident={viewingResidentDetails}
        property={selectedProperty}
        units={filteredUnits}
        lease={editingLease}
        onSubmit={handleLeaseSubmit}
        onCancel={handleLeaseCancel}
        onLogout={onLogout}
        accountMenuItems={accountMenuItems}
        onNavigateToProperty={handleNavigateToProperty}
        onNavigateToResident={handleNavigateToResident}
        allProperties={properties}
        onPropertySelect={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const prop = properties.find(p => p.id === propertyId);
          if (prop) {
            const slug = getPropertySlugForProperty(prop);
            navigate(`/homeowner/properties/${slug}/residents`);
          }
        }}
        onPropertySettings={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const prop = properties.find(p => p.id === propertyId);
          if (prop) {
            const slug = getPropertySlugForProperty(prop);
            navigate(`/homeowner/properties/${slug}/settings/property-information`);
          }
        }}
      />
    );
  }

  if (viewingResidentDetails) {
    return (
      <ResidentDetails
        resident={viewingResidentDetails}
        property={selectedProperty!}
        allResidents={residents}
        units={mergedUnits}
        onClose={() => navigate('/homeowner/residents')}
        onEdit={() => {
          const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
          const residentSlug = getResidentSlugForResident(viewingResidentDetails);
          if (currentSlug) {
            navigate(`/homeowner/properties/${currentSlug}/residents/${residentSlug}/edit`);
          } else {
            navigate(`/homeowner/residents/${residentSlug}/edit`);
          }
        }}
        onDelete={async () => {
          await onDeleteResident(viewingResidentDetails.id);
          // Navigate to residents list - use property-scoped URL when available
          const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
          if (currentSlug) {
            navigate(`/homeowner/properties/${currentSlug}/residents`);
          } else {
            navigate('/homeowner/residents');
          }
        }}
        onResidentSelect={(residentId) => {
          const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
          // Preserve current tab when switching residents
          const tabSuffix = detailTab ? `/${detailTab}` : '';
          if (currentSlug) {
            navigate(`/homeowner/properties/${currentSlug}/residents/${residentId}${tabSuffix}`);
          } else {
            navigate(`/homeowner/residents/${residentId}${tabSuffix}`);
          }
        }}
        onViewInvoice={(invoice) => {
          const residentSlug = getResidentSlugForResident(viewingResidentDetails);
          navigate(`/homeowner/residents/${residentSlug}/invoice/${invoice.id}`);
        }}
        onAddInvoice={(invoice, meterSnapshotFile) => onAddInvoice(selectedPropertyId, viewingResidentDetails.id, invoice, meterSnapshotFile)}
        onUpdateInvoice={(invoiceId, invoice, meterSnapshotFile) => onUpdateInvoice(selectedPropertyId, viewingResidentDetails.id, invoiceId, invoice, meterSnapshotFile)}
        onDeleteInvoice={(invoiceId) => onDeleteInvoice(selectedPropertyId, viewingResidentDetails.id, invoiceId)}
        onDeleteLease={(leaseId) => onDeleteLease(selectedPropertyId, viewingResidentDetails.id, leaseId)}
        onUpdateResident={async (residentData) => {
          console.log('[HomeownerDashboard] Calling onUpdateResident with:', residentData);
          await onUpdateResident(selectedPropertyId, viewingResidentDetails.id, { ...viewingResidentDetails, ...residentData });
          console.log('[HomeownerDashboard] onUpdateResident complete');
          // Check for toast after update completes
          const stored = localStorage.getItem('property_form_toast');
          console.log('[HomeownerDashboard] Checking localStorage for toast:', stored);
          if (stored) {
            try {
              const data = JSON.parse(stored);
              console.log('[HomeownerDashboard] Setting resident toast:', data);
              setResidentToast({ show: true, ...data });
            } catch {
              // Invalid JSON, ignore
            }
          }
        }}
        onNavigateToProperty={() => {
          const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
          if (currentSlug) {
            navigate(`/homeowner/properties/${currentSlug}/dashboard`);
          }
        }}
        allProperties={properties}
        onPropertySelect={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const prop = properties.find(p => p.id === propertyId);
          if (prop) {
            const slug = getPropertySlugForProperty(prop);
            navigate(`/homeowner/properties/${slug}/residents`);
          }
        }}
        onPropertySettings={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const prop = properties.find(p => p.id === propertyId);
          if (prop) {
            const slug = getPropertySlugForProperty(prop);
            navigate(`/homeowner/properties/${slug}/settings/property-information`);
          }
        }}
        onLogout={onLogout}
        accountMenuItems={accountMenuItems}
      />
    );
  }

  // Show PropertyForm for property settings route or add-property route
  if (showPropertyForm || (isPropertiesRoute && isPropertySettingsRoute) || isAddPropertyRoute) {
    // Use unified PropertyForm for both add and edit
    // If editing (isPropertySettingsRoute), use selectedProperty
    // If adding (isAddPropertyRoute), use editingProperty or undefined
    const propertyToEdit = (isPropertiesRoute && isPropertySettingsRoute) ? selectedProperty : editingProperty;

    return (
      <>
      <PropertyForm
        property={propertyToEdit || undefined}
        propertyTab={propertyTab}
        onSubmit={handlePropertyFormSubmit}
        onCancel={handlePropertyFormCancel}
        onTabChange={handlePropertyTabChange}
        onLogout={onLogout}
        accountMenuItems={accountMenuItems}
        onSuccess={handlePropertyFormSuccess}
        units={mergedUnits}
        invites={invites}
        onAddUnit={onAddUnit}
        onUpdateUnit={onUpdateUnit}
        onDeleteUnit={onDeleteUnit}
        onGenerateInvite={onGenerateInvite}
        onSendInvite={onSendInvite}
        onDeleteInvite={onDeleteInvite}
        allProperties={properties}
        onPropertySelect={handlePropertySelect}
        onDeleteProperty={handlePropertyDelete}
        onAddCost={onAddCost}
        onUpdateCost={onUpdateCost}
        onDeleteCost={onDeleteCost}
        onUpdateCombinedUtilities={onUpdateCombinedUtilities}
      />
    </>
    );
  }

  // Get the resident being edited from the URL (supports both ID and slug)
  const residentToEdit = isEditResidentRoute && activeTenantId
    ? findResidentByIdOrSlug(activeTenantId) || null
    : editingResident;

  if (showRenterForm || isAddResidentRoute || isEditResidentRoute) {
    return (
      <>
        <ResidentForm
          resident={residentToEdit}
          units={mergedUnits}
          propertyId={selectedPropertyId}
          property={selectedProperty || undefined}
          onSubmit={handleResidentFormSubmit}
          onSuccess={(createdResident) => {
            // Navigation is now handled in handleResidentFormSubmit
            // This callback is kept for compatibility but doesn't need to do anything
            console.log('[HomeownerDashboard.onSuccess] Called - navigation already handled in onSubmit');
          }}
          onCancel={() => {
            setShowRenterForm(false);
            setEditingResident(null);
            // Navigate back to residents tab
            const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
            if (currentSlug) {
              navigate(`/homeowner/properties/${currentSlug}/residents`);
            } else {
              navigate('/homeowner/residents');
            }
          }}
          onDelete={residentToEdit ? async () => {
            await onDeleteResident(residentToEdit.id);
            setShowRenterForm(false);
            setEditingResident(null);
            // Navigate back to residents tab
            const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
            if (currentSlug) {
              navigate(`/homeowner/properties/${currentSlug}/residents`);
            } else {
              navigate('/homeowner/residents');
            }
          } : undefined}
          onLogout={onLogout}
          accountMenuItems={accountMenuItems}
          allProperties={properties}
          onPropertySelect={(propertyId) => {
            setSelectedPropertyId(propertyId);
            const prop = properties.find(p => p.id === propertyId);
            if (prop) {
              const slug = getPropertySlugForProperty(prop);
              navigate(`/homeowner/properties/${slug}/residents`);
            }
          }}
          onPropertySettings={(propertyId) => {
            setSelectedPropertyId(propertyId);
            const prop = properties.find(p => p.id === propertyId);
            if (prop) {
              const slug = getPropertySlugForProperty(prop);
              navigate(`/homeowner/properties/${slug}/settings/property-information`);
            }
          }}
        />
        {residentToast.show && (
          <AppToast
            show={true}
            onClose={() => {
              localStorage.removeItem('property_form_toast');
              setResidentToast({ show: false, variant: 'success', title: '', message: '' });
            }}
            title={residentToast.title}
            message={residentToast.message}
            variant={residentToast.variant}
          />
        )}
      </>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'residents', label: 'Residents' },
    { id: 'units', label: 'Applications' },
  ];

  return (
    <>
    <div className="bg-page">
      <PageHeader
        title={PORTAL_LABELS.HOMEOWNER}
        onLogout={onLogout}
        accountMenuItems={accountMenuItems}
        breadcrumbs={selectedProperty ? [
          { label: 'Manage Rentals' },
          { label: getPropertyDisplayName(selectedProperty.address, selectedProperty.address2), isActive: true, isPropertyDropdown: true }
        ] : undefined}
        subtitle={!selectedProperty ? "Manage your rentals" : undefined}
        propertyOptions={properties.map(p => ({
          id: p.id,
          label: getPropertyDisplayName(p.address, p.address2),
          isSelected: p.id === selectedPropertyId,
          slug: getPropertySlugForProperty(p)
        }))}
        onPropertySelect={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const property = properties.find(p => p.id === propertyId);
          if (property) {
            const slug = getPropertySlugForProperty(property);
            // Map tab IDs to route paths
            const tabRoute = activeTab === 'units' ? 'applications' : activeTab;
            navigate(`/homeowner/properties/${slug}/${tabRoute}`);
          }
        }}
        onPropertySettings={(propertyId) => {
          setSelectedPropertyId(propertyId);
          const property = properties.find(p => p.id === propertyId);
          if (property) {
            const slug = getPropertySlugForProperty(property);
            navigate(`/homeowner/properties/${slug}/settings/property-information`);
          }
        }}
      />

      {/* Loading State */}
      {isLoading ? (
        <main id="main-content" className="container-xl px-4 py-5">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <p className="text-muted">Loading your properties...</p>
          </div>
        </main>
      ) : properties.length === 0 ? (
        /* Empty State - No Properties */
        <main id="main-content" className="container-xl px-4 py-5">
          <div className="text-center py-5">
            <div className="mb-4">
              <Home size={64} className="text-muted" strokeWidth={1} />
            </div>
            <h2 className="h3 mb-3">Welcome to your Property Dashboard</h2>
            <p className="text-muted mb-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
              Get started by adding your first rental property. Once added, you'll be able to manage tenants, track payments, and generate invoices.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="d-inline-flex"
              onClick={() => navigate('/homeowner/properties/add/property-information')}
            >
              <Plus size={20} />
              Add Your First Property
            </Button>
          </div>
        </main>
      ) : (
          <main id="main-content" className="container-xl px-4 py-4 d-flex flex-column gap-4">
            {/* Action Bar */}
            <div className="d-flex align-items-center justify-content-between">
              <div>
                {selectedProperty && (
                  <Button
                    variant="tertiary"
                    className="d-inline-flex align-items-center gap-1"
                    onClick={() => {
                      const slug = getPropertySlugForProperty(selectedProperty);
                      navigate(`/homeowner/properties/${slug}/settings/property-information`);
                    }}
                  >
                    <Settings size={16} />
                    Property Settings
                  </Button>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="d-inline-flex align-items-center gap-1"
                onClick={() => navigate('/homeowner/properties/add/property-information')}
              >
                <Plus size={16} />
                Add Property
              </Button>
            </div>
            {/* Tab Navigation */}
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId) => {
                // Get current property slug for URL
                const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
                if (!currentSlug) {
                  // Fallback to old routes if no property selected
                  if (tabId === 'dashboard') {
                    navigate('/homeowner/dashboard');
                  } else if (tabId === 'residents') {
                    navigate('/homeowner/residents');
                  } else {
                    navigate(`/homeowner/dashboard/${tabId}`);
                  }
                  return;
                }
                // Use property-scoped URLs
                if (tabId === 'dashboard') {
                  navigate(`/homeowner/properties/${currentSlug}/dashboard`);
                } else if (tabId === 'residents') {
                  navigate(`/homeowner/properties/${currentSlug}/residents`);
                } else if (tabId === 'units') {
                  navigate(`/homeowner/properties/${currentSlug}/applications`);
                }
              }}
            />

        {/* Dashboard Tab Content */}
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
                  {dateRangeFilter.startDate.toLocaleDateString()} - {dateRangeFilter.endDate.toLocaleDateString()}
                </div>
              </div>
              <div className="d-flex flex-wrap gap-3 align-items-center">
                {(['ytd', '1y', '2y', '3y', 'custom'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={dateRangeFilter.type === range ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => onDateRangeChange(range)}
                  >
                    {range === 'ytd' ? 'Year to Date' :
                     range === '1y' ? 'Last Year' :
                     range === '2y' ? 'Last 2 Years' :
                     range === '3y' ? 'Last 3 Years' : 'Custom'}
                  </Button>
                ))}
                {dateRangeFilter.type === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={dateRangeFilter.customStartDate || ''}
                      onChange={(e) => onDateRangeChange('custom', e.target.value, dateRangeFilter.customEndDate)}
                      className="form-control form-control-sm w-auto"
                    />
                    <span className="text-muted fw-semibold">to</span>
                    <input
                      type="date"
                      value={dateRangeFilter.customEndDate || ''}
                      onChange={(e) => onDateRangeChange('custom', dateRangeFilter.customStartDate, e.target.value)}
                      className="form-control form-control-sm w-auto"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Financial Stats */}
            <div className="row g-4">
              <div className="col-md-6 col-lg-3">
                <StatCard
                  label="Rent Collected"
                  value={`$${totalRentCollected.toFixed(0)}`}
                  description="Total paid rent"
                  icon={<DollarSign size={24} color="white" />}
                  iconBgClass="stat-icon-success"
                />
              </div>
              <div className="col-md-6 col-lg-3">
                <StatCard
                  label="Electric Collected"
                  value={`$${totalElectricCollected.toFixed(0)}`}
                  description="Total electric fees"
                  icon={<Zap size={24} color="white" />}
                  iconBgClass="stat-icon-info"
                />
              </div>
              <div className="col-md-6 col-lg-3">
                <StatCard
                  label="Total Costs"
                  value={`$${totalCosts.toFixed(0)}`}
                  description="Property expenses"
                  icon={<TrendingUp size={24} color="white" />}
                  iconBgClass="stat-icon-danger"
                />
              </div>
              <div className="col-md-6 col-lg-3">
                <StatCard
                  label="Net Income"
                  value={`$${netIncome.toFixed(0)}`}
                  description="Income - Expenses"
                  icon={<TrendingUp size={24} color="white" />}
                  iconBgClass="stat-icon-light"
                  highlight={true}
                />
              </div>
            </div>

            {/* Charts */}
            <div className="row g-4">
              <div className="col-lg-6">
                <div className="chart-container">
                  <h3 className="h5 fw-bold mb-4">Net Income Trend</h3>
                  {monthlyNetIncomeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyNetIncomeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Net Income']}
                        />
                        <Line
                          type="monotone"
                          dataKey="netIncome"
                          stroke="#667eea"
                          strokeWidth={3}
                          dot={{ fill: '#667eea', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center text-muted" style={{ height: '300px' }}>
                      No income data for selected date range
                    </div>
                  )}
                </div>
              </div>
              <div className="col-lg-6">
                <div className="chart-container">
                  <h3 className="h5 fw-bold mb-4">Expense Breakdown</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="35%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '13px', paddingLeft: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tenants Tab Content */}
        {activeTab === 'residents' && (
          <Card className="border-0 shadow-lg rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h3 className="mb-1">Residents</h3>
                  <p className="text-muted mb-0">Manage your property residents</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const currentSlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);
                    if (currentSlug) {
                      navigate(`/homeowner/properties/${currentSlug}/residents/add`);
                    } else {
                      navigate('/homeowner/residents/add');
                    }
                  }}
                  className="btn-gradient border-0 px-3 py-2"
                >
                  <Plus size={16} className="me-1" />
                  Add Resident
                </Button>
              </div>

              {residents.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3">
                  <p className="text-muted mb-0">No residents added yet</p>
                  <small className="text-muted">Select "Add Resident" to add your first resident</small>
                </div>
              ) : (
                <>
                  {/* Search Filter */}
                  <div className="mb-4" style={{ maxWidth: '400px' }}>
                    <div className="position-relative">
                      <Search className="position-absolute top-50 translate-middle-y ms-3 text-muted" size={18} />
                      <input
                        type="text"
                        placeholder="Filter residents by name or unit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control ps-5"
                      />
                    </div>
                  </div>

                  {/* Tenants List */}
                  {filteredResidents.length > 0 ? (
                    <div className="d-flex flex-column gap-4">
                      {filteredResidents.map((resident) => {
                        const latestInvoice = getLatestInvoice(resident);
                        const total = latestInvoice ? calculateInvoiceTotal(latestInvoice) : 0;
                        const isPaid = latestInvoice?.isPaid ?? true;

                        // Year-to-Date calculations for resident card
                        const residentRentCollected = resident.invoices.filter(inv => inv.isPaid && isInvoiceYTD(inv)).reduce((sum, inv) => sum + inv.currentRent, 0);
                        const residentElectricCollected = resident.invoices.filter(inv => inv.isPaid && isInvoiceYTD(inv)).reduce((sum, inv) =>
                          sum + (inv.previousMonthElectricUsageKwh * inv.electricRate), 0
                        );

                        const occupants = getOccupantsFromResident(resident);
                        const occupantsDisplay = formatOccupantsNames(occupants);

                        // Get primary occupant's contact info
                        const primaryOccupant = occupants[0];
                        const primaryEmail = primaryOccupant?.email || resident.email || '';
                        const primaryPhone = primaryOccupant?.phone || resident.phone || '';

                        // Debug: Log resident data structure
                        console.log('[TenantCard] Resident data:', {
                          id: resident.id,
                          name: resident.name,
                          email: resident.email,
                          occupants: resident.occupants,
                          occupantsDisplay,
                        });

                        // Debug: Log latest invoice data
                        if (latestInvoice) {
                          console.log('[TenantCard] Latest invoice data:', {
                            currentRent: latestInvoice.currentRent,
                            previousMonthElectricUsageKwh: latestInvoice.previousMonthElectricUsageKwh,
                            electricRate: latestInvoice.electricRate,
                            previousMonthLateFee: latestInvoice.previousMonthLateFee,
                            adjustments: latestInvoice.adjustments,
                            total,
                          });
                        }

                        // Get property slug for URL generation
                        const currentPropertySlug = propertySlug || (selectedProperty ? getPropertySlugForProperty(selectedProperty) : null);

                        // Generate URLs for accessibility (prefer slug, fallback to ID)
                        const getResidentUrl = () => {
                          const residentSlugOrId = (() => {
                            if (resident.occupants && resident.occupants.length > 0) {
                              const slug = generateResidentSlug(resident.occupants);
                              if (slug) return slug;
                            }
                            return resident.id;
                          })();

                          // Include property slug in URL for proper context
                          const url = currentPropertySlug
                            ? `/homeowner/properties/${currentPropertySlug}/residents/${residentSlugOrId}`
                            : `/homeowner/residents/${residentSlugOrId}`;

                          console.log('[TenantCard] Resident URL:', url, 'for resident:', resident.id, occupantsDisplay);
                          return url;
                        };

                        const getInvoiceUrl = () => {
                          if (!latestInvoice) return undefined;

                          const residentSlugOrId = (() => {
                            if (resident.occupants && resident.occupants.length > 0) {
                              const slug = generateResidentSlug(resident.occupants);
                              if (slug) return slug;
                            }
                            return resident.id;
                          })();

                          // Generate invoice slug from month (e.g., "December 2024" → "december-01-2024")
                          const invoiceSlug = generateInvoiceSlug(latestInvoice.month);

                          // Include property slug in URL for proper context
                          const url = currentPropertySlug
                            ? `/homeowner/properties/${currentPropertySlug}/residents/${residentSlugOrId}/invoices/${invoiceSlug}/view`
                            : `/homeowner/residents/${residentSlugOrId}/invoices/${invoiceSlug}/view`;

                          console.log('[TenantCard] Invoice URL:', url, 'for invoice:', latestInvoice.id, 'month:', latestInvoice.month);
                          return url;
                        };

                        return (
                          <div key={resident.id}>
                            <TenantCard
                              name={occupantsDisplay}
                              unit={resident.aptNumber}
                              email={primaryEmail}
                              phone={primaryPhone}
                              rentCollected={residentRentCollected}
                              electricCollected={residentElectricCollected}
                              latestInvoiceAmount={total}
                              latestInvoiceMonth={latestInvoice?.month}
                              isPaid={isPaid}
                              residentHref={getResidentUrl()}
                              invoiceHref={getInvoiceUrl()}
                              onClick={() => navigate(getResidentUrl())}
                              onViewInvoice={latestInvoice ? () => navigate(getInvoiceUrl()!) : undefined}
                              latestInvoice={latestInvoice ? {
                                currentRent: latestInvoice.currentRent,
                                previousMonthElectricUsageKwh: latestInvoice.previousMonthElectricUsageKwh,
                                electricRate: latestInvoice.electricRate,
                                daysLate: latestInvoice.daysLate,
                                lateFeeDailyRate: latestInvoice.lateFeeDailyRate,
                                prevMonthBalanceAdjustment: latestInvoice.prevMonthBalanceAdjustment,
                                prevMonthLateFeeAdjustment: latestInvoice.prevMonthLateFeeAdjustment,
                                prevMonthElectricAdjustment: latestInvoice.prevMonthElectricAdjustment,
                              } : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-5 bg-light rounded-3">
                      <p className="text-muted mb-0">No residents match your search</p>
                      <small className="text-muted">Try a different search term</small>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Units & Applications Tab Content */}
        {activeTab === 'units' && (
          <ApplicationsTab
            applications={filteredApplications}
            units={filteredUnits}
            properties={properties}
            onApprove={(applicationId) => {
              console.log('Approve application:', applicationId);
            }}
            onReject={(applicationId) => {
              console.log('Reject application:', applicationId);
            }}
            onSendInvite={onSendInvite}
          />
        )}
          </main>
      )}
    </div>

    {/* Welcome Toast - Rendered outside bg-page to avoid z-index stacking context */}
    {welcomeToastData && (
      <AppToast
        show={true}
        onClose={onCloseWelcomeToast}
        title={welcomeToastData.title}
        message={welcomeToastData.message}
        variant="success"
        autohide={false}
      />
    )}

    {/* Property Deleted Toast */}
    {deletePropertyToast.show && (
      <AppToast
        show={true}
        onClose={() => {
          localStorage.removeItem('delete_property_toast');
          setDeletePropertyToast({ show: false, address: '' });
        }}
        title="Property Deleted"
        message={`Property "${deletePropertyToast.address}" has been deleted`}
        variant="success"
      />
    )}

    {/* Resident Operation Toast (Add/Update/Delete) */}
    {residentToast.show && (
      <>
        {console.log('[HomeownerDashboard] 🎉 Rendering resident toast:', { title: residentToast.title, message: residentToast.message, variant: residentToast.variant })}
        <AppToast
          show={true}
          onClose={() => {
            console.log('[HomeownerDashboard] Toast closed by user, clearing localStorage');
            localStorage.removeItem('property_form_toast');
            setResidentToast({ show: false, variant: 'success', title: '', message: '' });
          }}
          title={residentToast.title}
          message={residentToast.message}
          variant={residentToast.variant}
        />
      </>
    )}

    {/* Delete Account Confirmation Modal */}
    <Modal
      show={showDeleteAccountModal}
      onHide={() => {
        setShowDeleteAccountModal(false);
        setDeleteConfirmText('');
      }}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2 text-danger">
          <AlertTriangle size={24} />
          Delete Account
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-3">
          <strong>This action cannot be undone.</strong> This will permanently delete your account and all associated data including:
        </p>
        <ul className="mb-4">
          <li>All properties and their settings</li>
          <li>All tenant records and invoices</li>
          <li>All payment history</li>
          <li>All uploaded documents</li>
        </ul>
        <p className="mb-2">
          To confirm, please type <strong>DELETE</strong> below:
        </p>
        <input
          type="text"
          className="form-control"
          placeholder="Type DELETE to confirm"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          autoComplete="off"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => {
            setShowDeleteAccountModal(false);
            setDeleteConfirmText('');
          }}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleDeleteAccount}
          disabled={deleteConfirmText !== 'DELETE'}
        >
          <Trash2 size={16} />
          Delete My Account
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
}
