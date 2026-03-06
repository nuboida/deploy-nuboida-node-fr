import { useState, useRef, useEffect, memo } from 'react';
import { Container, Card, Form, Button, Modal, Table, Dropdown, Row, Col, InputGroup, Badge, Spinner } from 'react-bootstrap';
import { Plus, X, Edit2, Check, ChevronDown, Trash2, Send, Copy, ArrowLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PageHeader, AccountMenuItem, BreadcrumbItem, PropertyOption } from '../common/PageHeader';
import { TabNavigation } from '../common/TabNavigation';
import { AppToast } from '../common/AppToast';
import { PORTAL_LABELS } from '../../config/labels';
import { copyToClipboard } from '../../utils/clipboard';
import BonusPoolManager from './BonusPoolManager';
import PaymentInfoForm from './PaymentInfoForm';
import { getPropertyDisplayName } from '../../utils/slug';
import { messages } from '../../utils/messages';
import type { Property, PropertyCost, Unit, Invite } from '../../App';

type PropertyFormProps = {
  property?: Property;
  propertyTab?: string;
  onSubmit: (property: Omit<Property, 'id'>) => void | Promise<void> | Promise<Property | void>;
  onCancel: () => void;
  onTabChange?: (tabId: string) => void;
  onLogout?: () => void;
  accountMenuItems?: AccountMenuItem[];
  onSuccess?: (createdProperty?: Property) => void; // Called after successful save with created property
  // Unit management props (only used when property exists)
  units?: Unit[];
  invites?: Invite[];
  onAddUnit?: (unit: Omit<Unit, 'id'>) => Promise<Unit>;
  onUpdateUnit?: (id: string, unit: Partial<Unit>) => Promise<Unit>;
  onDeleteUnit?: (id: string) => Promise<void>;
  onGenerateInvite?: (unitId: string) => void;
  onSendInvite?: (unitId: string, email: string, firstName?: string) => void | Promise<void>;
  onDeleteInvite?: (id: string) => void;
  // Property switching (when editing existing property)
  allProperties?: Property[];
  onPropertySelect?: (propertyId: string) => void;
  // Property deletion
  onDeleteProperty?: (id: string) => void;
};

const PREDEFINED_CATEGORIES = [
  'Mortgage',
  'Electricity',
  'Gas',
  'Heat',
  'Water',
  'Internet',
];

const CHART_COLORS = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Helper to get categories array from a cost (handles both API format and UI format)
const getCostCategories = (cost: PropertyCost): string[] => {
  // If categories array exists and has items, use it
  if (cost.categories && cost.categories.length > 0) {
    return cost.categories;
  }
  // Otherwise, use category array from API
  if (cost.category && cost.category.length > 0) {
    return cost.category;
  }
  return [];
};

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

const STORAGE_KEY = 'propertyFormData';

// Helper to get initial form data from sessionStorage or defaults
const getInitialFormData = (property?: Property) => {
  // If editing an existing property, use that data
  if (property) {
    return {
      name: property.name || '',
      address: property.address || '',
      address2: property.address2 || '',
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zipCode || '',
      residents: property.residents || [],
      costs: property.costs || [],
      units: property.units || [],
    };
  }

  // For new property, try to restore from sessionStorage
  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Ignore parse errors
    }
  }

  // Default empty form
  return {
    name: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    residents: [],
    costs: [],
    units: [],
  };
};

function PropertyForm({
  property,
  propertyTab,
  onSubmit,
  onCancel,
  onTabChange,
  onLogout,
  accountMenuItems,
  onSuccess,
  units = [],
  invites = [],
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onGenerateInvite,
  onSendInvite,
  onDeleteInvite,
  allProperties = [],
  onPropertySelect,
  onDeleteProperty,
}: PropertyFormProps) {
  // Debug: Log every render
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`[PropertyForm] RENDER #${renderCountRef.current}`, {
    propertyId: property?.id,
    propertyTab
  });

  const [formData, setFormData] = useState(() => getInitialFormData(property));

  // Track successful save to prevent form reset during navigation delay
  // Must be declared before the useEffect that uses it
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form data when property prop changes (e.g., after save/update or when switching properties)
  // Skip if we just saved successfully - prevents form reset during navigation delay
  useEffect(() => {
    if (property && !saveSuccess) {
      setFormData({
        name: property.name || '',
        address: property.address || '',
        address2: property.address2 || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        residents: property.residents || [],
        costs: property.costs || [],
        units: property.units || [],
      });
    }
  }, [property?.id, property?.name, property?.address, property?.address2, property?.city, property?.state, property?.zipCode, property?.costs, property?.units, saveSuccess]);

  const [showCostModal, setShowCostModal] = useState(false);
  const [editingCost, setEditingCost] = useState<PropertyCost | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');

  const [costFormData, setCostFormData] = useState({
    selectedCategories: [] as string[],
    displayName: '',
    amount: 0,
  });

  // Toast state - initialize from localStorage to persist across navigation
  const [showToast, setShowToast] = useState(() => {
    const stored = localStorage.getItem('property_form_toast');
    return !!stored;
  });
  const [toastMessage, setToastMessage] = useState(() => {
    const stored = localStorage.getItem('property_form_toast');
    console.log('[PropertyForm] Toast init - localStorage raw value:', stored);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('[PropertyForm] Toast init - parsed object:', JSON.stringify(parsed, null, 2));
        console.log('[PropertyForm] Toast init - parsed.title:', parsed.title);
        console.log('[PropertyForm] Toast init - parsed.description:', parsed.description);
        const result = { title: parsed.title || '', description: parsed.description || '' };
        console.log('[PropertyForm] Toast init - final toastMessage state:', result);
        return result;
      } catch (e) {
        console.error('[PropertyForm] Toast init - parse error:', e);
        return { title: '', description: '' };
      }
    }
    console.log('[PropertyForm] Toast init - no stored value, using defaults');
    return { title: '', description: '' };
  });
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'warning' | 'info'>(() => {
    const stored = localStorage.getItem('property_form_toast');
    console.log('[PropertyForm] Toast variant init - localStorage raw value:', stored);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('[PropertyForm] Toast variant init - parsed.variant:', parsed.variant);
        const result = parsed.variant || 'success';
        console.log('[PropertyForm] Toast variant init - final variant:', result);
        return result;
      } catch (e) {
        console.error('[PropertyForm] Toast variant init - parse error:', e);
        return 'success';
      }
    }
    console.log('[PropertyForm] Toast variant init - no stored value, using default: success');
    return 'success';
  });
  const [isSaving, setIsSaving] = useState(false);
  // Initialize isRedirecting from localStorage to persist across navigation
  const [isRedirecting, setIsRedirecting] = useState(() => {
    return localStorage.getItem('property_form_redirecting') === 'true';
  });

  // Clear persisted toast and redirecting state from localStorage after they've been loaded
  useEffect(() => {
    if (showToast) {
      localStorage.removeItem('property_form_toast');
    }
    if (isRedirecting) {
      // Clear the redirecting state after a short delay to let the user see it
      const timer = setTimeout(() => {
        localStorage.removeItem('property_form_redirecting');
        setIsRedirecting(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Check for toast updates in localStorage (e.g., after invite is sent)
  useEffect(() => {
    const checkToast = () => {
      const stored = localStorage.getItem('property_form_toast');
      console.log('[PropertyForm] useEffect - Checking localStorage for toast:', stored);
      if (stored && !showToast) {
        try {
          const parsed = JSON.parse(stored);
          console.log('[PropertyForm] useEffect - Found new toast, displaying:', parsed);
          setToastMessage({ title: parsed.title || '', description: parsed.description || '' });
          setToastVariant(parsed.variant || 'success');
          setShowToast(true);
        } catch (e) {
          console.error('[PropertyForm] useEffect - Error parsing toast:', e);
        }
      }
    };

    // Check immediately
    checkToast();

    // Also check when invites change (after sendInvite completes)
    const timer = setTimeout(checkToast, 100);
    return () => clearTimeout(timer);
  }, [invites, showToast]);

  // Delete property confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete cost confirmation modal state
  const [showDeleteCostModal, setShowDeleteCostModal] = useState(false);
  const [costToDelete, setCostToDelete] = useState<PropertyCost | null>(null);

  // Delete unit confirmation modal state
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    if (!property) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, property]);

  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(-1);

  // Map URL tab to internal tab - use URL-based tab if provided, otherwise default to 'info'
  type TabType = 'info' | 'costs' | 'units' | 'payment' | 'bonus';
  const getActiveTab = (): TabType => {
    switch (propertyTab) {
      case 'monthly-costs': return 'costs';
      case 'units': return 'units';
      case 'payment-info': return 'payment';
      case 'bonus-pool': return 'bonus';
      default: return 'info'; // 'property-information' or default
    }
  };
  const activeTab = getActiveTab();

  // Units state
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitFormData, setUnitFormData] = useState({
    number: '',
    address: '',
    rentAmount: '',
    securityDepositMultiplier: '1.5',
    securityDepositCustom: '',
    status: 'vacant' as 'vacant' | 'occupied' | 'pending',
    payStubsWeeks: '12',
    bankStatementsMonths: '3',
  });

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUnitForInvite, setSelectedUnitForInvite] = useState<Unit | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Get units for this property
  const propertyUnits = property ? units.filter(u => u.propertyId === property.id) : [];

  console.log('[PropertyForm] ALL units prop:', units);
  console.log('[PropertyForm] propertyUnits for this property:', propertyUnits);
  console.log('[PropertyForm] First unit:', propertyUnits[0]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const allCategories = [...PREDEFINED_CATEGORIES, ...customCategories];

  // Get categories that are already used (excluding the one being edited)
  const usedCategories = formData.costs
    .filter(cost => editingCost ? cost.id !== editingCost.id : true)
    .flatMap(cost => getCostCategories(cost));

  const availableCategories = allCategories.filter(cat => !usedCategories.includes(cat));

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Core save function that can be called with optional overrides (for immediate state updates)
  const performSave = async (dataOverrides?: Partial<PropertyFormData>, options?: { showPropertyToast?: boolean }) => {
    console.log('[performSave] Called with dataOverrides:', dataOverrides);
    console.log('[performSave] Current formData:', formData);
    setIsSaving(true);

    try {
      // Merge any overrides with current form data
      const currentData = dataOverrides ? { ...formData, ...dataOverrides } : formData;
      console.log('[performSave] Merged currentData:', currentData);

      // Auto-generate property name from address
      const dataToSubmit = {
        ...currentData,
        name: getPropertyDisplayName(currentData.address, currentData.address2),
      };
      console.log('[PropertyForm] Submitting form data:', dataToSubmit);
      const result = await onSubmit(dataToSubmit);
      console.log('[PropertyForm] Submit successful, result:', result);
      // Clear saved form data on successful submit
      sessionStorage.removeItem(STORAGE_KEY);
      // Mark save as successful to prevent form reset during navigation delay
      setSaveSuccess(true);

      // Show property-level toast only when explicitly requested (e.g., from main Save button)
      if (options?.showPropertyToast) {
        // Prepare toast data using centralized messages
        const propertyAddress = getPropertyDisplayName(currentData.address, currentData.address2);
        const msg = property
          ? messages.properties.updated(propertyAddress)
          : messages.properties.created(propertyAddress);
        const toastData = {
          title: msg.title,
          description: msg.message,
          variant: 'success' as const,
        };

        // For new properties that will redirect, persist toast and redirecting state to localStorage
        // so they survive the navigation/remount
        if (!property && onSuccess) {
          localStorage.setItem('property_form_toast', JSON.stringify(toastData));
          localStorage.setItem('property_form_redirecting', 'true');
        }

        // Show success toast
        setToastMessage({ title: toastData.title, description: toastData.description });
        setToastVariant('success');
        setShowToast(true);
      }

      // Keep isSaving true during redirect for new properties, transition to redirecting state
      if (!property && onSuccess) {
        setIsSaving(false);
        setIsRedirecting(true);
        // Call onSuccess after a delay to let user see the toast, passing the created property
        // Only redirect for NEW properties - existing properties should stay on current page
        setTimeout(() => {
          onSuccess(result as Property | undefined);
        }, 2000);
      } else {
        setIsSaving(false);
      }

      return true;
    } catch (error: any) {
      console.error('[PropertyForm] Submit failed:', error);
      // Show error toast
      setToastMessage({
        title: 'Save Failed',
        description: error.message || 'Failed to save property. Please try again.',
      });
      setToastVariant('error');
      setShowToast(true);
      setIsSaving(false);
      // Don't re-throw and don't call onSuccess - let user fix and retry
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSave(undefined, { showPropertyToast: true });
  };

  // Handler for cancel that clears saved form data
  const handleCancel = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    // Note: Toast localStorage is cleared globally by ClearToastsOnNavigation in App.tsx
    onCancel();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const openAddCostModal = () => {
    setEditingCost(null);
    setCostFormData({ selectedCategories: [], displayName: '', amount: 0 });
    setShowCustomInput(false);
    setNewCustomName('');
    setShowCostModal(true);
  };

  const openEditCostModal = (cost: PropertyCost) => {
    setEditingCost(cost);
    setCostFormData({
      selectedCategories: getCostCategories(cost),
      displayName: cost.name,
      amount: cost.amount,
    });
    setShowCustomInput(false);
    setNewCustomName('');
    setShowCostModal(true);
  };

  const handleToggleCategory = (category: string) => {
    setCostFormData(prev => {
      const isSelected = prev.selectedCategories.includes(category);
      const newCategories = isSelected
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category];
      
      // Auto-generate display name if not manually edited
      const autoGeneratedName = generateCostName(newCategories);
      
      return {
        ...prev,
        selectedCategories: newCategories,
        displayName: autoGeneratedName,
      };
    });
  };

  const generateCostName = (categories: string[]) => {
    if (categories.length === 0) return '';
    if (categories.length === 1) return categories[0];
    if (categories.length === 2) return `${categories[0]} & ${categories[1]}`;
    return categories.slice(0, -1).join(', ') + ' & ' + categories[categories.length - 1];
  };

  const handleAddCustomCategory = () => {
    if (newCustomName.trim() && !allCategories.includes(newCustomName.trim())) {
      const customCat = newCustomName.trim();
      setCustomCategories(prev => [...prev, customCat]);
      
      // Auto-select the newly added category
      setCostFormData(prev => {
        const newCategories = [...prev.selectedCategories, customCat];
        return {
          ...prev,
          selectedCategories: newCategories,
          displayName: generateCostName(newCategories),
        };
      });
      
      setNewCustomName('');
      setShowCustomInput(false);
    }
  };

  const handleSaveCost = async () => {
    console.log('[handleSaveCost] Called with costFormData:', costFormData);

    if (costFormData.selectedCategories.length === 0 || costFormData.amount <= 0 || !costFormData.displayName.trim()) {
      console.log('[handleSaveCost] Validation failed - returning early');
      return;
    }

    console.log('[handleSaveCost] Validation passed, proceeding...');
    const isUpdating = !!editingCost;
    let updatedCosts: PropertyCost[];

    if (editingCost) {
      // Update existing cost - preserve existing type/frequency/enabled or use defaults
      updatedCosts = formData.costs.map(c =>
        c.id === editingCost.id
          ? {
              ...c,
              name: costFormData.displayName.trim(),
              amount: costFormData.amount,
              category: costFormData.selectedCategories,  // Array for API
              categories: costFormData.selectedCategories,  // Keep for UI compatibility
              type: c.type || 'fixed',
              frequency: c.frequency || 'monthly',
              enabled: c.enabled !== false,
            }
          : c
      );
    } else {
      // Add new cost with required API fields
      const cost: PropertyCost = {
        id: `cost-${Date.now()}`,
        name: costFormData.displayName.trim(),
        amount: costFormData.amount,
        type: 'fixed', // Default to fixed cost
        frequency: 'monthly', // Default to monthly
        enabled: true, // Default to enabled
        category: costFormData.selectedCategories,  // Array for API
        categories: costFormData.selectedCategories,  // Keep for UI compatibility
      };
      updatedCosts = [...formData.costs, cost];
    }

    console.log('[handleSaveCost] Updated costs array:', updatedCosts);

    // Capture toast message data before async operation
    const costName = costFormData.displayName.trim();
    const costValue = `$${costFormData.amount.toFixed(2)}`;
    const msg = isUpdating
      ? messages.properties.monthlyCosts.updated(costName, costValue)
      : messages.properties.monthlyCosts.created(costName, costValue);

    // Update local state and close modal
    setFormData(prev => ({ ...prev, costs: updatedCosts }));
    setShowCostModal(false);
    setEditingCost(null);

    console.log('[handleSaveCost] About to call performSave with costs:', updatedCosts);

    // Persist toast to localStorage BEFORE calling performSave
    // This ensures toast survives if component remounts due to parent state changes
    const toastData = {
      title: msg.title,
      description: msg.message,
      variant: 'success' as const,
    };
    localStorage.setItem('property_form_toast', JSON.stringify(toastData));

    // Auto-save to backend with the updated costs
    const didSave = await performSave({ costs: updatedCosts });

    // Show success toast (either from state if component didn't remount, or from localStorage on remount)
    if (didSave) {
      console.log('[handleSaveCost] Save successful, showing toast:', { title: msg.title, message: msg.message });
      setToastMessage({
        title: msg.title,
        description: msg.message,
      });
      setToastVariant('success');
      setShowToast(true);
    } else {
      // Clear persisted toast on failure (performSave shows its own error toast)
      localStorage.removeItem('property_form_toast');
    }
  };

  const handleOpenDeleteCostModal = (cost: PropertyCost) => {
    setCostToDelete(cost);
    setShowDeleteCostModal(true);
  };

  const handleConfirmDeleteCost = async () => {
    if (!costToDelete) return;

    // Capture toast message data before async operation
    const costName = costToDelete.name;
    const costValue = `$${costToDelete.amount.toFixed(2)}`;
    const msg = messages.properties.monthlyCosts.deleted(costName, costValue);

    // Calculate updated costs before state update
    const updatedCosts = formData.costs.filter(c => c.id !== costToDelete.id);

    // Update local state
    setFormData(prev => ({
      ...prev,
      costs: updatedCosts,
    }));

    // Close modal and reset state
    setShowDeleteCostModal(false);
    setCostToDelete(null);

    // Persist toast to localStorage BEFORE calling performSave
    // This ensures toast survives if component remounts due to parent state changes
    const toastData = {
      title: msg.title,
      description: msg.message,
      variant: 'success' as const,
    };
    localStorage.setItem('property_form_toast', JSON.stringify(toastData));

    // Auto-save to backend with the updated costs
    const didSave = await performSave({ costs: updatedCosts });

    // Show success toast (either from state if component didn't remount, or from localStorage on remount)
    if (didSave) {
      setToastMessage({
        title: msg.title,
        description: msg.message,
      });
      setToastVariant('success');
      setShowToast(true);
    } else {
      // Clear persisted toast on failure (performSave shows its own error toast)
      localStorage.removeItem('property_form_toast');
    }
  };

  const startEditAmount = (cost: PropertyCost) => {
    setEditingAmountId(cost.id);
    setTempAmount(cost.amount.toString());
  };

  const saveEditAmount = async (costId: string) => {
    const newAmount = parseFloat(tempAmount) || 0;
    const updatedCosts = formData.costs.map(c =>
      c.id === costId ? { ...c, amount: newAmount } : c
    );

    setFormData(prev => ({
      ...prev,
      costs: updatedCosts,
    }));
    setEditingAmountId(null);

    // Auto-save to backend with the updated costs
    await performSave({ costs: updatedCosts });
  };

  const cancelEditAmount = () => {
    setEditingAmountId(null);
  };

  // ============================================
  // DELETE PROPERTY
  // ============================================

  const handleDeleteProperty = async () => {
    if (!property || !onDeleteProperty) return;

    setIsDeleting(true);
    try {
      await onDeleteProperty(property.id);
      setShowDeleteModal(false);
      // Navigation will be handled by the parent component
    } catch (error) {
      console.error('Error deleting property:', error);
      setToastMessage({ title: 'Error', description: 'Failed to delete property' });
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================
  // MANAGED UNITS (for existing properties)
  // ============================================

  const handleOpenUnitModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);

      // Calculate multiplier from existing security deposit
      const rent = unit.rentAmount;
      const deposit = unit.securityDeposit || 0;
      let multiplier = 'custom'; // Default to custom for existing units
      let customAmount = '';

      if (rent > 0) {
        if (deposit === 0) {
          // If deposit is 0, show custom with 0
          multiplier = 'custom';
          customAmount = '0';
        } else {
          const calculatedMultiplier = deposit / rent;
          const standardMultipliers = [0.5, 1, 1.5, 2.5];

          // Check with small tolerance for floating point precision
          const matchedMultiplier = standardMultipliers.find(
            m => Math.abs(calculatedMultiplier - m) < 0.01
          );

          if (matchedMultiplier !== undefined) {
            multiplier = matchedMultiplier.toString();
          } else {
            multiplier = 'custom';
            customAmount = deposit.toString();
          }
        }
      } else {
        // No rent set, show custom with current deposit
        multiplier = 'custom';
        customAmount = deposit.toString();
      }

      setUnitFormData({
        number: unit.number,
        address: unit.address || '',
        rentAmount: unit.rentAmount.toString(),
        securityDepositMultiplier: multiplier,
        securityDepositCustom: customAmount,
        status: unit.status,
        payStubsWeeks: unit.requirements?.payStubsWeeks?.toString() || '12',
        bankStatementsMonths: unit.requirements?.bankStatementsMonths?.toString() || '3',
      });
    } else {
      setEditingUnit(null);
      setUnitFormData({
        number: '',
        address: '',
        rentAmount: '',
        securityDepositMultiplier: '1.5',
        securityDepositCustom: '',
        status: 'vacant',
        payStubsWeeks: '12',
        bankStatementsMonths: '3',
      });
    }
    setShowUnitModal(true);
  };

  const handleSaveUnit = async () => {
    if (!property || !onAddUnit || !onUpdateUnit) return;

    const isUpdating = !!editingUnit;
    const unitNumber = unitFormData.number;

    // Calculate security deposit based on multiplier
    const rentAmount = parseFloat(unitFormData.rentAmount);
    let securityDeposit = 0;

    if (unitFormData.securityDepositMultiplier === 'custom') {
      securityDeposit = unitFormData.securityDepositCustom ? parseFloat(unitFormData.securityDepositCustom) : 0;
    } else {
      const multiplier = parseFloat(unitFormData.securityDepositMultiplier);
      securityDeposit = rentAmount * multiplier;
    }

    const unitData = {
      propertyId: property.id,
      number: unitFormData.number,
      address: unitFormData.address || undefined,
      rentAmount: rentAmount,
      securityDeposit: securityDeposit,
      status: unitFormData.status,
      requirements: {
        payStubsWeeks: parseInt(unitFormData.payStubsWeeks),
        bankStatementsMonths: parseInt(unitFormData.bankStatementsMonths),
      },
    };

    setShowUnitModal(false);

    try {
      // Call parent function (API call)
      let result: any;
      if (editingUnit) {
        result = await onUpdateUnit(editingUnit.id, unitData);
      } else {
        result = await onAddUnit(unitData);
      }

      // Use API response message if available, otherwise use local messages
      let msg;
      if (result?.title && result?.message) {
        msg = { title: result.title, message: result.message };
      } else {
        msg = isUpdating
          ? messages.properties.units.updated(unitNumber)
          : messages.properties.units.created(unitNumber, getPropertyDisplayName(property.address, property.address2));
      }

      // Persist toast to localStorage in case component remounts
      const toastData = {
        title: msg.title,
        description: msg.message,
        variant: 'success' as const,
      };
      localStorage.setItem('property_form_toast', JSON.stringify(toastData));

      // Show success toast
      setToastMessage({ title: msg.title, description: msg.message });
      setToastVariant('success');
      setShowToast(true);
    } catch (error: any) {
      console.error('[handleSaveUnit] Error:', error);
      // Show error toast
      setToastMessage({
        title: 'Error',
        description: error.message || `Failed to ${isUpdating ? 'update' : 'add'} unit`,
      });
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const handleOpenDeleteUnitModal = (unit: Unit) => {
    setUnitToDelete(unit);
    setShowDeleteUnitModal(true);
  };

  const handleConfirmDeleteUnit = async () => {
    if (!unitToDelete || !onDeleteUnit) return;

    const unitName = unitToDelete.name;

    setShowDeleteUnitModal(false);
    setUnitToDelete(null);

    try {
      // Call parent function (API call)
      await onDeleteUnit(unitToDelete.id);

      // Get success message from messages utility
      const msg = messages.properties.units.deleted(unitName);

      // Persist toast to localStorage in case component remounts
      const toastData = {
        title: msg.title,
        description: msg.message,
        variant: 'success' as const,
      };
      localStorage.setItem('property_form_toast', JSON.stringify(toastData));

      // Show success toast
      setToastMessage({ title: msg.title, description: msg.message });
      setToastVariant('success');
      setShowToast(true);
    } catch (error: any) {
      console.error('[handleConfirmDeleteUnit] Error:', error);
      // Show error toast
      setToastMessage({
        title: 'Error',
        description: error.message || 'Failed to delete unit',
      });
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const handleOpenInviteModal = (unit: Unit) => {
    setSelectedUnitForInvite(unit);
    setInviteEmail('');
    setInviteFirstName('');
    setShowInviteModal(true);
  };

  const handleSendInviteAction = async (viaEmail: boolean) => {
    console.log('[PropertyForm] handleSendInviteAction - START', { viaEmail, selectedUnitForInvite, inviteEmail, inviteFirstName });
    console.log('[PropertyForm] handleSendInviteAction - onGenerateInvite exists?', !!onGenerateInvite);
    console.log('[PropertyForm] handleSendInviteAction - onSendInvite exists?', !!onSendInvite);

    if (!selectedUnitForInvite) {
      console.log('[PropertyForm] handleSendInviteAction - No unit selected, returning');
      return;
    }

    if (viaEmail) {
      // Send email invite
      console.log('[PropertyForm] handleSendInviteAction - Email path');
      if (onSendInvite && inviteEmail) {
        console.log('[PropertyForm] handleSendInviteAction - Calling onSendInvite');
        setInviteSending(true);
        try {
          await onSendInvite(selectedUnitForInvite.id, inviteEmail, inviteFirstName);
        } finally {
          setInviteSending(false);
          setShowInviteModal(false);
        }
      } else {
        console.log('[PropertyForm] handleSendInviteAction - onSendInvite or inviteEmail missing', { onSendInvite: !!onSendInvite, inviteEmail });
      }
    } else {
      // Generate link
      console.log('[PropertyForm] handleSendInviteAction - Generate link path');
      if (onGenerateInvite) {
        console.log('[PropertyForm] handleSendInviteAction - Calling onGenerateInvite with unitId:', selectedUnitForInvite.id);
        onGenerateInvite(selectedUnitForInvite.id);
      } else {
        console.log('[PropertyForm] handleSendInviteAction - onGenerateInvite is missing!');
      }
      setShowInviteModal(false);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/apply/${token}`;
    copyToClipboard(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getUnitInvites = (unitId: string) => {
    return invites.filter(inv => inv.unitId === unitId);
  };

  const getStatusBadge = (status: Unit['status']) => {
    const variants: Record<Unit['status'], string> = {
      vacant: 'success',
      occupied: 'secondary',
      pending: 'warning',
    };
    return <Badge bg={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const totalMonthlyCost = formData.costs.reduce((sum, cost) => sum + cost.amount, 0);

  const chartData = formData.costs.map((cost, index) => ({
    name: cost.name,
    value: cost.amount,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Use URL-based tab IDs for navigation
  // Show all 5 tabs - Units/Payment/Bonus will show message if no property exists yet
  const tabs = [
    { id: 'property-information', label: 'Property Information' },
    { id: 'monthly-costs', label: 'Monthly Costs' },
    { id: 'units', label: 'Units' },
    { id: 'payment-info', label: 'Payment Info' },
    { id: 'bonus-pool', label: 'Bonus Pool' },
  ];

  // Map internal activeTab to URL tab ID for TabNavigation
  const getUrlTabFromActive = (): string => {
    switch (activeTab) {
      case 'costs': return 'monthly-costs';
      case 'units': return 'units';
      case 'payment': return 'payment-info';
      case 'bonus': return 'bonus-pool';
      default: return 'property-information';
    }
  };
  const activeUrlTab = getUrlTabFromActive();

  // Handle tab change - use URL navigation if onTabChange provided
  const handleTabChange = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  // Build breadcrumbs for header
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Manage Rentals', onClick: handleCancel },
  ];
  if (property) {
    breadcrumbs.push({
      label: getPropertyDisplayName(property.address, property.address2),
      isPropertyDropdown: allProperties.length > 1,
      isActive: true,
    });
  } else {
    breadcrumbs.push({
      label: 'Add Property',
      isActive: true,
    });
  }

  // Build property options for dropdown
  const propertyOptions: PropertyOption[] = allProperties.map(p => ({
    id: p.id,
    label: getPropertyDisplayName(p.address, p.address2),
    isSelected: property ? p.id === property.id : false,
  }));

  return (
    <div className="bg-page">
      <PageHeader
        title={PORTAL_LABELS.HOMEOWNER}
        onLogout={onLogout}
        accountMenuItems={accountMenuItems}
        breadcrumbs={breadcrumbs}
        propertyOptions={propertyOptions}
        onPropertySelect={onPropertySelect}
        onPropertySettings={onPropertySelect}
      />

      <main id="main-content" className="container-xl px-4 py-4 d-flex flex-column gap-4">
        {/* Back button, page title and action buttons */}
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={handleCancel}
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <h6 className="mb-0 text-muted">{property ? 'Property Settings' : 'Add Property'}</h6>
          </div>

          {/* Delete button only shown when editing existing property */}
          {property && onDeleteProperty && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSaving}
              className="btn btn-tertiary text-danger"
            >
              <Trash2 size={16} />
              Delete Property
            </button>
          )}
        </div>

        <Form id="property-form" className="d-flex flex-column gap-4" onSubmit={handleSubmit}>
          {/* Loading Overlay - shown when saving or redirecting */}
          {(isSaving || isRedirecting) && (
            <div className="position-relative">
              <div
                className="position-fixed d-flex flex-column align-items-center justify-content-center"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  zIndex: 1050,
                }}
              >
                <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                <p className="mt-3 text-muted fw-medium">
                  {isSaving ? 'Saving property...' : 'Redirecting to property settings...'}
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <TabNavigation
            tabs={tabs}
            activeTab={activeUrlTab}
            onTabChange={handleTabChange}
          />

          {/* Property Information Section - use CSS visibility to prevent remounting */}
          <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
            <Card className="border-0 shadow-lg mb-4 rounded-4">
              <Card.Body className="p-4">
                <h3 className="mb-1">Property Information</h3>
                <p className="text-muted mb-4">Basic details about the property</p>
                
                <div className="row g-3">
                  <div className="col-md-8">
                    <Form.Group>
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., 123 Main Street"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </div>

                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>Address 2 (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., Suite 100"
                        value={formData.address2}
                        onChange={(e) => handleChange('address2', e.target.value)}
                      />
                    </Form.Group>
                  </div>

                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., Springfield"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </div>

                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>State</Form.Label>
                      <Form.Select
                        value={formData.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        required
                      >
                        <option value="">Select state...</option>
                        {US_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </div>

                  <div className="col-md-4">
                    <Form.Group>
                      <Form.Label>ZIP Code</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., 62701"
                        value={formData.zipCode}
                        onChange={(e) => {
                          // Only allow digits, max 5 characters
                          const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                          handleChange('zipCode', value);
                        }}
                        maxLength={5}
                        pattern="[0-9]{5}"
                        inputMode="numeric"
                        required
                      />
                    </Form.Group>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      // Restore to last saved values (from property prop)
                      if (property) {
                        setFormData({
                          name: property.name || '',
                          address: property.address || '',
                          address2: property.address2 || '',
                          city: property.city || '',
                          state: property.state || '',
                          zipCode: property.zipCode || '',
                          residents: property.residents || [],
                          costs: property.costs || [],
                          units: property.units || [],
                        });
                      }
                    }}
                    disabled={isSaving || isRedirecting || !property}
                  >
                    Restore Last Saved
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSaving || isRedirecting}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Monthly Costs Section - use CSS visibility to prevent remounting */}
          <div style={{ display: activeTab === 'costs' ? 'block' : 'none' }}>
            <Card className="border-0 shadow-lg mb-4 rounded-4">
              <Card.Body className="p-4">
                {!property ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">Save the property first to manage monthly costs.</p>
                  </div>
                ) : (
                  <>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h3 className="mb-1">Monthly Costs</h3>
                    <p className="text-muted mb-0">Track all monthly expenses for this property</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openAddCostModal}
                    className="btn-gradient border-0 px-3 py-2"
                  >
                    <Plus size={16} className="me-1" />
                    Add Cost
                  </Button>
                </div>

                {formData.costs.length === 0 ? (
                  <div className="text-center py-5 bg-light rounded-3">
                    <p className="text-muted mb-0">No monthly costs added yet</p>
                    <small className="text-muted">Select "Add Cost" to track expenses</small>
                  </div>
                ) : (
                  <>
                    {/* Total and Chart */}
                    <div className="row mb-4">
                      <div className="col-md-5">
                        <div className="p-4 bg-gradient-primary-light rounded-4 border border-primary border-opacity-25 h-100 d-flex flex-column justify-content-center">
                          <p className="text-muted mb-1 small fw-semibold text-uppercase ls-1">
                            Total Monthly Costs
                          </p>
                          <h2 className="mb-0 display-4 fw-bold text-primary">
                            ${totalMonthlyCost.toFixed(2)}
                          </h2>
                          <small className="text-muted">per month</small>
                        </div>
                      </div>
                      <div className="col-md-7">
                        <div style={{ height: '250px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="35%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => `$${value.toFixed(2)}`}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
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

                    {/* Costs Table */}
                    <Table hover responsive className="mb-0 table-modern">
                      <thead className="table-light">
                        <tr>
                          <th className="border-bottom border-2 fw-bold">Cost Name</th>
                          <th className="border-bottom border-2 fw-bold">Categories</th>
                          <th className="border-bottom border-2 fw-bold" style={{ width: '200px' }}>Monthly Amount</th>
                          <th className="border-bottom border-2 fw-bold" style={{ width: '150px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.costs.map((cost) => (
                          <tr key={cost.id}>
                            <td className="align-middle">
                              {cost.name}
                            </td>
                            <td className="align-middle">
                              <div className="d-flex flex-wrap gap-1">
                                {getCostCategories(cost).map((cat, idx) => {
                                  // Assign colors based on category name for consistency
                                  const colorClasses = [
                                    'bg-primary',
                                    'bg-success',
                                    'bg-info',
                                    'bg-warning text-dark',
                                    'bg-danger',
                                    'bg-secondary',
                                  ];
                                  const colorIndex = cat.charCodeAt(0) % colorClasses.length;
                                  return (
                                    <span
                                      key={idx}
                                      className={`badge ${colorClasses[colorIndex]} small`}
                                      style={{ padding: '0.5rem' }}
                                    >
                                      {cat}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="align-middle">
                              {editingAmountId === cost.id ? (
                                <div className="d-flex align-items-center gap-2">
                                  <Form.Control
                                    type="text"
                                    inputMode="decimal"
                                    value={tempAmount}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Allow empty, or valid currency format (digits with optional decimal and up to 2 decimal places)
                                      const isValid = val === '' || /^\d*\.?\d{0,2}$/.test(val);
                                      if (isValid) {
                                        setTempAmount(val);
                                      }
                                    }}
                                    className="w-auto"
                                    style={{ width: '120px' }}
                                    size="sm"
                                    autoFocus
                                  />
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => saveEditAmount(cost.id)}
                                    className="px-2 py-1"
                                  >
                                    <Check size={14} />
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={cancelEditAmount}
                                    className="px-2 py-1"
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="text-decoration-underline text-decoration-dotted cursor-pointer fw-semibold"
                                  onClick={() => startEditAmount(cost)}
                                >
                                  ${cost.amount.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="align-middle">
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => openEditCostModal(cost)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleOpenDeleteCostModal(cost)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}

                  </>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Units Tab - use CSS visibility to prevent remounting */}
          <div style={{ display: activeTab === 'units' ? 'block' : 'none' }}>
            <Card className="border-0 shadow-lg mb-4 rounded-4">
              <Card.Body className="p-4">
                {!property ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">Save the property first to manage units.</p>
                  </div>
                ) : (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <h3 className="mb-1">Property Units</h3>
                        <p className="text-muted mb-0">Manage rental units and send tenant invites</p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenUnitModal()}
                        className="btn-gradient border-0 px-3 py-2"
                      >
                        <Plus size={16} className="me-1" />
                        Add Unit
                      </Button>
                    </div>

                    {propertyUnits.length === 0 ? (
                      <div className="text-center py-5 bg-light rounded-3">
                        <p className="text-muted mb-0">No units added yet</p>
                        <small className="text-muted">Select "Add Unit" to create rental units</small>
                      </div>
                    ) : (
                      <Row>
                        {propertyUnits.map(unit => {
                          const unitInvites = getUnitInvites(unit.id);

                          return (
                            <Col md={6} key={unit.id} className="mb-3">
                              <Card className="h-100 border">
                                <Card.Body>
                                  <div className="d-flex justify-content-between align-items-start mb-3">
                                    <h6 className="mb-0">Unit {unit.number}</h6>
                                    <Badge bg="warning">{unitInvites.filter(i => i.status === 'pending').length} Invites</Badge>
                                  </div>

                                  <div className="row mb-3">
                                    <div className="col-6">
                                      <p className="small text-muted mb-1 fw-semibold">Monthly Rent</p>
                                      <p className="small text-dark mb-0">${unit.rentAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="col-6">
                                      <p className="small text-muted mb-1 fw-semibold">Security Deposit</p>
                                      <p className="small text-dark mb-0">${(unit.securityDeposit || 0).toLocaleString()}</p>
                                    </div>
                                  </div>

                                  <div className="d-flex gap-2">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => handleOpenInviteModal(unit)}
                                    >
                                      <Send size={14} className="me-1" />
                                      Invite
                                    </Button>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() => handleOpenUnitModal(unit)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleOpenDeleteUnitModal(unit)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Payment Info Tab - use CSS visibility to prevent remounting and data reload */}
          <div style={{ display: activeTab === 'payment' ? 'block' : 'none' }}>
            {!property ? (
              <Card className="border-0 shadow-lg mb-4 rounded-4">
                <Card.Body className="p-4">
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">Save the property first to configure payment info.</p>
                  </div>
                </Card.Body>
              </Card>
            ) : (
              <PaymentInfoForm propertyId={property.id} />
            )}
          </div>

          {/* Bonus Pool Tab - use CSS visibility to prevent remounting and data reload */}
          <div style={{ display: activeTab === 'bonus' ? 'block' : 'none' }}>
            <Card className="border-0 shadow-lg mb-4 rounded-4">
              <Card.Body className="p-4">
                {!property ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">Save the property first to manage bonus pool.</p>
                  </div>
                ) : (
                  <BonusPoolManager propertyId={property.id} />
                )}
              </Card.Body>
            </Card>
          </div>

        </Form>
      </main>

      {/* Add/Edit Cost Modal */}
      <Modal show={showCostModal} onHide={() => setShowCostModal(false)} centered size="lg">
        <form onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
          console.log('[CostModal form] onSubmit triggered');
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          console.log('[CostModal form] About to call handleSaveCost');
          await handleSaveCost();
          console.log('[CostModal form] handleSaveCost completed');
        }}>
          <Modal.Header closeButton className="border-bottom border-2 border-light">
            <Modal.Title>{editingCost ? 'Edit Monthly Cost' : 'Add Monthly Cost'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Select Categories</Form.Label>
              <div ref={dropdownRef} className="position-relative">
                <div
                  role="combobox"
                  aria-expanded={showDropdown}
                  aria-haspopup="listbox"
                  aria-controls="category-listbox"
                  aria-activedescendant={focusedCategoryIndex >= 0 ? `category-${focusedCategoryIndex}` : undefined}
                  aria-label="Select categories"
                  tabIndex={0}
                  onClick={() => {
                    setShowDropdown(!showDropdown);
                    setFocusedCategoryIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (showDropdown && focusedCategoryIndex >= 0 && focusedCategoryIndex < availableCategories.length) {
                        // Select the focused category
                        handleToggleCategory(availableCategories[focusedCategoryIndex]);
                      } else {
                        setShowDropdown(!showDropdown);
                        setFocusedCategoryIndex(-1);
                      }
                    } else if (e.key === 'Escape') {
                      setShowDropdown(false);
                      setFocusedCategoryIndex(-1);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!showDropdown) {
                        setShowDropdown(true);
                        setFocusedCategoryIndex(0);
                      } else {
                        setFocusedCategoryIndex(prev =>
                          prev < availableCategories.length - 1 ? prev + 1 : prev
                        );
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (showDropdown) {
                        setFocusedCategoryIndex(prev => prev > 0 ? prev - 1 : 0);
                      }
                    } else if (e.key === 'Tab' && showDropdown) {
                      setShowDropdown(false);
                      setFocusedCategoryIndex(-1);
                    }
                  }}
                  className="form-control d-flex justify-content-between align-items-center cursor-pointer"
                >
                  <span className={costFormData.selectedCategories.length > 0 ? 'text-dark' : 'text-muted'}>
                    {costFormData.selectedCategories.length > 0
                      ? `${costFormData.selectedCategories.length} selected`
                      : 'Select categories...'}
                  </span>
                  <ChevronDown size={18} />
                </div>

                {showDropdown && (
                  <div
                    id="category-listbox"
                    role="listbox"
                    aria-label="Available categories"
                    className="position-absolute top-100 start-0 end-0 bg-white border rounded-2 shadow overflow-auto"
                    style={{ maxHeight: '300px', zIndex: 1000 }}
                  >
                    {availableCategories.length === 0 && !showCustomInput && (
                      <div className="p-3 text-center text-muted">
                        No available categories
                      </div>
                    )}

                    {availableCategories.map((category, index) => (
                      <div
                        key={category}
                        id={`category-${index}`}
                        role="option"
                        aria-selected={costFormData.selectedCategories.includes(category)}
                        onClick={() => handleToggleCategory(category)}
                        onMouseEnter={() => setFocusedCategoryIndex(index)}
                        className={`px-3 py-2 cursor-pointer d-flex align-items-center gap-2 border-bottom border-light ${
                          costFormData.selectedCategories.includes(category) || focusedCategoryIndex === index ? 'bg-light' : 'bg-white'
                        }`}
                      >
                        <Form.Check
                          type="checkbox"
                          checked={costFormData.selectedCategories.includes(category)}
                          onChange={() => {}}
                          tabIndex={-1}
                          style={{ pointerEvents: 'none' }}
                        />
                        <span>{category}</span>
                      </div>
                    ))}

                    {!showCustomInput ? (
                      <div
                        role="option"
                        aria-selected={false}
                        onClick={() => setShowCustomInput(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setShowCustomInput(true);
                          }
                        }}
                        tabIndex={0}
                        className={`px-3 cursor-pointer d-flex align-items-center gap-2 text-primary fw-semibold ${
                          availableCategories.length > 0 ? 'border-top border-2 border-light' : ''
                        }`}
                        style={{ height: '5rem' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.classList.add('bg-light');
                          setFocusedCategoryIndex(-1);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.classList.remove('bg-light');
                        }}
                      >
                        <Plus size={16} />
                        <span>Add Custom Category</span>
                      </div>
                    ) : (
                      <div
                        className={`px-3 d-flex align-items-center ${availableCategories.length > 0 ? 'border-top border-2 border-light' : ''}`}
                        style={{ height: '5rem' }}
                      >
                        <div className="d-flex gap-2 w-100">
                          <Form.Control
                            type="text"
                            placeholder="Category name..."
                            value={newCustomName}
                            onChange={(e) => setNewCustomName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddCustomCategory();
                              } else if (e.key === 'Escape') {
                                setShowCustomInput(false);
                                setNewCustomName('');
                              }
                            }}
                            autoFocus
                            size="sm"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setShowCustomInput(false);
                              setNewCustomName('');
                            }}
                            aria-label="Cancel adding custom category"
                          >
                            <X size={14} aria-hidden="true" />
                            <span className="visually-hidden">Cancel</span>
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleAddCustomCategory}
                            disabled={!newCustomName.trim()}
                            className="btn-gradient border-0"
                            aria-label="Add custom category"
                          >
                            <Check size={14} aria-hidden="true" />
                            <span className="visually-hidden">Add</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {costFormData.selectedCategories.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {costFormData.selectedCategories.map((cat, idx) => (
                    <span key={idx} className="badge bg-primary small">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </Form.Group>

            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Display Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Utilities"
                    value={costFormData.displayName}
                    onChange={(e) => setCostFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                  <Form.Text className="text-muted">
                    How this cost will appear in reports
                  </Form.Text>
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Monthly Amount</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costFormData.amount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Parse value and round to 2 decimal places
                      const numVal = parseFloat(val) || 0;
                      setCostFormData(prev => ({ ...prev, amount: Math.round(numVal * 100) / 100 }));
                    }}
                  />
                  <Form.Text className="text-muted">
                    Combined total for all selected categories
                  </Form.Text>
                </Form.Group>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top border-2 border-light">
            <Button type="button" variant="secondary" onClick={() => setShowCostModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={costFormData.selectedCategories.length === 0 || costFormData.amount <= 0 || !costFormData.displayName.trim()}
              className="btn-gradient border-0"
            >
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Unit Modal */}
      <Modal show={showUnitModal} onHide={() => setShowUnitModal(false)} centered>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSaveUnit();
        }}>
          <Modal.Header closeButton className="border-bottom border-2 border-light">
            <Modal.Title>{editingUnit ? 'Edit Unit' : 'Add Unit'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Unit Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., 2B, 3A, 101"
                value={unitFormData.number}
                onChange={e => setUnitFormData({ ...unitFormData, number: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Monthly Rent</Form.Label>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="0.00"
                  value={unitFormData.rentAmount}
                  onChange={e => setUnitFormData({ ...unitFormData, rentAmount: e.target.value })}
                  required
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Security Deposit</Form.Label>
              <Row>
                <Col md={6}>
                  <Form.Select
                    value={unitFormData.securityDepositMultiplier}
                    onChange={e => setUnitFormData({ ...unitFormData, securityDepositMultiplier: e.target.value })}
                  >
                    <option value="0.5">0.5x Monthly Rent</option>
                    <option value="1">1x Monthly Rent</option>
                    <option value="1.5">1.5x Monthly Rent</option>
                    <option value="2.5">2.5x Monthly Rent</option>
                    <option value="custom">Custom Amount</option>
                  </Form.Select>
                </Col>
                <Col md={6}>
                  {unitFormData.securityDepositMultiplier === 'custom' ? (
                    <InputGroup>
                      <InputGroup.Text>$</InputGroup.Text>
                      <Form.Control
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={unitFormData.securityDepositCustom}
                        onChange={e => setUnitFormData({ ...unitFormData, securityDepositCustom: e.target.value })}
                      />
                    </InputGroup>
                  ) : (
                    <InputGroup>
                      <InputGroup.Text>$</InputGroup.Text>
                      <Form.Control
                        type="text"
                        value={unitFormData.rentAmount ? (parseFloat(unitFormData.rentAmount) * parseFloat(unitFormData.securityDepositMultiplier)).toFixed(2) : '0.00'}
                        readOnly
                        className="bg-light"
                      />
                    </InputGroup>
                  )}
                </Col>
              </Row>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top border-2 border-light">
            <Button type="button" variant="secondary" onClick={() => setShowUnitModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!unitFormData.number?.trim() || !unitFormData.rentAmount}
              className="btn-gradient border-0"
            >
              Save
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal show={showInviteModal} onHide={() => setShowInviteModal(false)} centered>
        <Modal.Header closeButton className="border-bottom border-2 border-light">
          <Modal.Title>Send Application Invite</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUnitForInvite && (
            <Form
              id="invite-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteEmail) {
                  handleSendInviteAction(true);
                }
              }}
            >
              <p className="mb-3">
                Send an application invite for <strong>Unit {selectedUnitForInvite.name}</strong>
              </p>

              <Form.Group className="mb-3">
                <Form.Label>Applicant First Name (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="John"
                  value={inviteFirstName}
                  onChange={e => setInviteFirstName(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Applicant Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="applicant@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top border-2 border-light">
          <Button variant="secondary" onClick={() => setShowInviteModal(false)} disabled={inviteSending}>
            Cancel
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => handleSendInviteAction(false)}
            disabled={inviteSending}
          >
            <Copy size={14} className="me-2" />
            Generate Link
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="invite-form"
            disabled={!inviteEmail || inviteSending}
            className="btn-gradient border-0"
          >
            {inviteSending ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Sending...
              </>
            ) : (
              <>
                <Send size={14} className="me-2" />
                Send Email
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Property Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger">
            <Trash2 size={20} />
            Delete Property
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            Are you sure you want to delete <strong>{property?.name || 'this property'}</strong>?
          </p>
          <div className="alert alert-danger mb-0">
            <strong>Warning:</strong> This action cannot be undone. All data associated with this property will be permanently deleted, including:
            <ul className="mb-0 mt-2">
              <li>Units and tenant information</li>
              <li>Monthly costs</li>
              <li>Payment settings</li>
              <li>Invoices and documents</li>
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteProperty}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete Property
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Monthly Cost Confirmation Modal */}
      <Modal show={showDeleteCostModal} onHide={() => setShowDeleteCostModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger d-flex align-items-center gap-2">
            <Trash2 size={20} />
            Delete Monthly Cost
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Are you sure you want to delete <strong>{costToDelete?.name}</strong> of <strong>${costToDelete?.amount?.toFixed(2)}</strong>?
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteCostModal(false);
              setCostToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDeleteCost}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Unit Confirmation Modal */}
      <Modal show={showDeleteUnitModal} onHide={() => setShowDeleteUnitModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger d-flex align-items-center gap-2">
            <Trash2 size={20} />
            Delete Unit
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Are you sure you want to delete <strong>Unit {unitToDelete?.name}</strong>? This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteUnitModal(false);
              setUnitToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDeleteUnit}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success/Error Toast */}
      <AppToast
        show={showToast}
        onClose={() => {
          setShowToast(false);
          localStorage.removeItem('property_form_toast');
        }}
        title={toastMessage.title}
        message={toastMessage.description || ''}
        variant={toastVariant}
      />
    </div>
  );
}

// Wrap with memo to prevent unnecessary re-renders
// Custom comparison to handle array props that may have different references but same content
const MemoizedPropertyForm = memo(PropertyForm, (prevProps, nextProps) => {
  // Compare primitive props and functions (reference equality is fine for functions)
  if (
    prevProps.property?.id !== nextProps.property?.id ||
    prevProps.propertyTab !== nextProps.propertyTab ||
    prevProps.onSubmit !== nextProps.onSubmit ||
    prevProps.onCancel !== nextProps.onCancel ||
    prevProps.onTabChange !== nextProps.onTabChange ||
    prevProps.onLogout !== nextProps.onLogout ||
    prevProps.onSuccess !== nextProps.onSuccess ||
    prevProps.onPropertySelect !== nextProps.onPropertySelect ||
    prevProps.onDeleteProperty !== nextProps.onDeleteProperty ||
    prevProps.onAddUnit !== nextProps.onAddUnit ||
    prevProps.onUpdateUnit !== nextProps.onUpdateUnit ||
    prevProps.onDeleteUnit !== nextProps.onDeleteUnit ||
    prevProps.onGenerateInvite !== nextProps.onGenerateInvite ||
    prevProps.onSendInvite !== nextProps.onSendInvite ||
    prevProps.onDeleteInvite !== nextProps.onDeleteInvite
  ) {
    return false; // Props changed, re-render
  }

  // Compare arrays by length and first/last element IDs (lightweight check)
  // This prevents re-renders when array references change but content is the same
  const arraysEqual = (
    prev: any[] | undefined,
    next: any[] | undefined
  ): boolean => {
    if (prev === next) return true;
    if (!prev || !next) return prev === next;
    if (prev.length !== next.length) return false;
    // Quick check: compare first and last elements' IDs
    if (prev.length > 0) {
      const firstEqual = prev[0]?.id === next[0]?.id;
      const lastEqual = prev[prev.length - 1]?.id === next[prev.length - 1]?.id;
      return firstEqual && lastEqual;
    }
    return true;
  };

  if (
    !arraysEqual(prevProps.units, nextProps.units) ||
    !arraysEqual(prevProps.invites, nextProps.invites) ||
    !arraysEqual(prevProps.allProperties, nextProps.allProperties) ||
    !arraysEqual(prevProps.accountMenuItems, nextProps.accountMenuItems)
  ) {
    return false; // Arrays changed, re-render
  }

  // All relevant props are equal, skip re-render
  return true;
});

export { MemoizedPropertyForm as PropertyForm };