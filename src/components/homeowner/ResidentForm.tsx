import { useState } from 'react';
import { Card, Form, Button, Row, Col, Modal, Spinner } from 'react-bootstrap';
import { Plus, X, Trash2, Check, FileText, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import { PageHeader, AccountMenuItem, BreadcrumbItem, PropertyOption } from '../common/PageHeader';
import { getPropertyDisplayName } from '../../utils/slug';
import { LeaseFormFields, LeaseFormData, LeaseValidationErrors } from '../common/LeaseFormFields';
import { PORTAL_LABELS } from '../../config/labels';
import { getLeaseEndDisplay } from '../../utils/date';
import type { Resident, Unit, Property, LeaseDocument } from '../../App';

type ResidentFormProps = {
  resident: Resident | null;
  units?: Unit[];
  propertyId?: string;
  property?: Property;
  onSubmit: (resident: Omit<Resident, 'id'>) => Promise<Resident | undefined>;
  onCancel: () => void;
  onDelete?: () => void;
  onLogout?: () => void;
  accountMenuItems?: AccountMenuItem[];
  onSuccess?: (createdResident?: Resident) => void;
  // Property switching in breadcrumb dropdown
  allProperties?: Property[];
  onPropertySelect?: (propertyId: string) => void;
  onPropertySettings?: (propertyId: string) => void;
};

type Occupant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type WizardStep = 'occupants' | 'leases';  // rent-details step removed - now part of lease

export function ResidentForm({ resident, units = [], propertyId, property, onSubmit, onCancel, onDelete, onLogout, accountMenuItems, onSuccess, allProperties = [], onPropertySelect, onPropertySettings }: ResidentFormProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('occupants');

  // Lease management state
  const [leases, setLeases] = useState<Omit<LeaseDocument, 'id'>[]>(resident?.leases || []);
  const [leaseFile, setLeaseFile] = useState<File | null>(null); // Store actual PDF file
  const [leaseFormData, setLeaseFormData] = useState<LeaseFormData>({
    documentType: 'original',
    leaseType: 'yearly', // Default to yearly lease
    unitId: '', // Selected unit - inherits rent details from formData
    startDate: '',
    endDate: '',
    notes: '',
    fileUrl: '',
    lateStartDay: 5,
    lateFeeDailyRate: 5.00,
    electricRate: 0.12,
  });
  const [leaseValidationErrors, setLeaseValidationErrors] = useState<LeaseValidationErrors>({
    startDate: false,
    unitId: false,
  });

  // Wizard steps configuration (rent-details removed - now part of lease)
  const wizardSteps: { id: WizardStep; label: string; required: boolean }[] = [
    { id: 'occupants', label: 'Occupants', required: true },
    { id: 'leases', label: 'Lease Details', required: false },
  ];

  const currentStepIndex = wizardSteps.findIndex(s => s.id === currentStep);
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  // Parse existing resident name into first/last for primary occupant
  const parseName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName };
  };

  // Load existing occupants or create from legacy data
  const getInitialOccupants = (): Occupant[] => {
    if (!resident) {
      return [{ id: 'occupant-1', firstName: '', lastName: '', email: '', phone: '' }];
    }

    // If resident has occupants array, use it
    if (resident.occupants && resident.occupants.length > 0) {
      return resident.occupants;
    }

    // Otherwise, create from legacy fields
    return [{
      id: 'occupant-1',
      ...parseName(resident.name),
      email: resident.email,
      phone: resident.phone
    }];
  };

  const [occupants, setOccupants] = useState<Occupant[]>(getInitialOccupants());
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  // Get available units for the current property
  const availableUnits = propertyId ? units.filter(u => u.propertyId === propertyId) : units;

  const [formData, setFormData] = useState({
    aptNumber: resident?.aptNumber || '',
    lateStartDay: resident?.lateStartDay || 5,
    currentRent: resident?.currentRent || 0,
    lateFeeDailyRate: resident?.lateFeeDailyRate || 5.00,
    electricRate: resident?.electricRate || 0.12,
    invoices: resident?.invoices || [],
    leases: resident?.leases || [],
    // Address fields (will be auto-populated from selected unit or property)
    streetAddress: resident?.streetAddress || '',
    city: resident?.city || '',
    state: resident?.state || '',
    zipCode: resident?.zipCode || '',
  });

  // Helper to validate phone number (must be exactly 10 digits)
  const isValidPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  // Validate current step
  const validateCurrentStep = (): boolean => {
    if (currentStep === 'occupants') {
      const primaryOccupant = occupants[0];
      // Check that all required fields are filled AND phone has exactly 10 digits
      return !!(
        primaryOccupant.firstName &&
        primaryOccupant.lastName &&
        primaryOccupant.email &&
        primaryOccupant.phone &&
        isValidPhone(primaryOccupant.phone)
      );
    }
    // Other steps are optional
    return true;
  };

  // Handle next step
  const handleNext = () => {
    if (!validateCurrentStep()) return;

    setCompletedSteps(prev => new Set(prev).add(currentStep));

    if (!isLastStep) {
      setCurrentStep(wizardSteps[currentStepIndex + 1].id);
    }
  };

  // Handle skip step (for optional steps)
  const handleSkip = () => {
    if (!isLastStep) {
      setCurrentStep(wizardSteps[currentStepIndex + 1].id);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(wizardSteps[currentStepIndex - 1].id);
    }
  };

  // Handle final save
  const handleFinalSave = async () => {
    if (!validateCurrentStep()) return;

    setIsSaving(true);
    try {
      const primaryOccupant = occupants[0];
      const fullName = `${primaryOccupant.firstName} ${primaryOccupant.lastName}`.trim();

      const residentData = {
        name: fullName,
        email: primaryOccupant.email,
        phone: primaryOccupant.phone,
        occupants: occupants,
        ...formData,
        leases: leases, // Include leases from wizard
      };

      console.log('[ResidentForm.handleFinalSave] Calling onSubmit...');
      const result = await onSubmit(residentData);
      console.log('[ResidentForm.handleFinalSave] onSubmit returned:', result);

      // If this is a new resident, call onSuccess to navigate away
      if (!resident && onSuccess) {
        console.log('[ResidentForm.handleFinalSave] ✅ Calling onSuccess');
        onSuccess(result as Resident);
      } else {
        // For edits, just close the form
        console.log('[ResidentForm.handleFinalSave] Calling onCancel (edit mode)');
        onCancel();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
        if (!isLastStep && validateCurrentStep()) {
          e.preventDefault();
          handleNext();
        }
        break;
      case 'ArrowLeft':
        if (currentStepIndex > 0) {
          e.preventDefault();
          handlePrevious();
        }
        break;
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Sync unit selection between Rent Details and Original Lease
    if (field === 'aptNumber') {
      // Find the unit by name and sync with lease form
      const selectedUnit = units.find(u => u.name === value);
      if (selectedUnit) {
        setLeaseFormData(prev => ({
          ...prev,
          unitId: selectedUnit.id,
        }));
      }
    }
  };

  const handleOccupantChange = (id: string, field: keyof Occupant, value: string) => {
    setOccupants(prev => prev.map(occ =>
      occ.id === id ? { ...occ, [field]: value } : occ
    ));
  };

  const addOccupant = () => {
    const newOccupant: Occupant = {
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

  // Format phone number as user types: (555) 555-0000
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

  const handlePhoneChange = (id: string, value: string) => {
    const formatted = formatPhoneNumber(value);
    handleOccupantChange(id, 'phone', formatted);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    if (onDelete) {
      onDelete();
    }
  };

  // Lease management handlers
  const handleDeleteLease = () => {
    // Reset the form and clear the saved lease
    setLeases([]);
    setLeaseFormData({
      documentType: 'original',
      leaseType: 'month-to-month',
      unitId: '',
      startDate: '',
      endDate: '',
      notes: '',
      fileUrl: '',
      lateStartDay: 5,
      lateFeeDailyRate: 5.00,
      electricRate: 0.12,
    });
  };

  const handleLeaseFormChange = (field: keyof LeaseFormData, value: string | number) => {
    setLeaseFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate end date for yearly leases
      if (field === 'startDate' && prev.leaseType === 'yearly') {
        const startDate = new Date(value as string);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);
          endDate.setDate(endDate.getDate() - 1);
          updated.endDate = endDate.toISOString().split('T')[0];
        }
      }

      // Clear end date for month-to-month
      if (field === 'leaseType' && value === 'month-to-month') {
        updated.endDate = '';
      }

      // Auto-calculate end date when switching to yearly
      if (field === 'leaseType' && value === 'yearly' && prev.startDate) {
        const startDate = new Date(prev.startDate);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);
          endDate.setDate(endDate.getDate() - 1);
          updated.endDate = endDate.toISOString().split('T')[0];
        }
      }

      return updated;
    });

    // Clear validation error for this field when user starts typing
    if (field === 'startDate' || field === 'unitId') {
      setLeaseValidationErrors(prev => ({
        ...prev,
        [field]: false,
      }));
    }

    // Sync unit selection between Original Lease and Rent Details
    if (field === 'unitId') {
      // Find the unit by ID and sync with rent details form
      const selectedUnit = units.find(u => u.id === value);
      if (selectedUnit) {
        setFormData(prev => ({
          ...prev,
          aptNumber: selectedUnit.name,
          currentRent: selectedUnit.rentAmount,
        }));
      }
    }
  };

  const handleSaveLease = async () => {
    // Validation
    const errors = {
      startDate: !leaseFormData.startDate,
      unitId: !leaseFormData.unitId,
    };

    setLeaseValidationErrors(errors);

    // If there are any errors, don't submit
    if (errors.startDate || errors.unitId) {
      return;
    }

    // Find selected unit to get its rent details
    const selectedUnit = units.find(u => u.id === leaseFormData.unitId);
    if (!selectedUnit) {
      alert('Selected unit not found');
      return;
    }

    // Build lease with rent details from form and unit
    const newLease: any = {
      ...leaseFormData,
      residentId: resident?.id || '', // Changed from renterId
      // Inherit monthly rent from selected unit
      monthlyRent: selectedUnit.rentAmount || 0,
      // Use values from leaseFormData (which are editable in the form)
      lateFeeDailyRate: leaseFormData.lateFeeDailyRate,
      lateStartDay: leaseFormData.lateStartDay,
      electricRate: leaseFormData.electricRate,
    };

    // Include the actual File object if uploaded (for API upload)
    if (leaseFile) {
      newLease.file = leaseFile;
      console.log('[ResidentForm.handleSaveLease] 📄 Attached file to lease:', {
        name: leaseFile.name,
        size: leaseFile.size,
        type: leaseFile.type,
      });
    } else {
      console.log('[ResidentForm.handleSaveLease] ⚠️ No lease file to attach');
    }

    // Submit form with lease included
    setIsSaving(true);
    try {
      const primaryOccupant = occupants[0];
      const fullName = `${primaryOccupant.firstName} ${primaryOccupant.lastName}`.trim();

      const residentData = {
        name: fullName,
        email: primaryOccupant.email,
        phone: primaryOccupant.phone,
        occupants: occupants,
        ...formData,
        leases: [newLease], // Include the lease we just created (with File if present)
      };

      console.log('[ResidentForm.handleSaveLease] Submitting resident with lease data:', {
        hasLeases: !!residentData.leases,
        leasesCount: residentData.leases?.length,
        leaseHasFile: !!(residentData.leases?.[0] as any)?.file,
      });

      console.log('[ResidentForm.handleSaveLease] Calling onSubmit...');
      const result = await onSubmit(residentData);
      console.log('[ResidentForm.handleSaveLease] onSubmit returned:', result);

      // If this is a new resident, call onSuccess to navigate away
      if (!resident && onSuccess) {
        console.log('[ResidentForm.handleSaveLease] ✅ Calling onSuccess');
        onSuccess(result as Resident);
      } else {
        // For edits, just close the form
        console.log('[ResidentForm.handleSaveLease] Calling onCancel (edit mode)');
        onCancel();
      }
    } catch (error) {
      console.error('[ResidentForm.handleSaveLease] ❌ Error saving resident:', error);
      alert('Failed to save resident. Please try again.');
    } finally {
      setIsSaving(false);
    }
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

      <main id="main-content" className="container-xl px-4 py-4 d-flex flex-column gap-4" onKeyDown={handleKeyDown}>
        {/* Action bar with back button and page context */}
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={onCancel}
            >
              <ArrowLeft size={18} />
              Back to Residents
            </button>
            <h6 className="mb-0 text-muted">{resident ? 'Edit Resident' : 'Add Resident'}</h6>
          </div>

          {resident && onDelete && (
            <Button
              type="button"
              className="btn btn-tertiary text-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={18} />
              Delete
            </Button>
          )}
        </div>

        {/* Progress Steps */}
        {!resident && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-center align-items-center">
                <div className="d-flex align-items-center wizard-steps-container">
                {wizardSteps.map((step, index) => (
                  <div key={step.id} className={`d-flex align-items-center ${index < wizardSteps.length - 1 ? 'flex-grow-1' : ''}`}>
                    <div className="d-flex flex-column align-items-center wizard-step-item">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center mb-2 wizard-step-circle ${
                          completedSteps.has(step.id)
                            ? 'bg-success text-white'
                            : currentStep === step.id
                            ? 'bg-primary text-white'
                            : 'bg-light text-muted'
                        }`}
                      >
                        {completedSteps.has(step.id) ? (
                          <Check size={20} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={`small text-center ${
                          currentStep === step.id ? 'fw-semibold text-dark' : 'text-muted'
                        }`}
                      >
                        {step.label}
                      </span>
                      {step.required ? (
                        <span className="badge bg-primary text-white wizard-badge">
                          Required
                        </span>
                      ) : (
                        <span className="badge bg-light text-muted wizard-badge">
                          Optional
                        </span>
                      )}
                    </div>
                    {index < wizardSteps.length - 1 && (
                      <div className="flex-grow-1 mx-2 wizard-step-connector" style={{
                        background: completedSteps.has(step.id) ? '#198754' : '#dee2e6',
                      }} />
                    )}
                  </div>
                ))}
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Step 1: Occupants */}
        {currentStep === 'occupants' && (
          <Card className="border-0 shadow-lg mb-4 rounded-4">
            <Card.Body className="p-4 d-flex flex-column gap-4">
              <div>
                <h3>Occupant Information</h3>
                <p className="text-muted mb-0">Add all residents living in this unit</p>
              </div>

                {occupants.map((occupant, index) => (
                  <div key={occupant.id}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="text-muted">
                        {index === 0 ? 'Primary Occupant' : `Occupant ${index + 1}`}
                      </h6>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeOccupant(occupant.id)}
                        >
                          <X size={16} className="me-1" />
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
                              placeholder="e.g., John"
                              value={occupant.firstName}
                              onChange={(e) => handleOccupantChange(occupant.id, 'firstName', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && validateCurrentStep()) {
                                  e.preventDefault();
                                  if (isLastStep) {
                                    handleFinalSave();
                                  } else {
                                    handleNext();
                                  }
                                }
                              }}
                              required={index === 0}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="e.g., Smith"
                              value={occupant.lastName}
                              onChange={(e) => handleOccupantChange(occupant.id, 'lastName', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && validateCurrentStep()) {
                                  e.preventDefault();
                                  if (isLastStep) {
                                    handleFinalSave();
                                  } else {
                                    handleNext();
                                  }
                                }
                              }}
                              required={index === 0}
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
                              placeholder="e.g., john.smith@email.com"
                              value={occupant.email}
                              onChange={(e) => handleOccupantChange(occupant.id, 'email', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && validateCurrentStep()) {
                                  e.preventDefault();
                                  if (isLastStep) {
                                    handleFinalSave();
                                  } else {
                                    handleNext();
                                  }
                                }
                              }}
                              required={index === 0}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                              type="tel"
                              placeholder="(555) 555-0000"
                              value={occupant.phone}
                              onChange={(e) => handlePhoneChange(occupant.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && validateCurrentStep()) {
                                  e.preventDefault();
                                  if (isLastStep) {
                                    handleFinalSave();
                                  } else {
                                    handleNext();
                                  }
                                }
                              }}
                              maxLength={14}
                              required={index === 0}
                              isInvalid={index === 0 && occupant.phone.length > 0 && !isValidPhone(occupant.phone)}
                              isValid={index === 0 && occupant.phone.length > 0 && isValidPhone(occupant.phone)}
                            />
                            {index === 0 && occupant.phone.length > 0 && !isValidPhone(occupant.phone) && (
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
                <button
                  type="button"
                  onClick={addOccupant}
                  className="btn btn-outline-primary d-flex align-items-center gap-2"
                >
                  <Plus size={16} />
                  Add Another Occupant
                </button>
              </div>

              {/* Wizard Navigation Buttons */}
              <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                <Button
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={!validateCurrentStep() || isSaving}
                >
                  Continue to Lease Details
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Step 2: Lease Details (rent-details step removed - now combined here) */}
        {currentStep === 'leases' && (
          <Card className="border-0 shadow-lg mb-4 rounded-4">
            <Card.Body className="p-4">
              <div className="mb-4">
                <h3 className="mb-1">Original Lease</h3>
                <p className="text-muted mb-0">Add the original lease information for this resident</p>
              </div>

              {/* Lease Form */}
              <LeaseFormFields
                formData={leaseFormData}
                validationErrors={leaseValidationErrors}
                units={availableUnits}
                leaseFile={leaseFile}
                onFormChange={handleLeaseFormChange}
                onFileChange={setLeaseFile}
                onSave={handleSaveLease}
                idPrefix="resident-lease"
                isFirstLease={leases.length === 0}
              />

              {/* Saved Leases Display */}
              {leases.length > 0 && (
                <div className="mt-4">
                  <h5 className="mb-3">Saved Lease</h5>
                  <div className="d-flex flex-column gap-3">
                    {leases.map((lease, index) => (
                      <div key={index} className="lease-card">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex gap-3 flex-grow-1">
                            <div className="icon-container-info">
                              <FileText size={20} />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold">
                                {lease.leaseType === 'month-to-month' ? 'Month-to-Month' : 'Yearly'} Lease
                                {lease.unitId && units.find(u => u.id === lease.unitId) && (
                                  <span className="text-muted fw-normal"> - Unit {units.find(u => u.id === lease.unitId)?.name}</span>
                                )}
                              </h6>
                              <div className="d-flex gap-3 flex-wrap small text-muted">
                                <div className="d-flex align-items-center gap-1">
                                  <Calendar size={14} />
                                  <span>
                                    {new Date(lease.startDate).toLocaleDateString()}
                                    {' - '}
                                    {getLeaseEndDisplay(lease.leaseType, lease.endDate, lease.startDate)}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                  <DollarSign size={14} />
                                  <span>${lease.monthlyRent.toLocaleString()}/mo</span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                  <small className="text-muted">Security: ${(lease.securityDeposit || 0).toLocaleString()}</small>
                                </div>
                              </div>
                              {lease.notes && (
                                <p className="small text-muted mb-0 mt-2">{lease.notes}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={handleDeleteLease}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>

                        {/* Lease Details */}
                        <div className="pt-3 border-top">
                          <Row className="g-3 small">
                            {lease.lateStartDay && (
                              <Col md={4}>
                                <div className="text-muted">Late Start Day</div>
                                <div className="fw-semibold">Day {lease.lateStartDay}</div>
                              </Col>
                            )}
                            {lease.lateFeeDailyRate && lease.lateFeeDailyRate > 0 && (
                              <Col md={4}>
                                <div className="text-muted">Late Fee (Daily)</div>
                                <div className="fw-semibold">${lease.lateFeeDailyRate.toFixed(2)}/day</div>
                              </Col>
                            )}
                            {lease.electricRate && lease.electricRate > 0 && (
                              <Col md={4}>
                                <div className="text-muted">Electric Rate</div>
                                <div className="fw-semibold">${lease.electricRate.toFixed(2)}/kWh</div>
                              </Col>
                            )}
                          </Row>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex justify-content-end gap-2 pt-4 border-top mt-4">
                <Button
                  variant="tertiary"
                  onClick={handleFinalSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Saving...
                    </>
                  ) : (
                    'Add Later and Submit'
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={isSaving}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveLease}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Saving...
                    </>
                  ) : (
                    'Save and Submit'
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Resident</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">Are you sure you want to delete this resident? This action cannot be undone.</p>
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

    </div>
  );
}
