import { useState, useMemo, useEffect } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import { ArrowLeft, FileText, Download, X, Loader2 } from 'lucide-react';
import { PageHeader, AccountMenuItem, BreadcrumbItem, PropertyOption } from '../common/PageHeader';
import { FileDropzone } from '../common/FileDropzone';
import { PORTAL_LABELS } from '../../config/labels';
import { getPropertyDisplayName } from '../../utils/slug';
import { downloadMeterSnapshot } from '../../services/invoice.service';
import type { Resident, Invoice, Property, Occupant, LeaseDocument } from '../../App';

type InvoiceFormProps = {
  resident: Resident;
  property?: Property;
  invoice?: Invoice; // Optional invoice prop for edit mode
  activeLease?: LeaseDocument | null; // Active lease for default values
  previousInvoice?: Invoice | null; // Previous invoice for last month balance
  onSubmit: (invoice: Omit<Invoice, 'id'>, meterSnapshotFile?: File | null) => void;
  onCancel: () => void;
  onLogout?: () => void;
  accountMenuItems?: AccountMenuItem[];
  onNavigateToResident?: () => void;
  // Property switching in breadcrumb dropdown
  allProperties?: Property[];
  onPropertySelect?: (propertyId: string) => void;
  onPropertySettings?: (propertyId: string) => void;
};

export function InvoiceForm({
  resident,
  property,
  invoice,
  activeLease,
  previousInvoice,
  onSubmit,
  onCancel,
  onLogout,
  accountMenuItems,
  onNavigateToResident,
  allProperties = [],
  onPropertySelect,
  onPropertySettings,
}: InvoiceFormProps) {
  const currentDate = new Date();

  // Generate month options
  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate year options (current year + 5 years back)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  const defaultMonth = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const defaultYear = currentDate.getFullYear();

  const isEditMode = !!invoice;

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

  // Calculate last month balance from previous invoice (if unpaid, carry over total)
  const calculateLastMonthBalance = (): number => {
    if (invoice?.lastMonthBalance !== undefined) return invoice.lastMonthBalance;
    if (!previousInvoice) return 0;
    if (previousInvoice.isPaid) return 0;
    // If previous invoice is unpaid, calculate its total
    const prevTotal = previousInvoice.lastMonthBalance +
      previousInvoice.currentRent +
      (previousInvoice.previousMonthElectricUsageKwh * previousInvoice.electricRate);
    return prevTotal;
  };

  // Parse existing invoice month (format: "Month Year" e.g. "December 2024")
  const parseInvoiceMonth = (monthStr: string | undefined): { month: string; year: number } => {
    if (!monthStr) return { month: defaultMonth, year: defaultYear };
    const parts = monthStr.split(' ');
    if (parts.length === 2) {
      return { month: parts[0], year: parseInt(parts[1]) || defaultYear };
    }
    return { month: defaultMonth, year: defaultYear };
  };

  const parsedMonth = parseInvoiceMonth(invoice?.month);

  // Get previous month name based on selected invoice month
  const getPreviousMonthName = (month: string): string => {
    const monthIndex = monthOptions.indexOf(month);
    const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    return monthOptions[prevMonthIndex];
  };

  // Calculate days in previous month based on selected invoice month/year
  const getPreviousMonthDays = (month: string, year: number): number => {
    const monthIndex = monthOptions.indexOf(month);
    const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    const prevYear = monthIndex === 0 ? year - 1 : year;
    // Get last day of previous month
    return new Date(prevYear, prevMonthIndex + 1, 0).getDate();
  };

  // Calculate days late from last payment day
  // If lastPaymentDay is in previous month, calculate how many days late
  const calculateDaysLate = (lastPaymentDay: number, lateStartDay: number): number => {
    if (lastPaymentDay === 0) return 0;
    if (lastPaymentDay <= lateStartDay) return 0;
    return lastPaymentDay - lateStartDay;
  };

  const [formData, setFormData] = useState({
    month: parsedMonth.month,
    year: parsedMonth.year,
    date: invoice?.date ?? currentDate.toISOString().split('T')[0],
    // Editable fields
    previousMonthElectricUsageKwh: invoice?.previousMonthElectricUsageKwh ?? 0,
    electricMeterSnapshot: invoice?.electricMeterSnapshot ?? '',
    // Adjustment fields (editable)
    balanceAdjustment: 0,
    lateFeeAdjustment: 0,
    electricChargeAdjustment: 0,
    // Calculated/read-only values (from lease/resident/previous invoice)
    lastMonthBalance: calculateLastMonthBalance(),
    currentRent: invoice?.currentRent ?? activeLease?.monthlyRent ?? resident.currentRent ?? 0,
    lateFeeDailyRate: invoice?.lateFeeDailyRate ?? activeLease?.lateFeeDailyRate ?? resident.lateFeeDailyRate ?? 0,
    electricRate: invoice?.electricRate ?? activeLease?.electricRate ?? resident.electricRate ?? 0,
    lateStartDay: invoice?.lateStartDay ?? activeLease?.lateStartDay ?? resident.lateStartDay ?? 5,
    prevMonthLastPaymentDate: invoice?.prevMonthLastPaymentDate ?? '',
    // Payment status
    isPaid: invoice?.isPaid ?? false,
    shareToken: invoice?.shareToken ?? '',
    paidDate: invoice?.paidDate ?? '',
  });

  const [meterSnapshotFile, setMeterSnapshotFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [detectedFileExtension, setDetectedFileExtension] = useState<string>('jpg');

  // Function to restore form to last saved state
  const handleRestoreFromLastSaved = () => {
    if (invoice) {
      const parsedMonth = parseInvoiceMonth(invoice.month);
      setFormData({
        month: parsedMonth.month,
        year: parsedMonth.year,
        date: invoice.date ?? currentDate.toISOString().split('T')[0],
        // Editable fields
        previousMonthElectricUsageKwh: invoice.previousMonthElectricUsageKwh ?? 0,
        electricMeterSnapshot: invoice.electricMeterSnapshot ?? '',
        // Adjustment fields (load from saved invoice)
        balanceAdjustment: invoice.prevMonthBalanceAdjustment ?? 0,
        lateFeeAdjustment: invoice.prevMonthLateFeeAdjustment ?? 0,
        electricChargeAdjustment: invoice.prevMonthElectricAdjustment ?? 0,
        // Calculated/read-only values
        lastMonthBalance: invoice.lastMonthBalance ?? 0,
        currentRent: invoice.currentRent ?? 0,
        lateFeeDailyRate: invoice.lateFeeDailyRate ?? 0,
        electricRate: invoice.electricRate ?? 0,
        lateStartDay: invoice.lateStartDay ?? activeLease?.lateStartDay ?? resident.lateStartDay ?? 5,
        prevMonthLastPaymentDate: invoice.prevMonthLastPaymentDate ?? '',
        // Payment status
        isPaid: invoice.isPaid ?? false,
        shareToken: invoice.shareToken ?? '',
        paidDate: invoice.paidDate ?? '',
      });
      // Clear any uploaded file
      setMeterSnapshotFile(null);
    }
  };

  // Update form when invoice prop changes (e.g., when editing a different invoice)
  useEffect(() => {
    if (invoice) {
      console.log('[InvoiceForm] ===== LOADING INVOICE INTO FORM =====');
      console.log('[InvoiceForm] Full invoice object:', invoice);
      console.log('[InvoiceForm] Adjustment fields from invoice:');
      console.log('  - prevMonthBalanceAdjustment:', invoice.prevMonthBalanceAdjustment);
      console.log('  - prevMonthLateFeeAdjustment:', invoice.prevMonthLateFeeAdjustment);
      console.log('  - prevMonthElectricAdjustment:', invoice.prevMonthElectricAdjustment);
      console.log('[InvoiceForm] ===== END LOADING =====');

      handleRestoreFromLastSaved();

      console.log('[InvoiceForm] Form data SET with adjustments:');
      console.log('  - balanceAdjustment:', invoice.prevMonthBalanceAdjustment ?? 0);
      console.log('  - lateFeeAdjustment:', invoice.prevMonthLateFeeAdjustment ?? 0);
      console.log('  - electricChargeAdjustment:', invoice.prevMonthElectricAdjustment ?? 0);
    }
  }, [invoice]);

  // Detect file extension from meter snapshot blob when invoice changes
  useEffect(() => {
    console.log('[InvoiceForm] Extension detection useEffect triggered');
    console.log('[InvoiceForm] invoice?.id:', invoice?.id);
    console.log('[InvoiceForm] invoice?.electricMeterSnapshot:', invoice?.electricMeterSnapshot);

    if (invoice?.id && invoice?.electricMeterSnapshot) {
      console.log('[InvoiceForm] Fetching blob to detect file extension...');
      // Fetch the blob and detect file type from magic bytes
      downloadMeterSnapshot(invoice.id)
        .then(async (blob) => {
          console.log('[InvoiceForm] Blob received, MIME type:', blob.type);

          // Read first few bytes to detect file signature (magic bytes)
          const arrayBuffer = await blob.slice(0, 12).arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Detect file type from magic bytes
          let fileExt = 'jpg';

          // PNG: 89 50 4E 47 0D 0A 1A 0A
          if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
            fileExt = 'png';
          }
          // JPEG: FF D8 FF
          else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
            fileExt = 'jpg';
          }
          // GIF: 47 49 46 38
          else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x38) {
            fileExt = 'gif';
          }
          // WEBP: 52 49 46 46 ... 57 45 42 50
          else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
                   uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
            fileExt = 'webp';
          }

          console.log('[InvoiceForm] Detected file extension from magic bytes:', fileExt);
          setDetectedFileExtension(fileExt);
        })
        .catch(error => {
          console.error('[InvoiceForm] Failed to detect file extension:', error);
          // Keep default 'jpg' on error
        });
    } else {
      console.log('[InvoiceForm] No snapshot or invoice, resetting to default jpg');
      // Reset to default when no snapshot
      setDetectedFileExtension('jpg');
    }
  }, [invoice?.id, invoice?.electricMeterSnapshot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[InvoiceForm] ===== FORM SUBMIT START =====');
    console.log('[InvoiceForm] Current meterSnapshotFile state:', meterSnapshotFile ? `${meterSnapshotFile.name} (${meterSnapshotFile.size} bytes)` : 'NULL');

    // Calculate late fee with adjustment
    const calculatedLateFee = formData.lateFeeDailyRate > 0
      ? Math.max(0, (formData.currentRent - formData.lastMonthBalance)) / formData.lateFeeDailyRate
      : 0;
    const adjustedLateFee = calculatedLateFee + formData.lateFeeAdjustment;

    // Reverse-calculate daysLate from adjusted late fee
    const daysLate = formData.lateFeeDailyRate > 0
      ? Math.round(adjustedLateFee / formData.lateFeeDailyRate)
      : 0;

    // Combine month and year back into expected format "Month Year"
    const submitData = {
      month: `${formData.month} ${formData.year}`,
      date: formData.date,
      lastMonthBalance: formData.lastMonthBalance,
      currentRent: formData.currentRent,
      daysLate,
      lateFeeDailyRate: formData.lateFeeDailyRate,
      lateStartDay: formData.lateStartDay,
      previousMonthElectricUsageKwh: formData.previousMonthElectricUsageKwh,
      electricRate: formData.electricRate,
      electricMeterSnapshot: '', // Will be set via upload endpoint if file is provided
      prevMonthLastPaymentDate: formData.prevMonthLastPaymentDate,
      // Send adjustments as separate fields (+ to add, - to subtract)
      prevMonthBalanceAdjustment: formData.balanceAdjustment,
      prevMonthLateFeeAdjustment: formData.lateFeeAdjustment,
      prevMonthElectricAdjustment: formData.electricChargeAdjustment,
      isPaid: formData.isPaid,
      paidDate: formData.paidDate,
      shareToken: formData.shareToken,
    };

    console.log('[InvoiceForm] Invoice data to submit:', submitData);
    console.log('[InvoiceForm] About to call onSubmit with file:', meterSnapshotFile ? `YES - ${meterSnapshotFile.name}` : 'NO FILE');

    // Pass both the invoice data and the file separately
    // The file will be uploaded after invoice creation
    onSubmit(submitData, meterSnapshotFile);

    console.log('[InvoiceForm] ===== FORM SUBMIT END =====');
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMeterSnapshotChange = (file: File | null) => {
    console.log('[InvoiceForm] handleMeterSnapshotChange called with file:', file ? `${file.name} (${file.size} bytes, type: ${file.type})` : 'NULL');
    setMeterSnapshotFile(file);
    console.log('[InvoiceForm] File state updated');
    // Don't convert to base64 - file will be uploaded separately after invoice creation
  };

  const handleRemoveExistingSnapshot = () => {
    // Clear the existing snapshot from form data
    setFormData(prev => ({
      ...prev,
      electricMeterSnapshot: '',
    }));
  };

  // Generate the expected filename for meter snapshot based on invoice data
  const getMeterSnapshotFilename = (): string => {
    if (!invoice) return 'Meter Snapshot';

    // Parse invoice month to get date components
    const [monthName, year] = invoice.month.split(' ');
    const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const formattedDate = `${String(monthNumber).padStart(2, '0')}-01-${year}`;

    // Clean resident name for filename
    const cleanResidentName = residentDisplayName
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores

    // Use detected file extension from blob MIME type
    const fileExt = detectedFileExtension;

    return `Electric_Meter_Snapshot_Invoice_${cleanResidentName}_${formattedDate}.${fileExt}`;
  };

  // Handle downloading meter snapshot
  const handleDownloadSnapshot = async () => {
    if (!invoice?.id) return;

    setIsDownloading(true);
    try {
      const blob = await downloadMeterSnapshot(invoice.id);

      // Detect file extension from magic bytes (file signature)
      const arrayBuffer = await blob.slice(0, 12).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let fileExt = 'jpg';

      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
        fileExt = 'png';
      }
      // JPEG: FF D8 FF
      else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
        fileExt = 'jpg';
      }
      // GIF: 47 49 46 38
      else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x38) {
        fileExt = 'gif';
      }
      // WEBP: 52 49 46 46 ... 57 45 42 50
      else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
               uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
        fileExt = 'webp';
      }

      // Generate filename with correct extension
      const [monthName, year] = invoice.month.split(' ');
      const monthNumber = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      const formattedDate = `${String(monthNumber).padStart(2, '0')}-01-${year}`;
      const cleanResidentName = residentDisplayName
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_');
      const filename = `Electric_Meter_Snapshot_Invoice_${cleanResidentName}_${formattedDate}.${fileExt}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download meter snapshot:', error);
      alert('Failed to download meter snapshot. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Get the previous month name for dynamic labels
  const previousMonthName = getPreviousMonthName(formData.month);

  // Calculate late fee based on last payment day
  const calculateLateFee = (): number => {
    // If no last payment date, not late (no previous month)
    if (!formData.prevMonthLastPaymentDate) return 0;

    // If no late fee daily rate configured, no late fee
    if (formData.lateFeeDailyRate <= 0) return 0;

    const lastPaymentDay = parseInt(formData.prevMonthLastPaymentDate);
    const lateStartDay = formData.lateStartDay;

    // If paid on or before late start day, not late
    if (lastPaymentDay <= lateStartDay) return 0;

    // Calculate days late (payment day - late start day)
    const daysLate = lastPaymentDay - lateStartDay;

    // Late fee = days late × daily rate
    return daysLate * formData.lateFeeDailyRate;
  };

  // Calculate all values (with adjustments)
  const adjustedBalance = formData.lastMonthBalance + formData.balanceAdjustment;
  const baseLateFee = calculateLateFee();
  const adjustedLateFee = baseLateFee + formData.lateFeeAdjustment;
  const baseElectricCharge = formData.previousMonthElectricUsageKwh * formData.electricRate;
  const adjustedElectricCharge = baseElectricCharge + formData.electricChargeAdjustment;

  const total = adjustedBalance + formData.currentRent + adjustedLateFee + adjustedElectricCharge;

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
              Back to Invoices
            </button>
            <h6 className="mb-0 text-muted">{residentDisplayName}</h6>
            <span className="text-muted mx-2">/</span>
            <h6 className="mb-0 text-muted">{isEditMode ? 'Edit Invoice' : 'Add Invoice'}</h6>
          </div>
        </div>

        <Card className="border-0 shadow-lg rounded-4">
          <Card.Body className="p-4">
            
            <Form onSubmit={handleSubmit} className="d-flex flex-column gap-4">
              {/* Invoice Period */}
              <div>
                <h5 className="pb-2 border-bottom mb-3">Invoice Period</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Invoice Month</Form.Label>
                      <Form.Select
                        value={formData.month}
                        onChange={(e) => handleChange('month', e.target.value)}
                        required
                      >
                        {monthOptions.map(month => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Invoice Year</Form.Label>
                      <Form.Select
                        value={formData.year}
                        onChange={(e) => handleChange('year', parseInt(e.target.value))}
                        required
                      >
                        {yearOptions.map(year => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* Standard Charges */}
              <div>
                <h5 className="pb-2 border-bottom mb-3">Standard Charges</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="p-3 bg-light border rounded-3">
                      <div className="text-muted small mb-1">{formData.month}'s Rent</div>
                      <div className="fs-4 fw-semibold">${formData.currentRent.toFixed(2)}</div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 bg-light border rounded-3">
                      <div className="text-muted small mb-1">{previousMonthName}'s Balance</div>
                      <div className="fs-4 fw-semibold">${formData.lastMonthBalance.toFixed(2)}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Late Charges */}
              <div>
                <h5 className="pb-2 border-bottom mb-3">Late Charges</h5>
                <Row className="g-3">
                  <Col md={3}>
                    <div className="p-3 bg-light border rounded-3">
                      <div className="text-muted small mb-1">Daily Late Rate</div>
                      <div className="fs-4 fw-semibold">${formData.lateFeeDailyRate.toFixed(2)}<span className="fs-6 text-muted">/day</span></div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 bg-light border rounded-3">
                      <div className="text-muted small mb-1">Late Start Day</div>
                      <div className="fs-4 fw-semibold">Day {formData.lateStartDay}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 bg-light border rounded-3">
                      <div className="text-muted small mb-1">{previousMonthName}'s Last Payment Day</div>
                      <div className="fs-4 fw-semibold">
                        {formData.prevMonthLastPaymentDate ? `Day ${formData.prevMonthLastPaymentDate}` : 'No Previous Payment'}
                      </div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 bg-light border rounded-3">
                      <div className="text-muted small mb-1">Late Fee (Calculated)</div>
                      <div className="fs-4 fw-semibold">${baseLateFee.toFixed(2)}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Electric Usage */}
              <div>
                <h5 className="pb-2 border-bottom mb-3">Electric Usage</h5>

                {/* Current Meter Snapshot - Show when there's an existing image or new file */}
                {(invoice?.electricMeterSnapshot && formData.electricMeterSnapshot) || meterSnapshotFile ? (
                  <div className="mb-2">
                    <Form.Label className="fw-semibold">{previousMonthName}'s Electric Meter Snapshot</Form.Label>
                    <div className="d-flex align-items-center gap-3 p-3 bg-light border rounded-3 position-relative">
                      <div className="d-flex align-items-center justify-content-center bg-info bg-opacity-10 rounded" style={{ width: 40, height: 48 }}>
                        <FileText size={20} className="text-info" />
                      </div>
                      <div className="flex-grow-1">
                        <p className="small fw-semibold mb-0">
                          {meterSnapshotFile ? meterSnapshotFile.name : getMeterSnapshotFilename()}
                        </p>
                        <p className="small text-muted mb-0">
                          {(meterSnapshotFile ? meterSnapshotFile.name : getMeterSnapshotFilename()).match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1]?.toUpperCase() || 'Image'} File
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={meterSnapshotFile ? () => setMeterSnapshotFile(null) : handleRemoveExistingSnapshot}
                        className="file-dropzone__remove-btn"
                        aria-label="Remove meter snapshot"
                      >
                        <X size={20} />
                      </button>
                      {!meterSnapshotFile && invoice?.id && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleDownloadSnapshot}
                          disabled={isDownloading}
                          className="d-flex align-items-center gap-2"
                        >
                          {isDownloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Image Upload - Show only when no image exists */
                  <FileDropzone
                    id="invoice-meter-snapshot"
                    label={`${previousMonthName}'s Electric Meter Image Upload`}
                    accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
                    maxSize={5 * 1024 * 1024}
                    file={meterSnapshotFile}
                    onFileChange={handleMeterSnapshotChange}
                    helperText={`Upload a photo of ${previousMonthName}'s electric meter reading`}
                  />
                )}

                <Row className="g-3 mt-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Electric Rate</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="text"
                          value={formData.electricRate.toFixed(2)}
                          readOnly
                          className="bg-light"
                        />
                        <span className="input-group-text">/kWh</span>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{previousMonthName}'s Electric Usage</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={isNaN(formData.previousMonthElectricUsageKwh) ? 0 : formData.previousMonthElectricUsageKwh}
                          onChange={(e) => handleChange('previousMonthElectricUsageKwh', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                        <span className="input-group-text">kWh</span>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{previousMonthName}'s Electric Cost</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="text"
                          value={baseElectricCharge.toFixed(2)}
                          readOnly
                          className="bg-light"
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* Adjustments */}
              <div>
                <h5 className="pb-2 border-bottom mb-3">Adjustments</h5>
                <Form.Text className="text-muted d-block mb-3">
                  Select Debit to add charges or Credit to subtract
                </Form.Text>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Balance Adjustment</Form.Label>
                      <div className="input-group">
                        <Button
                          variant={formData.balanceAdjustment >= 0 ? 'outline-primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleChange('balanceAdjustment', Math.abs(formData.balanceAdjustment))}
                          style={{
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            fontWeight: formData.balanceAdjustment >= 0 ? 600 : 400
                          }}
                        >
                          Debit
                        </Button>
                        <Button
                          variant={formData.balanceAdjustment < 0 ? 'outline-primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleChange('balanceAdjustment', -Math.abs(formData.balanceAdjustment))}
                          style={{
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            fontWeight: formData.balanceAdjustment < 0 ? 600 : 400
                          }}
                        >
                          Credit
                        </Button>
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={Math.abs(formData.balanceAdjustment)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const sign = formData.balanceAdjustment < 0 ? -1 : 1;
                            handleChange('balanceAdjustment', value * sign);
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      {formData.balanceAdjustment !== 0 && (
                        <Form.Text className="text-muted">
                          Adjusted total: ${adjustedBalance.toFixed(2)}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Late Fee Adjustment</Form.Label>
                      <div className="input-group">
                        <Button
                          variant={formData.lateFeeAdjustment >= 0 ? 'outline-primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleChange('lateFeeAdjustment', Math.abs(formData.lateFeeAdjustment))}
                          style={{
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            fontWeight: formData.lateFeeAdjustment >= 0 ? 600 : 400
                          }}
                        >
                          Debit
                        </Button>
                        <Button
                          variant={formData.lateFeeAdjustment < 0 ? 'outline-primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleChange('lateFeeAdjustment', -Math.abs(formData.lateFeeAdjustment))}
                          style={{
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            fontWeight: formData.lateFeeAdjustment < 0 ? 600 : 400
                          }}
                        >
                          Credit
                        </Button>
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={Math.abs(formData.lateFeeAdjustment)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const sign = formData.lateFeeAdjustment < 0 ? -1 : 1;
                            handleChange('lateFeeAdjustment', value * sign);
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      {formData.lateFeeAdjustment !== 0 && (
                        <Form.Text className="text-muted">
                          Adjusted total: ${adjustedLateFee.toFixed(2)}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>{previousMonthName}'s Electric Charge Adjustment</Form.Label>
                      <div className="input-group">
                        <Button
                          variant={formData.electricChargeAdjustment >= 0 ? 'outline-primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleChange('electricChargeAdjustment', Math.abs(formData.electricChargeAdjustment))}
                          style={{
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            fontWeight: formData.electricChargeAdjustment >= 0 ? 600 : 400
                          }}
                        >
                          Debit
                        </Button>
                        <Button
                          variant={formData.electricChargeAdjustment < 0 ? 'outline-primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => handleChange('electricChargeAdjustment', -Math.abs(formData.electricChargeAdjustment))}
                          style={{
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            fontWeight: formData.electricChargeAdjustment < 0 ? 600 : 400
                          }}
                        >
                          Credit
                        </Button>
                        <span className="input-group-text">$</span>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={Math.abs(formData.electricChargeAdjustment)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            const sign = formData.electricChargeAdjustment < 0 ? -1 : 1;
                            handleChange('electricChargeAdjustment', value * sign);
                          }}
                          placeholder="0.00"
                        />
                      </div>
                      {formData.electricChargeAdjustment !== 0 && (
                        <Form.Text className="text-muted">
                          Adjusted total: ${adjustedElectricCharge.toFixed(2)}
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {/* Total Amount Due */}
              <div className="bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-dark fw-semibold fs-5">Total Amount Due</span>
                  <span className="fw-bold text-warning-emphasis" style={{ fontSize: '2.5rem' }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="d-flex gap-2 justify-content-end">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleRestoreFromLastSaved}
                    className="btn btn-tertiary"
                  >
                    Restore from Last Saved
                  </button>
                )}
                <Button type="button" variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {isEditMode ? 'Save Changes' : 'Save Invoice'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </main>
    </div>
  );
}
