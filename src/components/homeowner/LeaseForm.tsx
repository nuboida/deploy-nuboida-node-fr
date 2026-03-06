import { useState, useEffect } from 'react';
import { Card, Button } from 'react-bootstrap';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, AccountMenuItem, BreadcrumbItem, PropertyOption } from '../common/PageHeader';
import { LeaseFormFields, LeaseFormData, LeaseValidationErrors } from '../common/LeaseFormFields';
import { PORTAL_LABELS } from '../../config/labels';
import { getPropertyDisplayName } from '../../utils/slug';
import type { LeaseDocument, Resident, Property, Unit, Occupant } from '../../App';

type LeaseFormProps = {
  resident: Resident;
  property?: Property;
  units?: Unit[];
  lease?: LeaseDocument | null;
  onSubmit: (lease: Omit<LeaseDocument, 'id'>) => void;
  onCancel: () => void;
  onLogout?: () => void;
  accountMenuItems?: AccountMenuItem[];
  // Navigation callbacks for breadcrumb
  onNavigateToProperty?: () => void;
  onNavigateToResident?: () => void;
  // Property switching in breadcrumb dropdown
  allProperties?: Property[];
  onPropertySelect?: (propertyId: string) => void;
  onPropertySettings?: (propertyId: string) => void;
};

export function LeaseForm({
  resident,
  property,
  units = [],
  lease,
  onSubmit,
  onCancel,
  onLogout,
  accountMenuItems,
  onNavigateToProperty,
  onNavigateToResident,
  allProperties = [],
  onPropertySelect,
  onPropertySettings,
}: LeaseFormProps) {
  const isEditing = !!lease;

  // Helper to get occupants from resident (backward compatibility)
  const getOccupantsFromResident = (res: Resident): Occupant[] => {
    if (res.occupants && res.occupants.length > 0) {
      return res.occupants;
    }
    // Fallback: parse legacy name field
    const parseName = (fullName: string) => {
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
      }
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    };
    const parsed = parseName(res.name || '');
    return [{
      id: res.id,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: res.email || '',
      phone: res.phone || '',
    }];
  };

  // Format occupants names for display
  const formatOccupantsNames = (occupants: Occupant[]) => {
    const names = occupants.map(occ => `${occ.firstName} ${occ.lastName}`.trim()).filter(name => name);
    if (names.length === 0) return 'Resident';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  };

  const residentDisplayName = formatOccupantsNames(getOccupantsFromResident(resident));

  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<LeaseFormData>({
    documentType: 'original',
    leaseType: 'yearly',
    unitId: '',
    startDate: '',
    endDate: '',
    notes: '',
    fileUrl: '',
    securityDeposit: 0, // Will be set when unit is selected
    securityDepositMultiplier: '1.5', // Default for new leases
    securityDepositCustom: '',
    lateStartDay: 5,
    lateFeeDailyRate: 5.00,
    electricRate: 0.12,
  });
  const [validationErrors, setValidationErrors] = useState<LeaseValidationErrors>({
    startDate: false,
    unitId: false,
  });

  // Helper to format date from ISO to YYYY-MM-DD for input field
  const formatDateForInput = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '';
    // Extract just the date part (YYYY-MM-DD) from ISO datetime
    return isoDate.split('T')[0];
  };

  // Function to restore form to last saved state
  const handleRestoreFromLastSaved = () => {
    if (lease) {
      // Calculate multiplier from existing security deposit
      const rent = lease.monthlyRent || 0;
      const deposit = lease.securityDeposit || 0;
      let multiplier = 'custom'; // Default to custom for existing leases
      let customAmount = '';

      if (rent > 0) {
        if (deposit === 0) {
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
        // No rent available, treat as custom
        multiplier = 'custom';
        customAmount = deposit.toString();
      }

      const newFormData = {
        documentType: (lease.category || 'original') as 'original' | 'renewal',
        leaseType: lease.leaseType as 'yearly' | 'month-to-month',
        unitId: lease.unitId || '',
        startDate: formatDateForInput(lease.startDate),
        endDate: formatDateForInput(lease.endDate),
        notes: lease.notes || '',
        fileUrl: lease.fileUrl || '',
        securityDeposit: lease.securityDeposit || 0,
        securityDepositMultiplier: multiplier,
        securityDepositCustom: customAmount,
        lateStartDay: lease.lateStartDay || 5,
        lateFeeDailyRate: lease.lateFeeDailyRate || 5.00,
        electricRate: lease.electricRate || 0.12,
      };
      setFormData(newFormData);
      // Clear any uploaded file
      setLeaseFile(null);
    }
  };

  // Initialize form with lease data if editing
  useEffect(() => {
    console.log('[LeaseForm] useEffect triggered');
    console.log('[LeaseForm] useEffect - lease:', lease);
    console.log('[LeaseForm] useEffect - isEditing:', isEditing);

    if (lease) {
      handleRestoreFromLastSaved();
      console.log('[LeaseForm] ✅ Form data has been set');
    } else {
      console.log('[LeaseForm] ⚠️ No lease data to populate (creating new lease)');
    }
  }, [lease, isEditing]);


  const calculateEndDate = (startDate: string, leaseType: string): string | null => {
    if (leaseType === 'month-to-month' || !startDate) return null;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    return end.toISOString().split('T')[0];
  };

  const handleFormChange = (field: keyof LeaseFormData, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate end date for yearly leases
      if (field === 'startDate' && prev.leaseType === 'yearly') {
        const endDate = calculateEndDate(value as string, prev.leaseType);
        updated.endDate = endDate || '';
      }
      if (field === 'leaseType' && value === 'yearly' && prev.startDate) {
        const endDate = calculateEndDate(prev.startDate, value as string);
        updated.endDate = endDate || '';
      }
      if (field === 'leaseType' && value === 'month-to-month') {
        updated.endDate = '';
      }

      // Pre-fill security deposit and calculate multiplier when unit is selected
      if (field === 'unitId' && value) {
        const selectedUnit = units.find(u => u.id === value);
        if (selectedUnit) {
          const rent = selectedUnit.rentAmount || 0;
          const deposit = selectedUnit.securityDeposit || 0;
          updated.securityDeposit = deposit;

          // Calculate multiplier from unit's security deposit
          if (rent > 0) {
            if (deposit === 0) {
              updated.securityDepositMultiplier = 'custom';
              updated.securityDepositCustom = '0';
            } else {
              const calculatedMultiplier = deposit / rent;
              const standardMultipliers = [0.5, 1, 1.5, 2.5];

              const matchedMultiplier = standardMultipliers.find(
                m => Math.abs(calculatedMultiplier - m) < 0.01
              );

              if (matchedMultiplier !== undefined) {
                updated.securityDepositMultiplier = matchedMultiplier.toString();
                updated.securityDepositCustom = '';
              } else {
                updated.securityDepositMultiplier = 'custom';
                updated.securityDepositCustom = deposit.toString();
              }
            }
          } else {
            // No rent, treat as custom
            updated.securityDepositMultiplier = 'custom';
            updated.securityDepositCustom = deposit.toString();
          }
        }
      }

      // Calculate security deposit when multiplier changes
      if (field === 'securityDepositMultiplier') {
        const selectedUnit = units.find(u => u.id === prev.unitId);
        const rent = selectedUnit?.rentAmount || 0;

        if (value !== 'custom' && rent > 0) {
          const multiplier = parseFloat(value as string);
          updated.securityDeposit = rent * multiplier;
          updated.securityDepositCustom = '';
        } else if (value === 'custom' && prev.securityDepositCustom) {
          updated.securityDeposit = parseFloat(prev.securityDepositCustom) || 0;
        }
      }

      // Update security deposit when custom amount changes
      if (field === 'securityDepositCustom') {
        if (prev.securityDepositMultiplier === 'custom') {
          updated.securityDeposit = parseFloat(value as string) || 0;
        }
      }

      return updated;
    });

    // Clear validation errors when field is filled
    if (field === 'startDate' || field === 'unitId') {
      setValidationErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleRemoveExistingFile = () => {
    // Clear the existing file URL from form data
    setFormData(prev => ({
      ...prev,
      fileUrl: '',
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors: LeaseValidationErrors = {
      startDate: !formData.startDate,
      unitId: !formData.unitId,
    };
    setValidationErrors(errors);

    if (errors.startDate || errors.unitId) {
      return;
    }

    const selectedUnit = units.find(u => u.id === formData.unitId);

    const leaseData: Omit<LeaseDocument, 'id'> = {
      documentType: formData.documentType as 'original' | 'renewal',
      leaseType: formData.leaseType as 'month-to-month' | 'yearly',
      unitId: formData.unitId,
      startDate: formData.startDate,
      endDate: null, // Backend calculates this based on leaseType
      fileUrl: formData.fileUrl, // Use formData value directly (empty string if removed)
      notes: formData.notes,
      monthlyRent: selectedUnit?.rentAmount || 0,
      securityDeposit: formData.securityDeposit, // Use form value (pre-filled from unit, editable)
      lateStartDay: formData.lateStartDay,
      lateFeeDailyRate: formData.lateFeeDailyRate,
      electricRate: formData.electricRate,
    };

    // Include the actual File object if uploaded (for API upload)
    if (leaseFile) {
      (leaseData as any).file = leaseFile;
      console.log('[LeaseForm.handleSubmit] 📄 Attached file to lease:', {
        name: leaseFile.name,
        size: leaseFile.size,
        type: leaseFile.type,
      });
    } else {
      console.log('[LeaseForm.handleSubmit] ⚠️ No lease file to attach');
    }

    onSubmit(leaseData);
  };

  // Build breadcrumbs for header - only up to property address
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Manage Rentals', onClick: onCancel },
  ];
  if (property) {
    breadcrumbs.push({
      label: getPropertyDisplayName(property.address, property.address2),
      isPropertyDropdown: allProperties.length > 1,
      isActive: true,
    });
  }

  // Build property options for dropdown
  const propertyOptions: PropertyOption[] = allProperties.map(p => ({
    id: p.id,
    label: getPropertyDisplayName(p.address, p.address2),
    isSelected: p.id === property?.id,
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
        onPropertySettings={onPropertySettings}
      />

      <main id="main-content" className="container-xl px-4 py-4 d-flex flex-column gap-4">
        {/* Action bar with back button and page context */}
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={onNavigateToResident || onCancel}
            >
              <ArrowLeft size={18} />
              Back to Leases
            </button>
            <h6 className="mb-0 text-muted">{residentDisplayName}</h6>
            <span className="text-muted mx-2">/</span>
            <h6 className="mb-0 text-muted">{isEditing ? 'Edit Lease' : 'Add Lease'}</h6>
          </div>
        </div>

        <Card className="border-0 shadow-lg mb-4 rounded-4">
          <Card.Body className="p-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}>
              <LeaseFormFields
                formData={formData}
                validationErrors={validationErrors}
                units={units}
                leaseFile={leaseFile}
                onFormChange={handleFormChange}
                onFileChange={setLeaseFile}
                onRemoveExistingFile={handleRemoveExistingFile}
                onSave={handleSubmit}
                idPrefix="lease-page"
                isFirstLease={!isEditing && (!resident.leases || resident.leases.length === 0)}
                existingFileUrl={isEditing ? lease?.fileUrl : undefined}
                existingFileName={isEditing ? (() => {
                  const category = (lease?.category || 'original') === 'original' ? 'Original_Lease' : 'Renewal_Lease';
                  const type = lease?.leaseType === 'yearly' ? 'Yearly' : 'Monthly';
                  const name = residentDisplayName.replace(/\s+/g, '_');
                  const date = lease?.startDate ? new Date(lease.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '';
                  return `${category}_${type}_${name}_${date}.pdf`;
                })() : undefined}
                existingLeaseId={isEditing ? lease?.id : undefined}
              />

              {/* Action Buttons */}
              <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleRestoreFromLastSaved}
                    className="btn btn-tertiary"
                  >
                    Restore from Last Saved
                  </button>
                )}
                <Button variant="secondary" type="button" onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </main>
    </div>
  );
}
